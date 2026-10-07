import { damageFoe } from "./foes.js";

// ── Cog's bench modules ──────────────────────────────────────────────────
// In a dream Cog hovers ahead and to your left. What he can do besides
// comes from the workbench:
//   fetch  flies off to dust (and dream drops) out of your reach, brings
//          them back and lets them go next to you;
//   heal   after a quiet while, slowly wakes you up again;
//   zap    now and then sparks the nearest glitch that is after you;
//   scout  pings when a memory is near, and keeps glancing at it.
// He flies straight through everything: he is a dream robot.

const SPEED = 10;          // m/s out and back
const GRAB = 2.2;          // takes everything this close to what he went for
const QUIET = 4;           // seconds without a bonk before he starts healing
const SCOUT = 24;          // metres
const CHARGE = 0.5;        // seconds his antenna glows before a spark goes
const GATE = 1.4;          // seconds he works a lock's panel before it opens

export class Cog {
  constructor(run) {
    this.perks = run.perks.cog;
    const b = run.body;
    this.x = b.x; this.y = b.y + 1.9; this.z = b.z;
    this.task = null;      // null | "go" | "back"
    this.target = null;    // the mote / drop he is flying to
    this.load = [];        // what he carries
    this.zapT = 1.5;
    this.charging = null;  // { f, t }: a spark building up for a glitch
    this.healing = false;
    this.scout = null;     // the memory he points at
  }

  get busy() { return this.task !== null; }

  step(run, dt) {
    const b = run.body, P = this.perks;
    const sn = Math.sin(b.yaw), cs = Math.cos(b.yaw);
    const hx = b.x - sn * 1.6 - cs * 1.1, hy = b.y + 1.9, hz = b.z - cs * 1.6 + sn * 1.1;

    // ── Locks ──
    // A lock he has been called to comes first: over to its panel, a
    // moment's work, and it opens.
    const g = run.gates?.find((o) => o.called && !o.open);
    // ── Fetching ──
    if (!g && !this.task && P.fetch) this.pick(run);
    if (g) {
      const [px, py, pz] = run.gatePanel(g);
      if (this.fly(px, py, pz, dt) < 0.3) {
        if (g.t === 0) run.events.push({ type: "gateWork", id: g.id, x: px, y: py, z: pz });
        g.t += dt;
        if (g.t > GATE) run.openGate(g);
      }
    } else if (this.task === "go") {
      const m = this.target;
      if (m.got || m.carry || m.pull) { this.task = null; this.target = null; }
      else if (this.fly(m.x, m.y, m.z, dt) < 0.6) {
        for (const list of [run.dustMotes, run.heals]) for (const o of list) {
          if (o.got || o.carry || o.pull || Math.hypot(o.x - this.x, o.y - this.y, o.z - this.z) > GRAB) continue;
          o.carry = true;
          this.load.push(o);
        }
        this.task = "back";
        run.events.push({ type: "cogGrab", x: this.x, y: this.y, z: this.z, n: this.load.length });
      }
    } else if (this.task === "back") {
      if (this.fly(b.x, b.y + 1.3, b.z, dt) < 1.4) this.drop(run);
    } else if (this.charging) {
      // Winding up a spark: he darts out between you and the glitch.
      const f = this.charging.f;
      this.fly(b.x + (f.px - b.x) * 0.35, Math.max(b.y + 1.6, f.cy + 1.2), b.z + (f.pz - b.z) * 0.35, dt, 6);
    } else this.fly(hx, hy, hz, dt, 3);
    this.load.forEach((o, i) => {
      const a = i * 2.4 + run.time * 4;
      o.x = this.x + Math.cos(a) * 0.35; o.y = this.y - 0.3 + Math.sin(a * 0.7) * 0.1; o.z = this.z + Math.sin(a) * 0.35;
    });

    // ── Healing ──
    this.healing = P.heal > 0 && run.hurtT > QUIET && run.hp > 0 && run.hp < run.maxHp;
    if (this.healing) run.hp = Math.min(run.maxHp, run.hp + P.heal * dt);

    // ── Zapping ──
    // The antenna glows and crackles for a moment first (so you see it
    // coming), then the spark jumps to the glitch and jolts it.
    if (this.charging) {
      const c = this.charging, f = c.f;
      if (!f.alive) { this.charging = null; this.zapT = 0.3; }
      else if ((c.t -= dt) <= 0) {
        this.charging = null;
        const dx = f.px - this.x, dz = f.pz - this.z, l = Math.hypot(dx, dz) || 1;
        run.events.push({ type: "cogZap", from: [this.x, this.y, this.z], to: [f.px, f.cy, f.pz], id: f.id });
        if (damageFoe(run, f, P.zap.damage, dx / l * 2, dz / l * 2, true)) run.stats.popped++;
        this.zapT = P.zap.every;
      }
    } else if (P.zap && !this.task && (this.zapT -= dt) <= 0) {
      const f = this.zapTarget(run, P.zap.range);
      if (f) {
        this.charging = { f, t: CHARGE };
        run.events.push({ type: "cogCharge", id: f.id, x: f.px, y: f.cy, z: f.pz });
      } else this.zapT = 0.3;
    }

    // ── Scouting ──
    if (P.scout) {
      let best = null, bd = SCOUT;
      for (const m of run.memories) {
        if (m.got) continue;
        const d = Math.hypot(m.x - b.x, m.z - b.z);
        if (d < bd) { bd = d; best = m; }
      }
      if (best && best !== this.scout) run.events.push({ type: "cogPing", x: best.x, z: best.z });
      this.scout = best;
    }
  }

