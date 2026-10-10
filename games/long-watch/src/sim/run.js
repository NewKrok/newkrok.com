import { DT } from "../config.js";
import { rng } from "../rng.js";
import { Nav } from "./nav.js";
import { Ranger } from "./player.js";
import { Ally } from "./ally.js";
import { Bug } from "./bugs.js";
import { Warden } from "./warden.js";
import { blast } from "./combat.js";
import { WEAPONS } from "../data/weapons.js";

// ── A run ────────────────────────────────────────────────────────────────
// The level's static part (ground, solid world, walking grid) is built
// once; a Run is everything that moves: the ranger, the defenders, the
// reactor, the bugs, projectiles, pickups and the mode's script. A run is
// one sitting: no checkpoints, no saves.

export const DIFFICULTY = {
  easy: { dmg: 0.6, allyDmg: 0.5, hp: 0.8 },
  normal: { dmg: 1, allyDmg: 0.8, hp: 1 },
  hard: { dmg: 1.35, allyDmg: 1, hp: 1.2 },
};

export class Run {
  // level: { kit, nav, script }
  constructor(level, opts = {}) {
    this.level = level;
    this.kit = level.kit;
    this.space = level.kit.space;
    this.nav = level.nav ??= new Nav(this.space);
    this.script = level.script;
    this.diff = DIFFICULTY[opts.difficulty ?? "normal"];
    this.seed = opts.seed ?? (Date.now() % 100000);
    this.rng = rng(this.seed);
    this.time = 0;
    this.events = [];
    this.noises = [];
    this.bugs = [];
    this.shots = [];               // grenades and acid globs in flight
    this.puddles = [];             // acid on the ground
    this.uses = [];
    this.objectives = [];
    this.flags = {};
    this.lines = [];               // radio lines waiting to be said
    this.cut = null;               // a cutscene playing (unused by the siege, kept for the camera rails)
    this.stats = { kills: 0, shots: 0, downs: 0, time: 0, waves: 0, crystals: 0 };
    this.over = null;              // "failed" (the reactor is gone)
    this.groups = new Map();
    this.boss = null;
    this.saidAt = {};
    this.allies = [];
    this.drones = [];
    this.turrets = [];
    this.core = null;
    this.bank = 0;                 // crystals: yours the moment you pick them up, spent at the stations
    const s = this.kit.marks.start;
    this.player = new Ranger(s.x, this.space.floor(s.x, s.z, (s.y ?? 0) + 2) + 0.05, s.z, s.yaw ?? 0);
    for (const id of opts.loadout ?? ["rifle", "pistol"]) this.player.give(id);
    this.player.cur = 0;
    this.script.start(this, opts);
  }

  get ally() { return this.allies[0]; }
  weaponDef(id) { return WEAPONS[id]; }
  hasDrone(type) { return this.drones.some((d) => d.type === type); }
  // Everyone the bugs may go for: the ranger, the defenders, the reactor.
  foes() { return this._foes ??= [this.player, ...this.allies, ...(this.core ? [this.core] : [])]; }
  // A defender near a point (for the bugs' feel and the revive).
  addAlly(x, z, o) {
    const a = new Ally(x, this.space.floor(x, z, this.kit.h(x, z) + 2) + 0.05, z, o.yaw ?? 0, o);
    a.idx = this.allies.length;
    this.allies.push(a);
    this._foes = null;
    return a;
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
    for (const a of this.allies) a.step(this, dt);
    for (const d of this.drones) d.step(this, dt);
    for (const u of this.turrets) u.step(this, dt);
    if (this.core) this.core.hitT -= dt;
    // Bugs far off and minding their own business only potter about now and then.
    const far = (this.frame = (this.frame ?? 0) + 1) % 4;
    for (const b of this.bugs) {
      if ((b.state === "idle" || b.state === "patrol") && !b.boss && Math.abs(b.x - p.body.x) + Math.abs(b.z - p.body.z) > 110) { if ((b.id & 3) === far) b.step(this, dt * 4); continue; }
      b.step(this, dt);
    }
    this.bugs = this.bugs.filter((b) => !b.gone);
    // The ranger does not walk through bugs either.
    if (!p.downed) for (const g of this.bugs) {
      if (!g.alive || g.hidden || g.def.fly) continue;
      const dx = p.body.x - g.x, dz = p.body.z - g.z, dd = Math.hypot(dx, dz), min = g.def.radius + p.body.r;
      if (dd < min && Math.abs(p.body.y - g.y) < 1.5 && dd > 1e-4) { p.body.x += dx / dd * (min - dd) * 0.6; p.body.z += dz / dd * (min - dd) * 0.6; }
    }
    this.#shotsStep(dt);
    // Sounds reach the bugs at the end of the step.
    for (const n of this.noises) for (const b of this.bugs) b.hear(this, n);
    this.noises.length = 0;
    this.script.update(this, dt);
    if (p.body.fell) { p.hp = 0; p.downed = true; p.dead = true; }
    if (p.dead && !this.over) {
      this.stats.downs++;
      p.dead = false;
      if (this.script.onDead) this.script.onDead(this);
      else { this.over = "failed"; this.fx({ type: "failed" }); }
    }
  }

