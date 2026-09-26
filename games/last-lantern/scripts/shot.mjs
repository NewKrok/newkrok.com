// Headless screenshots through the dev server's debug handle.
// node scripts/shot.mjs <out-prefix> [stage] [seconds-of-play] [hero]
import { launch, URL } from "./browser.mjs";
const [out = "shot", stage = "0", secs = "0", hero = "wren"] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text()); });
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}-menu.png` });
if (Number(secs) >= 0) {
  await p.evaluate(([s, h]) => { const L = window.__lastLantern; L.settings.stage = s; L.settings.hero = h; L.startRun(); }, [Number(stage), hero]);
  // Fast-forward the sim with a wandering bot, taking cards automatically.
  await p.evaluate((secs) => {
    const R = window.__lastLantern.G.run;
    for (let i = 0; i < secs * 60; i++) {
      if (R.phase === "levelup") R.pickCard(0);
      if (R.phase === "chest") R.closeChest();
      R.step({ mx: Math.cos(i / 240), my: Math.sin(i / 300) });
      R.sfx.length = 0;
      R.hero.hp = R.hero.maxHp;
    }
    R.hero.hp = R.hero.maxHp;
  }, Number(secs));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}-play.png` });
}
console.log(logs.slice(0, 15).join("\n"));
await b.close();
