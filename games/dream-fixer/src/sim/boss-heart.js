// ── Old Hum's insomnia (the finale) ──────────────────────────────────────
// Old Hum's heart, a hundred years without sleep: a brass heart in three
// spinning rings, racing, one red eye wide open. It floats over the floor
// of the heart's chamber once the three anchors hold.
//
// It is not beaten, it is put to sleep. Its meter is sleepiness (hp here
// is how wide awake it still is): only the Dream Sand fills it. Every
// other hit clinks off it. Left without sand for a moment it slowly wakes
// up again.
//
//  roam     drifts round you at a few metres
//  alarm    its bells shake, then rings run out along the floor (jump them)
//  slam     rises over you (a ring on the floor follows you), stops, and
//           drops: a ring runs out from where it lands. Then it sits on the
//           floor a moment, dazed (sand counts more)
//  beans    a volley of coffee beans lobbed round you (rings show where)
//  wake     calls a few of the week's glitches out of the works
//  yawn     after every few attacks it yawns: its eye droops, its core
//           opens, and sand counts three times over
//
// Full up, it settles to the floor, nodding; Cog flies in with the last
// pinch of sand, and Old Hum is asleep.

export const HEART = {
  hp: 100, r: 1.8, hover: 2.8, high: 6.5,
  speed: [2.4, 3.2],
  gain: 1.85, yawnMul: 3, dazedMul: 1.5,            // sleepiness per unit of sand (a pinch is ~0.2)
  wake: { after: 1.6, rate: [0.6, 0.95] },          // wakes back up without sand (per second, by phase)
  alarm: { brace: 0.9, rings: [2, 3], gap: 0.55, dmg: 9, max: 13, speed: 9 },
  slam: { follow: 1.3, lock: 0.5, r: 2.3, dmg: 15, ring: 11, daze: 1.6 },
  beans: { wind: 0.7, n: [6, 8], gap: 0.1, dmg: 7, splash: 1.6 },
  wakeUp: { n: [3, 4], max: 6, kinds: ["fuzz", "pencil", "meatball", "gnome", "robot", "bunny"] },
  yawn: { every: [2, 3], time: 3.6 },
  sleep: { cog: 1.8, done: 4.2 },                  // Cog's last pinch; asleep
};

export class HeartBoss {
  kind = "insomnia";

  constructor(run, x, z, arena) {
    this.y0 = run.kit.floorAt(x, z);
    this.x = x; this.z = z; this.y = this.y0 - 4;
    this.vx = 0; this.vz = 0;
    this.arena = arena;
    this.hp = this.maxHp = HEART.hp;
    this.phase = 1;
    this.state = "rise"; this.t = 0;
    this.yaw = 0;
    this.rise = 0;
    this.flash = 0;
    this.cd = 2;
    this.mark = null;            // the slam's ring on the floor: [x, y, z, r, locked]
    this.glow = 0;               // how lit its core is (a yawn: wide open)
    this.alive = true;
    this.lx = x; this.ly = this.y; this.lz = z;
    this.dir = 1;
    this.attacks = 0;
    this.yawnAfter = 2;
    this.sandT = 9;              // seconds since the last sand
    this.beat = 0;               // its racing beat (the renderer pumps with it)
    this.hinted = false;
  }

  // Never hurt: only sand gets to it. (rise/sleep: nothing does.)
  get invulnerable() { return this.state === "rise" || this.state === "sleep"; }
  // How sleepy it is, 0…1 (the HUD's meter).
  get sleepy() { return 1 - this.hp / this.maxHp; }

  set(s) { this.state = s; this.t = 0; }

  // [x, y, z, r, multiplier, part]: its core (open while it yawns), then the rest.
  hitSpheres() {
    return [
      [this.x, this.y, this.z, 1.0, 1, "core"],
      [this.x, this.y, this.z, HEART.r, 1, "shell"],
    ];
  }

  // A shot, a ring, a gust: it only clinks off. (Once, Margo says why.)
  damage(run) {
    if (!this.alive || this.invulnerable) return false;
    this.flash = 0.4;
    run.events.push({ type: "heartClink", x: this.x, y: this.y, z: this.z, first: !this.hinted });
    this.hinted = true;
    return false;
  }
  ballHit(run, g) {
    if (!this.alive) return false;
    if ((g.x - this.x) ** 2 + (g.y - this.y) ** 2 + (g.z - this.z) ** 2 > (HEART.r + 0.3) ** 2) return false;
    this.damage(run);
    run.events.push({ type: "ballPop", kind: g.kind, x: g.x, y: g.y, z: g.z });
    return true;
  }