  // ── Events for the renderer, the sound and the HUD ──
  fx(e) { this.events.push(e); }
  drain() { const e = this.events; this.events = []; return e; }

  noise(x, z, r, src, loud = false) { this.noises.push({ x, z, r, src, loud }); }

  say(id, o = {}) {
    // The same line at most once in a while (barks), once ever with `once`.
    const last = this.saidAt[id];
    if (o.once && last != null) return;
    if (last != null && this.time - last < (o.gap ?? 20)) return;
    this.saidAt[id] = this.time;
    this.lines.push({ id, at: this.time, prio: o.prio ?? 0 });
  }

  // ── Bugs ──
  spawn(type, x, z, o = {}) {
    const y = this.space.floor(x, z, (o.y ?? this.space.terrain.height(x, z)) + 1) + 0.02;
    const b = type === "warden" ? new Warden(x, y, z, { ...o, hpMul: this.diff.hp * (o.hpMul ?? 1) }) : new Bug(type, x, y, z, { ...o, hpMul: this.diff.hp * (o.hpMul ?? 1) });
    if (o.hunt === true) b.hunt(this, this.player, false);
    this.bugs.push(b);
    if (o.group) { const g = this.groups.get(o.group) ?? []; g.push(b); this.groups.set(o.group, g); }
    if (type === "warden") this.boss = b;
    return b;
  }
  spawnGroup(name, list) {
    for (const [type, x, z, o] of list) this.spawn(type, x, z, { ...(o ?? {}), group: name });
  }
  groupAlive(name) { return (this.groups.get(name) ?? []).filter((b) => b.alive).length; }
  get alive() { return this.bugs.filter((b) => b.alive).length; }

  // A wave out of the burrows (by name), going for `target` (the reactor by default).
  wave(burrows, list, o = {}) {
    const holes = this.kit.burrows.filter((h) => burrows.includes(h.name));
    if (!holes.length) return;
    let i = 0;
    for (const [type, n] of list) for (let k = 0; k < n; k++) {
      const h = holes[i++ % holes.length];
      const a = this.rng() * Math.PI * 2, r = this.rng() * 2;
      this.spawn(type, h.x + Math.sin(a) * r, h.z + Math.cos(a) * r, { emerge: true, hunt: o.target ?? this.core ?? this.player, group: o.group, hpMul: o.hpMul });
    }
    for (const h of holes) this.fx({ type: "burrow", x: h.x, y: h.y, z: h.z });
  }

  // A random open spot on the walking grid, `rMin`…`rMax` from (cx, cz).
  // `pad`: metres of open ground wanted all round (for things that must be reachable).
  openSpot(cx, cz, rMin, rMax, tries = 40, pad = 0) {
    for (let i = 0; i < tries; i++) {
      const a = this.rng() * Math.PI * 2, r = rMin + this.rng() * (rMax - rMin);
      const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      if (Math.abs(x) > this.nav.margin || Math.abs(z) > this.nav.margin) continue;
      if (!this.nav.isOpen(x, z)) continue;
      if (this.kit.h(x, z) > 12) continue;
      if (pad && ![[pad, 0], [-pad, 0], [0, pad], [0, -pad]].every(([dx, dz]) => this.nav.isOpen(x + dx, z + dz))) continue;
      return { x, z };
    }
    return null;
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
    this.script.onKill?.(this, b, src);
  }
  onEngage(b, target) { this.script.onEngage?.(this, b, target); }
  onSpotted(b, target) {
    for (const g of this.bugs) {
      if (g === b || !g.alive || g.hidden || g.type === "sentry") continue;
      if (Math.hypot(g.x - b.x, g.z - b.z) < 48) { g.called = true; g.hunt(this, target, false); }
    }
    this.noise(b.x, b.z, 30, b, false);
    this.script.onSpotted?.(this, b, target);
  }
  onWardenSummon(w, n) {
    // Out of the burrows nearest the Warden.
    const holes = this.kit.burrows.map((h) => [h, Math.hypot(h.x - w.x, h.z - w.z)]).sort((a, b) => a[1] - b[1]).slice(0, 2).map((h) => h[0]);
    for (let i = 0; i < n; i++) {
      const h = holes[i % holes.length];
      this.spawn(i % 3 === 2 && w.phase === 3 ? "spitter" : "swarmer", h.x + (this.rng() - 0.5) * 2, h.z + (this.rng() - 0.5) * 2, { emerge: true, hunt: this.player });
    }
    for (const h of holes) this.fx({ type: "burrow", x: h.x, y: h.y, z: h.z });
  }

