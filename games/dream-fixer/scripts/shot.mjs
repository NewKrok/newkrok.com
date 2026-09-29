// Headless screenshots of the game through the dev debug handle.
// node scripts/shot.mjs <out-prefix> [x,z,yaw,pitch ...]
// Each view: stand at (x, z) looking along yaw/pitch, fire a few bolts, shoot.
import { launch, URL } from "./browser.mjs";
const [out = "shot", ...views] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) } });
const logs = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text()); });
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}-menu.png` });
let i = 0;
for (const v of views.length ? views : ["0,18,0,0"]) {
  const [x, z, yaw, pitch, fire] = v.split(",").map(Number);
  await p.evaluate(([x, z, yaw, pitch, fire]) => {
    const D = window.__dreamFixer; D.play(); D.place(x, z, yaw, pitch);
    if (fire) D.steps(fire, { fire: true }); else D.steps(2);
  }, [x, z, yaw, pitch, fire || 0]);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}-${i++}.png` });
}
console.log(logs.slice(0, 15).join("\n"));
await b.close();
