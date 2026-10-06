import { Body } from "./player.js";

// ── The Big Alarm Clock (Grandpa Joe's nightmare) ────────────────────────
// Comes up through the station platform once the three anchors hold: an
// old wind-up alarm clock taller than a house, on two stubby legs, two
// bells on its head and a winding key on top between them. Time is up,
// it says, and it means the ground under you.
//
//  roam     stomps about, keeping a few metres off
//  ring     stands, its bells shaking, then rings: rings run out along
//           the floor (jump them) and a slowing wave of sound (hide behind
//           something, or be slow for a moment)
//  sweep    its minute hand comes down and sweeps round over the floor:
//           jump it (in phase two both hands, opposite)
//  timesup  the slabs round you blink and fall away, and float back a few
//           seconds later: get off them, or open the umbrella and glide
//           to one that holds
//  snooze   two little alarm clocks come out of its door
//
// The Gust Umbrella is the trick: the winding key on top is out of reach
// of anything but a gust from close by, so ride an updraft and come at it
// from above. A gust on the key unwinds it: it stops dead for a few
// seconds, its glass swings open, and its face takes far more damage
// (wound up again, the key is stiff for a while).
// Anything else only clinks off the key.

export const BIGCLOCK = {
  hp: 190, r: 1.7, h: 5.4, key: 7,
  speed: [2.2, 2.9],
  ring: { wind: 1.4, rings: [3, 4], gap: 0.45, dmg: 9, max: 13, speed: 9, pulse: { max: 15, speed: 9, slow: 2.5 } },
  sweep: { wind: 0.9, turn: 1.9, len: 9.5, h: 1.1, dmg: 9, every: 0.5 },
  tiles: { warn: 1.5, down: 4, n: [3, 5], near: 8 },
  snooze: { n: 2, minions: 3 },
  unwound: { time: 5.5, mul: 2.6, wound: 4 },
  faceMul: 1, bodyMul: 0.55,
};

export class ClockBoss {
  kind = "bigclock";

  constructor(run, x, z, arena) {
    const y = run.kit.floorAt(x, z);
    const C = BIGCLOCK;
    this.body = new Body(x, y, z, { radius: C.r, height: C.h, step: 0.5, speed: C.speed[0], accel: 10, jump: 0 });
    this.body.grounded = true;
    this.arena = arena;
    this.hp = this.maxHp = C.hp;
    this.phase = 1;
    this.state = "rise"; this.t = 0;
    this.yaw = 0;
    this.rise = 0;
    this.flash = 0;
    this.woundT = 0;             // just wound up again: the key is stiff
    this.cd = 2;
    this.jets = [];              // the hands sweeping: angles round it
    this.bells = 0;              // how hard the bells shake (for the look)
    this.open = 0;               // the glass over its face, 0 shut … 1 open
    this.alive = true;
    this.lx = x; this.ly = y; this.lz = z;
    this.y0 = y;                 // the platform's height
  }

  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  get invulnerable() { return this.state === "rise" || this.state === "roar" || this.state === "down"; }

  set(s) { this.state = s; this.t = 0; }

  // [x, y, z, r, damage multiplier, part]: the key first (a gust looks
  // there before anything else), then the face, then the case.
  hitSpheres() {
    const b = this.body, C = BIGCLOCK, fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    return [
      [b.x, b.y + C.key, b.z, 0.75, 0, "key"],
      [b.x + fx * 0.9, b.y + 3, b.z + fz * 0.9, 1.5, this.state === "unwound" ? C.unwound.mul : C.faceMul, "face"],
      [b.x, b.y + 1.6, b.z, 1.6, C.bodyMul, "body"],
    ];
  }

