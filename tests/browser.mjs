import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";
import { MemoryFirestore } from "./memory-firestore.js";

const root = resolve(import.meta.dirname, "..");
const results = resolve(root, "test-results");
await mkdir(results, { recursive: true });
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpeg": "image/jpeg",
};
const server = createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      "." +
        new URL(req.url, "http://localhost").pathname.replace(
          /\/$/,
          "/index.html",
        ),
    );
    if (!path.startsWith(root + "/")) throw new Error();
    res.writeHead(200, {
      "Content-Type": types[extname(path)] || "text/plain",
    });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const db = new MemoryFirestore(),
  errors = [],
  watchers = new Map();
let browser;
async function notify() {
  await Promise.all(
    [...watchers].flatMap(([page, subs]) =>
      [...subs].map(async ([id, sub]) => {
        if (page.isClosed()) return;
        try {
          await page.evaluate(
            ({ id, data }) => window.notifyTestSnapshot?.(id, data),
            { id, data: db.read(sub.path, sub.collection) },
          );
        } catch {
          /* Page navigated. */
        }
      }),
    ),
  );
}
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BUSTRINKER_BROWSER_EXECUTABLE || undefined,
    args: ["--no-sandbox"],
  });
  async function pageAt(width = 390) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: width < 600,
      hasTouch: width < 600,
    });
    // Fonts are not a dependency of gameplay, and tests don't need network access.
    await context.route("https://fonts.**/*", (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    page.on("pageerror", (error) => errors.push(error.message));
    watchers.set(page, new Map());
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) watchers.get(page).clear();
    });
    await page.exposeFunction("firestoreBridge", async (type, data) => {
      if (type === "read") return db.read(data.path);
      if (type === "subscribe") {
        watchers.get(page).set(data.id, data);
        return db.read(data.path, data.collection);
      }
      if (type === "unsubscribe") {
        watchers.get(page).delete(data.id);
        return;
      }
      if (type === "commit") {
        const ok = db.commit(data.reads, data.writes);
        if (ok) await notify();
        return ok;
      }
    });
    await page.addInitScript({
      content: await readFile(resolve(root, "tests/browser-db.js"), "utf8"),
    });
    return page;
  }
  async function noOverflow(page) {
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      overflowing: [...document.querySelectorAll("body *")]
        .map((el) => ({
          element: el.tagName + "#" + el.id + "." + String(el.className),
          right: el.getBoundingClientRect().right,
          left: el.getBoundingClientRect().left,
        }))
        .filter((el) => el.right > innerWidth + 1 || el.left < -1),
    }));
    if (layout.width > layout.viewport + 1)
      await writeFile(
        resolve(results, "overflow.json"),
        JSON.stringify(layout, null, 2),
      );
    assert.ok(
      layout.width <= layout.viewport + 1,
      `Horizontal overflow on ${page.url()}`,
    );
  }
  async function connected(page) {
    await page.waitForFunction(() =>
      document
        .getElementById("connection-status")
        ?.textContent.startsWith("Verbunden"),
    );
  }
  async function settled(page) {
    await page.waitForFunction(
      () =>
        document.getElementById("main")?.getAttribute("aria-busy") === "false",
    );
  }
  const menu = await pageAt(1440);
  await menu.goto(base);
  await menu.locator(".game-tile").first().waitFor();
  assert.equal(await menu.locator(".game-tile").count(), 5);
  await noOverflow(menu);
  await menu.screenshot({
    path: resolve(results, "menu-desktop.png"),
    fullPage: true,
  });
  await menu.setViewportSize({ width: 390, height: 844 });
  await noOverflow(menu);
  await menu.screenshot({
    path: resolve(results, "menu-mobile.png"),
    fullPage: true,
  });
  await menu.getByRole("button", { name: "Ein Gerät", exact: true }).click();
  assert.equal(await menu.locator(".game-tile").count(), 4);
  await menu.locator("#game-search").fill("nichts");
  await menu.locator("#no-games").waitFor();
  console.log("PASS collection filters, mobile/desktop layout");

  const fire = await pageAt();
  await fire.goto(base + '/ring-of-fire.html');
  await fire.locator('#names').fill('Alex\nSam\nKim');
  await fire.locator('#setup details summary').click();
  for (const select of await fire.locator('#mapping select').all()) await select.selectOption('custom');
  await fire.locator('#setup-form button[type=submit]').click();
  await noOverflow(fire);
  await fire.locator('.rof-card').last().click();
  await fire.reload();
  await fire.locator('#action-form').waitFor({state:'visible'});
  assert.equal(await fire.locator('#task-title').textContent(), 'Eigene Aufgabe');
  await fire.locator('#action-form button[type=submit]').click();
  assert.equal(await fire.locator('#turn').textContent(), 'Sam');
  await fire.screenshot({path:resolve(results,'ring-of-fire-mobile.png'),fullPage:true});
  await fire.setViewportSize({width:1440,height:900});
  await noOverflow(fire);
  await fire.screenshot({path:resolve(results,'ring-of-fire-desktop.png'),fullPage:true});
  console.log('PASS Ring of Fire setup, draw, restore and turn order');

  const host = await pageAt(),
    guest = await pageAt(),
    display = await pageAt(1024);
  await host.goto(base + "/bustrinker.html");
  await host.locator("#nickname-input").fill("Alex");
  await host.locator("#entry-submit").click();
  await host.locator("#lobby-view").waitFor();
  await connected(host);
  const code = (await host.locator("#room-code-display").textContent()).trim();
  await guest.goto(base + `/bustrinker.html?room=${code}`);
  await guest.locator("#nickname-input").fill("Tom <b>");
  await guest.locator("#entry-submit").click();
  await guest.locator("#lobby-view").waitFor();
  await connected(guest);
  await host.waitForFunction(
    () => document.querySelector("#player-count").textContent === "2",
  );
  assert.equal(await host.locator("#player-list b").count(), 0);
  await host.locator("#external-display-checkbox").check();
  await host.locator("#display-code-area").waitFor();
  await display.goto(base + `/bustrinker.html?display=D-${code}`);
  await display.locator("#entry-submit").click();
  await display.locator("#display-wait").waitFor();
  await host.waitForFunction(() =>
    document
      .querySelector("#display-presence")
      .textContent.includes("verbunden"),
  );
  await host.screenshot({
    path: resolve(results, "lobby-mobile.png"),
    fullPage: true,
  });
  await host.locator("#start-game-button").click();
  await guest.locator("#game-view").waitFor();
  await connected(guest);
  const before = await guest.locator("#hand-cards").innerText();
  await guest.reload();
  await connected(guest);
  await guest.locator("#game-view").waitFor();
  assert.equal(await guest.locator("#hand-cards").innerText(), before);
  await host.reload();
  await connected(host);
  await host.locator("#reveal-controls").waitFor();
  await display.reload();
  await connected(display);
  assert.equal(await display.locator("#personal-column").isVisible(), false);
  await guest.getByRole("link", { name: "← Spiele", exact: true }).click();
  await guest.locator("#resume-link").click();
  await connected(guest);
  assert.equal(await guest.locator("#hand-cards").innerText(), before);
  console.log(
    "PASS host/player/display refresh and menu reentry keep hands and roles",
  );

  // Opening an invitation must remain an explicit choice even with an old session.
  // Mobile browsers emit these events when returning from another app.
  await guest.goto(base + "/bustrinker.html?room=NEW123");
  await guest.locator("#entry-view").waitFor();
  await guest.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
  });
  // Allow an unwanted asynchronous reconnect to surface before asserting.
  await guest.waitForTimeout(300);
  assert.equal(await guest.locator("#entry-view").isVisible(), true);
  assert.equal(await guest.locator("#room-code-input").inputValue(), "NEW123");
  assert.equal(watchers.get(guest).size, 0);
  await guest.locator("#resume-button").click();
  await connected(guest);
  assert.equal(await guest.locator("#hand-cards").innerText(), before);
  assert.equal(new URL(guest.url()).search, "");
  for (let wake = 0; wake < 3; wake++) {
    await guest.evaluate(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("online"));
    });
    await connected(guest);
    assert.equal(watchers.get(guest).size, 2);
    assert.equal(await guest.locator("#hand-cards").innerText(), before);
  }
  console.log(
    "PASS invitations survive app switches; explicit resume preserves the old hand",
  );

  const guestSession = await guest.evaluate(() =>
    JSON.parse(localStorage.getItem("bustrinker.session.v2")),
  );
  await guest.context().setOffline(true);
  await guest.waitForFunction(() =>
    document
      .querySelector("#connection-status")
      .textContent.startsWith("Offline"),
  );
  assert.equal(await guest.locator("#give-button").isEnabled(), false);
  await display.locator("#reveal-button").click();
  await settled(display);
  await guest.context().setOffline(false);
  await connected(guest);
  assert.equal(db.read(`rooms/${code}`).value.gameState.turn, 1);
  // Play the full round through the actual UI with two independently persisted clients.
  for (let roundStep = 0; roundStep < 30; roundStep++) {
    await connected(host);
    await connected(guest);
    await connected(display);
    const room = db.read(`rooms/${code}`).value;
    if (room.status === "finished") break;
    for (const page of [host, guest]) {
      if (await page.locator("#give-panel").isVisible()) {
        const selects = page.locator("#assignments select");
        for (let index = 0; index < (await selects.count()); index++)
          await selects.nth(index).selectOption({ index: 1 });
        await page.locator("#give-button").click();
        await settled(page);
        await page.locator("#give-panel").waitFor({ state: "hidden" });
      }
    }
    for (const page of [host, guest]) {
      await connected(page);
      if (await page.locator("#receipt-panel").isVisible()) {
        if (page === guest) {
          const receiptBefore = db.read(
            `rooms/${code}/players/${guestSession.id}`,
          ).value.pendingReceipts;
          await guest.reload();
          await connected(guest);
          await guest.locator("#receipt-panel").waitFor();
          assert.deepEqual(
            db.read(`rooms/${code}/players/${guestSession.id}`).value
              .pendingReceipts,
            receiptBefore,
          );
        }
        await page.locator("#confirm-button").click();
        await settled(page);
        await page.locator("#receipt-panel").waitFor({ state: "hidden" });
      }
    }
    await connected(host);
    if (roundStep === 0) {
      await host.screenshot({
        path: resolve(results, "game-mobile.png"),
        fullPage: true,
      });
      await noOverflow(host);
    }
    if (db.read(`rooms/${code}`).value.status === "finished") break;
    await host.locator("#reveal-button").click();
    await settled(host);
  }
  await host.locator("#result-panel").waitFor();
  await guest.locator("#result-panel").waitFor();
  assert.equal(db.read(`rooms/${code}`).value.status, "finished");
  await host.locator("#new-round-button").click();
  await guest.locator("#lobby-view").waitFor();
  assert.equal(
    db.read(`rooms/${code}/players/${guestSession.id}`).value.score,
    0,
  );
  // Maximum pyramid width must fit on a narrow phone.
  await host.locator("#card-count-select").selectOption("52");
  await settled(host);
  await connected(host);
  await host.locator("#row-count-select").selectOption("8");
  await settled(host);
  await connected(host);
  await host.locator("#start-game-button").click();
  await host.locator("#pyramid-area .pyramid-row").nth(7).waitFor();
  await host.setViewportSize({ width: 320, height: 740 });
  await noOverflow(host);
  await host.screenshot({
    path: resolve(results, "pyramid-8-mobile.png"),
    fullPage: true,
  });
  console.log(
    "PASS offline reconnect, pending receipts after reload, complete round, restart, eight-row mobile pyramid",
  );

  const local = await pageAt();
  await local.goto(base + "/HoeherTiefer.html");
  for (const name of ["Mia", "Jonas"]) {
    await local.locator("#player-input").fill(name);
    await local.locator("#add-player-form button").click();
  }
  await local.locator("#local-start").click();
  await local.locator(".pile").first().click();
  assert.equal(await local.locator("#equal-button").isEnabled(), true);
  await local.locator("#higher-button").click();
  await local.locator("#local-result").waitFor();
  const localBefore = await local.evaluate(() =>
    localStorage.getItem("bustrinker.higher-lower.v1"),
  );
  await local.reload();
  await local.locator("#local-result").waitFor();
  assert.equal(
    await local.evaluate(() =>
      localStorage.getItem("bustrinker.higher-lower.v1"),
    ),
    localBefore,
  );
  await local.locator("#next-player").click();
  await local.waitForFunction(() =>
    document.querySelector("#turn-indicator").textContent.includes("Jonas"),
  );
  await local.screenshot({
    path: resolve(results, "higher-lower-mobile.png"),
    fullPage: true,
  });
  await noOverflow(local);
  await local.locator("#local-restart").click();
  await local.locator("#cancel-restart").click();
  assert.equal(
    await local.locator("#turn-indicator").textContent(),
    "Jonas ist dran.",
  );
  await local.locator("#edit-players").click();
  await local.locator("#confirm-restart").click();
  await local.locator("#local-setup").waitFor();
  assert.equal(await local.locator("#local-player-list li").count(), 2);
  const roulette = await pageAt(1440);
  await roulette.goto(base + "/roulette.html");
  for (const name of ["Alex", "Kim"]) {
    await roulette.locator("#player-name").fill(name);
    await roulette.locator("#add-player-form button").click();
    await settled(roulette);
  }
  await roulette.locator("#duration").selectOption("3");
  await roulette.locator("#wheel-scene canvas").waitFor();
  assert.equal(await roulette.locator("#wheel-fallback").isVisible(), false);
  await roulette.screenshot({
    path: resolve(results, "roulette-setup-desktop.png"),
    fullPage: true,
  });
  await roulette.locator("#start").click();
  await settled(roulette);
  await roulette.locator('[data-bet="red"]').click();
  await settled(roulette);
  assert.equal(
    await roulette.locator("#bet-total").innerText(),
    "3 gesetzt · 97 verfügbar",
  );
  await roulette.locator("#ready").click();
  await settled(roulette);
  await roulette.locator('[data-bet="n0"]').click();
  await settled(roulette);
  await roulette.locator("#ready").click();
  await settled(roulette);
  assert.equal(await roulette.locator(".wager-entry").count(), 2);
  assert.ok((await roulette.locator("#all-bets").innerText()).includes("Alex"));
  assert.ok((await roulette.locator("#all-bets").innerText()).includes("Kim"));
  assert.equal(
    await roulette.locator('[data-bet="red"] .field-chip').innerText(),
    "A 3",
  );
  assert.equal(
    await roulette.locator('[data-bet="n0"] .field-chip').innerText(),
    "K 3",
  );
  const unified = await roulette.evaluate(() => {
    const table = document.querySelector(".casino-table");
    const wheel = document
      .querySelector(".wheel-panel")
      .getBoundingClientRect();
    const board = document.querySelector(".bet-layout").getBoundingClientRect();
    return (
      table.contains(document.querySelector(".wheel-panel")) &&
      table.contains(document.querySelector(".bet-layout")) &&
      wheel.bottom <= board.top
    );
  });
  assert.ok(
    unified,
    "Wheel and betting layout must be on one vertically unified table",
  );
  await noOverflow(roulette);
  await roulette.screenshot({
    path: resolve(results, "roulette-betting-desktop.png"),
    fullPage: true,
  });
  await roulette.setViewportSize({ width: 390, height: 844 });
  await roulette.locator("#spin").click();
  await settled(roulette);
  await roulette.waitForFunction(() => {
    const bounds = document
      .querySelector(".wheel-panel")
      .getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
  });
  await roulette.locator("#spinning").waitFor();
  assert.equal(await roulette.locator(".bet-layout").isVisible(), true);
  assert.equal(await roulette.locator(".wager-entry").count(), 2);
  assert.equal(await roulette.locator('[data-bet="red"]').isEnabled(), false);
  const firstFrame = await roulette
    .locator("#wheel-scene canvas")
    .evaluate((canvas) => ({
      wheel: Number(canvas.dataset.wheelAngle),
      ball: Number(canvas.dataset.ballAngle),
    }));
  await roulette.waitForFunction(({ wheel, ball }) => {
    const canvas = document.querySelector("#wheel-scene canvas");
    return (
      Number(canvas.dataset.wheelAngle) > wheel + 0.1 &&
      Number(canvas.dataset.ballAngle) < ball - 0.1
    );
  }, firstFrame);
  const spinningSave = await roulette.evaluate(
    () => JSON.parse(localStorage.getItem("bustrinker.roulette.v1")).state,
  );
  await roulette.reload();
  await roulette.locator("#results").waitFor();
  const resultSave = await roulette.evaluate(
    () => JSON.parse(localStorage.getItem("bustrinker.roulette.v1")).state,
  );
  assert.equal(resultSave.outcome, spinningSave.outcome);
  assert.equal(await roulette.locator(".bet-layout").isVisible(), true);
  assert.equal(await roulette.locator(".wager-entry").count(), 2);
  assert.equal(
    await roulette.locator('[data-bet="red"] .field-chip').innerText(),
    "A 3",
  );
  assert.equal(resultSave.history.length, 1);
  assert.equal(
    await roulette.locator("#result-number").innerText(),
    String(spinningSave.outcome),
  );
  await roulette.setViewportSize({ width: 320, height: 740 });
  await noOverflow(roulette);
  await roulette.screenshot({
    path: resolve(results, "roulette-result-mobile.png"),
    fullPage: true,
  });
  // Seed a known winning round through the same pure engine, then distribute via UI.
  await roulette.evaluate(async () => {
    const { createGame, transition, ROULETTE_KEY } = await import(
      "/roulette-core.js"
    );
    let s = createGame(["Alex", "Kim"], { duration: 3 });
    const act = (c) => {
      s = transition(s, { ...c, revision: s.revision });
    };
    act({ type: "bet", id: "red", amount: 3 });
    act({ type: "ready" });
    act({ type: "ready" });
    act({ type: "spin", outcome: 1, now: Date.now() - 4000 });
    act({ type: "settle", now: Date.now() });
    localStorage.setItem(ROULETTE_KEY, JSON.stringify({ state: s }));
  });
  await roulette.reload();
  await roulette.locator("#send-sips").click();
  await settled(roulette);
  await roulette.locator(".confirm-drink:not([disabled])").click();
  await settled(roulette);
  await roulette.locator("#next").click();
  await settled(roulette);
  assert.ok(
    (await roulette.locator("#round-label").innerText()).includes("RUNDE 2"),
  );
  await roulette.locator(".combination-panel summary").click();
  await settled(roulette);
  await roulette.locator("#combination-type").selectOption("corner");
  await roulette.locator("#combination").selectOption("firstfour");
  await roulette.locator("#place-combination").click();
  await settled(roulette);
  assert.ok(
    (await roulette.locator("#bet-list").innerText()).includes("0 / 1 / 2 / 3"),
  );
  await noOverflow(roulette);
  await roulette.screenshot({
    path: resolve(results, "roulette-betting-mobile.png"),
    fullPage: true,
  });
  assert.equal(await roulette.locator(".wager-entry").count(), 1);
  for (const n of [0, 1, 2, 3])
    assert.equal(
      await roulette.locator(`[data-bet="n${n}"] .combination-chip`).count(),
      1,
    );
  await roulette.reload();
  assert.ok(
    (await roulette.locator("#bet-list").innerText()).includes("0 / 1 / 2 / 3"),
  );
  await roulette.locator("#edit").click();
  await settled(roulette);
  await roulette.locator("#cancel-edit").click();
  await settled(roulette);
  assert.equal(await roulette.locator("#bet-list li").count(), 1);
  await roulette.locator("#edit").click();
  await settled(roulette);
  await roulette.locator("#confirm-edit").click();
  await settled(roulette);
  assert.equal(await roulette.locator("#players li").count(), 2);
  await roulette.locator("#minimum").fill("5");
  await roulette.locator("#start").click();
  await settled(roulette);
  assert.equal(await roulette.locator("#stake").inputValue(), "5");
  // WebGL unavailability must not block any betting controls.
  const fallback = await pageAt(390);
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  await fallback.goto(base + "/roulette.html");
  await fallback.locator("#wheel-fallback").waitFor();
  await fallback.locator("#player-name").fill("Solo");
  await fallback.locator("#add-player-form button").click();
  await settled(fallback);
  await fallback.locator("#start").click();
  await settled(fallback);
  await fallback.locator('[data-bet="red"]').click();
  await settled(fallback);
  assert.equal(await fallback.locator("#bet-list li").count(), 1);
  await noOverflow(fallback);
  console.log(
    "PASS roulette unified table, all-player wagers in every phase, rendered counter-rotation, mobile layout, spin reload, payouts and WebGL fallback",
  );
  const payout = await pageAt(390);
  await payout.goto(base + "/roulette.html");
  await payout.evaluate(async () => {
    const { createGame, transition, ROULETTE_KEY } = await import(
      "/roulette-core.js"
    );
    let s = createGame(["Alex", "Kim", "Mia"], { duration: 3 });
    const act = (c) => {
      s = transition(s, { ...c, revision: s.revision });
    };
    act({ type: "bet", id: "n1", amount: 3 });
    act({ type: "bet", id: "black", amount: 3 });
    for (let i = 0; i < 3; i++) act({ type: "ready" });
    act({ type: "spin", outcome: 1, now: Date.now() - 4000 });
    act({ type: "settle", now: Date.now() });
    localStorage.setItem(ROULETTE_KEY, JSON.stringify({ state: s }));
  });
  await payout.reload();
  await payout.locator("#send-sips").waitFor();
  await payout.waitForFunction(
    () => document.querySelector("#wheel-scene canvas")?.dataset.progress,
  );
  await payout.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const counterInline = await payout.evaluate(() => {
    const [minus, plus] = [
      ...document.querySelectorAll(".sip-counter .amount-step"),
    ].map((b) => b.getBoundingClientRect());
    return Math.abs(minus.top - plus.top) < 2 && minus.right < plus.left;
  });
  assert.ok(counterInline, "Amount stepper buttons must share one row");
  assert.equal(await payout.locator(".prize-count").innerText(), "30");
  assert.equal(await payout.locator(".recipient-card").count(), 3);
  const resultOrder = await payout.evaluate(
    () =>
      document.querySelector("#results").getBoundingClientRect().top <
      document.querySelector(".bet-layout").getBoundingClientRect().top,
  );
  assert.ok(resultOrder);
  await noOverflow(payout);
  await payout.screenshot({
    path: resolve(results, "roulette-payout-mobile.png"),
    fullPage: true,
  });
  await payout.setViewportSize({ width: 1440, height: 1000 });
  await noOverflow(payout);
  await payout.screenshot({
    path: resolve(results, "roulette-payout-desktop.png"),
    fullPage: true,
  });
  await payout.locator("#send-sips").click();
  await settled(payout);
  await payout.locator("#round-feedback").waitFor();
  assert.ok(
    (await payout.locator("#round-feedback").innerText()).includes(
      "Alex → Kim",
    ),
  );
  assert.ok(
    (await payout.locator('[data-receipt-player="1"]').innerText()).includes(
      "Von Alex",
    ),
  );
  await payout.locator('[data-receipt-player="1"] .confirm-drink').click();
  await settled(payout);
  await payout.locator("#give-amount").fill("1");
  await payout.locator("#send-sips").click();
  await settled(payout);
  assert.equal(
    await payout
      .locator('[data-receipt-player="1"] .confirm-drink')
      .innerText(),
    "1 Schluck bestätigen",
  );
  await payout.reload();
  await payout.locator("#send-sips").waitFor();
  assert.equal(await payout.locator(".prize-count").innerText(), "26");
  assert.ok(
    (await payout.locator('[data-receipt-player="1"]').innerText()).includes(
      "Von Alex",
    ),
  );
  await payout.locator('[data-recipient="2"]').click();
  await payout.locator("#give-amount").fill("2");
  await payout.locator("#send-sips").click();
  await settled(payout);
  await payout.locator('[data-recipient="0"]').click();
  await payout.locator("#send-sips").click();
  await settled(payout);
  await payout.locator(".waive-button").click();
  await settled(payout);
  assert.equal(await payout.locator("#next").isEnabled(), false);
  const pendingButtons = payout.locator(".confirm-drink");
  while (await pendingButtons.count()) {
    await pendingButtons.first().click();
    await settled(payout);
  }
  assert.equal(await payout.locator("#next").isEnabled(), true);
  await payout.locator("#next").click();
  await settled(payout);
  assert.deepEqual(
    await payout.evaluate(
      () =>
        JSON.parse(localStorage.getItem("bustrinker.roulette.v1")).state
          .transfers,
    ),
    [],
  );
  console.log(
    "PASS reward panel, direct recipients, source receipts, self allocation, new-sip confirmation and reload",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS higher/lower persistence, equal option, next player, restart; no browser exceptions",
  );
} catch (error) {
  if (browser)
    for (const [index, page] of browser
      .contexts()
      .flatMap((context) => context.pages())
      .entries()) {
      await page
        .screenshot({
          path: resolve(results, `failure-${index}.png`),
          fullPage: true,
        })
        .catch(() => {});
    }
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.close();
}
