import { DT } from "../config.js";
import { rng } from "../rng.js";
import { Nav } from "./nav.js";
import { Ranger } from "./player.js";
import { Ally } from "./ally.js";
import { Bug } from "./bugs.js";
import { Warden } from "./warden.js";
import { blast } from "./combat.js";
import { WEAPONS } from "../data/weapons.js";

// ── A mission being played ───────────────────────────────────────────────
// The level's static part (ground, solid world, walking grid) is built
// once; a Run is everything that moves: the ranger, Kessler, the bugs,
// projectiles, the objectives and the story script. A checkpoint is a
// small snapshot (script stage and flags, loadout, where you stood); a
// fall-back builds a fresh Run from it on the same level.

export const DIFFICULTY = {
  easy: { dmg: 0.6, allyDmg: 0.5, hp: 0.8 },
  normal: { dmg: 1, allyDmg: 0.8, hp: 1 },
  hard: { dmg: 1.35, allyDmg: 1, hp: 1.2 },
};

export class Run {
  // level: { kit, nav, script }, cp: a checkpoint (or null for a new start)
  constructor(level, cp = null, opts = {}) {
    this.level = level;
    this.kit = level.kit;
    this.space = level.kit.space;
    this.nav = level.nav ??= new Nav(this.space);
    this.script = level.script;
    this.diff = DIFFICULTY[opts.difficulty ?? "normal"];
    this.rng = rng(opts.seed ?? 7);
    this.time = 0;
    this.events = [];
    this.noises = [];
    this.bugs = [];
    this.shots = [];               // grenades and acid globs in flight
    this.puddles = [];             // acid on the ground
    this.uses = [];
    this.objectives = [];
    this.flags = {};
    this.lines = [];               // story lines waiting to be said
    this.cut = null;               // the cutscene playing
    this.stats = { kills: 0, shots: 0, spotted: 0, downs: 0, time: 0, logs: 0, ...(cp?.stats ?? {}) };
    this.over = null;              // "won" | "failed"
    this.cp = cp;
    this.groups = new Map();
    this.boss = null;
    this.saidAt = {};
    const s = cp?.at ?? this.kit.marks.start;
    this.player = new Ranger(s.x, this.space.floor(s.x, s.z, (s.y ?? 0) + 2) + 0.05, s.z, s.yaw ?? 0);
    const a = cp?.ally ?? { x: s.x + 1.6, z: s.z + 1.2 };
    this.ally = new Ally(a.x, this.space.floor(a.x, a.z, (s.y ?? 0) + 2) + 0.05, a.z, s.yaw ?? 0);
    for (const w of cp?.loadout ?? [{ id: "rifle" }, { id: "pistol" }]) {
      const g = this.player.give(w.id);
      if (w.reserve != null) g.reserve = w.reserve === "inf" ? Infinity : Math.max(w.reserve, WEAPONS[w.id].mag * 2);
    }
    this.player.cur = cp?.cur ?? 0;
    this.flags = { ...(cp?.flags ?? {}) };
    this.script.start(this, cp);
  }

