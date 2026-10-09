import { dampAngle } from "../config.js";
import { Bug } from "./bugs.js";

// ── The Hive Warden ──────────────────────────────────────────────────────
// Dustnest's boss: the big guardian of the mine's nest. Armoured all over
// except three glowing sacs (left, right and on its tail) and its maw while
// it is open (it opens to roar, to spit and before it charges). Popping a
// sac staggers it. Three phases by health:
//   1. stomps after you, swipes up close, spits volleys, charges
//   2. + roars up swarmers from the burrows round the pit
//   3. faster, + leaps and slams the ground: a shockwave ring to jump over

export const WARDEN = { hp: 4200, speed: 3.4, wander: 1, radius: 2.1, height: 3.4, hearing: 2, xp: 500 };

export class Warden extends Bug {
  constructor(x, y, z, o = {}) {
    super("warden", x, y, z, { ...o, def: WARDEN });
    this.def = WARDEN;
    this.body.P.step = 1.2;
    this.boss = true;
    this.arena = o.arena;            // { x, z, r }
    this.sacs = { sacL: 300, sacR: 300, sacT: 300 };
    this.phase = 1;
    this.nextMove = 2.5;
    this.maw = 0;                    // 0 shut … 1 wide open
    this.summoned = 0;
    this.ring = null;                // { x, z, r, t }
    this.boundR = 4.5;
    this.state = "boss";
  }

  spheres() {
    const s = this._s; s.length = 0;
    const b = this.body, fx = -Math.sin(this.face), fz = -Math.cos(this.face), rx = -fz, rz = fx;
    const add = (f, side, up, r, part) => s.push(b.x + fx * f + rx * side, b.y + up, b.z + fz * f + rz * side, r, part);
    add(2.1, 0, 2.0, 0.85, "head");
    add(0, 0, 1.9, 1.8, "body");
    add(-1.9, 0, 1.6, 1.1, "body");
    if (this.sacs.sacL > 0) add(0.2, -1.75, 2.3, 0.62, "sacL");
    if (this.sacs.sacR > 0) add(0.2, 1.75, 2.3, 0.62, "sacR");
    if (this.sacs.sacT > 0) add(-3.0, 0, 2.2, 0.66, "sacT");
    return s;
  }

  damage(run, dmg, src, part, dx, dz, quiet) {
    if (!this.alive || this.hidden) return false;
    let k = 0.18, armour = true;
    if (part === "head") { k = this.maw > 0.5 ? 1.5 : 0.35; armour = this.maw <= 0.5; }
    else if (part in this.sacs) {
      k = 1.4; armour = false;
      this.sacs[part] -= dmg * 1.4;
      if (this.sacs[part] <= 0) {
        this.sacs[part] = 0;
        this.hp -= 180;
        this.act = "stagger"; this.actT = 0; this.stunT = 2.6;
        run.fx({ type: "sacPop", id: this.id, part, x: this.x, y: this.y + 2.3, z: this.z });
        run.say("voss_sac");
      }
    } else if (part === "blast") { k = 0.45; armour = false; }
    this.hp -= dmg * k;
    this.hitT = 0.1;
    if (!quiet) run.fx({ type: "bugHit", id: this.id, part, armour, x: this.x, y: this.y + 2, z: this.z, boss: true });
    if (this.hp <= 0) { this.hp = 0; this.die(run, src); }
    return armour;
  }

