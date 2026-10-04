import { Body } from "./player.js";

// ── The Pressure Cooker (Rosie's nightmare) ──────────────────────────────
// Comes up through the kitchen floor once the three anchors hold: a pot
// as big as a car, its lid clamped down, a gauge on the front and a
// whistle on top. It is under pressure, and the pressure keeps rising.
//
//  roam      shuffles about, keeping a few metres off
//  steam     a jet of steam from the vent at its foot sweeps round the
//            floor: jump it
//  hop       crouches and jumps, landing where you stood (a ring shows
//            where): don't be under it, and jump the ring it sends out
//  beans     lifts its lid and lobs hot beans that splash where they land
//  serve     two meatballs hop out from under the lid
//  whistle   the gauge is in the red: it shakes and whistles, then blows,
//            rings of steam running out all round
//  (phase two, below half) faster, the pressure rises sooner, two jets
//            at once, and a hop comes twice
//
// The Lullaby Bell is the trick: every ring rattles the lid (more so the
// higher the pressure), and rattled enough the lid flies off. Open, it
// lets off its pressure and takes far more damage, inside most of all,
// until it gets its lid back on. The lullaby calms it: the pressure
// halves and it goes slow for a moment.

export const COOKER = {
  hp: 170, r: 1.5, h: 2.6,
  speed: [2.2, 3],
  pressure: { rate: [1 / 13, 1 / 9], whistle: 2.2, rings: 2, gap: 0.5, dmg: 11, max: 16 },
  rattle: { ring: 0.28, high: 0.4, dry: 0.14 },
  open: { time: 4.5, mul: 2.2 },
  steam: { wind: 0.8, turn: 1.8, len: 11, h: 1.0, dmg: 8, every: 0.5 },
  hop: { wind: 0.55, T: 0.95, ring: 9, dmg: 9, crush: 12 },
  beans: { n: 4, dmg: 7, splash: 1.6 },
  serve: { n: 2, minions: 3 },
  lull: { pressure: 0.5, slow: 3 },
  lidMul: 0.5, bodyOpen: 1.3,
};

export class CookerBoss {
  kind = "cooker";

  constructor(run, x, z, arena) {
    const y = run.kit.floorAt(x, z);
    this.body = new Body(x, y, z, { radius: COOKER.r, height: COOKER.h, step: 0.5, speed: COOKER.speed[0], accel: 10, jump: 0 });
    this.body.grounded = true;
    this.arena = arena;
    this.hp = this.maxHp = COOKER.hp;
    this.phase = 1;
    this.state = "rise"; this.t = 0;
    this.yaw = 0;
    this.rise = 0;
    this.flash = 0;
    this.cd = 2;
    this.pressure = 0;
    this.rattle = 0;
    this.lidOff = false;
    this.lidUp = 0;              // lifted a little (beans, serve)
    this.slowT = 0;              // lulled
    this.jets = [];              // steam jets: angles round it
    this.mark = null;            // where a hop comes down
    this.hopY = 0;
    this.alive = true;
    this.lx = x; this.ly = y; this.lz = z;
  }

  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  get invulnerable() { return this.state === "rise" || this.state === "roar" || this.state === "down"; }

  set(s) { this.state = s; this.t = 0; }

  // [x, y, z, r, damage multiplier, part]
  hitSpheres() {
    const b = this.body, y = b.y + this.hopY;
    const out = [[b.x, y + 1.0, b.z, 1.4, this.lidOff ? COOKER.bodyOpen : 1, "body"]];
    if (this.lidOff) out.push([b.x, y + 2.45, b.z, 0.85, COOKER.open.mul, "core"]);
    else out.push([b.x, y + 2.55 + this.lidUp * 0.4, b.z, 0.95, COOKER.lidMul, "lid"]);
    return out;
  }