  // ── Step ──────────────────────────────────────────────────────────────
  step(I) {
    const dt = DT;
    this.time += dt;
    if (this.over) return;
    if (this.cut) { this.#cutStep(I, dt); return; }
    this.stats.time += dt;
    const p = this.player;
    p.step(this, I, dt);
    this.ally.step(this, dt);
    // Bugs far off and minding their own business only potter about now and then.
    const far = (this.frame = (this.frame ?? 0) + 1) % 4;
    for (const b of this.bugs) {
      if (b.state === "idle" && !b.boss && Math.abs(b.x - p.body.x) + Math.abs(b.z - p.body.z) > 110) { if ((b.id & 3) === far) b.step(this, dt * 4); continue; }
      b.step(this, dt);
    }
    this.bugs = this.bugs.filter((b) => !b.gone);
    this.#shotsStep(dt);
    // Sounds reach the bugs at the end of the step.
    for (const n of this.noises) for (const b of this.bugs) b.hear(this, n);
    this.noises.length = 0;
    this.script.update(this, dt);
    if (p.body.fell) { p.hp = 0; p.downed = true; p.dead = true; }
    if (p.dead && !this.over) {
      this.stats.downs++;
      this.over = "failed";
      this.fx({ type: "failed" });
    }
  }

  // ── Events for the renderer, the sound and the HUD ──
  fx(e) { this.events.push(e); }
  drain() { const e = this.events; this.events = []; return e; }

  noise(x, z, r, src, loud = false) { this.noises.push({ x, z, r, src, loud }); }

  say(id, o = {}) {
    // The same line at most once in a while (barks), once ever for story.
    const last = this.saidAt[id];
    if (o.once && last != null) return;
    if (last != null && this.time - last < (o.gap ?? 20)) return;
    this.saidAt[id] = this.time;
    this.lines.push({ id, at: this.time, prio: o.prio ?? 0 });
  }

  // ── Bugs ──
  spawn(type, x, z, o = {}) {
    const y = this.space.floor(x, z, (o.y ?? this.space.terrain.height(x, z)) + 1) + 0.02;
    const b = type === "warden" ? new Warden(x, y, z, o) : new Bug(type, x, y, z, { ...o, hpMul: this.diff.hp });
    if (o.hunt === true) b.hunt(this, this.player, false);
    this.bugs.push(b);
    if (o.group) { const g = this.groups.get(o.group) ?? []; g.push(b); this.groups.set(o.group, g); }
    if (type === "warden") this.boss = b;
    return b;
  }

  // A group placed by the level: skipped when a checkpoint says it was wiped out.
  spawnGroup(name, list) {
    if (this.flags[`cleared_${name}`]) return;
    for (const [type, x, z, o] of list) this.spawn(type, x, z, { ...(o ?? {}), group: name });
  }
  groupAlive(name) { return (this.groups.get(name) ?? []).filter((b) => b.alive).length; }

  // A wave out of the burrows (by name), going for the ranger.
  wave(burrows, list, o = {}) {
    const holes = this.kit.burrows.filter((h) => burrows.includes(h.name));
    let i = 0;
    for (const [type, n] of list) for (let k = 0; k < n; k++) {
      const h = holes[i++ % holes.length];
      const a = this.rng() * Math.PI * 2, r = this.rng() * 1.5;
      this.spawn(type, h.x + Math.sin(a) * r, h.z + Math.cos(a) * r, { emerge: true, hunt: o.target ?? this.player, group: o.group });
    }
    for (const h of holes) this.fx({ type: "burrow", x: h.x, y: h.y, z: h.z });
  }

  alertBugs(x, z, r, target, from) {
    for (const b of this.bugs) {
      if (b === from || !b.alive || b.hidden || b.state === "hunt") continue;
      if (Math.hypot(b.x - x, b.z - z) > r) continue;
      if (b.type === "sentry") continue;
      b.called = true;
      b.hunt(this, target, false);
    }
  }

  onBugDeath(b, src) {
    this.stats.kills++;
    this.fx({ type: "bugDie", id: b.id, bug: b.type, x: b.x, y: b.y, z: b.z, boss: !!b.boss });
    if (src?.kind === "player") this.fx({ type: "kill", bug: b.type });
    // A group wiped out stays wiped out after a fall-back.
    for (const [name, list] of this.groups) if (list.includes(b) && list.every((g) => !g.alive)) this.flags[`cleared_${name}`] = true;
    this.script.onKill?.(this, b, src);
  }
  onEngage(b, target) { this.script.onEngage?.(this, b, target); }
  onSpotted(b, target) {
    this.stats.spotted++;
    // The shriek: everything near enough comes.
    for (const g of this.bugs) {
      if (g === b || !g.alive || g.hidden || g.type === "sentry") continue;
      if (Math.hypot(g.x - b.x, g.z - b.z) < 48) { g.called = true; g.hunt(this, target, false); }
    }
    this.noise(b.x, b.z, 30, b, false);
    this.say("kessler_spotted", { gap: 25 });
    this.script.onSpotted?.(this, b, target);
  }
  onWardenSummon(w, n) {
    const holes = this.kit.burrows.filter((h) => h.name.startsWith("pit"));
    for (let i = 0; i < n; i++) {
      const h = holes[i % holes.length];
      this.spawn(i % 3 === 2 && w.phase === 3 ? "spitter" : "swarmer", h.x + (this.rng() - 0.5) * 2, h.z + (this.rng() - 0.5) * 2, { emerge: true, hunt: this.player });
    }
    for (const h of holes) this.fx({ type: "burrow", x: h.x, y: h.y, z: h.z });
  }

  // ── Projectiles ──
  launchGrenade(src, x, y, z, dx, dy, dz, w) {
    this.shots.push({ kind: "grenade", src, x, y, z, vx: dx * w.speed, vy: dy * w.speed, vz: dz * w.speed, t: 0, w, id: this.time + Math.random() });
    this.stats.shots++;
  }

  // Acid: a lob that leads the target a little. spread: radians to the
  // side, size: bigger globs (the Warden's).
  spit(bug, T, spread = 0, size = 1) {
    const sy = bug.y + bug.def.height * 0.8, fx = -Math.sin(bug.face), fz = -Math.cos(bug.face);
    const sx = bug.x + fx * bug.def.radius, sz = bug.z + fz * bug.def.radius;
    const tx = T.body.x + T.body.vx * 0.5, tz = T.body.z + T.body.vz * 0.5, ty = T.body.y + 0.8;
    const dx = tx - sx, dz = tz - sz, dist = Math.hypot(dx, dz);
    const flight = 0.45 + dist / 26, g = 16;
    let vx = dx / flight, vz = dz / flight;
    const vy = (ty - sy + 0.5 * g * flight * flight) / flight;
    if (spread) { const c = Math.cos(spread), s = Math.sin(spread); [vx, vz] = [vx * c - vz * s, vx * s + vz * c]; }
    this.shots.push({ kind: "acid", src: bug, x: sx, y: sy, z: sz, vx, vy, vz, t: 0, g, size, dmg: (bug.def.spit ?? 18) * (size > 1 ? 1.1 : 1), id: this.time + Math.random() });
    this.fx({ type: "spit", x: sx, y: sy, z: sz, size });
  }

  #shotsStep(dt) {
    const keep = [];
    for (const s of this.shots) {
      s.t += dt;
      const g = s.kind === "grenade" ? 14 : s.g;
      const ox = s.x, oy = s.y, oz = s.z;
      s.vy -= g * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      const dx = s.x - ox, dy = s.y - oy, dz = s.z - oz, L = Math.hypot(dx, dy, dz) || 1e-6;
      const hit = this.space.ray(ox, oy, oz, dx / L, dy / L, dz / L, L, {});
      let boom = null;
      if (hit) boom = [ox + dx / L * hit.t, oy + dy / L * hit.t, oz + dz / L * hit.t];
      if (s.kind === "grenade") {
        // Bursts on a bug it touches, or on anything solid.
        for (const b of this.bugs) if (b.alive && !b.hidden && Math.hypot(b.x - s.x, b.y + b.def.height * 0.5 - s.y, b.z - s.z) < b.def.radius + 0.5) { boom = [s.x, s.y, s.z]; break; }
        if (boom || s.t > 4) {
          const [x, y, z] = boom ?? [s.x, s.y, s.z];
          blast(this, s.src, x, y, z, s.w.splash, s.w.dmg, s.w.blastNoise);
          continue;
        }
      } else {
        // Acid splashes whoever it reaches.
        let hitT = null;
        for (const t of [this.player, this.ally]) {
          if (t.downed) continue;
          const b = t.body;
          if (Math.hypot(b.x - s.x, b.z - s.z) < 0.6 * s.size + b.r && s.y > b.y && s.y < b.y + b.h + 0.2) { hitT = t; break; }
        }
        if (hitT) { hitT.hurt(this, s.dmg, s.src.x, s.src.z, "acid"); this.fx({ type: "acidHit", x: s.x, y: s.y, z: s.z }); continue; }
        if (boom || s.t > 5) {
          const [x, y, z] = boom ?? [s.x, s.y, s.z];
          this.puddles.push({ x, y, z, r: 1.1 * s.size, t: 4, id: s.id });
          this.fx({ type: "acidSplash", x, y, z, size: s.size, id: s.id });
          continue;
        }
      }
      keep.push(s);
    }
    this.shots = keep;
    // Puddles sting for a while.
    for (const p of this.puddles) {
      p.t -= dt;
      for (const t of [this.player, this.ally]) {
        if (t.downed || !t.body.grounded) continue;
        if (Math.hypot(t.body.x - p.x, t.body.z - p.z) < p.r && Math.abs(t.body.y - p.y) < 1) { p.sting = (p.sting ?? 0) + dt; if (p.sting > 0.5) { p.sting = 0; t.hurt(this, 4, p.x, p.z, "puddle"); } }
      }
    }
    this.puddles = this.puddles.filter((p) => p.t > 0);
  }

