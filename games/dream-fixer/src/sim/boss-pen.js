import { GLITCH } from "../config.js";
import { Body } from "./player.js";

// ── The Red Pen (Ethan's nightmare) ───────────────────────────────────────
// Comes up through the gym floor once the three anchors hold: a teacher's
// red pen as tall as a door, marking everything wrong.
//
//  roam      hops about the gym on its nib, keeping a few metres off
//  strike    lines up on you (a faint guide shows the way), then dashes
//            right through, drawing a red line on the floor behind it.
//            Ink on the floor burns your feet for a while: step or jump
//            over it, don't stand in it
//  grade     flicks a fan of red grades at you (shootable)
//  correct   circles spots round you in red; a moment later a glitch
//            pops out of each (and standing in one when it closes hurts)
//  tired     after every few attacks it stops, nib down, out of breath:
//            the only time foam sticks to its nib
//  (phase two, below half) faster, a strike runs twice, and it scribbles:
//            spins on the spot, sending out rings of ink to jump
//
// Foam on its nib gums it up: enough of it and the pen is blotted, falls
// over and lies there for a while, taking more from everything (the cap
// end most of all). Only while it is tired, though: otherwise its nib is
// dry and hard and foam does not stick. Shots anywhere hurt it.

export const PEN = {
  hp: 110, r: 0.7, h: 3.2, len: 3.1,
  speed: [3, 4.2],
  strike: { aim: 0.85, speed: 17, max: 1.4, ink: [6, 8], burn: 6, every: 0.7, w: 0.42 },
  grade: { n: [3, 5], spread: 0.22, speed: 10, dmg: 6 },
  correct: { n: 3, T: 1.3, r: 1.3, dmg: 8, minions: 3 },
  scribble: { rings: 2, gap: 0.7, dmg: 9 },
  blot: { need: 1, dry: 0.12, time: 5, mul: 2.5 },
  tired: { every: [3, 4], time: 4 },    // attacks between rests; how long it rests
  capMul: 1.8, nibMul: 1.2,
};

export class PenBoss {
  kind = "pen";

  constructor(run, x, z, arena) {
    const y = run.kit.floorAt(x, z);
    this.body = new Body(x, y, z, { radius: PEN.r, height: PEN.h, step: 0.5, speed: PEN.speed[0], accel: 14, jump: 0 });
    this.body.grounded = true;
    this.arena = arena;
    this.hp = this.maxHp = PEN.hp * GLITCH.hp;
    this.phase = 1;
    this.state = "rise"; this.t = 0;
    this.yaw = 0;
    this.tilt = 0;               // 0 upright … π/2 lying on the floor
    this.rise = 0;
    this.flash = 0;
    this.cd = 2;
    this.ink = 0;                // foam on the nib
    this.attacks = 0;            // since its last rest
    this.tiredAfter = PEN.tired.every[0];
    this.lines = [];             // ink on the floor: { x0, z0, x1, z1, y, t, life, hitT }
    this.circles = [];           // corrections closing: { x, y, z, t, T, kind }
    this.guide = null;           // where a strike is about to run
    this.alive = true;
    this.lx = x; this.ly = y; this.lz = z;
    this.pose();
  }

  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  get invulnerable() { return this.state === "rise" || this.state === "roar" || this.state === "down"; }

  set(s) { this.state = s; this.t = 0; }

  // The nib on the floor, the pen standing up from it (tilted along its yaw).
  pose() {
    const b = this.body, sn = Math.sin(this.tilt), cs = Math.cos(this.tilt);
    this.axis = [-Math.sin(this.yaw) * sn, cs, -Math.cos(this.yaw) * sn];
    this.nib = [b.x, b.y + 0.15, b.z];
  }
  at(t) { const n = this.nib, a = this.axis; return [n[0] + a[0] * t, n[1] + a[1] * t + (this.tilt > 1 ? 0.45 : 0), n[2] + a[2] * t]; }

  // [x, y, z, r, damage multiplier, part]
  hitSpheres() {
    const k = this.state === "blotted" ? PEN.blot.mul : 1;
    return [
      [...this.at(0.3), 0.45, PEN.nibMul * k, "nib"],
      [...this.at(1.2), 0.62, k, "body"],
      [...this.at(2.1), 0.62, k, "body"],
      [...this.at(2.9), 0.55, PEN.capMul * k, "cap"],
    ];
  }