  // The nearest loose dust out of your reach but inside his.
  pick(run) {
    const b = run.body, cx = b.x, cz = b.z;
    let best = null, bd = this.perks.fetch;
    const consider = (o) => {
      if (o.got || o.carry || o.pull || o.t < 0.6) return;
      const d = Math.hypot(o.x - cx, o.z - cz);
      if (d > run.magnet * 0.9 && d < bd) { bd = d; best = o; }
    };
    for (const m of run.dustMotes) consider(m);
    if (run.hp < run.maxHp) for (const h of run.heals) consider(h);
    if (best) { this.task = "go"; this.target = best; }
  }

  // Back next to you: let go, and the magnet does the rest.
  drop(run) {
    for (const o of this.load) {
      o.carry = false;
      o.t = Math.max(o.t, 0.5);
      o.vx = o.vy = o.vz = 0;
      o.floor = run.kit.floorAt(o.x, o.z, o.y + 0.5);
    }
    this.load = [];
    this.task = null; this.target = null;
  }

  // Straight there; returns the distance left. k: ease in (formation) instead of flying flat out.
  fly(tx, ty, tz, dt, k = 0) {
    const dx = tx - this.x, dy = ty - this.y, dz = tz - this.z, d = Math.hypot(dx, dy, dz);
    if (d < 1e-4) return 0;
    const step = k ? d * Math.min(1, k * dt) : Math.min(d, SPEED * dt);
    this.x += dx / d * step; this.y += dy / d * step; this.z += dz / d * step;
    return d - step;
  }

  zapTarget(run, range) {
    const b = run.body;
    let best = null, bd = range;
    for (const f of run.foes) {
      if (!f.alive || f.state === "spawn" || f.sleepT > 0 || !(f.aware || f.group)) continue;
      const d = Math.hypot(f.px - b.x, f.pz - b.z);
      if (d >= bd) continue;
      const ex = f.px - this.x, ey = f.cy - this.y, ez = f.pz - this.z, l = Math.hypot(ex, ey, ez);
      if (run.world.raycast(this.x, this.y, this.z, ex / l, ey / l, ez / l, l - f.def.hitR)) continue;
      bd = d; best = f;
    }
    return best;
  }
}
