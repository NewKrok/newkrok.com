// Headless screenshots through the dev debug handle.
// node scripts/shot.mjs <out-prefix> [stage:x,z,yaw,pitch[,steps] …]
// Each view: start the stage, stand at (x, z) looking along yaw / pitch,
// run a few sim steps, take a picture. "menu" shoots the title screen.
import { launch, URL } from "./browser.mjs";
const [out = "shot", ...views] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) } });
const logs = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text()); });
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => window.__longWatch, null, { timeout: 60000 });
await p.waitForTimeout(1500);
let i = 0;
for (const v of views.length ? views : ["menu"]) {
  if (v !== "menu") {
    const [x, z, yaw, pitch, steps] = v.split(",").map(Number);
    await p.evaluate(([x, z, yaw, pitch, steps]) => {
      const D = window.__longWatch;
      D.play();
      if (!Number.isNaN(x)) D.place(x, z, yaw || 0, Number.isNaN(pitch) ? -0.1 : pitch);
      D.steps(steps || 2);
    }, [x, z, yaw, pitch, steps]);
  }
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}-${i++}.png` });
}
console.log(logs.slice(0, 20).join("\n"));
await b.close();
