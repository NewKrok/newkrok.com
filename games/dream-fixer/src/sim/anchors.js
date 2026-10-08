// ── Dream anchors ────────────────────────────────────────────────────────
// Three anchors hold a dream together, and all three are broken. Walk up
// to one and press use to start tuning it; the tuning runs while you stay
// inside its ring, and the glitches it shakes loose come at you in waves.
// Once it is tuned it holds until you have beaten what its waves brought
// and stand inside its ring again; then it sends out a calm pulse that smooths
// out any straggler and becomes your checkpoint.

export const USE_RANGE = 2.6;
// Tuned, waiting for its waves to be beaten: glitches farther out than this
// past the ring do not count (stuck somewhere), and after `time` seconds
// (in the ring) it gives up waiting.
const HOLD = { reach: 25, time: 45 };

export class Anchor {
  constructor(def) {
    this.id = def.id;
    this.x = def.x; this.y = def.y; this.z = def.z;
    this.ring = def.ring ?? 6.5;
    this.duration = def.duration ?? 26;
    this.waves = (def.waves ?? []).map((w) => ({ at: w[0], foes: w.slice(1), done: false }));
    this.spawns = def.spawns ?? [];
    this.state = "broken";          // broken → tuning → fixed
    this.progress = 0;
    this.inside = false;
    this.left = 0;                  // tuned: glitches of its waves still about
    this.holdT = 0;
    this.t = 0;
  }
}

export function stepAnchors(run, dt) {
  const b = run.body;
  run.nearAnchor = null;
  for (const a of run.anchors) {
    a.t += dt;
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const dy = Math.abs(b.y - a.y);
    if (a.state === "broken") {
      if (d < USE_RANGE && dy < 2) run.nearAnchor = a;
      continue;
    }
    if (a.state !== "tuning") continue;
    a.inside = d < a.ring && dy < 2.5;
    if (a.inside) a.progress = Math.min(1, a.progress + dt / a.duration);
    for (const w of a.waves) {
      if (w.done || a.progress < w.at) continue;
      w.done = true;
      spawnWave(run, a, w);
      run.events.push({ type: "wave", anchor: a.id });
    }
    if (a.progress < 1) continue;
    a.left = run.foes.filter((f) => f.alive && f.group === a.id && Math.hypot(f.px - a.x, f.pz - a.z) < a.ring + HOLD.reach).length;
    if (a.inside && (!a.left || (a.holdT += dt) > HOLD.time)) fix(run, a);
    else if (a.left && !a.held && (a.held = true)) run.events.push({ type: "anchorHold", anchor: a.id });
  }
}

export function startTuning(run, a) {
  if (a.state !== "broken") return false;
  // Waves by how far along you are (the level's tiers), if it has them.
  const tiers = run.def.tiers;
  if (tiers) a.waves = tiers[Math.min(run.fixedCount, tiers.length - 1)].map((w) => ({ at: w[0], foes: w.slice(1), done: false }));
  a.state = "tuning";
  a.t = 0;
  run.events.push({ type: "tuneStart", anchor: a.id });
  return true;
}

function spawnWave(run, a, w) {
  const b = run.body;
  // Spawn points out of your face: prefer the farther ones.
  const pts = a.spawns.map((p) => ({ p, d: Math.hypot(p[0] - b.x, p[1] - b.z) })).filter((q) => q.d > 5);
  const list = (pts.length ? pts : a.spawns.map((p) => ({ p, d: 0 }))).sort((q, r) => r.d - q.d);
  let k = Math.floor(run.rnd() * Math.min(2, list.length));
  for (const [kind, n] of w.foes) {
    for (let i = 0; i < n; i++) {
      const p = list[k % list.length].p; k++;
      const j = (run.rnd() - 0.5) * 1.6;
      // (On the floor round the anchor: not on a table over it.)
      run.spawn(kind, p[0] + j, p[1] - j, { group: a.id, y: run.kit.floorAt(p[0] + j, p[1] - j, a.y + 2) });
    }
  }
}

function fix(run, a) {
  a.state = "fixed";
  a.progress = 1;
  a.t = 0;
  // The calm pulse: every glitch this anchor shook loose is smoothed out.
  for (const f of run.foes) if (f.alive && f.group === a.id) {
    f.alive = false;
    run.events.push({ type: "pop", kind: f.kind, id: f.id, x: f.px, y: f.cy, z: f.pz, big: false, calm: true });
    run.dropDust(f.px, f.cy, f.pz, 1);
  }
  run.dropDust(a.x, a.y + 1.8, a.z, 16);
  run.checkpoint = { x: a.x, y: a.y, z: a.z + 2.2, yaw: run.body.yaw };
  run.checkpoint.y = run.kit.floorAt(run.checkpoint.x, run.checkpoint.z, a.y + 1);
  run.hp = Math.max(run.hp, run.maxHp);
  // The Factory may send a new tool down once enough anchors hold.
  const U = run.def.unlockTool;
  if (U && run.fixedCount === U.anchors) run.pendingUnlock = U.id;
  run.events.push({ type: "anchorFixed", anchor: a.id, x: a.x, y: a.y, z: a.z, left: run.anchors.filter((o) => o.state !== "fixed").length });
}