  // Dream sand on it: sleepier.
  sanded(run, amount) {
    if (!this.alive || this.invulnerable) return;
    const k = this.state === "yawn" ? HEART.yawnMul : this.state === "dazed" ? HEART.dazedMul : 1;
    this.hp = Math.max(0, this.hp - amount * HEART.gain * k);
    this.sandT = 0;
    run.events.push({ type: "heartSand", x: this.x, y: this.y, z: this.z, k });
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      run.events.push({ type: "bossPhase", phase: 2, kind: this.kind });
    }
    if (this.hp <= 0) {
      this.mark = null;
      this.set("sleep");
      for (const f of run.foes) if (f.alive && f.group === "boss") { f.alive = false; run.events.push({ type: "pop", kind: f.kind, id: f.id, x: f.px, y: f.cy, z: f.pz, calm: true }); }
      run.events.push({ type: "heartAsleep", x: this.x, y: this.y, z: this.z });
    }
  }

  step(run, dt) {
    const P = run.body, H = HEART, A = this.arena;
    this.lx = this.x; this.ly = this.y; this.lz = this.z;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.cd -= dt;
    this.sandT += dt;
    // Racing: faster the more awake it is.
    this.beat += dt * (this.state === "yawn" || this.state === "sleep" ? 0.8 : 1.6 + 2.4 * (this.hp / this.maxHp));
    // Without sand a while, it wakes back up.
    if (this.sandT > H.wake.after && this.state !== "sleep" && this.state !== "rise" && this.state !== "yawn") this.hp = Math.min(this.maxHp, this.hp + H.wake.rate[this.phase - 1] * dt);
    const dx = P.x - this.x, dz = P.z - this.z;
    const toYou = Math.atan2(-dx, -dz);
    const turn = (want, rate) => { const d = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)); this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); };
    let wantY = this.y0 + H.hover + Math.sin(run.time * 1.3) * 0.25, drift = 1, glow = 0.2, ease = 1.5;
    switch (this.state) {
      case "rise":
        this.rise = Math.min(1, this.t / 2.6);
        wantY = this.y0 - 4 + (H.hover + 4) * this.rise;
        drift = 0;
        if (this.t > 3) { this.set("roam"); this.cd = 1.2; }
        break;
      case "roam":
        turn(toYou, 1.8);
        if (this.cd <= 0 && this.t > 0.8) this.pickAttack(run);
        break;
      case "alarm": {
        // Its bells shake, then the rings go.
        const L = H.alarm, n = L.rings[this.phase - 1];
        drift = 0; glow = 0.6;
        if (this.t > L.brace && this.rings < n && this.t > L.brace + this.rings * L.gap) {
          this.rings++;
          run.shock(this.x, this.y0, this.z, { max: L.max, speed: L.speed, dmg: L.dmg, color: 0xff7050 });
          run.events.push({ type: "heartRing", x: this.x, z: this.z });
        }
        if (this.t > L.brace + n * L.gap + 0.6) { this.set("roam"); this.cd = 1.2 + run.rnd() * 0.8; }
        break;
      }
      case "slam": {
        // Up over you, following; it stops, and drops where the ring is.
        const S = H.slam;
        drift = 0; glow = 0.5;
        if (!this.mark) this.mark = [P.x, this.y0, P.z, S.r, false];
        const m = this.mark;
        if (this.t < S.follow) {
          const k = Math.min(1, dt * 3);
          m[0] += (P.x - m[0]) * k; m[2] += (P.z - m[2]) * k;
          m[0] = Math.max(A.minX, Math.min(A.maxX, m[0])); m[2] = Math.max(A.minZ, Math.min(A.maxZ, m[2]));
          m[1] = run.kit.floorAt(m[0], m[2], this.y0 + 1);
        } else m[4] = true;
        if (this.t < S.follow + S.lock) {
          wantY = this.y0 + H.high;
          this.x += (m[0] - this.x) * Math.min(1, dt * 4); this.z += (m[2] - this.z) * Math.min(1, dt * 4);
          ease = 3;
        } else if (!this.fired) {
          // Down it comes.
          this.fired = true;
          this.y = m[1] + H.r; this.x = m[0]; this.z = m[2];
          if (Math.hypot(P.x - m[0], P.z - m[2]) < S.r + P.r && P.y < m[1] + 3) run.hurt(S.dmg, m[0], m[2], false);
          run.shock(m[0], m[1], m[2], { max: S.ring, speed: 10, dmg: H.alarm.dmg, color: 0xff7050 });
          run.events.push({ type: "heartSlam", x: m[0], y: m[1], z: m[2] });
          this.mark = null;
          this.set("dazed");
          return;
        }
        break;
      }
      case "dazed":
        // Sitting on the floor after a slam, shaken: sand counts more.
        drift = 0; wantY = this.y0 + H.r; glow = 0.4;
        if (this.t > H.slam.daze) { this.set("roam"); this.cd = 1; }
        break;
      case "beans": {
        const B = H.beans, n = B.n[this.phase - 1];
        turn(toYou, 2); drift = 0.3; glow = 0.5;
        if (this.t > B.wind && this.thrown < n && this.t > B.wind + this.thrown * B.gap) {
          const i = this.thrown++, T = 1 + i * 0.04, a = run.rnd() * Math.PI * 2, r = i ? 0.8 + run.rnd() * 3 : 0;
          const tx = P.x + P.vx * T * 0.6 + Math.cos(a) * r, tz = P.z + P.vz * T * 0.6 + Math.sin(a) * r, ty = run.kit.floorAt(tx, tz, this.y0 + 1);
          const g = 9, sx = this.x, sy = this.y + 1, sz = this.z;
          run.spit({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy + 0.5 * g * T * T) / T, vz: (tz - sz) / T, g, splash: B.splash, dmg: B.dmg, kind: "coffeebean", tx, ty, tz, owner: "boss" });
          run.events.push({ type: "heartBean", x: sx, z: sz });
        }
        if (this.t > B.wind + n * B.gap + 0.8) { this.set("roam"); this.cd = 1.3 + run.rnd() * 0.8; }
        break;
      }
      case "wake":
        glow = 0.8;
        if (this.t > 0.6 && !this.fired) {
          this.fired = true;
          const W = H.wakeUp, n = W.n[this.phase - 1];
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + run.rnd(), kind = W.kinds[Math.floor(run.rnd() * W.kinds.length)];
            const x = Math.max(A.minX, Math.min(A.maxX, this.x + Math.cos(a) * 3)), z = Math.max(A.minZ, Math.min(A.maxZ, this.z + Math.sin(a) * 3));
            run.spawn(kind, x, z, { group: "boss" });
          }
          run.events.push({ type: "bossAttack", attack: "wakeOut" });
        }
        if (this.t > 1.4) { this.set("roam"); this.cd = 1.6 + run.rnd(); }
        break;
      case "yawn":
        // A big yawn: drifting low and slow, its core wide open.
        drift = 0.25; wantY = this.y0 + H.hover - 0.7; glow = 1;
        if (this.t > H.yawn.time) { this.set("roam"); this.cd = 0.6; run.events.push({ type: "heartAwake", x: this.x, z: this.z }); }
        break;
      case "sleep":
        // Settling to the floor, nodding off; Cog brings the last pinch.
        drift = 0; wantY = this.y0 + H.r * 0.8; glow = 1; ease = 0.8;
        if (this.t > H.sleep.cog && !this.fired) { this.fired = true; run.events.push({ type: "cogLast", x: this.x, y: this.y, z: this.z }); }
        if (this.t > H.sleep.done && this.alive) {
          this.alive = false;
          run.dropDust(this.x, this.y, this.z, 60);
          run.events.push({ type: "bossPop", x: this.x, y: this.y, z: this.z, asleep: true });
        }
        break;
    }
    if (!["slam", "wake", "sleep"].includes(this.state)) this.fired = false;
    if (this.state !== "beans") this.thrown = 0;
    if (this.state !== "alarm") this.rings = 0;
    this.glow += (glow - this.glow) * Math.min(1, dt * 6);

    // Drifting round you at a few metres (sand's reach), held over the arena.
    const want = 5.5 + Math.sin(run.time * 0.35) * 1.2, sp = H.speed[this.phase - 1] * drift;
    const ox = this.x - P.x, oz = this.z - P.z, ol = Math.hypot(ox, oz) || 1;
    if (Math.sin(run.time * 0.19 + 2) > 0.95) this.dir = -this.dir;
    const tx = P.x + ox / ol * want - oz / ol * this.dir * 3, tz = P.z + oz / ol * want + ox / ol * this.dir * 3;
    const ex = tx - this.x, ez = tz - this.z, el = Math.hypot(ex, ez) || 1;
    this.vx += ((sp ? ex / el * Math.min(sp, el) : 0) - this.vx) * Math.min(1, dt * 1.5);
    this.vz += ((sp ? ez / el * Math.min(sp, el) : 0) - this.vz) * Math.min(1, dt * 1.5);
    this.x += this.vx * dt; this.z += this.vz * dt;
    this.x = Math.max(A.minX, Math.min(A.maxX, this.x)); this.z = Math.max(A.minZ, Math.min(A.maxZ, this.z));
    this.y += (wantY - this.y) * Math.min(1, dt * ease);

    // You cannot walk (or jump) through it.
    const cy = P.y + 0.9, d3 = Math.hypot(P.x - this.x, cy - this.y, P.z - this.z), m = H.r + P.r + 0.2;
    if (d3 < m && this.state !== "rise") {
      const hx = P.x - this.x, hz = P.z - this.z, hl = Math.hypot(hx, hz) || 1, push = m - d3;
      P.x += hx / hl * push; P.z += hz / hl * push;
    }
  }

  pickAttack(run) {
    // Worn out after a few: a yawn, its core open.
    if (this.attacks >= this.yawnAfter) {
      this.attacks = 0;
      this.yawnAfter = HEART.yawn.every[0] + Math.floor(run.rnd() * (HEART.yawn.every[1] - HEART.yawn.every[0] + 1)) + (this.phase === 2 ? 1 : 0);
      this.set("yawn");
      run.events.push({ type: "heartYawn", x: this.x, z: this.z });
      run.events.push({ type: "bossWeak", kind: this.kind });
      return;
    }
    this.attacks++;
    const minions = run.foes.filter((f) => f.alive && f.group === "boss").length;
    const r = run.rnd();
    const s = r < 0.27 ? "alarm" : r < 0.54 ? "slam" : r < 0.8 || minions >= HEART.wakeUp.max ? "beans" : "wake";
    this.set(s);
    run.events.push({ type: "bossAttack", attack: s });
  }
}
