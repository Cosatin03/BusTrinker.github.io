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

  const a=await pageAt(390), b=await pageAt(390);
  await a.goto(base+'/maexchen.html');await b.goto(base+'/maexchen.html');
  await a.fill('#nickname','Anna');await a.click('#create');await a.waitForSelector('#room-code');
  const code=await a.textContent('#room-code');assert.match(code,/^[A-Z2-9]{6}$/);
  await b.fill('#nickname','Ben <img onerror=alert(1)>');await b.fill('#join-code',code);await b.click('#join');
  await a.waitForFunction(()=>document.querySelectorAll('#players li').length===2);
  await a.click('#start');await a.waitForSelector('#roll:not([disabled])');
  await a.bringToFront();
  // A physical throw may legitimately land cocked. Exercise the offered retry,
  // rather than treating that documented outcome as a broken multiplayer flow.
  for(let attempt=0;attempt<5;attempt++) {
    await a.click('#roll');
    await a.waitForFunction(()=>!document.querySelector('#claim-controls').hidden || /schräg|Ruhe/.test(document.querySelector('#notice').textContent),{},{timeout:60000});
    if(await a.locator('#claim-controls').isVisible())break;
  }
  assert.equal(await a.locator('#claim-controls').isVisible(),true,'No valid throw after five attempts');
  assert.match(await a.textContent('#dice-label'),/Nur du/);assert.equal(await b.textContent('#dice-label'),'Würfel verdeckt');
  const savedLabel=await a.textContent('#dice-label');await a.reload();await a.waitForSelector('#claim-controls:not([hidden])');assert.equal(await a.textContent('#dice-label'),savedLabel);
  await a.selectOption('#claim-value','21');await a.click('#claim');await b.waitForSelector('#challenge:not([hidden])');await b.click('#challenge');
  await a.waitForSelector('#reveal:not([hidden])');await a.click('#reveal');await a.waitForFunction(()=>document.querySelector('#phase-title').textContent==='Runde beendet');
  await b.waitForFunction(()=>document.querySelector('#phase-title').textContent==='Runde beendet');
  assert.equal(await a.textContent('#phase-info'),await b.textContent('#phase-info'));
  await a.screenshot({path:resolve(results,'maexchen-result.png'),fullPage:true});
  for(const p of [a,b])assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await a.click('#next');await a.waitForFunction(()=>document.querySelector('#phase-title').textContent==='Verdeckt würfeln');
  await b.context().setOffline(true);await b.waitForFunction(()=>document.querySelector('#connection').textContent.includes('unterbrochen'));
  await b.context().setOffline(false);await b.waitForFunction(()=>document.querySelector('#connection').textContent==='Verbunden');
  await a.click('#leave');await b.waitForFunction(()=>document.querySelector('#phase-title').textContent==='Wer spielt mit?');
  assert.equal(await b.locator('#start').isVisible(),true);assert.equal(await b.locator('#start').isDisabled(),true);
  assert.deepEqual(errors,[]);console.log('Mäxchen: two-client lobby, real WebGL physics, private roll, reload, challenge, result, reconnect, host transfer, mobile layout passed.');
} finally { await browser?.close();await new Promise(resolve=>server.close(resolve)); }
