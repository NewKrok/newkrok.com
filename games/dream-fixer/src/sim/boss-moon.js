// ── The Moon Lamp (Sophie's nightmare) ───────────────────────────────────
// The night-light from her childhood room, a moon with a sleepy face, now
// as big as a car and floating over the cupola's floor once the three
// anchors hold. Its pull-chain hangs below it, a star bead at the end.
//
//  roam     drifts round you at a few metres, high up
//  beam     a spotlight on the floor follows you, stops, and a column of
//           moonlight comes down in it: get out of the circle (two in
//           phase two)
//  tide     pulls you in under it for a moment, then rings run out along
//           the floor (jump them, or hang from a star handle)
//  rocks    lobs a handful of moon rocks that burst where they land
//           (rings show where)
//  rockets  two plush rockets come off it
//
// The Star Yo-Yo's lasso is the trick: only the lasso catches its
// pull-chain (anything else just clinks off the bead). Pulled, the moon
// is reeled down to the floor and held there for a few seconds, lit up
// all over: it takes far more damage.

export const MOON = {
  hp: 200, r: 2.1, hover: 6, low: 2.4, chain: 3.4,
  speed: [2.2, 3],
  beam: { follow: 1.5, lock: 0.5, r: 2.2, dmg: 11, n: [1, 2] },
  tide: { time: 2.2, pull: [3.4, 4.4], rings: [1, 2], gap: 0.5, dmg: 9, max: 12, speed: 8 },
  rocks: { wind: 0.8, n: [5, 7], gap: 0.12, dmg: 7, splash: 1.7 },
  rockets: { n: 2, max: 3 },
  tether: { time: 5.5, mul: 2.4 },
  faceMul: 1, shellMul: 0.5,
};

export class MoonBoss {
  kind = "moon";

  constructor(run, x, z, arena) {
    this.y0 = run.kit.floorAt(x, z);
    this.x = x; this.z = z; this.y = this.y0 - 4;
    this.vx = 0; this.vz = 0;
    this.arena = arena;
    this.hp = this.maxHp = MOON.hp;
    this.phase = 1;
    this.state = "rise"; this.t = 0;
    this.yaw = 0;
    this.rise = 0;
    this.flash = 0;
    this.cd = 2;
    this.marks = [];             // spotlights on the floor: [x, y, z, r, locked]
    this.glow = 0;               // how lit up it is (tethered: all over)
    this.alive = true;
    this.lx = x; this.ly = this.y; this.lz = z;
    this.dir = 1;
  }

  get invulnerable() { return this.state === "rise" || this.state === "roar" || this.state === "down"; }
  get tethered() { return this.state === "tethered"; }

  set(s) { this.state = s; this.t = 0; }