  damage(run, dmg, part) {
    if (this.invulnerable || !this.alive) return false;
    // A shot at the key only clinks off it.
    if (part === "key") { if (this.state !== "unwound") run.events.push({ type: "bigclockClink", x: this.x, y: this.y + BIGCLOCK.key, z: this.z }); return false; }
    this.hp -= dmg;
    this.flash = 1;
    run.events.push({ type: "bossHit", part: part === "face" && this.state === "unwound" ? "bag" : part, dmg });
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.body.P.speed = BIGCLOCK.speed[1];
      if (this.state !== "unwound") { this.jets = []; this.set("roar"); }
      run.events.push({ type: "bossPhase", phase: 2, kind: this.kind });
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.jets = [];
      this.set("down");
      for (const f of run.foes) if (f.alive && f.group === "boss") { f.alive = false; run.events.push({ type: "pop", kind: f.kind, id: f.id, x: f.px, y: f.cy, z: f.pz, calm: true }); }
      for (const p of run.tiles) if (p.state !== "set") run.setTile(p);
      run.events.push({ type: "bossDown" });
    }
    return true;
  }

  // The umbrella's gust: on the key, it unwinds.
  gusted(run, ax, az, part) {
    if (part !== "key" || !this.alive || this.invulnerable || this.state === "unwound") return;
    // Just wound up again: the key is stiff for a while.
    if (this.woundT > 0) { run.events.push({ type: "lockClink", x: this.x, y: this.y + BIGCLOCK.key, z: this.z }); return; }
    this.jets = [];
    this.set("unwound");
    run.events.push({ type: "bigclockUnwound", x: this.x, y: this.y + BIGCLOCK.key, z: this.z });
  }

  // A yarn ball, a pillow: a hit like any other (not on the key).
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
    const b = this.body, P = run.body, C = BIGCLOCK;
    this.lx = b.x; this.ly = b.y; this.lz = b.z;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.cd -= dt;
    this.woundT = Math.max(0, this.woundT - dt);
    this.bells = Math.max(0, this.bells - dt * 2);
    const dx = P.x - b.x, dz = P.z - b.z, dist = Math.hypot(dx, dz) || 0.01;
    const toYou = Math.atan2(-dx, -dz);
    const turn = (want, rate) => { const d = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)); this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); };
    const intent = { forward: 0, strafe: 0 };
    let moving = false, open = 0;
    switch (this.state) {
      case "rise":
        this.rise = Math.min(1, this.t / 2.6);
        if (this.t > 3) { this.set("roam"); this.cd = 1.2; }
        break;
      case "roam":
        turn(toYou, 1.8);
        intent.forward = dist > 10 ? 1 : dist < 6 ? -0.7 : 0;
        intent.strafe = Math.sin(run.time * 0.4) * 0.5;
        moving = true;
        if (this.cd <= 0 && this.t > 0.8) this.pickAttack(run, dist);
        break;
      case "ring": {
        // Bells shaking (it stands still: the moment to go for the key).
        const R = C.ring, n = R.rings[this.phase - 1];
        turn(toYou, 1);
        this.bells = Math.min(1, this.t / R.wind);
        if (this.t > R.wind && !this.rang) {
          this.rang = true; this.rings = 0;
          run.pulse(b.x, b.y + 4.5, b.z, R.pulse);
          run.events.push({ type: "bigclockRing", x: b.x, z: b.z });
        }
        if (this.rang && this.t > R.wind + this.rings * R.gap && this.rings < n) {
          this.rings++;
          run.shock(b.x, b.y, b.z, { max: R.max, speed: R.speed, dmg: R.dmg, color: 0xffd23a });
          this.bells = 1;
        }
        if (this.t > R.wind + n * R.gap + 0.6) { this.rang = false; this.set("roam"); this.cd = 1.4 + run.rnd() * 0.8; }
        break;
      }
      case "sweep": {
        // The hands come down, then sweep round over the floor.
        const S = C.sweep, n = this.phase === 2 ? 2 : 1;
        if (this.t < S.wind) { this.jets = []; this.windJet ??= toYou + this.dir * 1.9; break; }
        if (!this.jets.length) { this.jets = Array.from({ length: n }, (_, i) => this.windJet + i * Math.PI); this.hitT = 0; this.spun = 0; run.events.push({ type: "bigclockSweep", x: b.x, z: b.z }); }
        const w = this.dir * S.turn * dt;
        this.jets = this.jets.map((a) => a + w);
        this.spun += Math.abs(w);
        this.hitT -= dt;
        if (this.hitT <= 0 && P.y < b.y + S.h && dist < S.len && dist > C.r * 0.5) {
          for (const a of this.jets) {
            const d = Math.atan2(Math.sin(toYou - a), Math.cos(toYou - a));
            if (Math.abs(d) < Math.atan(0.6 / dist) + 0.05) { run.hurt(S.dmg, b.x, b.z, false); this.hitT = S.every; run.events.push({ type: "bigclockHit" }); break; }
          }
        }
        if (this.spun > Math.PI * 2 / n + 0.3) { this.jets = []; this.windJet = null; this.set("roam"); this.cd = 1 + run.rnd() * 0.8; }
        break;
      }
      case "timesup": {
        // Points at you, ticking loudly; the slabs round you start to blink.
        turn(toYou, 2);
        if (!this.fired && this.t > 0.5) {
          this.fired = true;
          const T = C.tiles, n = T.n[this.phase - 1];
          const near = run.tiles.filter((p) => p.state === "set" && !p.fixed && Math.hypot(p.x - P.x, p.z - P.z) < T.near && Math.hypot(p.x - b.x, p.z - b.z) > p.w * 0.75)
            .sort((a, c) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(c.x - P.x, c.z - P.z));
          let k = 0;
          for (const p of near) { if (k >= n) break; if (run.dropTile(p, T.warn, T.down)) k++; }
          run.events.push({ type: "bigclockTimesup", x: b.x, z: b.z });
        }
        if (this.t > 1.6) { this.set("roam"); this.cd = 1.6 + run.rnd(); }
        break;
      }
      case "snooze":
        open = Math.min(1, this.t / 0.4) * 0.6;
        if (this.t > 0.5 && !this.fired) {
          this.fired = true;
          const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
          for (let i = 0; i < C.snooze.n; i++) run.spawn("clock", b.x + fx * 2.6 + (i ? 1.2 : -1.2), b.z + fz * 2.6, { group: "boss", y: b.y + 1.5 });
          run.events.push({ type: "bossAttack", attack: "snoozeOut" });
        }
        if (this.t > 1.3) { this.set("roam"); this.cd = 1.6 + run.rnd(); }
        break;
      case "unwound":
        // Run down: stock still, the glass swung open.
        open = 1;
        if (this.t > C.unwound.time) { this.woundT = C.unwound.wound; this.set("roam"); this.cd = 0.8; run.events.push({ type: "bigclockWound", x: b.x, z: b.z }); }
        break;
      case "roar":
        this.bells = 1;
        if (this.t > 0.5 && !this.fired) {
          this.fired = true;
          for (let i = 0; i < 2; i++) run.spawn("clock", b.x + (i ? 3 : -3), b.z, { group: "boss", y: b.y + 1.5 });
        }
        if (this.t > 2) { this.set("roam"); this.cd = 1; }
        break;
      case "down":
        if (this.t > 2.4 && this.alive) {
          this.alive = false;
          run.dropDust(b.x, b.y + 1.5, b.z, 45);
          run.events.push({ type: "bossPop", x: b.x, y: b.y + 2.5, z: b.z });
        }
        break;
    }
    if (this.state !== "timesup" && this.state !== "snooze" && this.state !== "roar") this.fired = false;
    this.open += (open - this.open) * Math.min(1, dt * 6);

    b.yaw = this.yaw;
    b.step(run.world, moving ? intent : { forward: 0, strafe: 0 }, dt, moving ? 1 : 0);
    // It stays on the platform (and on a slab that holds: one going from
    // under it stays put for it).
    const A = this.arena;
    b.x = Math.max(A.minX, Math.min(A.maxX, b.x)); b.z = Math.max(A.minZ, Math.min(A.maxZ, b.z));
    if (b.y < this.y0 - 0.3 || b.fell) { b.place(this.lx, this.y0, this.lz, this.yaw); b.grounded = true; }
    // You cannot walk through it.
    const pd = Math.hypot(P.x - b.x, P.z - b.z), m = C.r + P.r;
    if (this.alive && pd < m && pd > 1e-3 && P.y < b.y + C.h && P.y + 1.6 > b.y) { P.x = b.x + (P.x - b.x) / pd * m; P.z = b.z + (P.z - b.z) / pd * m; }
  }

  pickAttack(run, dist) {
    const minions = run.foes.filter((f) => f.alive && f.group === "boss").length;
    const r = run.rnd();
    let s = r < 0.27 ? "ring" : r < 0.52 ? "sweep" : r < 0.82 || minions >= BIGCLOCK.snooze.minions ? "timesup" : "snooze";
    if (s === "sweep" && dist > BIGCLOCK.sweep.len - 1) s = "timesup";
    if (s === "sweep") { this.dir = run.rnd() < 0.5 ? 1 : -1; this.windJet = null; }
    this.set(s);
    run.events.push({ type: "bossAttack", attack: s });
  }
}