  step(run, dt) {
    const b = this.body;
    this.actT += dt; this.hitT -= dt;
    if (!this.alive) { this.deadT += dt; return; }
    if (this.hidden) { this.emergeT -= dt; if (this.emergeT <= 0) { this.hidden = false; this.act = "roar"; this.actT = 0; } return; }
    const frac = this.hp / this.maxHp;
    const ph = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    if (ph !== this.phase) {
      this.phase = ph;
      run.fx({ type: "bossPhase", phase: ph });
      run.say(ph === 2 ? "voss_warden2" : "kessler_warden3");
      this.#start(run, "summon");
    }
    this.#ring(run, dt);
    const open = this.act === "roar" || this.act === "spitUp" || this.act === "chargeUp" || this.act === "stagger" || this.act === "summon";
    this.maw += ((open ? 1 : 0) - this.maw) * Math.min(1, dt * 8);
    if (this.stunT > 0) { this.stunT -= dt; b.step(run.space, { vx: 0, vz: 0 }, dt); if (this.stunT <= 0) { this.act = "walk"; this.actT = 0; } return; }

    // Target: whoever is closer and up.
    const P = run.player, A = run.ally;
    let T = !P.downed ? P : A && !A.downed ? A : null;
    if (A && !A.downed && !P.downed && Math.hypot(A.body.x - this.x, A.body.z - this.z) + 6 < Math.hypot(P.body.x - this.x, P.body.z - this.z)) T = A;
    this.target = T;
    if (!T) { b.step(run.space, { vx: 0, vz: 0 }, dt); return; }
    const tx = T.body.x, tz = T.body.z, td = Math.hypot(tx - this.x, tz - this.z);
    const turn = (k) => { this.face = dampAngle(this.face, Math.atan2(-(tx - this.x), -(tz - this.z)), k, dt); };
    const sp = this.def.speed * (ph === 3 ? 1.35 : 1);
    let wx = 0, wz = 0, speed = 0;

    switch (this.act) {
      case "roar": turn(3); if (this.actT > 1.6) this.#idle(); break;
      case "swipeUp":
        turn(5);
        if (this.actT > 0.55) {
          for (const t of [P, A]) {
            if (!t || t.downed) continue;
            const dx = t.body.x - this.x, dz = t.body.z - this.z, d = Math.hypot(dx, dz);
            const fx = -Math.sin(this.face), fz = -Math.cos(this.face);
            if (d < 5.6 && (dx * fx + dz * fz) / (d || 1) > 0.25) { t.hurt(run, 26, this.x, this.z, "swipe"); t.body.vx += dx / d * 7; t.body.vz += dz / d * 7; t.body.vy = 3.5; t.body.grounded = false; }
          }
          run.fx({ type: "swipe", id: this.id, x: this.x, y: this.y, z: this.z, face: this.face });
          this.act = "swipe"; this.actT = 0;
        }
        break;
      case "swipe": if (this.actT > 0.5) this.#idle(); break;
      case "spitUp":
        turn(4);
        if (this.actT > 1.0) {
          const n = ph === 3 ? 5 : 3;
          for (let i = 0; i < n; i++) run.spit(this, T, (i - (n - 1) / 2) * 0.22, 2.4);
          this.act = "spit"; this.actT = 0;
        }
        break;
      case "spit": if (this.actT > 0.6) this.#idle(); break;
      case "chargeUp":
        turn(6);
        if (this.actT > 1.1) {
          const dx = tx - this.x, dz = tz - this.z, l = Math.hypot(dx, dz) || 1;
          this.cx = dx / l; this.cz = dz / l; this.act = "charge"; this.actT = 0; this.struck = false;
          run.fx({ type: "charge", id: this.id, x: this.x, y: this.y, z: this.z, boss: true });
        }
        break;
      case "charge": {
        const ox = b.x, oz = b.z, cs = 13;
        b.step(run.space, { vx: this.cx * cs, vz: this.cz * cs }, dt, 6);
        this.face = Math.atan2(-this.cx, -this.cz);
        for (const t of [P, A]) {
          if (!t || t.downed || this.struck) continue;
          if (Math.hypot(t.body.x - this.x, t.body.z - this.z) < 3.0) { this.struck = true; t.hurt(run, 34, this.x, this.z, "ram"); t.body.vx += this.cx * 11; t.body.vz += this.cz * 11; t.body.vy = 5; t.body.grounded = false; }
        }
        const a = this.arena, out = a && Math.hypot(b.x - a.x, b.z - a.z) > a.r;
        if ((this.actT > 0.3 && Math.hypot(b.x - ox, b.z - oz) < cs * dt * 0.35) || out) {
          if (out) { b.x = ox; b.z = oz; }
          this.act = "stagger"; this.actT = 0; this.stunT = 2.4;
          run.fx({ type: "stun", id: this.id, x: this.x, y: this.y + 3, z: this.z, boss: true });
          run.say("kessler_stunned");
        } else if (this.actT > 2) this.#idle();
        return;
      }
      case "summon":
        turn(2);
        if (this.actT > 0.9 && !this.struck) {
          this.struck = true;
          run.onWardenSummon(this, ph === 3 ? 6 : 4);
          run.fx({ type: "roar", id: this.id, x: this.x, y: this.y, z: this.z });
        }
        if (this.actT > 2.2) this.#idle();
        break;
      case "leap":
        // Up, over, down on the spot it marked.
        b.step(run.space, { vx: this.cx, vz: this.cz }, dt, 0);
        if (b.grounded && this.actT > 0.3) {
          this.act = "slam"; this.actT = 0;
          this.ring = { x: b.x, z: b.z, r: 1, t: 0, hit: new Set() };
          run.fx({ type: "slam", x: b.x, y: b.y, z: b.z });
          run.noise(b.x, b.z, 50, this, true);
        }
        return;
      case "slam": if (this.actT > 1.0) this.#idle(); break;
      default: {
        // Walk at the target and pick the next move.
        this.nextMove -= dt;
        turn(2.5);
        if (td > 4) { const dx = tx - this.x, dz = tz - this.z; wx = dx / td; wz = dz / td; speed = sp; }
        if (this.nextMove <= 0) {
          const r = Math.random();
          if (td < 5.5) this.#start(run, "swipeUp");
          else if (ph === 3 && r < 0.35) this.#start(run, "leap", T);
          else if (r < 0.5) this.#start(run, "spitUp");
          else if (r < 0.85 && td > 7) this.#start(run, "chargeUp");
          else if (ph >= 2 && run.time - (this.lastSummon ?? 0) > 22) this.#start(run, "summon");
          else this.#start(run, "spitUp");
        }
      }
    }
    b.step(run.space, { vx: wx * speed, vz: wz * speed }, dt);
    if (this.arena) {
      const a = this.arena, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d > a.r) { b.x = a.x + dx / d * a.r; b.z = a.z + dz / d * a.r; }
    }
    if (speed > 0 && this.act !== "walk") { this.act = "walk"; this.actT = 0; }
    if (speed === 0 && this.act === "walk") this.act = "idle";
  }

  #idle() { this.act = "idle"; this.actT = 0; this.nextMove = this.phase === 3 ? 1.0 : 1.7; }

  #start(run, act, T) {
    this.act = act; this.actT = 0; this.struck = false;
    if (act === "summon") this.lastSummon = run.time;
    if (act === "leap") {
      const b = this.body, tx = T.body.x, tz = T.body.z, dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
      const flight = 1.1;
      this.cx = dx / flight * Math.min(1, 14 / Math.max(d, 1)); this.cz = dz / flight * Math.min(1, 14 / Math.max(d, 1));
      b.vx = this.cx; b.vz = this.cz; b.vy = 11; b.grounded = false;
      run.fx({ type: "bossLeap", id: this.id });
    }
    if (act === "roar" || act === "chargeUp" || act === "spitUp" || act === "summon") run.fx({ type: "roar", id: this.id, x: this.x, y: this.y, z: this.z, quiet: act !== "summon" && act !== "roar" });
  }

  // The slam's shockwave: a ring racing outwards; touching the ground in
  // its band hurts (jump it).
  #ring(run, dt) {
    const g = this.ring;
    if (!g) return;
    g.t += dt; g.r = 1 + g.t * 16;
    for (const t of [run.player, run.ally]) {
      if (!t || t.downed || g.hit.has(t)) continue;
      const d = Math.hypot(t.body.x - g.x, t.body.z - g.z);
      if (Math.abs(d - g.r) < 1.1 && t.body.grounded) { g.hit.add(t); t.hurt(run, 22, g.x, g.z, "slam"); t.body.vy = 5; t.body.grounded = false; }
    }
    if (g.r > 18) this.ring = null;
  }
}