  // ── Use points ──
  // u: { id, x, y, z, r, label, hold, when(run), act(run), loud }
  addUse(u) { u.y ??= this.space.floor(u.x, u.z, this.space.terrain.height(u.x, u.z) + 0.4); this.uses.push(u); return u; }
  activate(u) {
    if (u.done) return;
    if (!u.repeat) u.done = true;
    this.fx({ type: "use", id: u.id, x: u.x, y: u.y, z: u.z });
    u.act(this, u);
  }

  // ── Objectives ──
  obj(id, o = {}) {
    let ob = this.objectives.find((q) => q.id === id);
    if (!ob) { ob = { id, done: false, ...o }; this.objectives.push(ob); this.fx({ type: "objNew", id }); }
    else Object.assign(ob, o);
    return ob;
  }
  objDone(id) {
    const ob = this.objectives.find((q) => q.id === id);
    if (!ob || ob.done) return;
    ob.done = true; ob.doneAt = this.time;
    this.fx({ type: "objDone", id });
  }
  // Finished objectives drop off the list after a moment.
  get openObjectives() { return this.objectives.filter((o) => !o.done || this.time - o.doneAt < 4); }

  // ── Checkpoints ──
  checkpoint(stage) {
    const p = this.player;
    this.cp = {
      stage, flags: { ...this.flags },
      at: { x: p.body.x, z: p.body.z, y: p.body.y, yaw: p.yaw },
      ally: { x: this.ally.body.x, z: this.ally.body.z },
      loadout: p.slots.map((g) => ({ id: g.id, reserve: g.reserve === Infinity ? "inf" : g.reserve + g.mag })),
      cur: p.cur,
      stats: { ...this.stats },
    };
    this.fx({ type: "checkpoint" });
    return this.cp;
  }

