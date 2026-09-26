// Close-up of a stage's monsters around the hero, frozen in place.
// node scripts/showcase.mjs <out.png> <stage> <x> <y> <ids,comma,separated> [zoom] [hero]
import { launch, URL } from "./browser.mjs";
const [out, stage = "0", x = "1300", y = "760", ids = "", zoom = "0.6", hero = "wren"] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(1500);
await p.evaluate(([s, x, y, ids, zoom, hero]) => {
  const L = window.__lastLantern; L.settings.stage = s; L.settings.hero = hero; L.startRun();
  const R = L.G.run;
  R.hero.body.position.x = x; R.hero.body.position.y = y;
  R.events.length = 0; R.rateMul = 0; R.hero.weapons.length = 0; R.levelUpQueue = 0;
  L.scene.zoom = zoom; L.scene.snap = true;
  const list = ids ? ids.split(",") : [];
  list.forEach((id, i) => { const a = (i / list.length) * Math.PI * 2 - Math.PI / 2; const d = id === "colossus" || id.endsWith("mother") || id === "stag" || id === "king" ? 170 : 95; const m = window.__lastLantern.spawn(id, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8); if (m) { m.born = -100; m.stun = 1e9; } });
  for (let i = 0; i < 40; i++) { R.step({ mx: 0, my: 0.01 }); R.sfx.length = 0; }
  document.getElementById("hud").style.display = "none";
}, [Number(stage), Number(x), Number(y), ids, Number(zoom), hero]);
await p.waitForTimeout(1500);
await p.screenshot({ path: out });
await b.close();
