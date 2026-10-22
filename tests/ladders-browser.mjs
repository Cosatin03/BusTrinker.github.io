import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
const root = resolve(import.meta.dirname, "..");
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
    if (!path.startsWith(root + "/")) throw Error();
    const body = await readFile(path);
    res.writeHead(200, {
      "Content-Type":
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".jpeg": "image/jpeg",
        }[extname(path)] || "text/plain",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BUSTRINKER_BROWSER_EXECUTABLE || undefined,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const errors = [];
await mkdir(resolve(root, "test-results"), { recursive: true });
const key = "bustrinker.ladders.v1";
async function saved(p) {
  return p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
}
async function overflow(p) {
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "horizontal overflow",
  );
}
async function inViewport(page, selector) {
  const r = await page.locator(selector).boundingBox(),
    size = page.viewportSize();
  assert.ok(
    r &&
      r.y >= -1 &&
      r.y + r.height <= size.height + 1 &&
      r.x >= -1 &&
      r.x + r.width <= size.width + 1,
    `${selector}: ${JSON.stringify(r)}`,
  );
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.route("https://fonts.**/*", (r) => r.abort());
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/ladders.html");
  assert.equal(await page.locator("#mode-options button").count(), 5);
  await page.getByRole("button", { name: /Weird/ }).click();
  assert.equal(
    await page.locator('[data-mode="weird"]').getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: /Hot/ }).click();
  assert.equal(await page.locator("#adult-setting").isVisible(), true);
  for (const name of ["Alex", "Sam", "Kim", "Test"]) {
    await page.fill("#player-name", name);
    await page.click("#add-player");
  }
  await page
    .getByRole("button", { name: "Test entfernen", exact: true })
    .click();
  assert.equal(await page.locator("#setup-players li").count(), 3);
  await overflow(page);
  assert.ok((await page.locator("#player-name").boundingBox()).width > 120);
  await page.screenshot({
    path: resolve(root, "test-results/ladders-setup-desktop.png"),
    fullPage: true,
  });
  await page.click('[data-mode="hardcore"]');
  await page.click(".start-board");
  await page.waitForSelector("#scene-host canvas");
  assert.equal(await page.locator("#fallback").isVisible(), false);
  assert.equal((await saved(page)).settings.mode, "hardcore");
  await inViewport(page, "#roll");
  await inViewport(page, "#scene-host");
  await overflow(page);
  await page.screenshot({
    path: resolve(root, "test-results/ladders-desktop.png"),
    fullPage: true,
  });
  await page.click("#roll");
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).phase === "task",
    key,
  );
  const pending = await saved(page);
  await page.reload();
  await page.waitForSelector("#done");
  assert.deepEqual(await saved(page), pending);
  assert.equal(await page.locator("#task-text").innerText(), pending.task.text);
  await page.click("#done");
  assert.equal((await saved(page)).current, 1);
  // Actual animation settles and leaves a playable task.
  await page.click("#roll");
  await page.waitForFunction(() => !document.querySelector("#done").disabled);
  assert.equal((await saved(page)).revision, 3);
  const tab = await context.newPage();
  tab.on("pageerror", (e) => errors.push(e.message));
  await tab.goto(base + "/ladders.html");
  await Promise.all([
    page.evaluate(() => document.querySelector("#done").click()),
    tab.evaluate(() => document.querySelector("#done").click()),
  ]);
  await page.waitForTimeout(200);
  assert.equal((await saved(page)).revision, 4);
  assert.equal((await saved(tab)).current, 2);
  // Responsive layout and selectable fields.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await overflow(page);
  await page.screenshot({
    path: resolve(root, "test-results/ladders-mobile.png"),
    fullPage: true,
  });
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await inViewport(page, "#roll");
    await inViewport(page, "#scene-host");
    await overflow(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#board-info");
  await page.waitForSelector("#board-info-dialog[open]");
  await page.click("#close-info");
  await page.click("#edit");
  await page.getByRole("button", { name: /Hot/ }).click();
  await page.check("#adult-confirmed");
  await page.fill("#size", "20");
  await page.fill("#ladders", "0");
  await page.fill("#slides", "0");
  await page
    .locator("summary")
    .filter({ hasText: "Aufgaben & eigene Feldbelegung" })
    .click();
  await page.uncheck("#cat-challenge");
  await page.uncheck("#cat-duel");
  await page.uncheck("#cat-sip");
  await page.fill("#pool-talk", "Eine eigene Aufgabe {n}");
  await page.fill("#custom-field", "20");
  await page.fill("#custom-task", "Zielfeier");
  await page.click("#assign-field");
  await page.click(".start-board");
  await page.waitForSelector("#restart-dialog[open]");
  await page.click("#keep-game");
  assert.equal((await saved(page)).settings.size, 64);
  await page.click(".start-board");
  await page.click("#replace-game");
  assert.equal((await saved(page)).settings.size, 20);
  assert.equal((await saved(page)).settings.fields[20], "Zielfeier");
  assert.equal((await saved(page)).settings.mode, "sexy");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.click("#roll");
  await page.waitForFunction(() => !document.querySelector("#done").disabled);
  assert.equal(
    await page.locator("#task-text").innerText(),
    "Eine eigene Aufgabe 2",
  );
  await inViewport(page, "#done");
  await inViewport(page, "#skip");
  await inViewport(page, "#task-text");
  assert.equal(await page.evaluate(() => scrollY), 0);
  await page.screenshot({
    path: resolve(root, "test-results/ladders-task-mobile.png"),
    fullPage: true,
  });
  await page.goto(base + "/index.html");
  await page.waitForSelector('a[href="ladders.html"]');
  assert.equal(
    await page.locator("#resume-link").getAttribute("href"),
    "ladders.html",
  );
  await overflow(page);
  // Full endgame with custom final field, and no-WebGL mode.
  const fallbackContext = await browser.newContext({
    viewport: { width: 360, height: 800 },
    reducedMotion: "reduce",
  });
  await fallbackContext.route("https://fonts.**/*", (r) => r.abort());
  await fallbackContext.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  const fb = await fallbackContext.newPage();
  fb.on("pageerror", (e) => errors.push(e.message));
  await fb.goto(base + "/ladders.html");
  await fb.fill("#player-name", "Solo");
  await fb.click("#add-player");
  await fb.fill("#size", "20");
  await fb.fill("#ladders", "0");
  await fb.fill("#slides", "0");
  await fb.selectOption("#finish", "reach");
  await fb.click(".start-board");
  await fb.waitForSelector("#fallback:not([hidden])");
  await overflow(fb);
  for (let i = 0; i < 20; i++) {
    if ((await saved(fb)).phase === "won") break;
    await fb.click("#roll");
    await fb.waitForFunction(() => !document.querySelector("#done").disabled);
    await fb.click("#done");
  }
  assert.equal((await saved(fb)).phase, "won");
  await fb.screenshot({
    path: resolve(root, "test-results/ladders-winner-fallback.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Ladders browser: 3D, animation, mobile, reload, cross-tab, customization, catalog, fallback and victory passed.",
  );
} finally {
  await browser.close();
  server.close();
}
