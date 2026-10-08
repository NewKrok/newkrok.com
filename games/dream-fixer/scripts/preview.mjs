// The Gamer Zone preview: a gameplay frame without the HUD, 960×540 shot,
// scaled to 480×270 WebP in the browser. node scripts/preview.mjs <out.webp>
import fs from "node:fs";
import { launch, URL } from "./browser.mjs";
const [out = "preview.webp"] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.evaluate(() => {
  const D = window.__dreamFixer;
  D.level("park");
  D.toBoss();
  D.place(-3, 15.5, -0.25, 0.08);
  D.steps(60 * 8);
  const R = D.run;
  R.boss.body.x = 1; R.boss.body.z = 6; R.boss.yaw = Math.PI - 0.5; R.boss.lx = 1; R.boss.lz = 6;
  for (const [x, z] of [[-2.5, 10], [1.8, 11.5]]) R.spawn("fuzz", x, z);
  R.spawn("buzzer", -5, 9);
  D.steps(40, { fire: true });
  for (const el of document.querySelectorAll(".hud, .dialog, .memcards, .touch-ui")) el.style.display = "none";
});
await p.waitForTimeout(1500);
const png = await p.screenshot();
const webp = await p.evaluate(async (b64) => {
  const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
  const c = document.createElement("canvas"); c.width = 480; c.height = 270;
  const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, 480, 270);
  return c.toDataURL("image/webp", 0.86).split(",")[1];
}, png.toString("base64"));
fs.writeFileSync(out, Buffer.from(webp, "base64"));
await b.close();