  damage(run, dmg, part) {
    if (this.invulnerable || !this.alive) return false;
    this.hp -= dmg;
    this.flash = 1;
    run.events.push({ type: "bossHit", part: part === "core" ? "bag" : part, dmg });
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.body.P.speed = COOKER.speed[1];
      if (this.state !== "open") { this.jets = []; this.mark = null; this.hopY = 0; this.set("roar"); }
      run.events.push({ type: "bossPhase", phase: 2, kind: this.kind });
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.jets = []; this.mark = null; this.hopY = 0;
      this.set("down");
      for (const f of run.foes) if (f.alive && f.group === "boss") { f.alive = false; run.events.push({ type: "pop", kind: f.kind, id: f.id, x: f.px, y: f.cy, z: f.pz, calm: true }); }
      run.events.push({ type: "bossDown" });
    }
    return true;
  }

  // The bell's ring: it rattles the lid (harder the higher the pressure).
  rung(run) {
    if (!this.alive || this.invulnerable || this.lidOff) return;
    const R = COOKER.rattle;
    this.rattle += R.ring + R.high * this.pressure;
    run.events.push({ type: "cookerRattle", x: this.x, y: this.y + 2.6, z: this.z, k: Math.min(1, this.rattle) });
    if (this.rattle >= 1) this.popLid(run);
  }

  popLid(run) {
    this.rattle = 0; this.lidOff = true; this.pressure = 0; this.lidUp = 0;
    this.jets = []; this.mark = null; this.hopY = 0;
    this.set("open");
    run.events.push({ type: "cookerLid", x: this.x, y: this.y + 2.6, z: this.z, off: true });
  }

  // The bell's lullaby: calmer, slower for a moment.
  lulled(run) {
    if (!this.alive || this.invulnerable) return;
    this.pressure *= COOKER.lull.pressure;
    this.slowT = COOKER.lull.slow;
    run.events.push({ type: "foeDrowsy", id: 0, x: this.x, y: this.y + 2.6, z: this.z });
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

  step(run, dt0) {
    const b = this.body, P = run.body, C = COOKER;
    this.lx = b.x; this.ly = b.y + this.hopY; this.lz = b.z;
    this.slowT = Math.max(0, this.slowT - dt0);
    const dt = dt0 * (this.slowT > 0 ? 0.55 : 1);
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt0 * 6);
    this.cd -= dt;
    this.rattle = Math.max(0, this.rattle - C.rattle.dry * dt);
    const dx = P.x - b.x, dz = P.z - b.z, dist = Math.hypot(dx, dz) || 0.01;
    const toYou = Math.atan2(-dx, -dz);
    const turn = (want, rate) => { const d = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)); this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); };
    const intent = { forward: 0, strafe: 0 };
    let moving = false, lid = 0;
    // The pressure builds while the lid is on (not while it rises or goes down).
    const busy = this.state === "rise" || this.state === "down" || this.state === "whistle" || this.state === "blow" || this.state === "open";
    if (!busy) this.pressure = Math.min(1, this.pressure + C.pressure.rate[this.phase - 1] * dt);
    if (this.pressure >= 1 && (this.state === "roam" || this.state === "beans" || this.state === "serve")) { this.set("whistle"); run.events.push({ type: "cookerWhistle", x: b.x, z: b.z }); }
    switch (this.state) {
      case "rise":
        this.rise = Math.min(1, this.t / 2.6);
        if (this.t > 3) { this.set("roam"); this.cd = 1.2; }
        break;
      case "roam":
        turn(toYou, 2);
        intent.forward = dist > 10 ? 1 : dist < 6 ? -0.7 : 0;
        intent.strafe = Math.sin(run.time * 0.5) * 0.6;
        moving = true;
        if (this.cd <= 0 && this.t > 0.8) this.pickAttack(run, dist);
        break;
      case "steam": {
        // Puffs at the vents, then the jets come and sweep round.
        const S = C.steam, n = this.phase === 2 ? 2 : 1;
        if (this.t < S.wind) { this.jets = []; this.windJet = this.windJet ?? toYou + this.dir * 1.9; break; }
        if (!this.jets.length) { this.jets = Array.from({ length: n }, (_, i) => this.windJet + i * Math.PI); this.hitT = 0; this.spun = 0; run.events.push({ type: "cookerSteam", x: b.x, z: b.z }); }
        const w = this.dir * S.turn * dt;
        this.jets = this.jets.map((a) => a + w);
        this.spun += Math.abs(w);
        this.hitT -= dt;
        if (this.hitT <= 0 && P.y < b.y + S.h && dist < S.len && dist > C.r * 0.5) {
          for (const a of this.jets) {
            const d = Math.atan2(Math.sin(toYou - a), Math.cos(toYou - a));
            if (Math.abs(d) < Math.atan(0.7 / dist) + 0.05) { run.hurt(S.dmg, b.x, b.z); this.hitT = S.every; run.events.push({ type: "steamBurn" }); break; }
          }
        }
        if (this.spun > Math.PI * 2 / n + 0.3) { this.jets = []; this.windJet = null; this.set("roam"); this.cd = 1 + run.rnd() * 0.8; }
        break;
      }
      case "hop": {
        const H = C.hop;
        if (this.t < H.wind) {
          // Crouched, eyes on you.
          turn(toYou, 3);
          this.mark = [P.x + P.vx * 0.3, P.y, P.z + P.vz * 0.3, C.r + 0.6];
          break;
        }
        if (!this.from) {
          const A = this.arena, m = this.mark;
          m[0] = Math.max(A.minX, Math.min(A.maxX, m[0])); m[2] = Math.max(A.minZ, Math.min(A.maxZ, m[2]));
          m[1] = run.kit.floorAt(m[0], m[2], b.y + 3);
          this.from = [b.x, b.y, b.z];
          run.events.push({ type: "cookerHop", x: b.x, z: b.z });
        }
        const u = Math.min(1, (this.t - H.wind) / H.T), m = this.mark, f = this.from;
        b.x = f[0] + (m[0] - f[0]) * u; b.z = f[2] + (m[2] - f[2]) * u;
        b.y = f[1] + (m[1] - f[1]) * u;
        this.hopY = 4 * 5.5 * u * (1 - u);
        if (u >= 1) {
          this.hopY = 0;
          // Landed: a ring runs out, and anyone under it is squashed.
          if (dist < C.r + P.r + 0.2 && P.y < b.y + 1.5) {
            run.hurt(H.crush, b.x, b.z);
            P.vx += dx / dist * 9; P.vz += dz / dist * 9; P.vy = 5; P.grounded = false;
          }
          run.shock(b.x, b.y, b.z, { max: H.ring, speed: 9, dmg: H.dmg, color: 0xfff0e0 });
          run.events.push({ type: "cookerLand", x: b.x, z: b.z });
          this.from = null; this.mark = null;
          if (this.phase === 2 && !this.again) { this.again = true; this.set("hop"); this.t = H.wind * 0.4; }
          else { this.again = false; this.set("roam"); this.cd = 1.1 + run.rnd() * 0.8; }
        }
        break;
      }
      case "beans":
        turn(toYou, 2);
        lid = Math.min(1, this.t / 0.4);
        if (this.t > 0.5 && !this.fired) {
          this.fired = true;
          const B = C.beans;
          for (let i = 0; i < B.n; i++) {
            const T = 1.1 + run.rnd() * 0.4, a = run.rnd() * Math.PI * 2, r = i ? 1.2 + run.rnd() * 3 : 0;
            const tx = P.x + P.vx * T * 0.6 + Math.cos(a) * r, tz = P.z + P.vz * T * 0.6 + Math.sin(a) * r, ty = run.kit.floorAt(tx, tz, P.y + 1);
            const sx = b.x, sy = b.y + 2.8, sz = b.z, g = 9;
            run.spit({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy + 0.5 * g * T * T) / T, vz: (tz - sz) / T, g, dmg: B.dmg, splash: B.splash, kind: "bean", tx, ty, tz, owner: 0 });
          }
          run.events.push({ type: "bossAttack", attack: "beansOut" });
        }
        if (this.t > 1.2) { this.set("roam"); this.cd = 1.4 + run.rnd(); }
        break;
      case "serve":
        lid = Math.min(1, this.t / 0.4);
        if (this.t > 0.5 && !this.fired) {
          this.fired = true;
          for (let i = 0; i < C.serve.n; i++) {
            const a = toYou + (i ? 0.7 : -0.7), r = C.r + 1;
            run.spawn("meatball", b.x - Math.sin(a) * r, b.z - Math.cos(a) * r, { group: "boss" });
          }
        }
        if (this.t > 1.2) { this.set("roam"); this.cd = 1.6 + run.rnd(); }
        break;
      case "whistle":
        // In the red: it shakes and whistles. Then it blows.
        if (this.t > C.pressure.whistle) { this.set("blow"); this.rings = 0; }
        break;
      case "blow": {
        const Pr = C.pressure;
        if (this.t > this.rings * Pr.gap && this.rings < Pr.rings) {
          this.rings++;
          run.shock(b.x, b.y, b.z, { max: Pr.max, speed: 10, dmg: Pr.dmg, color: 0xffffff });
          run.events.push({ type: "cookerBlow", x: b.x, z: b.z });
        }
        if (this.t > Pr.rings * Pr.gap + 0.6) { this.pressure = 0; this.set("roam"); this.cd = 1.5; }
        break;
      }
      case "open":
        // Lid off: steam pouring out, wide open. Then the lid goes back on.
        if (this.t > C.open.time) { this.lidOff = false; this.set("roam"); this.cd = 1; run.events.push({ type: "cookerLid", x: b.x, y: b.y + 2.6, z: b.z, off: false }); }
        break;
      case "roar":
        if (this.t > 0.5 && !this.fired) {
          this.fired = true;
          for (let i = 0; i < 2; i++) run.spawn("meatball", b.x + (i ? 3 : -3), b.z, { group: "boss" });
        }
        if (this.t > 2) { this.set("roam"); this.cd = 1; }
        break;
      case "down":
        if (this.t > 2.4 && this.alive) {
          this.alive = false;
          run.dropDust(b.x, b.y + 1.5, b.z, 40);
          run.events.push({ type: "bossPop", x: b.x, y: b.y + 1.4, z: b.z });
        }
        break;
    }
    if (this.state !== "beans" && this.state !== "serve" && this.state !== "roar") this.fired = false;
    this.lidUp += (lid - this.lidUp) * Math.min(1, dt * 8);

    // Move (never outside the arena). In a hop it is carried, not walked.
    if (this.state !== "hop" || this.t < C.hop.wind) {
      b.yaw = this.yaw;
      b.step(run.world, moving ? intent : { forward: 0, strafe: 0 }, dt, moving ? 1 : 0);
    }
    const A = this.arena;
    b.x = Math.max(A.minX, Math.min(A.maxX, b.x)); b.z = Math.max(A.minZ, Math.min(A.maxZ, b.z));
    // You cannot walk through it.
    const pd = Math.hypot(P.x - b.x, P.z - b.z), m = C.r + P.r;
    if (pd < m && pd > 1e-3 && P.y < b.y + this.hopY + C.h && P.y + 1.6 > b.y + this.hopY) { P.x = b.x + (P.x - b.x) / pd * m; P.z = b.z + (P.z - b.z) / pd * m; }
  }

  pickAttack(run, dist) {
    const minions = run.foes.filter((f) => f.alive && f.group === "boss").length;
    const r = run.rnd();
    let s = r < 0.3 ? "steam" : r < 0.55 ? "hop" : r < 0.8 || minions >= COOKER.serve.minions ? "beans" : "serve";
    if (s === "steam" && dist > COOKER.steam.len - 1) s = "hop";
    if (s === "steam") { this.dir = run.rnd() < 0.5 ? 1 : -1; this.windJet = null; }
    this.set(s);
    run.events.push({ type: "bossAttack", attack: s });
  }
}