  damage(run, dmg, part) {
    if (this.invulnerable || !this.alive) return false;
    this.hp -= dmg;
    this.flash = 1;
    run.events.push({ type: "bossHit", part: part === "cap" ? "bag" : part, dmg });
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.body.P.speed = PEN.speed[1];
      if (this.state !== "blotted") this.set("roar");
      run.events.push({ type: "bossPhase", phase: 2, kind: this.kind });
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.set("down");
      this.lines.length = 0; this.circles.length = 0; this.guide = null;
      for (const f of run.foes) if (f.alive && f.group === "boss") { f.alive = false; run.events.push({ type: "pop", kind: f.kind, id: f.id, x: f.px, y: f.cy, z: f.pz, calm: true }); }
      run.events.push({ type: "bossDown" });
    }
    return true;
  }

  // Foam from the Foam Cannon: on the nib it gums it up.
  foamed(run, amount, part) {
    if (!this.alive || this.invulnerable || this.state === "blotted") return;
    if (this.state !== "tired") { if (part === "nib") run.events.push({ type: "lockClink", x: this.x, y: this.y + 0.5, z: this.z }); return; }
    if (part !== "nib") { this.soggy = Math.min(1, (this.soggy || 0) + amount * 0.3); return; }
    this.ink += amount;
    if (this.ink >= PEN.blot.need) {
      this.ink = 0; this.guide = null;
      this.set("blotted");
      run.events.push({ type: "penBlot", x: this.x, y: this.y + 0.5, z: this.z });
    }
  }

  // A yarn ball, a pillow: a hit like any other.
  ballHit(run, g) {
    if (!this.alive) return false;
    for (const [x, y, z, r, mul, part] of this.hitSpheres()) {
      if ((g.x - x) ** 2 + (g.y - y) ** 2 + (g.z - z) ** 2 < (r + 0.3) ** 2) {
        this.damage(run, g.dmg * 1.5 * mul, part);
        run.events.push({ type: "ballPop", kind: g.kind, x: g.x, y: g.y, z: g.z });
        return true;
      }
    }
    return false;
  }

  step(run, dt) {
    const b = this.body, P = run.body;
    this.lx = b.x; this.ly = b.y; this.lz = b.z;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.cd -= dt;
    this.ink = Math.max(0, this.ink - PEN.blot.dry * dt);
    this.soggy = Math.max(0, (this.soggy || 0) - dt * 0.1);
    const dx = P.x - b.x, dz = P.z - b.z, dist = Math.hypot(dx, dz) || 0.01;
    const toYou = Math.atan2(-dx, -dz);
    const turn = (want, rate) => { const d = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)); this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); };
    const intent = { forward: 0, strafe: 0 };
    let speedMul = 1 - 0.4 * this.soggy, tilt = 0.12;
    switch (this.state) {
      case "rise":
        this.rise = Math.min(1, this.t / 2.6);
        if (this.t > 3) { this.set("roam"); this.cd = 1.2; }
        break;
      case "roam":
        turn(toYou, 2.4);
        intent.forward = dist > 9 ? 1 : dist < 5 ? -0.7 : 0;
        intent.strafe = Math.sin(run.time * 0.6) * 0.7;
        tilt = 0.12 + Math.abs(intent.forward) * 0.12;
        if (this.cd <= 0 && this.t > 1) this.pickAttack(run, dist);
        break;
      case "aim": {
        // Lines up on you; the guide shows the strike's path through you.
        turn(toYou, 3.5);
        tilt = Math.min(1, this.t / PEN.strike.aim) * 0.9;
        const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), L = Math.max(dist + 6, 12);
        this.guide = { x0: b.x, z0: b.z, x1: b.x + fx * L, z1: b.z + fz * L, y: b.y };
        if (this.t > PEN.strike.aim) {
          this.dir = this.yaw; this.from = [b.x, b.z];
          b.vx = -Math.sin(this.dir) * PEN.strike.speed; b.vz = -Math.cos(this.dir) * PEN.strike.speed;
          this.guide = null; this.hitDone = false;
          this.set("strike");
          run.events.push({ type: "penStrike", x: b.x, z: b.z });
        }
        break;
      }
      case "strike": {
        // Nib down, dragging a red line across the floor.
        this.yaw = this.dir; tilt = 1;
        intent.forward = 1; speedMul = PEN.strike.speed / this.body.P.speed;
        // It corrects foam steps too: rubs them out as it passes.
        for (const p of [...run.foam.steps]) if (Math.hypot(p.x - b.x, p.z - b.z) < p.r + PEN.r) run.foam.melt(run, p);
        if (!this.hitDone && dist < PEN.r + P.r + 0.5 && P.y - b.y < 2.2) {
          this.hitDone = true; run.hurt(PEN.strike.burn + 4, b.x, b.z);
          P.vx += -Math.sin(this.dir) * 7; P.vz += -Math.cos(this.dir) * 7; P.vy = 5; P.grounded = false;
        }
        const ran = Math.hypot(b.x - this.from[0], b.z - this.from[1]);
        if (this.t > PEN.strike.max || (this.t > 0.25 && b.speed2D < 3)) {
          if (ran > 1) this.lines.push({ x0: this.from[0], z0: this.from[1], x1: b.x, z1: b.z, y: b.y, t: 0, life: PEN.strike.ink[this.phase - 1], hitT: 0 });
          run.events.push({ type: "penLine", x: b.x, z: b.z });
          // Phase two: a second pass, straight back through you.
          if (this.phase === 2 && !this.again) { this.again = true; this.set("aim"); this.t = PEN.strike.aim * 0.45; }
          else { this.again = false; this.set("roam"); this.cd = 1.4 + run.rnd(); }
        }
        break;
      }
      case "grade":
        turn(toYou, 3);
        tilt = 0.3 - Math.min(1, this.t / 0.5) * 0.4;
        if (this.t > 0.55 && !this.fired) {
          this.fired = true;
          const n = PEN.grade.n[this.phase - 1], G = PEN.grade, top = this.at(2.6);
          const ey = (P.y + 1.1 - top[1]) / Math.max(dist, 1);
          for (let i = 0; i < n; i++) {
            const a = toYou + (i - (n - 1) / 2) * G.spread;
            run.spit({ x: top[0], y: top[1], z: top[2], vx: -Math.sin(a) * G.speed, vy: ey * G.speed, vz: -Math.cos(a) * G.speed, dmg: G.dmg, kind: "grade", owner: 0 });
          }
          run.events.push({ type: "bossAttack", attack: "gradeThrow" });
        }
        if (this.t > 1.2) { this.set("roam"); this.cd = 1.6 + run.rnd(); }
        break;
      case "correct":
        turn(toYou, 2);
        tilt = 0.5 + Math.sin(this.t * 12) * 0.1;
        if (!this.fired) {
          this.fired = true;
          const C = PEN.correct;
          for (let i = 0; i < C.n; i++) {
            const a = run.rnd() * Math.PI * 2, r = i ? 2.5 + run.rnd() * 3 : 0.5;
            const x = Math.max(this.arena.minX, Math.min(this.arena.maxX, P.x + Math.cos(a) * r)), z = Math.max(this.arena.minZ, Math.min(this.arena.maxZ, P.z + Math.sin(a) * r));
            this.circles.push({ x, z, y: run.kit.floorAt(x, z, P.y + 1), t: 0, T: C.T + i * 0.25, kind: run.rnd() < 0.5 ? "clock" : "pencil" });
          }
        }
        if (this.t > 1) { this.set("roam"); this.cd = 2 + run.rnd(); }
        break;
      case "scribble":
        // Spins on its nib, scribbling: rings of ink run out along the floor.
        this.yaw += dt * 14; tilt = 0.45;
        if (this.t > 0.5 + this.rings * PEN.scribble.gap && this.rings < PEN.scribble.rings) {
          this.rings++;
          run.shock(b.x, b.y, b.z, { max: 15, speed: 9, dmg: PEN.scribble.dmg, color: 0xd8202a });
          run.events.push({ type: "slam", x: b.x, z: b.z });
        }
        if (this.t > 0.6 + PEN.scribble.rings * PEN.scribble.gap) { this.set("roam"); this.cd = 1.5 + run.rnd(); }
        break;
      case "roar":
        tilt = Math.sin(this.t * 20) * 0.15;
        if (this.t > 0.5 && !this.fired) {
          this.fired = true;
          for (let i = 0; i < 2; i++) run.spawn("clock", b.x + (i ? 3 : -3), b.z, { group: "boss" });
        }
        if (this.t > 2) { this.set("roam"); this.cd = 1; }
        break;
      case "tired":
        // Out of breath, nib down, swaying a little.
        tilt = 0.2 + Math.sin(this.t * 4) * 0.08;
        speedMul = 0;
        if (this.t > PEN.tired.time) { this.ink = 0; this.set("roam"); this.cd = 0.6; }
        break;
      case "blotted":
        // Gummed up with foam: down on the floor, wide open.
        tilt = Math.min(Math.PI / 2, this.t * 6);
        speedMul = 0;
        if (this.t > PEN.blot.time) { this.set("roam"); this.cd = 1; run.events.push({ type: "penUnblot" }); }
        break;
      case "down":
        tilt = Math.min(Math.PI / 2, this.t * 1.5);
        if (this.t > 2.4 && this.alive) {
          this.alive = false;
          run.dropDust(b.x, b.y + 1.5, b.z, 40);
          run.events.push({ type: "bossPop", x: b.x, y: b.y + 1.4, z: b.z });
        }
        break;
    }
    if (this.state !== "grade" && this.state !== "correct" && this.state !== "roar") this.fired = false;
    if (this.state !== "scribble") this.rings = 0;
    if (this.state !== "aim") this.guide = null;
    this.tilt += (tilt - this.tilt) * Math.min(1, dt * (this.state === "strike" ? 12 : 6));

    // Ink on the floor burns while you stand in it.
    const S = PEN.strike;
    for (const L of this.lines) {
      L.t += dt; L.hitT -= dt;
      if (L.hitT > 0 || !P.grounded || P.y - L.y > 0.3) continue;
      if (segDist(P.x, P.z, L) < S.w + P.r * 0.5) { L.hitT = S.every; run.hurt(S.burn, P.x, P.z); run.events.push({ type: "inkBurn", x: P.x, z: P.z }); }
    }
    this.lines = this.lines.filter((L) => L.t < L.life);
    // Corrections closing: a glitch pops out of each.
    for (const c of this.circles) {
      c.t += dt;
      if (c.t < c.T) continue;
      c.done = true;
      if (Math.hypot(P.x - c.x, P.z - c.z) < PEN.correct.r && P.y - c.y < 1) run.hurt(PEN.correct.dmg, c.x, c.z);
      if (run.foes.filter((f) => f.alive && f.group === "boss").length < PEN.correct.minions) run.spawn(c.kind, c.x, c.z, { group: "boss" });
      run.events.push({ type: "penCircle", x: c.x, y: c.y, z: c.z });
    }
    this.circles = this.circles.filter((c) => !c.done);

    // Move (never outside the arena).
    b.yaw = this.yaw;
    const moving = this.state === "roam" || this.state === "strike";
    b.step(run.world, moving ? intent : { forward: 0, strafe: 0 }, dt, moving ? speedMul : 0);
    const A = this.arena;
    b.x = Math.max(A.minX, Math.min(A.maxX, b.x)); b.z = Math.max(A.minZ, Math.min(A.maxZ, b.z));
    // You cannot walk through it (upright).
    const pd = Math.hypot(P.x - b.x, P.z - b.z), m = PEN.r + P.r;
    if (this.alive && this.tilt < 1 && pd < m && pd > 1e-3 && P.y < b.y + PEN.h) { P.x = b.x + (P.x - b.x) / pd * m; P.z = b.z + (P.z - b.z) / pd * m; }
    this.pose();
  }

  pickAttack(run, dist) {
    // Every few attacks it stops for breath.
    if (this.attacks >= this.tiredAfter) {
      this.attacks = 0;
      this.tiredAfter = PEN.tired.every[0] + Math.floor(run.rnd() * (PEN.tired.every[1] - PEN.tired.every[0] + 1));
      this.set("tired");
      run.events.push({ type: "bossWeak", kind: this.kind, x: this.x, z: this.z });
      return;
    }
    this.attacks++;
    const minions = run.foes.filter((f) => f.alive && f.group === "boss").length;
    const r = run.rnd();
    let s;
    if (this.phase === 1) s = r < 0.45 ? "aim" : r < 0.75 || minions >= PEN.correct.minions ? "grade" : "correct";
    else s = r < 0.35 ? "aim" : r < 0.55 ? "scribble" : r < 0.8 || minions >= PEN.correct.minions ? "grade" : "correct";
    if (s === "aim" && dist > 18) s = "grade";
    this.set(s);
    run.events.push({ type: "bossAttack", attack: s === "aim" ? "strike" : s });
  }
}

// Distance from (x, z) to a line of ink.
function segDist(x, z, L) {
  const ex = L.x1 - L.x0, ez = L.z1 - L.z0, l2 = ex * ex + ez * ez || 1;
  const u = Math.max(0, Math.min(1, ((x - L.x0) * ex + (z - L.z0) * ez) / l2));
  return Math.hypot(x - (L.x0 + ex * u), z - (L.z0 + ez * u));
}
