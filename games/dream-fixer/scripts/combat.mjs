// A fight for screenshots: spawn glitches in front of you, let them come,
// aim at the nearest and fire for a while, then capture a few frames.
// node scripts/combat.mjs <out-prefix> [seconds]
import { launch, URL } from "./browser.mjs";
const [out = "combat", secs = "3", scenario = "spawn"] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text()); });
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(2000);
await p.evaluate((scenario) => {
  const D = window.__dreamFixer; D.play();
  if (scenario === "anchor") {
    // Tune the lawn anchor.
    const a = D.run.anchors[0];
    D.place(a.x - 1.5, a.z + 1.5, -0.8, -0.1);
    D.steps(1, { usePressed: true });
  } else {
    D.place(0, 10, 0, 0);
    for (const [k, x, z] of [["fuzz", -2, 2], ["fuzz", 1, 1], ["fuzz", 3, 3], ["buzzer", 2, -1], ["knot", -3, -4], ["buzzer", -4, 0]]) D.spawn(k, x, z);
  }
}, scenario);
for (let shot = 0; shot < 3; shot++) {
  for (let chunk = 0; chunk < secs * 60 / 3 / 4; chunk++) await p.evaluate((chunk) => {
    const D = window.__dreamFixer, R = D.run, B = R.body;
    for (let j = 0; j < 4; j++) { const i = chunk * 4 + j;
      const f = R.foes.filter((f) => f.alive).sort((a, c) => Math.hypot(a.px - B.x, a.pz - B.z) - Math.hypot(c.px - B.x, c.pz - B.z))[0];
      if (f) { const dx = f.px - B.x, dy = f.cy - B.eyeY, dz = f.pz - B.z; B.yaw = Math.atan2(-dx, -dz); B.pitch = Math.atan2(dy, Math.hypot(dx, dz)); }
      D.steps(1, { fire: i % 40 < 20 });
    }
    return new Promise((r) => requestAnimationFrame(() => r()));
  }, chunk);
  await p.waitForTimeout(120);
  await p.screenshot({ path: `${out}-${shot}.png` });
}
const st = await p.evaluate(() => { const R = window.__dreamFixer.run; return { hp: Math.round(R.hp), dust: R.dust, foes: R.foes.length, popped: R.stats.popped, faints: R.faints }; });
console.log(JSON.stringify(st));
console.log(logs.slice(0, 15).join("\n"));
await b.close();
