// The Gamer Zone preview: a gameplay frame without the HUD, 960×540 → 480×270.
import { launch, URL } from "./browser.mjs";
const [out, stage = "0", secs = "110"] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(2000);
await p.evaluate(([s, secs]) => {
  const L = window.__lastLantern; L.settings.stage = s; L.settings.hero = "wren"; L.startRun();
  const R = L.G.run;
  R.hero.weapons.length = 0;
  for (const id of ["flail", "flail", "flail", "spades", "spades", "spades", "storm", "storm"]) R.hero.weapons.find((w) => w.id === id) ? R.hero.weapons.find((w) => w.id === id).level++ : R.hero.weapons.push({ id, level: 1, cd: 20, pulse: 0, radius: 0, angle: 0 });
  for (let i = 0; i < secs * 60; i++) {
    if (R.phase === "levelup") R.pickCard(0);
    if (R.phase === "chest") R.closeChest();
    R.step({ mx: Math.cos(i / 300) * 0.6, my: Math.sin(i / 360) * 0.6 });
    R.sfx.length = 0; R.hero.hp = R.hero.maxHp;
  }
  document.getElementById("hud").style.display = "none";
  document.getElementById("ingame").style.display = "none";
}, [Number(stage), Number(secs)]);
await p.waitForTimeout(1200);
await p.screenshot({ path: out });
await b.close();