  // [x, y, z, r, damage multiplier, part]: the chain's bead first (the
  // lasso looks there before anything else), then its face, then the rest.
  hitSpheres() {
    const M = MOON, fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), k = this.tethered ? M.tether.mul : 1;
    return [
      [this.x, this.y - M.chain, this.z, 0.5, 0, "chain"],
      [this.x + fx * 1.1, this.y, this.z + fz * 1.1, 1.4, M.faceMul * k, "face"],
      [this.x, this.y, this.z, M.r, M.shellMul * k, "shell"],
    ];
  }

  damage(run, dmg, part) {
    if (this.invulnerable || !this.alive) return false;
    // A shot at the bead only clinks off it.
    if (part === "chain") { if (!this.tethered) run.events.push({ type: "moonClink", x: this.x, y: this.y - MOON.chain, z: this.z }); return false; }
    this.hp -= dmg;
    this.flash = 1;
    run.events.push({ type: "bossHit", part: this.tethered ? "bag" : part, dmg });
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      if (!this.tethered) { this.marks = []; this.set("roar"); }
      run.events.push({ type: "bossPhase", phase: 2, kind: this.kind });
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.marks = [];
      this.set("down");
      for (const f of run.foes) if (f.alive && f.group === "boss") { f.alive = false; run.events.push({ type: "pop", kind: f.kind, id: f.id, x: f.px, y: f.cy, z: f.pz, calm: true }); }
      run.events.push({ type: "bossDown" });
    }
    return true;
  }

  // The yo-yo's lasso on its chain: it is reeled down to the floor.
  tied(run, part) {
    if (part !== "chain" || !this.alive || this.invulnerable || this.tethered) return;
    this.marks = [];
    this.set("tethered");
    run.events.push({ type: "moonTethered", x: this.x, y: this.y - MOON.chain, z: this.z });
  }

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
    const P = run.body, M = MOON, A = this.arena;
    this.lx = this.x; this.ly = this.y; this.lz = this.z;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.cd -= dt;
    const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz) || 0.01;
    const toYou = Math.atan2(-dx, -dz);
    const turn = (want, rate) => { const d = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)); this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); };
    let wantY = this.y0 + M.hover + Math.sin(run.time * 0.9) * 0.35, drift = 1, glow = 0;
    switch (this.state) {
      case "rise":
        this.rise = Math.min(1, this.t / 2.6);
        wantY = this.y0 - 4 + (M.hover + 4) * this.rise;
        drift = 0;
        if (this.t > 3) { this.set("roam"); this.cd = 1.2; }
        break;
      case "roam":
        turn(toYou, 1.6);
        if (this.cd <= 0 && this.t > 0.8) this.pickAttack(run);
        break;
      case "beam": {
        // Spotlights follow you round the floor, stop, and the moonlight comes down.
        const B = M.beam;
        turn(toYou, 2.5); drift = 0.4; glow = 0.6;
        if (!this.marks.length) {
          const n = B.n[this.phase - 1];
          for (let i = 0; i < n; i++) this.marks.push([P.x, this.y0, P.z, B.r, false]);
          run.events.push({ type: "moonBeamOn", x: this.x, z: this.z });
        }
        this.marks.forEach((m, i) => {
          if (this.t > B.follow) { m[4] = true; return; }
          // The second one runs ahead of you.
          const lead = i ? 1.2 : 0, tx = P.x + P.vx * lead, tz = P.z + P.vz * lead, k = Math.min(1, dt * (i ? 2.5 : 3.5));
          m[0] += (tx - m[0]) * k; m[2] += (tz - m[2]) * k;
          m[1] = run.kit.floorAt(m[0], m[2], this.y0 + 1);
        });
        if (this.t > B.follow + B.lock && !this.fired) {
          this.fired = true;
          for (const m of this.marks) {
            run.events.push({ type: "moonBeam", x: m[0], y: m[1], z: m[2], r: m[3] });
            if (Math.hypot(P.x - m[0], P.z - m[2]) < m[3] + P.r && P.y < m[1] + 4) run.hurt(B.dmg, m[0], m[2], false);
          }
        }
        if (this.t > B.follow + B.lock + 0.5) { this.marks = []; this.set("roam"); this.cd = 1.2 + run.rnd() * 0.8; }
        break;
      }
      case "tide": {
        // Pulls you in under it, glowing; then the rings.
        const T = M.tide, n = T.rings[this.phase - 1];
        drift = 0; glow = 0.4 + 0.4 * Math.sin(this.t * 12);
        if (this.t < T.time) {
          const pull = T.pull[this.phase - 1] * Math.min(1, this.t * 2);
          if (dist > 1.5) { P.pushX -= dx / dist * pull; P.pushZ -= dz / dist * pull; }
        } else if (this.rings < n && this.t > T.time + this.rings * T.gap) {
          this.rings++;
          run.shock(this.x, this.y0, this.z, { max: T.max, speed: T.speed, dmg: T.dmg, color: 0xc8d8ff });
          run.events.push({ type: "moonTideRing", x: this.x, z: this.z });
        }
        if (this.t > T.time + n * T.gap + 0.6) { this.set("roam"); this.cd = 1.2 + run.rnd() * 0.8; }
        break;
      }
      case "rocks": {
        const R = M.rocks, n = R.n[this.phase - 1];
        turn(toYou, 2); drift = 0.3;
        if (this.t > R.wind && this.thrown < n && this.t > R.wind + this.thrown * R.gap) {
          const i = this.thrown++, T = 1.1 + i * 0.05, a = run.rnd() * Math.PI * 2, r = i ? 0.8 + run.rnd() * 2.6 : 0;
          const tx = P.x + P.vx * T * 0.6 + Math.cos(a) * r, tz = P.z + P.vz * T * 0.6 + Math.sin(a) * r, ty = run.kit.floorAt(tx, tz, this.y0 + 1);
          const g = 9, sx = this.x, sy = this.y - 1, sz = this.z;
          run.spit({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy + 0.5 * g * T * T) / T, vz: (tz - sz) / T, g, splash: R.splash, dmg: R.dmg, kind: "moonrock", tx, ty, tz, owner: "boss" });
          run.events.push({ type: "moonRock", x: sx, z: sz });
        }
        if (this.t > R.wind + n * R.gap + 0.8) { this.set("roam"); this.cd = 1.4 + run.rnd() * 0.8; }
        break;
      }
      case "rockets":
        glow = 0.5;
        if (this.t > 0.6 && !this.fired) {
          this.fired = true;
          for (let i = 0; i < M.rockets.n; i++) run.spawn("rocket", this.x + (i ? 2 : -2), this.z, { group: "boss", y: this.y - 2 });
          run.events.push({ type: "bossAttack", attack: "rocketsOut" });
        }
        if (this.t > 1.4) { this.set("roam"); this.cd = 1.6 + run.rnd(); }
        break;
      case "tethered":
        // Reeled down on its own chain, lit up all over.
        wantY = this.y0 + M.low; drift = 0; glow = 1;
        if (this.t > M.tether.time) { this.set("roam"); this.cd = 0.8; run.events.push({ type: "moonFree", x: this.x, z: this.z }); }
        break;
      case "roar":
        glow = 1; drift = 0;
        if (this.t > 0.5 && !this.fired) {
          this.fired = true;
          for (let i = 0; i < 2; i++) run.spawn("rocket", this.x + (i ? 3 : -3), this.z, { group: "boss", y: this.y - 2 });
        }
        if (this.t > 2) { this.set("roam"); this.cd = 1; }
        break;
      case "down":
        drift = 0; wantY = this.y0 + 1;
        if (this.t > 2.4 && this.alive) {
          this.alive = false;
          run.dropDust(this.x, this.y, this.z, 45);
          run.events.push({ type: "bossPop", x: this.x, y: this.y, z: this.z });
        }
        break;
    }
    if (this.state !== "beam" && this.state !== "rockets" && this.state !== "roar") this.fired = false;
    if (this.state !== "rocks") this.thrown = 0;
    if (this.state !== "tide") this.rings = 0;
    this.glow += (glow - this.glow) * Math.min(1, dt * 6);

    // Drifting round you at a few metres (the way round it keeps
    // changing), held over the arena.
    const want = 8 + Math.sin(run.time * 0.3) * 2, sp = M.speed[this.phase - 1] * drift;
    const ox = this.x - P.x, oz = this.z - P.z, ol = Math.hypot(ox, oz) || 1;
    if (Math.sin(run.time * 0.17 + 1) > 0.95) this.dir = -this.dir;
    const tx = P.x + ox / ol * want - oz / ol * this.dir * 3, tz = P.z + oz / ol * want + ox / ol * this.dir * 3;
    const ex = tx - this.x, ez = tz - this.z, el = Math.hypot(ex, ez) || 1;
    this.vx += ((sp ? ex / el * Math.min(sp, el) : 0) - this.vx) * Math.min(1, dt * 1.5);
    this.vz += ((sp ? ez / el * Math.min(sp, el) : 0) - this.vz) * Math.min(1, dt * 1.5);
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.x = Math.max(A.minX, Math.min(A.maxX, this.x)); this.z = Math.max(A.minZ, Math.min(A.maxZ, this.z));
    this.y += (wantY - this.y) * Math.min(1, dt * (this.tethered ? 4 : 1.5));

    // You cannot walk (or jump) through it.
    const cy = P.y + 0.9, d3 = Math.hypot(P.x - this.x, cy - this.y, P.z - this.z), m = M.r + P.r + 0.2;
    if (d3 < m && this.state !== "rise") {
      const hx = P.x - this.x, hz = P.z - this.z, hl = Math.hypot(hx, hz) || 1, push = m - d3;
      P.x += hx / hl * push; P.z += hz / hl * push;
    }
  }

  pickAttack(run) {
    const minions = run.foes.filter((f) => f.alive && f.group === "boss").length;
    const r = run.rnd();
    const s = r < 0.32 ? "beam" : r < 0.58 ? "tide" : r < 0.86 || minions >= MOON.rockets.max ? "rocks" : "rockets";
    this.set(s);
    run.events.push({ type: "bossAttack", attack: s });
  }
}