  // ── Cutscenes ──
  // shots: [{ dur, from: [x, y, z], to?: [x, y, z], look: [x, y, z], lookTo?, line?, act?(run) }]
  cutscene(name, shots, onEnd) {
    this.cut = { name, shots, i: 0, t: 0, onEnd };
    shots[0]?.act?.(this);
    if (shots[0]?.line) this.say(shots[0].line, { once: true });
    this.fx({ type: "cutStart", name });
  }
  #cutStep(I, dt) {
    const c = this.cut;
    c.t += dt;
    // The world keeps breathing (Kessler and the bugs idle in place).
    for (const b of this.bugs) if (b.hidden || b.act === "emerge") b.step(this, dt);
    const sh = c.shots[c.i];
    if (I.skipPressed && c.t > 0.4) { this.#cutEnd(true); return; }
    if (c.t >= sh.dur) {
      c.i++; c.t = 0;
      if (c.i >= c.shots.length) { this.#cutEnd(false); return; }
      const n = c.shots[c.i];
      n.act?.(this);
      if (n.line) this.say(n.line, { once: true });
    }
  }
  #cutEnd(skipped) {
    const c = this.cut;
    // Skipping still does what the rest of the shots would have done (but
    // their lines are dropped).
    if (skipped) for (let i = c.i + 1; i < c.shots.length; i++) c.shots[i].act?.(this);
    this.cut = null;
    this.fx({ type: "cutEnd", name: c.name, skipped });
    c.onEnd?.(this);
  }
  // Where the cutscene camera is now: { x, y, z, lx, ly, lz }.
  cutCamera() {
    const c = this.cut;
    if (!c) return null;
    const sh = c.shots[c.i], k = Math.min(1, c.t / sh.dur), e = k * k * (3 - 2 * k);
    const L = (a, b) => (b ? a.map((v, i) => v + (b[i] - v) * e) : a);
    const f = typeof sh.from === "function" ? sh.from(this) : sh.from, t = typeof sh.to === "function" ? sh.to(this) : sh.to;
    const l = typeof sh.look === "function" ? sh.look(this) : sh.look, lt = typeof sh.lookTo === "function" ? sh.lookTo(this) : sh.lookTo;
    const p = L(f, t), q = L(l, lt);
    return { x: p[0], y: p[1], z: p[2], lx: q[0], ly: q[1], lz: q[2] };
  }

  win() { if (!this.over) { this.over = "won"; this.fx({ type: "won" }); } }
}
