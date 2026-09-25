// Sanity checks for every level, run headless in Node:
//   - the rig, parked cars and cones start clear of each other and of walls
//   - nothing stands inside the target bay
//   - the trailer's load bed fits the bay
// Usage: npm run check-levels
import { Vec2 } from "@newkrok/nape-js";
import { LEVELS } from "../src/levels.js";
import { createSim } from "../src/sim.js";
import { M, TRAILERS } from "../src/config.js";

let failed = 0;
const sim = createSim();
for (const lvl of LEVELS) {
  const problems = [];
  sim.load(lvl);
  const bay = lvl.bay;
  const t = TRAILERS[lvl.trailer];
  if (t.len * M > bay.l - 4) problems.push(`bay too short for ${lvl.trailer} (${(t.len * M).toFixed(1)} vs ${bay.l})`);
  if (t.wid * M > bay.w - 4) problems.push(`bay too narrow for ${lvl.trailer} (${(t.wid * M).toFixed(1)} vs ${bay.w})`);

  // Bay must be empty.
  const ca = Math.cos(bay.a), sa = Math.sin(bay.a);
  const hits = new Set();
  for (let u = -bay.l / 2 + 1; u <= bay.l / 2 - 1; u += 3) {
    for (let v = -bay.w / 2 + 1; v <= bay.w / 2 - 1; v += 3) {
      const x = bay.x + u * ca - v * sa, y = bay.y + u * sa + v * ca;
      if (x < 0 || y < 0 || x > lvl.w || y > lvl.h) { hits.add("outside the site"); continue; }
      const list = sim.space.bodiesUnderPoint(new Vec2(x, y));
      for (let i = 0; i < list.length; i++) {
        const b = list.at(i);
        if (b.userData._veh) continue;
        const d = b.userData._static ?? (b.userData._parked ? { kind: "parked " + b.userData._parked.type } : b.userData._cone ? { kind: "cone" } : { kind: "?" });
        hits.add(`${d.kind}@${Math.round(b.position.x)},${Math.round(b.position.y)}`);
      }
    }
  }
  if (hits.size) problems.push("bay not clear: " + [...hits].join(", "));

  // Start clear: nothing may move while everything sits braked.
  const pos0 = (b) => ({ b, x: b.position.x, y: b.position.y, a: b.rotation });
  const tracked = [
    { name: "car", ...pos0(sim.veh.chassis) },
    { name: "trailer", ...pos0(sim.veh.trailer.body) },
    ...sim.parked.map((p) => ({ name: `parked ${p.type}@${Math.round(p.x0)},${Math.round(p.y0)}`, ...pos0(p.body) })),
    ...sim.cones.map((c) => ({ name: `cone@${Math.round(c.body.position.x)},${Math.round(c.body.position.y)}`, ...pos0(c.body) })),
  ];
  for (let i = 0; i < 90; i++) sim.step({ throttle: 0, steer: 0, brake: true });
  for (const tr of tracked) {
    const d = Math.hypot(tr.b.position.x - tr.x, tr.b.position.y - tr.y);
    if (d > 0.6) problems.push(`${tr.name} moved ${d.toFixed(1)} px at rest (overlap)`);
  }

  const tag = `${String(lvl.index + 1).padStart(2)} ${lvl.id.padEnd(10)} ${lvl.title}`;
  if (problems.length) { failed++; console.log(`✗ ${tag}\n    - ${problems.join("\n    - ")}`); }
  else console.log(`✓ ${tag}`);
}
console.log(failed ? `\n${failed} level(s) with problems` : `\nAll ${LEVELS.length} levels OK`);
process.exit(failed ? 1 : 0);