  // ── Crystals ──
  // A pickup on the ground; the ranger takes it by walking over it.
  dropCrystal(x, z, n, y = null) {
    if (n <= 0) return;
    const u = this.addUse({ id: `cr${this.time.toFixed(2)}_${Math.round(x)}_${Math.round(z)}`, x, z, y: y ?? undefined, r: 1.7, auto: true, model: "crystal", amount: n, label: () => ["use_crystal"], act: (r) => {
      r.bank += n; r.stats.crystals += n;
      r.fx({ type: "crystal", n, x, z, total: r.bank });
    } });
    u.born = this.time;
    return u;
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
    const foes = this.foes();
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
        for (const b of this.bugs) if (b.alive && !b.hidden && Math.hypot(b.x - s.x, b.y + b.def.height * 0.5 - s.y, b.z - s.z) < b.def.radius + 0.5) { boom = [s.x, s.y, s.z]; break; }
        if (boom || s.t > 4) {
          const [x, y, z] = boom ?? [s.x, s.y, s.z];
          blast(this, s.src, x, y, z, s.w.splash, s.w.dmg, s.w.blastNoise);
          continue;
        }
      } else {
        // Acid splashes whoever it reaches (the reactor too).
        let hitT = null;
        for (const t of foes) {
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
      for (const t of foes) {
        if (t.kind === "core" || t.downed || !t.body.grounded) continue;
        if (Math.hypot(t.body.x - p.x, t.body.z - p.z) < p.r && Math.abs(t.body.y - p.y) < 1) { p.sting = (p.sting ?? 0) + dt; if (p.sting > 0.5) { p.sting = 0; t.hurt(this, 4, p.x, p.z, "puddle"); } }
      }
    }
    this.puddles = this.puddles.filter((p) => p.t > 0);
  }

  // ── Use points ──
  // u: { id, x, y, z, r, label, hold, when(run), act(run), loud, auto, model }
  addUse(u) { u.y ??= this.space.floor(u.x, u.z, this.space.terrain.height(u.x, u.z) + 0.4); this.uses.push(u); return u; }
  activate(u) {
    if (u.done) return;
    if (!u.repeat) u.done = true;
    this.fx({ type: "use", id: u.id, x: u.x, y: u.y, z: u.z });
    u.act(this, u);
    if (u.done) this.uses = this.uses.filter((q) => q !== u);
  }

  // ── Objectives (markers on the HUD) ──
  obj(id, o = {}) {
    let ob = this.objectives.find((q) => q.id === id);
    if (!ob) { ob = { id, done: false, ...o }; this.objectives.push(ob); }
    else Object.assign(ob, o);
    return ob;
  }
  objDone(id) {
    const ob = this.objectives.find((q) => q.id === id);
    if (!ob || ob.done) return;
    ob.done = true; ob.doneAt = this.time;
  }
  get openObjectives() { return this.objectives.filter((o) => !o.done && !o.hidden); }

  // ── Cutscenes (camera rails) ──
  cutscene(name, shots, onEnd) {
    this.cut = { name, shots, i: 0, t: 0, onEnd };
    shots[0]?.act?.(this);
    if (shots[0]?.line) this.say(shots[0].line, { once: true });
    this.fx({ type: "cutStart", name });
  }
  #cutStep(I, dt) {
    const c = this.cut;
    c.t += dt;
    for (const b of this.bugs) if (b.hidden || b.act === "emerge") b.step(this, dt);
    const sh = c.shots[c.i];
    if (I.skipPressed && c.t > 0.2) { this.#cutEnd(true); return; }
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
    if (skipped) for (let i = c.i + 1; i < c.shots.length; i++) c.shots[i].act?.(this);
    this.cut = null;
    this.fx({ type: "cutEnd", name: c.name, skipped });
    c.onEnd?.(this);
  }
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

  fail() { if (!this.over) { this.over = "failed"; this.fx({ type: "failed" }); } }
}
