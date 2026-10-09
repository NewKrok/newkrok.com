import { clamp, dampAngle, angDiff } from "../config.js";
import { Body } from "./body.js";

// ── The Hive ─────────────────────────────────────────────────────────────
// The bugs are nearly blind. They hear footsteps and shots and feel the
// ground; only the sentries see, and a sentry that spots you shrieks the
// whole area awake. A bug that notices something calls the ones around it
// (a chittering wave spreads through a nest), searches where the noise was,
// and hunts whoever it finds. It loses you if you go quiet long enough.
//
// States: idle (wander round home) → search (go to a noise, look about)
// → hunt (go for a target and attack) → back to search / idle. Dead bugs
// stay a moment for the renderer, then go.

export const BUGS = {
  // Small, fast, many. Bites, and leaps the last few metres.
  swarmer: { hp: 48, speed: 7.4, wander: 1.8, radius: 0.42, height: 0.7, hearing: 1, bite: 8, reach: 1.45, biteCool: 0.85, leap: true, xp: 10 },
  // Keeps its distance and lobs acid. Its glowing sac is the soft spot.
  spitter: { hp: 115, speed: 4.6, wander: 1.4, radius: 0.6, height: 1.2, hearing: 1.1, spit: 15, near: 9, far: 24, spitCool: 2.6, xp: 25 },
  // Armoured head-on; charges in a straight line and stuns itself on walls.
  charger: { hp: 400, speed: 3.6, wander: 1.2, radius: 0.95, height: 1.5, hearing: 0.9, ram: 28, chargeSpeed: 15, xp: 60 },
  // Sees (and only sees): a long look at you and it shrieks.
  sentry: { hp: 80, speed: 3.2, wander: 0.8, radius: 0.5, height: 1.7, hearing: 0.6, sight: 34, fov: 1.05, xp: 30 },
};

let nextId = 1;

