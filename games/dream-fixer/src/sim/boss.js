import { Body } from "./player.js";
import { PenBoss } from "./boss-pen.js";
import { CookerBoss } from "./boss-cooker.js";
import { ClockBoss } from "./boss-clock.js";
import { MoonBoss } from "./boss-moon.js";
import { HeartBoss } from "./boss-heart.js";

// ── The Vacuum Cleaner (Biscuit's nightmare) ──────────────────────────────
// Comes up out of the lawn once all three anchors hold.
//
//  roam    rolls after you, keeping a few metres off
//  suck    points its hose and pulls you in; too close and it gulps you
//          (and spits you back out). A caught fuzz fired from the Fuzz
//          Vacuum into its open nozzle clogs it.
//  clogged coughs and shakes for a while: every hit counts triple
//  burp    puffs a few fuzzes out of its bag
//  (phase two, below half) sweep: its cord lashes round in a ring you
//          must jump over; volley: a fan of dust orbs
//
// Shots anywhere hurt it; its glowing dust bag on the back takes more.

export const BOSS = {
  hp: 110, r: 1.25, h: 2.4,
  speed: [2.6, 3.4],
  gulp: 16, sweep: 12, orbDmg: 8,
  bagMul: 2.5, clogMul: 3,
};

const SHOULDER = [-1.0, 1.05, -0.72];
const HOSE = 2.2;

