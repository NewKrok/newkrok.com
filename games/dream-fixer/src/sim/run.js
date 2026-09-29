import { DT } from "../config.js";
import { Body } from "./player.js";
import { ToolState } from "./tools.js";
import { World } from "./world.js";
import { Foe, stepFoes, damageFoe } from "./foes.js";
import { Anchor, stepAnchors, startTuning } from "./anchors.js";
import { buildLevel } from "../levels/kit.js";
import { rng } from "../rng.js";

// ── One visit to a dream ─────────────────────────────────────────────────
// Everything that happens in a level, with no rendering: the body, the
// tools, the glitches and their orbs, dream dust, and (later) anchors and
// the boss. The renderer and the sound read `events` after every step and
// clear them.

export const DIFFICULTY = {
  easy: { dmg: 0.5, regen: 1.5 },
  normal: { dmg: 1, regen: 1 },
  hard: { dmg: 1.5, regen: 0.7 },
};

export const MAX_HP = 100;

export class Run {
  constructor(levelDef, o = {}) {
    this.def = levelDef;
    this.kit = buildLevel(levelDef);
    this.world = this.kit.world;
    this.rnd = rng(o.seed ?? 1);
    this.opts = { difficulty: "normal", aimAssist: 0, autoFire: false, ...o };
    this.body = new Body();
    const s = this.kit.spawn;
    this.checkpoint = { ...s };
    this.body.place(s.x, s.y, s.z, s.yaw);
    this.tools = [new ToolState("stabilizer")];
    this.tool = 0;
    this.time = 0;
    this.events = [];
    this.hp = MAX_HP; this.hurtT = 9; this.invuln = 0;
    this.faints = 0;
    this.foes = []; this.foeSeq = 0;
    this.spits = [];
    this.dustMotes = []; this.dust = 0;
    this.stats = { popped: 0, shots: 0, hits: 0 };
    this.anchors = this.kit.anchors.map((a) => new Anchor(a));
    this.nearAnchor = null;
    for (const f of this.kit.foes) this.spawn(f.kind, f.x, f.z);
    this.events.length = 0;
    this._shots = [];
    this._hit = {};
  }

  get activeTool() { return this.tools[this.tool]; }
  get tuning() { return this.anchors.find((a) => a.state === "tuning") ?? null; }
  get fixedCount() { return this.anchors.filter((a) => a.state === "fixed").length; }
  get diff() { return DIFFICULTY[this.opts.difficulty] ?? DIFFICULTY.normal; }
  topAt(c, x, z) { return World.topAt(c, x, z); }

  // Unit vector of the view.
  aimDir(spread = 0) {
    const b = this.body;
    const yaw = b.yaw + (spread ? (this.rnd() - 0.5) * 2 * spread : 0);
    const pitch = b.pitch + (spread ? (this.rnd() - 0.5) * 2 * spread : 0);
    const cp = Math.cos(pitch);
    return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
  }

  spawn(kind, x, z, o = {}) {
    const y = o.y ?? this.kit.floorAt(x, z, 60);
    const f = new Foe(this, kind, x, kind === "buzzer" ? y + 3 : y, z, o);
    this.foes.push(f);
    this.events.push({ type: "spawn", id: f.id, kind, x, y, z });
    return f;
  }

  spit(s) { s.life = 4; s.id = ++this.foeSeq; this.spits.push(s); this.events.push({ type: "spit", id: s.id }); }

