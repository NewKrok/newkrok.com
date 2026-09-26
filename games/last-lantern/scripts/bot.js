// Headless balance bot: plays a stage with a simple survival policy (run
// from the crowd, drift toward gems, take the first card) and prints what
// happened. `npm run bot -- <stage> <hero> [seed] [blood]`
import { createRun, runSummary } from "../src/sim/run.js";

const [stageArg = "0", hero = "wren", seedArg = "1", bloodArg] = process.argv.slice(2);
const hearth = JSON.parse(process.env.HEARTH || "{}");
const R = createRun({ stageIndex: Number(stageArg), heroId: hero, seed: Number(seedArg), blood: bloodArg === "blood", hearth });

function policy() {
  // Sample 16 headings; score each by the crowd near where it leads, the
  // walls, hazards, and a pull toward gems. Take the best.
  const hx = R.hero.body.position.x, hy = R.hero.body.position.y;
  const { W, H } = R.world;
  let best = -1e9, bx = 0, by = 0;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    let score = 0;
    for (const L of [60, 130]) {
      const px = hx + dx * L, py = hy + dy * L;
      if (px < 60 || py < 60 || px > W - 60 || py > H - 60) score -= 40;
      for (const o of R.world.obstacles) {
        const rr = (o.r ?? Math.max(o.w, o.h) / 2) + 22;
        if (Math.abs(o.x - px) < rr && Math.abs(o.y - py) < rr) score -= L === 60 ? 30 : 10;
      }
      for (const m of R.monsters) {
        if (!m.alive || m.def.prop) continue;
        const ex = m.body.position.x - px, ey = m.body.position.y - py, d2 = ex * ex + ey * ey;
        if (d2 < 150 * 150) score -= (m.def.boss ? 6 : m.def.elite ? 3 : 1) * (1 - Math.sqrt(d2) / 150) * (L === 60 ? 1.5 : 1);
      }
      for (const z of R.zones) if (z.kind === "fire" || z.kind === "mud") { if (Math.hypot(z.x - px, z.y - py) < z.r) score -= z.kind === "fire" ? 8 : 2; }
      for (const z of R.hazards) if (Math.hypot(z.x - px, z.y - py) < 60) score -= 10;
    }
    for (const g of R.gems) { const d = Math.hypot(g.x - hx - dx * 60, g.y - hy - dy * 60); if (d < 200) score += 0.15 * (1 - d / 200) * Math.min(5, g.xp); }
    for (const p of R.pickups) { const d = Math.hypot(p.x - hx - dx * 60, p.y - hy - dy * 60); if (d < 300) score += 2 * (1 - d / 300); }
    // A mild pull to the middle keeps it out of corners.
    score -= (Math.abs(hx + dx * 100 - W / 2) / W + Math.abs(hy + dy * 100 - H / 2) / H) * 3;
    if (score > best) { best = score; bx = dx; by = dy; }
  }
  return { mx: bx, my: by };
}

const t0 = Date.now();
let lastMin = -1;
while (R.phase !== "dead" && R.phase !== "won" && R.frame < 60 * 60 * 14) {
  if (R.phase === "levelup") { R.pickCard(0); continue; }
  if (R.phase === "chest") { R.closeChest(); continue; }
  const input = policy();
  let near = 0;
  for (const m of R.monsters) if (m.alive && !m.def.prop && Math.hypot(m.body.position.x - R.hero.body.position.x, m.body.position.y - R.hero.body.position.y) < 140) near++;
  if (near > 12) R.useActive();
  R.step(input);
  R.sfx.length = 0;
  if (process.env.GOD) R.hero.hp = R.hero.maxHp;
  if (R.boss?.alive && R.frame % 1800 === 0) console.log(`  boss ${Math.round(R.boss.hp)}/${Math.round(R.boss.maxHp)} at ${(R.clock / 60).toFixed(0)}s`);
  const min = Math.floor(R.clock / 3600);
  if (min !== lastMin) {
    lastMin = min;
    console.log(`${min}:00 lv ${R.hero.level} hp ${Math.round(R.hero.hp)}/${R.hero.maxHp} alive ${R.monsters.filter((m) => m.alive).length} kills ${R.kills} embers ${R.embers} weapons ${R.hero.weapons.map((w) => w.id + w.level).join(",")}`);
  }
}
const s = runSummary(R);
console.log(JSON.stringify({ ...s, boss: R.boss ? Math.round(R.boss.hp) + "/" + Math.round(R.boss.maxHp) : null }, null, 0));
console.log(`ms per step ${((Date.now() - t0) / R.frame).toFixed(2)}`);
