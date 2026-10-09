// In-game pictures of the rangers' animation states, through the dev handle.
// node scripts/anim-shots.mjs <out-prefix>
// Each picture: start a stage, stand somewhere, feed the sim a few steps of
// input (aim, fire, reload, swap, crouch, sprint), look at the figure.
import { launch, URL } from "./browser.mjs";
const [out = "anim"] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) } });
const logs = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text()); });
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForFunction(() => window.__longWatch, null, { timeout: 60000 });
await p.waitForTimeout(1500);
// [name, stage, x, z, yaw, pitch, script]: the script runs in the page with D.
const VIEWS = [
  ["idle-front", "approach", 0, 70, 0, -0.1, "D.steps(30); D.input.setView(Math.PI, -0.05); D.steps(2);"],
  ["aim", "approach", 0, 70, 0, -0.1, "D.steps(40, { aim: true });"],
  ["fire", "approach", 0, 70, 0, -0.1, "D.steps(30, { aim: true }); D.steps(3, { aim: true, fire: true, firePressed: true });"],
  ["reload-out", "approach", 0, 70, 0, -0.1, "D.steps(4, { fire: true, firePressed: true }); D.steps(30); D.steps(1, { reloadPressed: true }); D.steps(38); D.input.setView(Math.PI + 0.6, -0.05); D.steps(1);"],
  ["reload-pouch", "approach", 0, 70, 0, -0.1, "D.steps(4, { fire: true, firePressed: true }); D.steps(30); D.steps(1, { reloadPressed: true }); D.steps(56); D.input.setView(Math.PI + 0.6, -0.05); D.steps(1);"],
  ["reload-in", "approach", 0, 70, 0, -0.1, "D.steps(4, { fire: true, firePressed: true }); D.steps(30); D.steps(1, { reloadPressed: true }); D.steps(78); D.input.setView(Math.PI + 0.6, -0.05); D.steps(1);"],
  ["swap-mid", "approach", 0, 70, 0, -0.1, "D.steps(30); D.steps(1, { swapPressed: true }); D.steps(10); D.input.setView(Math.PI - 0.5, -0.05); D.steps(1);"],
  ["swap-done", "approach", 0, 70, 0, -0.1, "D.steps(30); D.steps(1, { swapPressed: true }); D.steps(40); D.input.setView(Math.PI - 0.5, -0.05); D.steps(1);"],
  ["crouch", "approach", 0, 70, 0, -0.1, "D.steps(1, { crouchPressed: true }); D.steps(40); D.input.setView(Math.PI - 0.7, -0.05); D.steps(1);"],
  ["sprint", "approach", 0, 70, 0, -0.1, "D.steps(45, { sprint: true, forward: 1 });"],
  ["cover", "approach", 6, 65.3, 0, -0.1, "D.steps(5); D.steps(1, { coverPressed: true }); D.steps(30); D.input.setView(Math.PI - 0.6, -0.05); D.steps(1);"],
  ["survivors", "vents", -22, -125.5, 0, -0.25, "D.steps(10);"],
];
for (const [name, stage, x, z, yaw, pitch, script] of VIEWS) {
  await p.evaluate(([stage, x, z, yaw, pitch, script]) => {
    const D = window.__longWatch;
    D.stage(stage); D.skipCut();
    D.place(x, z, yaw, pitch);
    D.god(true);
    D.freeze(false);
    new Function("D", script)(D);
    D.freeze(true);
  }, [stage, x, z, yaw, pitch, script]);
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `${out}-${name}.png` });
}
console.log(logs.slice(0, 20).join("\n"));
await b.close();
