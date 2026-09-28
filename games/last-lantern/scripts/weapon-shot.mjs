// A few seconds of play with chosen weapons (and relics), for a screenshot.
// node scripts/weapon-shot.mjs <out.png> <stage> <weapons,comma> [relics,comma] [seconds] [zoom]
import { launch, URL } from "./browser.mjs";
const [out, stage = "0", weapons = "flail", relics = "", secs = "6", zoom = "0.7"] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(1500);
await p.evaluate(([s, ws, rs, secs, zoom]) => {
  const L = window.__lastLantern; L.settings.stage = s; L.startRun();
  const R = L.G.run; R.levelUpQueue = 0; R.clock = 150 * 60; R.events.length = 0;
  R.hero.weapons.length = 0;
  for (const id of ws.split(",")) R.hero.weapons.push({ id, level: 5, cd: 10, pulse: 0, radius: 0, angle: 0, evolved: !!id.match(/choir|harvest|thurible|unkindness/) });
  for (const id of rs.split(",").filter(Boolean)) R.relics.push(id);
  L.scene.zoom = zoom;
  for (let i = 0; i < secs * 60; i++) { if (R.phase === "levelup") { R.levelUpQueue = 0; R.phase = "play"; } if (R.phase === "chest") R.closeChest(); R.step({ mx: Math.cos(i / 90) * 0.6, my: Math.sin(i / 110) * 0.6 }); R.sfx.length = 0; R.hero.hp = R.hero.maxHp; }
}, [Number(stage), weapons, relics, Number(secs), Number(zoom)]);
await p.waitForTimeout(1200);
await p.screenshot({ path: out });
console.log(errs.join("\n"));
await b.close();
