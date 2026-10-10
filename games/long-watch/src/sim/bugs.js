import { clamp, dampAngle, angDiff } from "../config.js";
import { Body } from "./body.js";

// ── The Hive ─────────────────────────────────────────────────────────────
// The bugs see and hear. One that spots or hears something calls the ones
// around it (a chittering wave spreads through a pack), searches where the
// noise was, and hunts whoever it finds: the ranger, a defender or the
// reactor. Waves come up out of the burrows already hunting the reactor
// and turn on anyone who gets in the way. Patrols wander the whole area
// from point to point.
//
// States: idle (wander round home) / patrol (point to point) → search (go
// to a noise, look about) → hunt (go for a target and attack) → back to
// search / idle. Dead bugs stay a moment for the renderer, then go.

export const BUGS = {
  // Small, fast, many. Bites, and leaps the last few metres.
  swarmer: { hp: 48, speed: 6.3, wander: 1.8, radius: 0.42, height: 0.7, hearing: 1, sight: 24, bite: 8, reach: 1.45, biteCool: 0.85, leap: true, crystal: 3 },
  // Keeps its distance and lobs acid. Its glowing sac is the soft spot.
  spitter: { hp: 115, speed: 4.6, wander: 1.4, radius: 0.6, height: 1.2, hearing: 1.1, sight: 28, spit: 15, near: 9, far: 24, spitCool: 2.6, crystal: 7 },
  // Armoured head-on; charges in a straight line and stuns itself on walls.
  charger: { hp: 400, speed: 3.6, wander: 1.2, radius: 0.95, height: 1.5, hearing: 0.9, sight: 22, ram: 28, chargeSpeed: 15, bite: 22, reach: 1.8, crystal: 18 },
  // Sees far and shrieks the area awake (kept from the old mode; not spawned by the siege).
  sentry: { hp: 80, speed: 3.2, wander: 0.8, radius: 0.5, height: 1.7, hearing: 0.6, sight: 34, fov: 1.05, crystal: 10 },
  // The skimmer: flies, never attacks, runs from anyone who comes near, and is full of crystal.
  skimmer: { hp: 90, speed: 9.5, wander: 3, radius: 0.6, height: 1.0, hearing: 1.4, sight: 30, fly: 4.5, flee: 24, life: 75, crystal: 60 },
};

let nextId = 1;
const _hit = {};

export class Bug {
  constructor(type, x, y, z, o = {}) {
    this.id = nextId++;
    this.type = type;
    this.def = BUGS[type] ?? o.def;
    const d = this.def;
    // Bugs climb far less than the ranger (about 36°): steep ground is a wall to them and the grid routes round it.
    this.body = new Body(x, y, z, { radius: d.radius, height: d.height, step: d.leap ? 0.9 : 0.6, jump: 6.2, gravity: 22, fallGravity: 26, accel: 40, friction: 10, climb: 0.72 });
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
    this.route = null;                      // patrol: the next point to walk to
    this.blockT = 0;                        // how long it has been pushing against something
    this.detourT = 0;                       // follow the grid instead of going straight, for a while
    this.hop = false;                       // jump this step (a leaper over a low obstacle)
    this.stuckT = 0;                        // how long it has wanted to move and not moved
    this.unstick = null;                    // { x, z, t }: a nearby spot to go to first, to get out of a corner
    this.seeT = Math.random() * 0.3;
    this.patrolling = !!o.patrol;
    if (o.patrol) { this.state = "patrol"; this.goalX = x; this.goalZ = z; }
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
      case "skimmer": add(0, 0.5, 0.75, "body"); add(0.7, 0.55, 0.35, "head"); break;
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
    // slow wits) gives a moment to finish it before it reacts. One on its
    // way to the reactor turns on a shooter who is close.
    if (src && src.body && this.state === "hunt" && this.target?.kind === "core" && Math.hypot(src.body.x - this.x, src.body.z - this.z) < 18) { this.hunt(run, src, false); return armour; }
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
    if (team && n.src.downed) return;
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
    this.target = null;
    this.state = "search"; this.stateT = 6 + Math.random() * 3;
    this.goalX = x + (Math.random() - 0.5) * 4; this.goalZ = z + (Math.random() - 0.5) * 4;
    this.act = "alert"; this.actT = 0;
  }