export class VacuumBoss {
  kind = "vacuum";
  constructor(run, x, z, arena) {
    const y = run.kit.floorAt(x, z);
    this.body = new Body(x, y, z, { radius: BOSS.r, height: BOSS.h, step: 0.5, speed: BOSS.speed[0], accel: 12, jump: 0 });
    this.body.grounded = true;
    this.arena = arena;
    this.hp = this.maxHp = BOSS.hp;
    this.phase = 1;
    this.state = "rise"; this.t = 0;
    this.yaw = 0; this.aimYaw = 0; this.aimPitch = 0;
    this.rise = 0;               // 0 → 1 while it comes up
    this.flash = 0;
    this.cd = 2;
    this.minions = 0;
    this.ring = null;            // the cord sweep: { r, hit }
    this.alive = true;
    this.lx = x; this.ly = y; this.lz = z;
    this.nozzle = [x, y + 1, z];
  }

  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }
  get invulnerable() { return this.state === "rise" || this.state === "roar" || this.state === "down"; }

  set(s) { this.state = s; this.t = 0; }

  // Where the parts are in the world this step.
  pose() {
    const b = this.body, sn = Math.sin(this.yaw), cs = Math.cos(this.yaw);
    const sx = b.x + SHOULDER[0] * cs + SHOULDER[2] * sn, sz = b.z - SHOULDER[0] * sn + SHOULDER[2] * cs, sy = b.y + SHOULDER[1];
    const cp = Math.cos(this.aimPitch);
    const dx = -Math.sin(this.aimYaw) * cp, dy = Math.sin(this.aimPitch), dz = -Math.cos(this.aimYaw) * cp;
    this.nozzle[0] = sx + dx * HOSE; this.nozzle[1] = sy + dy * HOSE; this.nozzle[2] = sz + dz * HOSE;
    this.nozzleDir = [dx, dy, dz];
    // Bag on the back.
    this.bag = [b.x + sn * 1.25, b.y + 1.35, b.z + cs * 1.25];
  }

  // Spheres the player's shots can hit: [x, y, z, r, damage multiplier].
  hitSpheres() {
    const b = this.body, mul = this.state === "clogged" ? BOSS.clogMul : 1;
    return [
      [this.bag[0], this.bag[1], this.bag[2], 0.7, BOSS.bagMul * mul, "bag"],
      [b.x, b.y + 1.2, b.z, 1.35, mul, "body"],
      [b.x, b.y + 2.0, b.z, 0.95, mul, "body"],
    ];
  }

  damage(run, dmg, part) {
    if (this.invulnerable || !this.alive) return false;
    this.hp -= dmg;
    this.flash = 1;
    run.events.push({ type: "bossHit", part, dmg });
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.body.P.speed = BOSS.speed[1];
      this.set("roar");
      run.events.push({ type: "bossPhase", phase: 2, kind: this.kind });
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.set("down");
      for (const f of run.foes) if (f.alive && f.group === "boss") { f.alive = false; run.events.push({ type: "pop", kind: f.kind, id: f.id, x: f.px, y: f.cy, z: f.pz, calm: true }); }
      run.events.push({ type: "bossDown" });
    }
    return true;
  }

  // A yarn ball from the Fuzz Vacuum: into the open nozzle clogs it.
  ballHit(run, g) {
    if (!this.alive) return false;
    const n = this.nozzle;
    if (this.state === "suck" && (g.x - n[0]) ** 2 + (g.y - n[1]) ** 2 + (g.z - n[2]) ** 2 < 1.5 ** 2) {
      this.set("clogged");
      this.damage(run, g.dmg, "nozzle");
      run.events.push({ type: "bossClog", x: n[0], y: n[1], z: n[2] });
      return true;
    }
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
    const dx = P.x - b.x, dz = P.z - b.z, dist = Math.hypot(dx, dz);
    const toYou = Math.atan2(-dx, -dz);
    const turn = (want, rate) => {
      const d = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
      this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d));
    };
    // Hose aims at your chest from the shoulder (with a little lag).
    this.pose();
    const hx = P.x - (this.nozzle[0] - this.nozzleDir[0] * HOSE), hy = P.y + 1.1 - (this.nozzle[1] - this.nozzleDir[1] * HOSE), hz = P.z - (this.nozzle[2] - this.nozzleDir[2] * HOSE);
    // Hose held up to the side like a trunk, except when it sucks or spits.
    const aiming = this.state === "suck" || this.state === "volley";
    const wantAY = aiming ? Math.atan2(-hx, -hz) : this.yaw + 0.85;
    const wantAP = aiming ? Math.max(-0.7, Math.min(0.5, Math.atan2(hy, Math.hypot(hx, hz)))) : 0.55 + Math.sin(run.time * 1.3) * 0.1;
    const aimRate = this.state === "suck" ? 1.6 : 2.5;
    const da = Math.atan2(Math.sin(wantAY - this.aimYaw), Math.cos(wantAY - this.aimYaw));
    this.aimYaw += Math.max(-aimRate * dt, Math.min(aimRate * dt, da));
    this.aimPitch += (wantAP - this.aimPitch) * Math.min(1, dt * 3);
    // Keep the hose on its own side: no further than ~70° off the face.
    const off = Math.atan2(Math.sin(this.aimYaw - this.yaw), Math.cos(this.aimYaw - this.yaw));
    if (Math.abs(off) > 1.2) this.aimYaw = this.yaw + Math.sign(off) * 1.2;

    let intent = { forward: 0, strafe: 0 };
    switch (this.state) {
      case "rise":
        this.rise = Math.min(1, this.t / 2.6);
        if (this.t > 3) { this.set("roam"); this.cd = 1.5; }
        break;
      case "roam": {
        turn(toYou, 2);
        // Keep ~7 m off, circling a bit; stay inside the arena.
        intent.forward = dist > 8 ? 1 : dist < 5 ? -0.6 : 0;
        intent.strafe = Math.sin(run.time * 0.5) * 0.6;
        if (this.cd <= 0 && this.t > 1.2) this.pickAttack(run, dist);
        break;
      }
      case "suck": {
        turn(toYou, 1.2);
        if (this.t < 0.6) break;                 // winding up (it inhales)
        const n = this.nozzle;
        const ex = n[0] - P.x, ey = n[1] - (P.y + 1), ez = n[2] - P.z, el = Math.hypot(ex, ey, ez);
        // In front of the nozzle and not too far: pulled in.
        const facing = -(ex * this.nozzleDir[0] + ez * this.nozzleDir[2]) / Math.max(0.01, Math.hypot(ex, ez));
        if (el < 16 && facing > 0.2) {
          // A drift towards the nozzle, stronger up close: running away
          // still wins, standing still does not.
          const h = Math.hypot(ex, ez) || 1;
          const v = (2.2 + 4.2 * Math.max(0, 1 - el / 15)) * (this.phase === 2 ? 1.2 : 1);
          P.pushX += ex / h * v; P.pushZ += ez / h * v;
        }
        if (el < 2.3) {
          // Gulp! and spat back out.
          run.hurt(BOSS.gulp, n[0], n[2]);
          P.vx = -ex / el * 11; P.vz = -ez / el * 11; P.vy = 6.5; P.grounded = false;
          run.events.push({ type: "bossGulp" });
          this.set("roam"); this.cd = 2.5;
          break;
        }
        // It sucks up loose dust too.
        for (const m of run.dustMotes) {
          const mx = n[0] - m.x, my = n[1] - m.y, mz = n[2] - m.z, ml = Math.hypot(mx, my, mz);
          if (ml < 7) { m.vx += mx / ml * 30 * dt; m.vy += my / ml * 30 * dt; m.vz += mz / ml * 30 * dt; if (ml < 0.8) m.got = true; }
        }
        if (this.t > 5) { this.set("roam"); this.cd = 2 + run.rnd(); }
        break;
      }
      case "clogged":
        if (this.t > 5.5) { this.set("roam"); this.cd = 1.5; run.events.push({ type: "bossUnclog" }); }
        break;
      case "burp":
        turn(toYou, 1.5);
        if (this.t > 0.8 && !this.burped) {
          this.burped = true;
          const n = this.phase === 1 ? 3 : 4;
          for (let i = 0; i < n; i++) {
            const a = this.yaw + Math.PI + (i - (n - 1) / 2) * 0.6;
            run.spawn("fuzz", b.x - Math.sin(a) * 2.2, b.z - Math.cos(a) * 2.2, { group: "boss" });
          }
          run.events.push({ type: "bossBurp", x: this.bag[0], y: this.bag[1], z: this.bag[2] });
        }
        if (this.t > 1.8) { this.set("roam"); this.cd = 2 + run.rnd(); }
        break;
      case "sweep":
        if (this.t > 0.7 && !this.ring && !this.fired) { this.fired = true; this.ring = { r: 1.4, hit: false, y: b.y }; run.events.push({ type: "bossSweep" }); }
        if (this.ring) {
          const R = this.ring;
          R.r += dt * 8.5;
          // Crossing you on the ground hurts; jumping over it is the answer.
          if (!R.hit && Math.abs(dist - R.r) < 0.55 && P.y - R.y < 0.5) {
            R.hit = true;
            run.hurt(BOSS.sweep, b.x, b.z);
            P.vx += dx / dist * 6; P.vz += dz / dist * 6; P.vy = 4.5; P.grounded = false;
          }
          if (R.r > 17) this.ring = null;
        }
        if (this.t > 2.8) { this.set("roam"); this.cd = 1.5 + run.rnd(); this.ring = null; }
        break;
      case "volley":
        turn(toYou, 2);
        if (this.t > 0.7 && !this.fired) {
          this.fired = true;
          const n = this.nozzle;
          for (let i = -2; i <= 2; i++) {
            const a = this.aimYaw + i * 0.2, v = 9;
            const ey = (P.y + 1.1 - n[1]) / Math.max(dist, 1);
            run.spit({ x: n[0], y: n[1], z: n[2], vx: -Math.sin(a) * v, vy: ey * v, vz: -Math.cos(a) * v, dmg: BOSS.orbDmg, owner: 0 });
          }
        }
        if (this.t > 1.6) { this.set("roam"); this.cd = 1.8 + run.rnd(); }
        break;
      case "roar":
        if (this.t > 0.6 && !this.burped) {
          this.burped = true;
          for (let i = 0; i < 4; i++) {
            const a = i / 4 * Math.PI * 2;
            run.spawn("fuzz", b.x - Math.sin(a) * 3, b.z - Math.cos(a) * 3, { group: "boss" });
          }
        }
        if (this.t > 2.2) { this.set("roam"); this.cd = 1; }
        break;
      case "down":
        if (this.t > 2.4 && this.alive) {
          this.alive = false;
          run.dropDust(b.x, b.y + 1.5, b.z, 40);
          run.events.push({ type: "bossPop", x: b.x, y: b.y + 1.4, z: b.z });
        }
        break;
    }
    if (this.state !== "burp" && this.state !== "roar") this.burped = false;
    if (this.state !== "volley" && this.state !== "sweep") this.fired = false;
    // Move (never outside the arena).
    b.yaw = this.yaw;
    const moving = this.state === "roam";
    b.step(run.world, moving ? intent : { forward: 0, strafe: 0 }, dt, moving ? 1 : 0);
    const A = this.arena;
    b.x = Math.max(A.minX, Math.min(A.maxX, b.x)); b.z = Math.max(A.minZ, Math.min(A.maxZ, b.z));
    // You cannot walk through it.
    const pd = Math.hypot(P.x - b.x, P.z - b.z), m = BOSS.r + P.r;
    if (this.alive && pd < m && pd > 1e-3 && P.y < b.y + BOSS.h) { P.x = b.x + (P.x - b.x) / pd * m; P.z = b.z + (P.z - b.z) / pd * m; }
    this.pose();
  }

  pickAttack(run, dist) {
    const minions = run.foes.filter((f) => f.alive && f.group === "boss").length;
    const r = run.rnd();
    let s;
    if (this.phase === 1) s = minions < 3 && r < 0.4 ? "burp" : "suck";
    else s = r < 0.35 ? "suck" : r < 0.7 ? "sweep" : minions < 3 && r < 0.85 ? "burp" : "volley";
    if (s === "suck" && dist > 14) s = this.phase === 1 ? "burp" : "volley";
    this.set(s);
    run.events.push({ type: "bossAttack", attack: s });
  }
}

// ── Every nightmare, by the kind a level's `boss` names ──
// A boss is stepped by the Run and must offer: alive, hp, maxHp, x/y/z,
// invulnerable, hitSpheres() → [[x, y, z, r, damage multiplier, part]],
// damage(run, dmg, part) and step(run, dt). It may offer ballHit(run, g),
// splash(run, g), blasted(run, ax, az, def) and foamed(run, amount, part)
// for what the tools throw at it.
export const BOSSES = { vacuum: VacuumBoss, pen: PenBoss, cooker: CookerBoss, bigclock: ClockBoss, moon: MoonBoss, insomnia: HeartBoss };
