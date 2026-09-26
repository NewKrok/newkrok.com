// Jump to each stage's keeper, watch it for a while, then kill it and
// capture the lit beacon and the result screen.
import { launch, URL } from "./browser.mjs";
const [out, stages = "0,1,2,3,4"] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(1500);
for (const s of stages.split(",").map(Number)) {
  await p.evaluate((s) => {
    const L = window.__lastLantern; L.settings.stage = s; L.startRun();
    const R = L.G.run;
    R.clock = R.stage.bossAt * 60 - 30;
    R.events.length = 0;
    for (let i = 0; i < 60 * 14; i++) { if (R.phase === "levelup") R.pickCard(0); if (R.phase === "chest") R.closeChest(); R.step({ mx: Math.cos(i / 200) * 0.5, my: Math.sin(i / 260) * 0.5 }); R.sfx.length = 0; R.hero.hp = R.hero.maxHp; }
  }, s);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}-boss${s}.png` });
  await p.evaluate(() => { const R = window.__lastLantern.G.run; if (R.boss) { R.boss.hp = 1; } });
  await p.evaluate(() => { const R = window.__lastLantern.G.run; for (let i = 0; i < 600 && R.boss; i++) { if (R.phase === "levelup") R.pickCard(0); R.step({ mx: 0, my: 0 }); R.sfx.length = 0; R.hero.hp = R.hero.maxHp; } });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: `${out}-lit${s}.png` });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}-won${s}.png` });
}
console.log(logs.join("\n"));
await b.close();