export class Bug {
  constructor(type, x, y, z, o = {}) {
    this.id = nextId++;
    this.type = type;
    this.def = BUGS[type] ?? o.def;
    const d = this.def;
    this.body = new Body(x, y, z, { radius: d.radius, height: d.height, step: 0.9, jump: 6, gravity: 22, fallGravity: 26, accel: 40, friction: 10 });
    this.hp = d.hp * (o.hpMul ?? 1); this.maxHp = this.hp;
    this.face = o.yaw ?? Math.random() * Math.PI * 2;
    this.home = { x, z, r: o.roam ?? 7 };
    this.state = "idle"; this.stateT = 0;
    this.target = null; this.knownX = x; this.knownZ = z; this.lostT = 0;
    this.goalX = x; this.goalZ = z;
    this.alive = true; this.deadT = 0;
    this.hidden = false; this.emergeT = 0;
    this.act = "idle"; this.actT = 0;       // what the renderer shows
    this.cool = 1 + Math.random();
    this.detect = 0;                        // sentry: how close it is to shrieking
    this.boundR = Math.max(d.radius * 1.6, d.height * 0.8);
    this._s = [];
    this.hitT = 0;
    this.stunT = 0;
    this.called = false;
    this.pathKey = `bug${this.id}`;
    this.tag = o.tag ?? null;
    if (o.emerge) { this.hidden = true; this.emergeT = 0.9 + Math.random() * 0.6; this.act = "emerge"; }
    if (o.hunt) this.hunt(null, o.hunt, false);
  }

  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z; }

  // Hit spheres [x, y, z, r, part, …], in the world, for this step.
  spheres() {
    const s = this._s; s.length = 0;
    const b = this.body, fx = -Math.sin(this.face), fz = -Math.cos(this.face);
    const add = (f, up, r, part) => s.push(b.x + fx * f, b.y + up, b.z + fz * f, r, part);
    switch (this.type) {
      case "swarmer": add(-0.1, 0.38, 0.42, "body"); add(0.45, 0.42, 0.26, "head"); break;
      case "spitter": add(0, 0.7, 0.62, "body"); add(-0.55, 1.05, 0.36, "sac"); add(0.6, 0.75, 0.3, "head"); break;
      case "charger": add(1.0, 0.85, 0.72, "plate"); add(-0.1, 0.9, 0.9, "body"); add(-1.0, 1.0, 0.5, "back"); break;
      case "sentry": add(0, 0.95, 0.45, "body"); add(0.1, 1.6, 0.3, "head"); break;
    }
    return s;
  }

  // ── Damage ── returns true when it glanced off armour.
  damage(run, dmg, src, part, dx = 0, dz = 0, quiet = false) {
    if (!this.alive || this.hidden) return false;
    let k = 1, armour = false;
    if (part === "head") k = this.type === "sentry" ? 2.5 : 1.6;
    else if (part === "sac") k = 2;
    else if (part === "back") k = 1.8;
    else if (part === "plate") { if (this.stunT > 0) k = 0.6; else { k = 0.1; armour = true; } }
    if (this.type === "charger" && part === "blast") k = 0.7;
    this.hp -= dmg * k;
    this.hitT = 0.12;
    if (!quiet || this.hp <= 0) run.fx({ type: "bugHit", id: this.id, part, armour, x: this.x, y: this.y + this.def.height * 0.6, z: this.z });
    if (this.hp <= 0) { this.die(run, src); return armour; }
    // Shot: it knows roughly where from. A quiet weapon (or a sentry's
    // slow wits) gives a moment to finish it before it reacts.
    if (src && src.body && this.state !== "hunt" && this.state !== "shriek") {
      if (quiet || this.type === "sentry") { if (this.startle == null) { this.startle = 0.55; this.startleSrc = src; } }
      else this.hunt(run, src, true);
    }
    return armour;
  }

  die(run, src) {
    this.alive = false; this.deadT = 0; this.act = "die"; this.actT = 0;
    run.onBugDeath(this, src);
  }

  // ── Senses ──
  hear(run, n) {
    if (!this.alive || this.hidden || n.src === this) return;
    const d = Math.hypot(n.x - this.x, n.z - this.z);
    let r = n.r * this.def.hearing;
    if (d > r) return;
    if (!run.space.clear(this.x, this.y + 0.8, this.z, n.x, run.space.terrain.height(n.x, n.z) + 1, n.z)) { r *= 0.6; if (d > r) return; }
    const team = n.src && n.src.body && (n.src.kind === "player" || n.src.kind === "ally");
    if (this.state === "hunt") {
      if (team && n.src === this.target) { this.knownX = n.x; this.knownZ = n.z; this.lostT = 0; }
      else if (team && this.target && Math.hypot(this.target.body.x - this.x, this.target.body.z - this.z) > d + 6 && !n.src.downed) this.hunt(run, n.src, false);
      return;
    }
    if (team && !n.src.downed && (n.loud || d < r * 0.45 || this.state === "search" && d < r * 0.7)) this.hunt(run, n.src, true);
    else if (this.state !== "search" || Math.hypot(n.x - this.goalX, n.z - this.goalZ) > 4) this.search(n.x, n.z);
  }

  search(x, z) {
    if (this.type === "sentry") { this.face = Math.atan2(-(x - this.x), -(z - this.z)); this.detect = Math.max(this.detect, 0.3); return; }
    this.state = "search"; this.stateT = 6 + Math.random() * 3;
    this.goalX = x + (Math.random() - 0.5) * 4; this.goalZ = z + (Math.random() - 0.5) * 4;
    this.act = "alert"; this.actT = 0;
  }

  hunt(run, target, call) {
    if (!target || target.downed) return;
    if (this.type === "sentry") { if (run) this.shriek(run, target); return; }
    const was = this.state;
    this.state = "hunt"; this.target = target; this.lostT = 0;
    this.knownX = target.body.x; this.knownZ = target.body.z;
    if (run && was !== "hunt") {
      run.fx({ type: "bugAlert", id: this.id, x: this.x, y: this.y, z: this.z, bug: this.type });
      if (call && !this.called) { this.called = true; run.alertBugs(this.x, this.z, 13, target, this); }
      run.onEngage(this, target);
    }
  }

  shriek(run, target) {
    if (this.state === "shriek" || !this.alive) return;
    this.state = "shriek"; this.stateT = 1.4; this.act = "shriek"; this.actT = 0;
    this.target = target;
    run.fx({ type: "shriek", id: this.id, x: this.x, y: this.y, z: this.z });
    run.onSpotted(this, target);
  }

  // ── One step ──
  step(run, dt) {
    const b = this.body, d = this.def;
    this.actT += dt; this.hitT -= dt; this.cool -= dt;
    if (!this.alive) { this.deadT += dt; b.step(run.space, { vx: 0, vz: 0 }, dt); return; }
    if (this.hidden) {
      this.emergeT -= dt;
      if (this.emergeT <= 0) { this.hidden = false; this.act = "emerge"; this.actT = 0; run.fx({ type: "emerge", x: this.x, y: this.y, z: this.z }); }
      return;
    }
    if (this.startle != null) {
      this.startle -= dt;
      if (this.startle <= 0) {
        const src = this.startleSrc; this.startle = null;
        if (this.type === "sentry") this.shriek(run, src); else this.hunt(run, src, true);
      }
    }
    if (this.stunT > 0) { this.stunT -= dt; b.step(run.space, { vx: 0, vz: 0 }, dt); if (this.stunT <= 0) this.act = "walk"; return; }

    let wx = 0, wz = 0, speed = 0;
    const T = this.target;
    if (this.state === "hunt" && T) {
      if (T.downed) {
        // Lost interest in someone who is down: the other one, else search.
        const other = T === run.player ? run.ally : run.player;
        if (other && !other.downed && Math.hypot(other.body.x - this.x, other.body.z - this.z) < 30) this.hunt(run, other, false);
        else this.search(T.body.x, T.body.z);
      } else {
        const td = Math.hypot(T.body.x - this.x, T.body.z - this.z);
        // Close by, it feels you whatever you do.
        if (td < 6) { this.knownX = T.body.x; this.knownZ = T.body.z; this.lostT = 0; } else this.lostT += dt;
        if (this.lostT > 7) this.search(this.knownX, this.knownZ);
        else [wx, wz, speed] = this.#attack(run, T, td, dt);
      }
    } else if (this.state === "search") {
      this.stateT -= dt;
      const gd = Math.hypot(this.goalX - this.x, this.goalZ - this.z);
      if (gd > 1.5) { [wx, wz] = this.#way(run, this.goalX, this.goalZ, `pt`); speed = d.speed * 0.6; }
      else if (Math.random() < dt * 0.8) { this.goalX = this.x + (Math.random() - 0.5) * 8; this.goalZ = this.z + (Math.random() - 0.5) * 8; }
      if (this.stateT <= 0) { this.state = "idle"; this.called = false; this.act = "idle"; }
      // Feel anyone who walks right up.
      this.#feel(run);
    } else if (this.state === "shriek") {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        // Shrieked: it scuttles off to a new perch.
        this.state = "idle"; this.detect = 0.5;
        this.home.x += (Math.random() - 0.5) * 10; this.home.z += (Math.random() - 0.5) * 10;
      }
    } else {
      // Idle: potter about home, now and then stop and listen.
      this.stateT -= dt;
      if (this.stateT <= 0) {
        this.stateT = 2 + Math.random() * 4;
        const a = Math.random() * Math.PI * 2, r = Math.random() * this.home.r;
        this.goalX = this.home.x + Math.sin(a) * r; this.goalZ = this.home.z + Math.cos(a) * r;
        this.pause = Math.random() < 0.4;
      }
      const gd = Math.hypot(this.goalX - this.x, this.goalZ - this.z);
      // A sentry that has something in sight stands still and stares.
      const staring = this.type === "sentry" && (this.watching || this.detect > 0.15);
      if (!this.pause && !staring && gd > 0.8) {
        wx = (this.goalX - this.x) / gd; wz = (this.goalZ - this.z) / gd; speed = d.wander;
        if (gd > this.home.r * 2.5) { [wx, wz] = this.#way(run, this.goalX, this.goalZ, "home"); speed = d.speed * 0.5; }
      }
      this.#feel(run);
      if (this.type === "sentry") this.#look(run, dt);
    }

    // Keep apart from each other.
    for (const o of run.bugs) {
      if (o === this || !o.alive || o.hidden) continue;
      const dx = this.x - o.x, dz = this.z - o.z, dd = Math.hypot(dx, dz), min = this.def.radius + o.def.radius;
      if (dd < min && dd > 1e-4) { b.x += dx / dd * (min - dd) * 0.5; b.z += dz / dd * (min - dd) * 0.5; }
    }

    if (this.act !== "charge" && this.act !== "leap") b.step(run.space, { vx: wx * speed, vz: wz * speed }, dt);
    else this.#lunge(run, dt);
    if (speed > 0.3 && this.act !== "spit" && this.act !== "windup") this.face = dampAngle(this.face, Math.atan2(-wx, -wz), 8, dt);
    if (this.act === "idle" || this.act === "walk" || this.act === "alert") this.act = b.speed2D > 0.4 ? "walk" : this.act === "alert" && this.actT < 0.6 ? "alert" : "idle";
    if (b.fell) { this.alive = false; this.deadT = 99; }
  }

  #feel(run) {
    for (const t of [run.player, run.ally]) {
      if (!t || t.downed) continue;
      const dd = Math.hypot(t.body.x - this.x, t.body.z - this.z);
      if (dd < (t.body.speed2D > 1 ? 3 : 1.6) * (t.crouchK > 0.5 ? 0.6 : 1)) { this.hunt(run, t, true); return; }
    }
  }

  // Sentries: a cone of sight, blocked by walls; crouching and cover help.
  #look(run, dt) {
    const d = this.def;
    let seen = null, best = 0;
    for (const t of [run.player, run.ally]) {
      if (!t || t.downed) continue;
      const dx = t.body.x - this.x, dz = t.body.z - this.z, dist = Math.hypot(dx, dz);
      if (dist > d.sight) continue;
      const a = Math.abs(angDiff(this.face, Math.atan2(-dx, -dz)));
      if (a > d.fov && dist > 4) continue;
      const ty = t.body.y + t.body.h * 0.8;
      if (!run.space.clear(this.x, this.y + 1.6, this.z, t.body.x, ty, t.body.z)) continue;
      const k = t.exposure * (1.25 - dist / d.sight) * (a < d.fov * 0.5 ? 1.2 : 0.7);
      if (k > best) { best = k; seen = t; }
    }
    if (seen) {
      this.detect += dt * best * 0.5;
      this.watching = seen;
      this.face = dampAngle(this.face, Math.atan2(-(seen.body.x - this.x), -(seen.body.z - this.z)), 2, dt);
      if (this.detect >= 1) this.shriek(run, seen);
    } else {
      this.detect = Math.max(0, this.detect - dt * 0.2);
      this.watching = null;
      // Sweep the view now and then.
      if (Math.random() < dt * 0.3) this.face += (Math.random() - 0.5) * 1.6;
    }
  }

  // Wanted direction to (gx, gz): straight when it can, else the field.
  #way(run, gx, gz, key) {
    const dx = gx - this.x, dz = gz - this.z, dist = Math.hypot(dx, dz) || 1;
    if (dist < 14 && run.space.clear(this.x, this.y + 0.5, this.z, gx, run.space.terrain.height(gx, gz) + 0.5, gz)) return [dx / dist, dz / dist];
    const f = run.nav.field(key === "pt" ? `pt${Math.round(gx / 4)},${Math.round(gz / 4)}` : key === "home" ? `home${this.id}` : key, gx, gz, run.time, key === "pt" ? 2 : 0.35);
    const w = run.nav.dir(f, this.x, this.z);
    return w ?? [dx / dist, dz / dist];
  }

  // ── Attacks ── returns [wx, wz, speed].
  #attack(run, T, td, dt) {
    const d = this.def, b = this.body;
    const tx = T.body.x, tz = T.body.z;
    const key = T.kind === "player" ? "player" : "ally";
    const faceT = () => { this.face = dampAngle(this.face, Math.atan2(-(tx - this.x), -(tz - this.z)), 10, dt); };
    if (this.act === "bite" || this.act === "spit" || this.act === "windup" || this.act === "recover") {
      faceT();
      if (this.act === "bite" && this.actT >= 0.22 && !this.struck) {
        this.struck = true;
        if (td < d.reach + 0.5) T.hurt(run, d.bite, this.x, this.z, "bite");
      }
      if (this.act === "spit" && this.actT >= 0.55 && !this.struck) { this.struck = true; run.spit(this, T); }
      if (this.act === "windup" && this.actT >= 0.8) {
        // Charge: straight at where it last saw you.
        const dx = tx - this.x, dz = tz - this.z, l = Math.hypot(dx, dz) || 1;
        this.cx = dx / l; this.cz = dz / l; this.act = "charge"; this.actT = 0; this.struck = false;
        run.fx({ type: "charge", id: this.id, x: this.x, y: this.y, z: this.z });
        run.noise(this.x, this.z, 10, this, false);
      }
      const done = this.act === "bite" ? 0.55 : this.act === "spit" ? 0.9 : this.act === "recover" ? 0.6 : 99;
      if (this.actT >= done) { this.act = "walk"; this.actT = 0; }
      return [0, 0, 0];
    }
    const [wx, wz] = this.#way(run, this.knownX, this.knownZ, key);
    switch (this.type) {
      case "swarmer": {
        if (td < d.reach && this.cool <= 0) { this.act = "bite"; this.actT = 0; this.struck = false; this.cool = d.biteCool; return [0, 0, 0]; }
        if (d.leap && td < 5.5 && td > 2.6 && this.cool <= 0 && b.grounded && run.space.clear(this.x, this.y + 0.5, this.z, tx, T.body.y + 0.5, tz)) {
          const l = td;
          b.vx = (tx - this.x) / l * 9; b.vz = (tz - this.z) / l * 9; b.vy = 5.2; b.grounded = false;
          this.act = "leap"; this.actT = 0; this.struck = false; this.cool = 1.6;
          run.fx({ type: "leap", id: this.id, x: this.x, y: this.y, z: this.z });
          return [0, 0, 0];
        }
        return [wx, wz, d.speed];
      }
      case "spitter": {
        const see = td < d.far && run.space.clear(this.x, this.y + 1.1, this.z, tx, T.body.y + 1, tz);
        if (see && this.cool <= 0 && td > 3) { this.act = "spit"; this.actT = 0; this.struck = false; this.cool = d.spitCool + Math.random(); return [0, 0, 0]; }
        if (see && td < d.near) return [-(tx - this.x) / td, -(tz - this.z) / td, d.speed * 0.8];
        if (see && td < d.far * 0.8) {
          // Sidestep while it reloads.
          const s = Math.sin(run.time * 0.7 + this.id) > 0 ? 1 : -1;
          return [-(tz - this.z) / td * s, (tx - this.x) / td * s, d.speed * 0.5];
        }
        return [wx, wz, d.speed];
      }
      case "charger": {
        const see = run.space.clear(this.x, this.y + 0.8, this.z, tx, T.body.y + 0.8, tz);
        if (see && td < 16 && td > 4 && this.cool <= 0) { this.act = "windup"; this.actT = 0; this.cool = 4.5; run.fx({ type: "windup", id: this.id, x: this.x, y: this.y, z: this.z }); return [0, 0, 0]; }
        if (td < 2.6 && this.cool <= 2) { this.act = "bite"; this.actT = 0; this.struck = false; this.cool = 3; return [0, 0, 0]; }
        return [wx, wz, d.speed];
      }
    }
    return [wx, wz, d.speed];
  }

  // Leaps and charges move on their own.
  #lunge(run, dt) {
    const b = this.body, d = this.def;
    if (this.act === "leap") {
      b.step(run.space, { vx: b.vx, vz: b.vz }, dt, 0);
      if (!this.struck) for (const t of [run.player, run.ally]) {
        if (!t || t.downed) continue;
        if (Math.hypot(t.body.x - this.x, t.body.z - this.z) < d.radius + 0.7 && Math.abs(t.body.y + 0.8 - this.y) < 1.4) { this.struck = true; t.hurt(run, d.bite * 1.3, this.x, this.z, "leap"); }
      }
      if (b.grounded && this.actT > 0.15) { this.act = "walk"; this.actT = 0; }
      return;
    }
    // Charge.
    const sp = d.chargeSpeed;
    const ox = b.x, oz = b.z;
    b.step(run.space, { vx: this.cx * sp, vz: this.cz * sp }, dt, 6);
    this.face = Math.atan2(-this.cx, -this.cz);
    if (!this.struck) for (const t of [run.player, run.ally]) {
      if (!t || t.downed) continue;
      if (Math.hypot(t.body.x - this.x, t.body.z - this.z) < d.radius + 0.8) {
        this.struck = true;
        t.hurt(run, d.ram, this.x, this.z, "ram");
        t.body.vx += this.cx * 9; t.body.vz += this.cz * 9; t.body.vy = 4; t.body.grounded = false;
        run.fx({ type: "ram", x: t.body.x, y: t.body.y, z: t.body.z });
      }
    }
    const moved = Math.hypot(b.x - ox, b.z - oz);
    if (this.actT > 0.25 && moved < sp * dt * 0.35) {
      // Into a wall: dazed, with its back open.
      this.act = "stun"; this.actT = 0; this.stunT = 2.4;
      run.fx({ type: "stun", id: this.id, x: this.x, y: this.y + 1, z: this.z });
      run.noise(this.x, this.z, 14, this, false);
    } else if (this.actT > 1.5) { this.act = "recover"; this.actT = 0; }
  }

  get gone() { return !this.alive && this.deadT > 2.5; }
  get alarmed() { return this.state === "hunt" || this.state === "shriek"; }
}

export { clamp };