  dropDust(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const a = this.rnd() * Math.PI * 2, v = 1.5 + this.rnd() * 2;
      this.dustMotes.push({ x, y, z, vx: Math.cos(a) * v, vy: 3 + this.rnd() * 2.5, vz: Math.sin(a) * v, t: 0, floor: this.kit.floorAt(x, z, y + 0.5), id: ++this.foeSeq });
    }
  }

  // Can a glitch at (x, y, z) see your head?
  canSee(x, y, z) {
    const b = this.body;
    const dx = b.x - x, dy = b.eyeY - y, dz = b.z - z, l = Math.hypot(dx, dy, dz);
    if (l < 1e-3) return true;
    return !this.world.raycast(x, y, z, dx / l, dy / l, dz / l, l - 0.2);
  }

  hurt(amount, fromX, fromZ) {
    if (this.invuln > 0 || this.hp <= 0) return;
    const dmg = amount * this.diff.dmg;
    this.hp -= dmg;
    this.hurtT = 0;
    this.invuln = 0.35;
    this.events.push({ type: "hurt", dmg, fromX, fromZ });
    if (this.hp <= 0) this.faint();
  }

  // Too many bonks: you drift out of the dream and the Factory drops you
  // back at the last anchor, with everything you had gathered.
  faint() {
    this.faints++;
    const c = this.checkpoint, b = this.body;
    b.place(c.x, c.y, c.z, c.yaw);
    this.hp = MAX_HP;
    this.invuln = 1.5;
    this.spits.length = 0;
    // Glitches right at the checkpoint step back a little.
    for (const f of this.foes) if (f.alive && f.body) {
      const dx = f.body.x - c.x, dz = f.body.z - c.z, d = Math.hypot(dx, dz);
      if (d < 7) { const k = (7 - d) / Math.max(d, 0.1); f.body.x += dx * k; f.body.z += dz * k; }
    }
    this.events.push({ type: "faint" });
  }

  step(intent, dt = DT) {
    this.time += dt;
    const b = this.body;
    b.step(this.world, intent, dt);
    if (b.jumped) this.events.push({ type: "jump" });
    if (b.landSpeed > 4) this.events.push({ type: "land", speed: b.landSpeed });
    if (b.fell) {
      // Falling out of a dream just puts you back: no harm done.
      const c = this.checkpoint;
      b.place(c.x, c.y, c.z, b.yaw);
      this.events.push({ type: "respawn" });
    }

    // Wakefulness comes back on its own after a quiet moment.
    this.hurtT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.hurtT > 2.5 && this.hp < MAX_HP) this.hp = Math.min(MAX_HP, this.hp + 28 * this.diff.regen * dt);

    const tool = this.activeTool;
    // Auto-fire (touch): shoot whenever the crosshair rests on a glitch.
    if (this.opts.autoFire && !intent.fire && !intent.alt) intent = { ...intent, fire: !!this.target(0.035) };
    this._shots.length = 0;
    for (const shot of tool.step(intent, dt, this._shots)) this.fire(tool, shot);

    stepAnchors(this, dt);
    if (intent.usePressed && this.nearAnchor) startTuning(this, this.nearAnchor);
    stepFoes(this, dt);
    this.stepSpits(dt);
    this.stepDust(dt);
    this.foes = this.foes.filter((f) => f.alive || f.age < 0.1);
  }

  // The glitch (or orb) the view points at within `cone` radians, if it is in sight.
  target(cone, ox = this.body.x, oy = this.body.eyeY, oz = this.body.z, d = this.aimDir()) {
    let best = null, bestA = cone;
    for (const f of this.foes) {
      if (!f.alive) continue;
      const ex = f.px - ox, ey = f.cy - oy, ez = f.pz - oz, l = Math.hypot(ex, ey, ez);
      if (l > 45) continue;
      const cos = (ex * d[0] + ey * d[1] + ez * d[2]) / l;
      const a = Math.acos(Math.min(1, cos)) - Math.atan(f.def.hitR / l);
      if (a < bestA) {
        const hit = this.world.raycast(ox, oy, oz, ex / l, ey / l, ez / l, l - f.def.hitR);
        if (!hit) { best = f; bestA = a; }
      }
    }
    return best;
  }

  fire(tool, shot) {
    const d = tool.def, b = this.body;
    let [dx, dy, dz] = this.aimDir(shot.big ? 0 : d.spread);
    const ox = b.x, oy = b.eyeY, oz = b.z;
    this.stats.shots++;
    // Aim assist bends the bolt onto a glitch just off the crosshair.
    if (this.opts.aimAssist > 0) {
      const f = this.target(this.opts.aimAssist, ox, oy, oz, [dx, dy, dz]);
      if (f) {
        const ex = f.px - ox, ey = f.cy - oy, ez = f.pz - oz, l = Math.hypot(ex, ey, ez);
        dx = ex / l; dy = ey / l; dz = ez / l;
      }
    }
    const wall = this.world.raycast(ox, oy, oz, dx, dy, dz, d.range, this._hit);
    let t = wall ? wall.t : d.range, n = wall ? [wall.nx, wall.ny, wall.nz] : null;
    // Nearest glitch or orb on the line.
    let foe = null, spit = null;
    for (const f of this.foes) {
      if (!f.alive) continue;
      const tt = raySphere(ox, oy, oz, dx, dy, dz, f.px, f.cy, f.pz, f.def.hitR + (shot.big ? 0.25 : 0));
      if (tt >= 0 && tt < t) { t = tt; foe = f; spit = null; }
    }
    for (const s of this.spits) {
      const tt = raySphere(ox, oy, oz, dx, dy, dz, s.x, s.y, s.z, 0.38);
      if (tt >= 0 && tt < t) { t = tt; spit = s; foe = null; }
    }
    if (foe) {
      this.stats.hits++;
      n = [-dx, -dy, -dz];
      if (damageFoe(this, foe, shot.damage, dx, dz, shot.big)) this.stats.popped++;
    }
    if (spit) { spit.life = 0; this.events.push({ type: "spitPop", x: spit.x, y: spit.y, z: spit.z }); n = [-dx, -dy, -dz]; }
    this.events.push({
      type: "shot", tool: tool.id, big: shot.big,
      o: [ox, oy, oz], d: [dx, dy, dz], t, hit: !!(wall || foe || spit) && t < d.range,
      n, foe: foe?.id ?? null,
    });
  }

  stepSpits(dt) {
    const b = this.body, cx = b.x, cy = b.y + 1.0, cz = b.z;
    for (const s of this.spits) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const l = Math.hypot(s.vx, s.vy, s.vz) * dt;
      const hit = this.world.raycast(s.x, s.y, s.z, s.vx * dt / l, s.vy * dt / l, s.vz * dt / l, l);
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (hit) { s.life = 0; this.events.push({ type: "spitPop", x: s.x, y: s.y, z: s.z }); continue; }
      if ((s.x - cx) ** 2 + ((s.y - cy) / 1.6) ** 2 + (s.z - cz) ** 2 < 0.5 ** 2) {
        s.life = 0;
        this.hurt(s.dmg, s.x, s.z);
        this.events.push({ type: "spitPop", x: s.x, y: s.y, z: s.z, onYou: true });
      }
    }
    this.spits = this.spits.filter((s) => s.life > 0);
  }

  stepDust(dt) {
    const b = this.body, cx = b.x, cy = b.y + 0.9, cz = b.z;
    for (const m of this.dustMotes) {
      m.t += dt;
      const dx = cx - m.x, dy = cy - m.y, dz = cz - m.z, d = Math.hypot(dx, dy, dz);
      if (m.t > 0.45 && d < 4.5) {
        // Drawn to you, faster the closer it gets.
        const k = (14 / Math.max(d, 0.3)) * dt;
        m.vx += dx * k; m.vy += dy * k; m.vz += dz * k;
        m.vx *= 1 - 3 * dt; m.vy *= 1 - 3 * dt; m.vz *= 1 - 3 * dt;
      } else {
        m.vy -= 12 * dt;
        m.vx *= 1 - 1.5 * dt; m.vz *= 1 - 1.5 * dt;
      }
      m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
      const floor = m.floor + 0.18;
      if (m.y < floor) { m.y = floor; m.vy = Math.abs(m.vy) * 0.35; }
      if (d < 0.7 && m.t > 0.45) { m.got = true; this.dust++; this.events.push({ type: "dust", x: m.x, y: m.y, z: m.z }); }
      if (m.t > 30) m.got = true;
    }
    this.dustMotes = this.dustMotes.filter((m) => !m.got);
  }
}

function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  if (tca < 0) return -1;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return -1;
  return tca - Math.sqrt(r * r - d2);
}