  hunt(run, target, call) {
    if (!target || target.downed || this.def.fly) return;
    if (target.kind === "core" && this.target && this.target.kind !== "core" && this.state === "hunt") return;   // a live target beats the reactor
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
    if (d.fly) { this.#fly(run, dt); return; }
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
        // Lost interest in someone who is down: the nearest other one, else the reactor, else search.
        const other = this.#nearestFoe(run, 30, T);
        if (other) this.hunt(run, other, false);
        else if (run.core && !run.core.downed) this.hunt(run, run.core, false);
        else this.search(T.body.x, T.body.z);
      } else {
        const td = Math.hypot(T.body.x - this.x, T.body.z - this.z);
        // Close by, it feels you whatever you do; the reactor does not move.
        if (td < 6 || T.kind === "core") { this.knownX = T.body.x; this.knownZ = T.body.z; this.lostT = 0; } else this.lostT += dt;
        if (this.lostT > 7) this.search(this.knownX, this.knownZ);
        else [wx, wz, speed] = this.#attack(run, T, td, dt);
        // On the way to the reactor, anyone close and in sight is the better prey.
        if (T.kind === "core") { this.seeT -= dt; if (this.seeT <= 0) { this.seeT = 0.3; const f = this.#nearestFoe(run, this.type === "spitter" ? 4 : 7, T); if (f && run.space.clear(this.x, this.y + 0.6, this.z, f.body.x, f.body.y + 0.8, f.body.z)) this.hunt(run, f, false); } }
      }
    } else if (this.state === "search") {
      this.stateT -= dt;
      const gd = Math.hypot(this.goalX - this.x, this.goalZ - this.z);
      if (gd > 1.5) { [wx, wz] = this.#way(run, this.goalX, this.goalZ, `pt`); speed = d.speed * 0.6; }
      else if (Math.random() < dt * 0.8) { this.goalX = this.x + (Math.random() - 0.5) * 8; this.goalZ = this.z + (Math.random() - 0.5) * 8; }
      if (this.stateT <= 0) { this.state = this.patrolling ? "patrol" : "idle"; this.called = false; this.act = "idle"; }
      this.#feel(run);
      this.#see(run, dt);
    } else if (this.state === "shriek") {
      this.stateT -= dt;
      if (this.stateT <= 0) {
        // Shrieked: it scuttles off to a new perch.
        this.state = "idle"; this.detect = 0.5;
        this.home.x += (Math.random() - 0.5) * 10; this.home.z += (Math.random() - 0.5) * 10;
      }
    } else if (this.state === "patrol") {
      // Point to point across the area, by the walking grid.
      const gd = Math.hypot(this.goalX - this.x, this.goalZ - this.z);
      if (gd < 2.5 || this.stuckT > 4) { const p = run.openSpot(this.x, this.z, 30, 70); if (p) { this.goalX = p.x; this.goalZ = p.z; } this.stuckT = 0; }
      else { [wx, wz] = this.#way(run, this.goalX, this.goalZ, "pt"); speed = d.speed * 0.55; }
      this.stuckT = b.speed2D < 0.3 ? (this.stuckT ?? 0) + dt : 0;
      this.#feel(run);
      this.#see(run, dt);
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
      if (this.type === "sentry") this.#look(run, dt); else this.#see(run, dt);
    }

    // Keep apart from each other and out of the rangers (a pack piles up, it does not pass through).
    if (!d.fly) {
      for (const o of run.bugs) {
        if (o === this || !o.alive || o.hidden || o.def.fly) continue;
        const dx = this.x - o.x, dz = this.z - o.z, dd = Math.hypot(dx, dz), min = this.def.radius + o.def.radius;
        if (dd < min) { if (dd > 1e-4) { b.x += dx / dd * (min - dd) * 0.5; b.z += dz / dd * (min - dd) * 0.5; } else b.x += 0.05; }
      }
      if (this.act !== "leap" && this.act !== "charge") for (const t of run.foes()) {
        if (t.kind === "core" || t.downed) continue;
        const dx = this.x - t.body.x, dz = this.z - t.body.z, dd = Math.hypot(dx, dz), min = this.def.radius + t.body.r + 0.1;
        if (dd < min && Math.abs(t.body.y - this.y) < 1.5) { if (dd > 1e-4) { b.x += dx / dd * (min - dd); b.z += dz / dd * (min - dd); } else b.x += 0.1; }
      }
    }

    // Pushing against something and getting nowhere: a leaper hops a low
    // obstacle (a barrier, a crate), anyone else gives up the straight line
    // and follows the grid for a while.
    this.hop = false;
    this.detourT -= dt;
    if (speed > 0.3 && this.act !== "charge" && this.act !== "leap") {
      const stuck = b.grounded && b.speed2D < speed * 0.3;
      this.blockT = stuck ? this.blockT + dt : Math.max(0, this.blockT - dt * 2);
      this.stuckT = stuck ? this.stuckT + dt : Math.max(0, this.stuckT - dt);
      if (this.blockT > 0.3) {
        this.blockT = 0;
        if (d.leap && this.#lowAhead(run, wx, wz)) { this.hop = true; this.act = "walk"; }
        else this.detourT = 2 + Math.random();
      }
      // Still stuck after the detour: wander to an open spot nearby first and try again from there.
      if (this.stuckT > 3 && !this.unstick) { const p = run.openSpot(this.x, this.z, 5, 14, 20); if (p) this.unstick = { x: p.x, z: p.z, t: 3 }; this.stuckT = 0; }
      if (this.unstick) {
        this.unstick.t -= dt;
        const ux = this.unstick.x - this.x, uz = this.unstick.z - this.z, ul = Math.hypot(ux, uz) || 1;
        if (this.unstick.t <= 0 || ul < 1.5) this.unstick = null;
        else [wx, wz] = this.#way(run, this.unstick.x, this.unstick.z, "pt");
      }
    } else { this.blockT = 0; this.stuckT = 0; }
    if (this.act !== "charge" && this.act !== "leap") b.step(run.space, { vx: wx * speed, vz: wz * speed, jumpPressed: this.hop }, dt);
    else this.#lunge(run, dt);
    if (this.hop) run.fx({ type: "leap", id: this.id, x: this.x, y: this.y, z: this.z, hop: true });
    if (speed > 0.3 && this.act !== "spit" && this.act !== "windup") this.face = dampAngle(this.face, Math.atan2(-wx, -wz), 8, dt);
    if (this.act === "idle" || this.act === "walk" || this.act === "alert") this.act = b.speed2D > 0.4 ? "walk" : this.act === "alert" && this.actT < 0.6 ? "alert" : "idle";
    if (b.fell) { this.alive = false; this.deadT = 99; }
  }

  // The skimmer: hovers over the ground, drifts between points, and flees
  // from anyone within `flee`; shot, it flees harder. Gone after `life` seconds.
  #fly(run, dt) {
    const b = this.body, d = this.def;
    b.px = b.x; b.py = b.y; b.pz = b.z;
    if (!this.alive) { this.deadT += dt; b.y = Math.max(run.kit.h(b.x, b.z) + 0.3, b.y - 9 * dt); b.vx *= 0.9; b.vz *= 0.9; b.x += b.vx * dt; b.z += b.vz * dt; return; }
    this.lifeT = (this.lifeT ?? 0) + dt;
    if (this.lifeT > d.life) { this.alive = false; this.deadT = 99; run.fx({ type: "skimmerGone", x: b.x, z: b.z }); return; }
    let fx = 0, fz = 0, scared = false;
    for (const t of run.foes()) {
      if (t.kind === "core" || t.downed) continue;
      const dx = b.x - t.body.x, dz = b.z - t.body.z, dd = Math.hypot(dx, dz);
      if (dd < d.flee || (this.hitT > -2 && dd < d.flee * 2)) { fx += dx / (dd || 1) * (1.5 - dd / (d.flee * 2)); fz += dz / (dd || 1) * (1.5 - dd / (d.flee * 2)); scared = true; }
    }
    let wx, wz, speed;
    if (scared) { const l = Math.hypot(fx, fz) || 1; wx = fx / l; wz = fz / l; speed = d.speed; this.act = "flee"; }
    else {
      const gd = Math.hypot(this.goalX - b.x, this.goalZ - b.z);
      if (gd < 4 || this.stateT <= 0) { const p = run.openSpot(b.x, b.z, 20, 50) ?? { x: b.x, z: b.z }; this.goalX = p.x; this.goalZ = p.z; this.stateT = 12; }
      this.stateT -= dt;
      wx = (this.goalX - b.x) / (gd || 1); wz = (this.goalZ - b.z) / (gd || 1); speed = d.wander; this.act = "walk";
    }
    // Stay over the area.
    const m = run.nav.margin;
    if (Math.abs(b.x) > m) wx -= Math.sign(b.x); if (Math.abs(b.z) > m) wz -= Math.sign(b.z);
    const l = Math.hypot(wx, wz) || 1;
    b.vx += (wx / l * speed - b.vx) * Math.min(1, dt * 3); b.vz += (wz / l * speed - b.vz) * Math.min(1, dt * 3);
    b.x += b.vx * dt; b.z += b.vz * dt;
    const want = run.kit.h(b.x, b.z) + d.fly + Math.sin(run.time * 1.3 + this.id) * 0.4;
    b.y += (want - b.y) * Math.min(1, dt * 4);
    b.grounded = false;
    if (b.speed2D > 0.5) this.face = dampAngle(this.face, Math.atan2(-b.vx, -b.vz), 6, dt);
  }

  // The nearest live target (not the reactor) within r, other than `not`.
  #nearestFoe(run, r, not = null) {
    let best = null, bd = r;
    for (const t of run.foes()) {
      if (t === not || t.kind === "core" || t.downed) continue;
      const d = Math.hypot(t.body.x - this.x, t.body.z - this.z);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  // Sight: a wide cone out to `sight` metres, anything within 5 m all round, blocked by walls.
  #see(run, dt) {
    this.seeT -= dt;
    if (this.seeT > 0) return;
    this.seeT = 0.25 + Math.random() * 0.1;
    const d = this.def, sight = d.sight ?? 22;
    for (const t of run.foes()) {
      if (t.kind === "core" || t.downed) continue;
      const dx = t.body.x - this.x, dz = t.body.z - this.z, dist = Math.hypot(dx, dz);
      if (dist > sight) continue;
      if (dist > 5 && Math.abs(angDiff(this.face, Math.atan2(-dx, -dz))) > 1.3) continue;
      if (!run.space.clear(this.x, this.y + d.height * 0.7, this.z, t.body.x, t.body.y + t.body.h * 0.7, t.body.z)) continue;
      this.hunt(run, t, true);
      return;
    }
  }

  #feel(run) {
    for (const t of run.foes()) {
      if (!t || t.downed || t.kind === "core") continue;
      const dd = Math.hypot(t.body.x - this.x, t.body.z - this.z);
      if (dd < (t.body.speed2D > 1 ? 3 : 1.6) * (t.crouchK > 0.5 ? 0.6 : 1)) { this.hunt(run, t, true); return; }
    }
  }

  // Sentries: a cone of sight, blocked by walls; crouching and cover help.
  #look(run, dt) {
    const d = this.def;
    let seen = null, best = 0;
    for (const t of run.foes()) {
      if (!t || t.downed || t.kind === "core") continue;
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

  // Wanted direction to (gx, gz): straight when the line is clear and the
  // ground on it walkable, else the field (a leaper's field may cross low
  // obstacles, which it then jumps).
  #way(run, gx, gz, key) {
    const dx = gx - this.x, dz = gz - this.z, dist = Math.hypot(dx, dz) || 1, jump = !!this.def.leap;
    if (this.detourT <= 0 && dist < 14 && run.space.clear(this.x, this.y + 0.5, this.z, gx, run.space.terrain.height(gx, gz) + 0.5, gz) && run.nav.straight(this.x, this.z, gx, gz, false)) return [dx / dist, dz / dist];
    const f = run.nav.field(key === "pt" ? `pt${Math.round(gx / 4)},${Math.round(gz / 4)}` : key === "home" ? `home${this.id}` : key, gx, gz, run.time, key === "pt" ? 2 : 0.35, jump);
    const w = run.nav.dir(f, this.x, this.z);
    return w ?? [dx / dist, dz / dist];
  }

  // Is what stops it a low, jumpable piece (its top within reach of a hop)?
  #lowAhead(run, wx, wz) {
    const b = this.body, l = Math.hypot(wx, wz) || 1;
    const h = run.space.world.raycast(b.x, b.y + 0.35, b.z, wx / l, 0, wz / l, b.r + 0.8, _hit);
    if (h && h.c) return h.c.y1 - b.y <= 1.4;
    // Nothing solid: maybe a step in the ground it cannot climb; a hop may still do it.
    const T = run.space.terrain;
    return T.height(b.x + wx / l * 1.2, b.z + wz / l * 1.2) - b.y <= 1.2;
  }

  // ── Attacks ── returns [wx, wz, speed].
  #attack(run, T, td, dt) {
    const d = this.def, b = this.body;
    const tx = T.body.x, tz = T.body.z;
    const key = T.kind === "player" ? "player" : T.kind === "core" ? "core" : `ally${T.idx ?? 0}`;
    const reachT = d.reach + (T.body.r > 1 ? T.body.r : 0.5);
    const faceT = () => { this.face = dampAngle(this.face, Math.atan2(-(tx - this.x), -(tz - this.z)), 10, dt); };
    if (this.act === "bite" || this.act === "spit" || this.act === "windup" || this.act === "recover") {
      faceT();
      if (this.act === "bite" && this.actT >= 0.22 && !this.struck) {
        this.struck = true;
        if (td < reachT) T.hurt(run, d.bite, this.x, this.z, "bite");
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
      if (this.actT >= done) {
        // A swarmer that just bit (or missed) gathers itself for a moment.
        if (this.act === "bite" && this.type === "swarmer" && Math.random() < 0.6) { this.act = "recover"; this.actT = 0; }
        else { this.act = "walk"; this.actT = 0; }
      }
      return [0, 0, 0];
    }
    // Chasing: a swarmer stops to crouch and chitter now and then, which is your chance to pull away.
    if (this.type === "swarmer" && td > 3 && td < 14 && this.cool <= 0 && Math.random() < dt * 0.35) { this.act = "recover"; this.actT = 0; this.cool = 1.2; return [0, 0, 0]; }
    const [wx, wz] = this.#way(run, this.knownX, this.knownZ, key);
    switch (this.type) {
      case "swarmer": {
        if (td < reachT - 0.3 && this.cool <= 0) { this.act = "bite"; this.actT = 0; this.struck = false; this.cool = d.biteCool; return [0, 0, 0]; }
        if (d.leap && T.kind !== "core" && td < 7 && td > 2.6 && this.cool <= 0 && b.grounded && run.space.clear(this.x, this.y + 0.5, this.z, tx, T.body.y + 0.5, tz)) {
          const l = td;
          b.vx = (tx - this.x) / l * 10.5; b.vz = (tz - this.z) / l * 10.5; b.vy = 6.4; b.grounded = false;
          this.act = "leap"; this.actT = 0; this.struck = false; this.cool = 2.0;
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
        if (td < reachT + 1.2 && this.cool <= 2) { this.act = "bite"; this.actT = 0; this.struck = false; this.cool = 3; return [0, 0, 0]; }
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
      if (!this.struck) for (const t of run.foes()) {
        if (!t || t.downed) continue;
        if (Math.hypot(t.body.x - this.x, t.body.z - this.z) < d.radius + 0.7 + (t.body.r > 1 ? t.body.r : 0) && Math.abs(t.body.y + 0.8 - this.y) < 1.4) { this.struck = true; t.hurt(run, d.bite * 1.3, this.x, this.z, "leap"); }
      }
      if (b.grounded && this.actT > 0.15) { this.act = "recover"; this.actT = 0; }
      return;
    }
    // Charge.
    const sp = d.chargeSpeed;
    const ox = b.x, oz = b.z;
    b.step(run.space, { vx: this.cx * sp, vz: this.cz * sp }, dt, 6);
    this.face = Math.atan2(-this.cx, -this.cz);
    if (!this.struck) for (const t of run.foes()) {
      if (!t || t.downed) continue;
      if (Math.hypot(t.body.x - this.x, t.body.z - this.z) < d.radius + 0.8 + (t.body.r > 1 ? t.body.r : 0)) {
        this.struck = true;
        t.hurt(run, d.ram, this.x, this.z, "ram");
        if (t.kind !== "core") { t.body.vx += this.cx * 9; t.body.vz += this.cz * 9; t.body.vy = 4; t.body.grounded = false; }
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
