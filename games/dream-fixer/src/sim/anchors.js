// ── Dream anchors ────────────────────────────────────────────────────────
// Three anchors hold a dream together, and all three are broken. Walk up
// to one and press use to start tuning it; the tuning runs while you stay
// inside its ring, and the glitches it shakes loose come at you in waves.
// When it is done the anchor sends out a calm pulse that smooths out every
// glitch of its waves, and becomes your checkpoint.

export const USE_RANGE = 2.6;

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
    if (a.progress >= 1) fix(run, a);
  }
}

export function startTuning(run, a) {
  if (a.state !== "broken") return false;
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
      run.spawn(kind, p[0] + j, p[1] - j, { group: a.id });
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
  run.hp = Math.max(run.hp, 100);
  // The Factory sends the Fuzz Vacuum down after the first anchor.
  if (run.def.unlockAfterFirst && run.anchors.filter((o) => o.state === "fixed").length === 1) run.pendingUnlock = run.def.unlockAfterFirst;
  run.events.push({ type: "anchorFixed", anchor: a.id, x: a.x, y: a.y, z: a.z, left: run.anchors.filter((o) => o.state !== "fixed").length });
}
