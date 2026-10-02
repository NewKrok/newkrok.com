import { DT } from "../config.js";
import { Body } from "./player.js";
import { ToolState, TOOL_ORDER } from "./tools.js";
import { World } from "./world.js";
import { Foe, stepFoes, damageFoe, startle } from "./foes.js";
import { Anchor, stepAnchors, startTuning } from "./anchors.js";
import { BOSSES } from "./boss.js";
import { Nav } from "./nav.js";
import { buildLevel } from "../levels/kit.js";
import { rng } from "../rng.js";
import { toolDef, maxHpFor, magnetFor, perksFor, ITEM } from "../data/upgrades.js";
import { Cog } from "./cog.js";
import { Foam } from "./foam.js";

// ── One visit to a dream ─────────────────────────────────────────────────
// Everything that happens in a level, with no rendering: the body, the
// tools, the glitches and their orbs, dream dust, and (later) anchors and
// the boss. The renderer and the sound read `events` after every step and
// clear them.

// dmg: what a bonk costs you; heals: how often glitches drop a heal.
export const DIFFICULTY = {
  easy: { dmg: 0.5, heals: 1.5 },
  normal: { dmg: 1, heals: 1 },
  hard: { dmg: 1.5, heals: 0.7 },
};

// Wakefulness does not come back by itself: popped glitches now and then
// leave a dream drop behind (chance per kind; better when you are low).
const HEAL = { amount: 10, life: 30, magnet: 5, chance: { fuzz: 0.45, bunny: 0.25, buzzer: 0.5, tub: 1, knot: 1 } };
// Falling off the dream costs a bit too.
const FALL_DMG = 12;

export const MAX_HP = 50;
// Breath for running: seconds of running on a full one, seconds to fill it
// again (after a short rest), and how much back before you can run again.
// (The bench's lungs stretch the first two.)
const STAMINA = { delay: 0.6, again: 0.35 };

export class Run {
  constructor(levelDef, o = {}) {
    this.def = levelDef;
    this.kit = buildLevel(levelDef);
    this.world = this.kit.world;
    this.rnd = rng(o.seed ?? 1);
    this.opts = { difficulty: "normal", aimAssist: 0, autoFire: false, upgrades: {}, tools: ["stabilizer"], noTools: false, ...o };
    this.maxHp = maxHpFor(this.opts.upgrades);
    this.magnet = magnetFor(this.opts.upgrades);
    this.perks = perksFor(this.opts.upgrades);
    this.body = new Body();
    const s = this.kit.spawn;
    this.checkpoint = { ...s };
    // Loose glitches leave you alone this close to where you arrive.
    this.calm = levelDef.calm ? { x: s.x, z: s.z, r: levelDef.calm } : null;
    this.body.place(s.x, s.y, s.z, s.yaw);
    this.tools = this.opts.tools.map((id) => new ToolState(id, toolDef(id, this.opts.upgrades)));
    this.tool = 0;
    this.switchT = 0;
    this.balls = [];              // what the vacuum shoots back out
    this.foam = new Foam();       // the Foam Cannon's globs and steps
    this.time = 0;
    this.events = [];
    this.hp = this.maxHp; this.hurtT = 9; this.invuln = 0;
    this.stamina = 1; this.winded = false; this.restT = 0; this.sprinting = false;
    // Kit from the bench, in your pockets (none in the Factory).
    this.items = levelDef.hub ? {} : { ...(o.items ?? {}) };
    this.boostT = 0;              // an espresso still working
    this.faints = 0;
    this.foes = []; this.foeSeq = 0;
    this.nav = this.kit.foes.length || levelDef.boss ? new Nav(this.world) : null;
    this.spits = [];
    this.dustMotes = []; this.dust = 0;
    this.heals = [];
    this.shocks = [];
    this.stats = { popped: 0, shots: 0, hits: 0 };
    this.anchors = this.kit.anchors.map((a) => new Anchor(a));
    this.nearAnchor = null;
    this.uses = this.kit.uses;
    this.nearUse = null;
    this.memories = this.kit.memories.map((m) => ({ ...m, got: (o.memoriesFound ?? []).includes(m.id) }));
    this.found = [];
    this.boss = null; this.coreT = -1; this.wonT = -1; this.won = false;
    for (const f of this.kit.foes) this.spawn(f.kind, f.x, f.z);
    this.cog = levelDef.hub ? null : new Cog(this);
    this.events.length = 0;
    this._shots = [];
    this._hit = {};
  }

  get activeTool() { return this.tools[this.tool]; }
  get tuning() { return this.anchors.find((a) => a.state === "tuning") ?? null; }
  get fixedCount() { return this.anchors.filter((a) => a.state === "fixed").length; }
  // What the dream asks of you, for the task panel: [{ id, n, of, done, optional }].
  get objectives() {
    const out = [];
    if (this.anchors.length) out.push({ id: "anchors", n: this.fixedCount, of: this.anchors.length, done: this.fixedCount === this.anchors.length });
    if (this.def.boss && (this.boss || this.coreT > 0)) out.push({ id: "boss", done: !!this.boss && !this.boss.alive });
    if (this.memories.length) out.push({ id: "memories", n: this.memories.filter((m) => m.got).length, of: this.memories.length, optional: true });
    return out;
  }
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

  unlockTool(id) {
    if (this.tools.some((t) => t.id === id)) return;
    const held = this.activeTool, got = new ToolState(id, toolDef(id, this.opts.upgrades));
    this.tools.push(got);
    this.tools.sort((a, b) => TOOL_ORDER.indexOf(a.id) - TOOL_ORDER.indexOf(b.id));
    this.tool = this.tools.indexOf(held);
    this.events.push({ type: "toolUnlocked", tool: id });
    this.switchTool(this.tools.indexOf(got));
  }

  switchTool(i) {
    i = ((i % this.tools.length) + this.tools.length) % this.tools.length;
    if (i === this.tool) return;
    this.tool = i;
    this.switchT = 0.3;
    this.events.push({ type: "toolSwitch", tool: this.activeTool.id });
  }

  spawn(kind, x, z, o = {}) {
    const y = o.y ?? this.kit.floorAt(x, z, 60);
    const f = new Foe(this, kind, x, kind === "buzzer" ? y + 3 : y, z, o);
    this.foes.push(f);
    this.events.push({ type: "spawn", id: f.id, kind, x, y, z });
    return f;
  }

  spit(s) { s.life = 4; s.id = ++this.foeSeq; this.spits.push(s); this.events.push({ type: "spit", id: s.id, x: s.x, z: s.z }); }

  // A glitch popped: maybe it leaves a dream drop that wakes you up a bit.
  dropHeal(f) {
    const p = (HEAL.chance[f.kind] ?? 0) * this.diff.heals * (this.hp < this.maxHp * 0.35 ? 1.6 : 1);
    const n = f.kind === "knot" ? 2 : 1;
    for (let i = 0; i < n; i++) {
      if (this.rnd() >= p) continue;
      const a = this.rnd() * Math.PI * 2;
      this.heals.push({ x: f.px, y: f.cy + 0.3, z: f.pz, vx: Math.cos(a) * 1.5, vy: 4.5, vz: Math.sin(a) * 1.5, t: 0, floor: this.kit.floorAt(f.px, f.pz, f.cy + 0.5), id: ++this.foeSeq });
    }
  }

  // Dream drops: hop out, settle, and float to you when you need them.
  stepHeals(dt) {
    const b = this.body, cx = b.x, cy = b.y + 0.9, cz = b.z;
    for (const h of this.heals) {
      if (h.carry) { h.t = Math.min(h.t, 1); continue; }   // Cog has it
      h.t += dt;
      const dx = cx - h.x, dy = cy - h.y, dz = cz - h.z, d = Math.hypot(dx, dy, dz);
      h.pull = h.t > 0.5 && d < HEAL.magnet && this.hp < this.maxHp;
      if (h.pull) {
        const k = (10 / Math.max(d, 0.3)) * dt;
        h.vx += dx * k; h.vy += dy * k; h.vz += dz * k;
        h.vx *= 1 - 3 * dt; h.vy *= 1 - 3 * dt; h.vz *= 1 - 3 * dt;
      } else {
        h.vy -= 12 * dt;
        h.vx *= 1 - 2 * dt; h.vz *= 1 - 2 * dt;
      }
      h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt;
      if (h.y < h.floor + 0.4) { h.y = h.floor + 0.4; h.vy = Math.abs(h.vy) * 0.3; }
      if (d < 0.8 && h.pull) {
        h.got = true;
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + HEAL.amount);
        this.events.push({ type: "heal", x: h.x, y: h.y, z: h.z, amount: this.hp - before });
      }
      if (h.t > HEAL.life) h.got = true;
    }
    this.heals = this.heals.filter((h) => !h.got);
  }

  // A knot's slam: a ring that runs out along the ground; jump over it.
  shock(x, y, z, o = {}) { this.shocks.push({ x, y, z, r: 0, t: 0, hit: false, max: o.max ?? 6.5, speed: o.speed ?? 11, dmg: o.dmg ?? 8 }); }
  stepShocks(dt) {
    const b = this.body;
    for (const s of this.shocks) {
      s.t += dt; s.r = s.t * s.speed;
      const d = Math.hypot(b.x - s.x, b.z - s.z);
      if (!s.hit && Math.abs(d - s.r) < 0.6 && b.y - s.y < 0.45) { s.hit = true; this.hurt(s.dmg, s.x, s.z); }
    }
    this.shocks = this.shocks.filter((s) => s.r < s.max);
  }

  dropDust(x, y, z, n) {
    // The bench's sieve: now and then half as much again.
    if (this.perks.sieve && this.rnd() < this.perks.sieve) n += Math.ceil(n / 2);
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
    const dmg = amount * this.diff.dmg * this.perks.hurt;
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
    this.hp = this.maxHp;
    this.invuln = 1.5;
    this.shocks.length = 0;
    this.stamina = 1; this.winded = false;
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
    // Running: forward only, half as fast again, while the breath lasts.
    // Run out and you are winded: no running until you have got some back.
    // An espresso: quicker on your feet, and running costs no breath.
    const S = this.perks.stamina;
    this.boostT = Math.max(0, this.boostT - dt);
    const wantRun = !!intent.sprint && (intent.forward || 0) > 0.3 && !this.opts.noTools;
    this.sprinting = wantRun && !this.winded && (b.grounded || this.sprinting);
    if (this.sprinting && this.boostT > 0) this.restT = 0;
    else if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - dt / S.run);
      this.restT = 0;
      if (this.stamina <= 0) { this.winded = true; this.sprinting = false; this.events.push({ type: "winded" }); }
    } else {
      this.restT += dt;
      if (this.restT > STAMINA.delay) this.stamina = Math.min(1, this.stamina + dt / S.refill);
      if (this.winded && this.stamina >= STAMINA.again) this.winded = false;
    }
    b.step(this.world, intent, dt, (this.sprinting ? 1.45 : 1) * this.perks.speed * (this.boostT > 0 ? ITEM.espresso.speed : 1));
    if (b.jumped) this.events.push({ type: "jump" });
    if (b.landSpeed > 4) this.events.push({ type: "land", speed: b.landSpeed });
    // Water: a ring at every few steps through it, a splash on jumping in.
    const wy = this.kit.waterAt(b.x, b.z), wet = wy !== null && b.y < wy;
    if (wet && (!this.wet || b.landSpeed > 3)) this.events.push({ type: "wade", x: b.x, y: wy, z: b.z, vx: b.vx, vz: b.vz, big: Math.max(2, b.landSpeed) });
    else if (wet && b.speed2D > 0.5) {
      this.wadeT = (this.wadeT ?? 0) - dt * b.speed2D;
      if (this.wadeT <= 0) { this.wadeT = 1.6; this.events.push({ type: "wade", x: b.x, y: wy, z: b.z, vx: b.vx, vz: b.vz, big: 0 }); }
    }
    this.wet = wet;
    if (b.fell) {
      // Falling out of a dream puts you back at the last anchor, a little
      // less awake.
      const c = this.checkpoint;
      b.place(c.x, c.y, c.z, b.yaw);
      this.events.push({ type: "respawn" });
      this.invuln = 0;
      this.hurt(FALL_DMG, c.x, c.z);
    }

    this.hurtT += dt;
    this.invuln = Math.max(0, this.invuln - dt);

    // Tool switching takes a moment (the view model swaps them).
    if (intent.toolTo !== undefined && intent.toolTo !== this.tool) this.switchTool(intent.toolTo);
    this.switchT = Math.max(0, this.switchT - dt);
    const tool = this.activeTool;
    // Auto-fire (touch): shoot whenever the crosshair rests on a glitch.
    if (this.opts.autoFire && tool.id === "stabilizer" && !intent.fire && !intent.alt) intent = { ...intent, fire: !!this.target(0.035) || this.aimsAtBoss() };
    this._shots.length = 0;
    const held = this.switchT > 0 || this.opts.noTools ? NO_TOOL : intent;
    for (const t of this.tools) if (t !== tool) t.step(NO_TOOL, dt, []);   // the other tools cool down
    for (const shot of tool.step(held, dt, this._shots)) {
      if (shot.suck) this.suck(tool, dt);
      else if (shot.launch) this.launch(tool, shot.launch);
      else if (shot.blast) this.blast(tool);
      else if (shot.spray) this.foam.spray(this, tool);
      else if (shot.blob) this.foam.blob(this, tool);
      else this.fire(tool, shot);
    }
    this.stepBalls(dt);
    this.foam.step(this, dt);
    if (intent.item) this.useItem(intent.item);

    stepAnchors(this, dt);
    if (this.pendingUnlock && !this.tuning) { this.unlockTool(this.pendingUnlock); this.pendingUnlock = null; }
    // All anchors hold: the dream's heart opens and its nightmare comes up.
    if (this.coreT < 0 && !this.boss && this.def.boss && this.anchors.length && this.fixedCount === this.anchors.length) {
      this.coreT = 4;
      this.events.push({ type: "coreOpen" });
    }
    if (this.coreT > 0) {
      this.coreT -= dt;
      if (this.coreT <= 0) {
        const B = this.def.boss;
        this.boss = new BOSSES[B.kind](this, B.x, B.z, B.arena);
        this.events.push({ type: "bossRise", kind: B.kind, x: B.x, z: B.z });
      }
    }
    if (this.boss) {
      this.boss.step(this, dt);
      if (!this.boss.alive && this.wonT < 0) this.wonT = 3.5;
    }
    if (this.wonT > 0) {
      this.wonT -= dt;
      if (this.wonT <= 0 && !this.won) { this.won = true; this.events.push({ type: "dreamFixed" }); }
    }
    // Things to use: the nearest one in reach that you roughly face.
    this.nearUse = null;
    if (!this.nearAnchor) {
      let best = 1e9;
      const d = this.aimDir();
      for (const u of this.uses) {
        const dx = u.x - b.x, dz = u.z - b.z, dist = Math.hypot(dx, dz);
        if (dist > u.r || Math.abs(u.y - b.y) > 2) continue;
        const facing = (dx * d[0] + dz * d[2]) / Math.max(dist, 0.01);
        if (facing < 0.3 && dist > 0.8) continue;
        if (dist < best) { best = dist; this.nearUse = u; }
      }
    }
    if (intent.usePressed && this.nearAnchor) startTuning(this, this.nearAnchor);
    else if (intent.usePressed && this.nearUse) this.events.push({ type: "interact", id: this.nearUse.id });
    // Memories: walk into the bubble.
    for (const m of this.memories) {
      if (m.got) continue;
      if (Math.hypot(m.x - b.x, m.z - b.z) < 1.1 && Math.abs(m.y + 1.2 - (b.y + 1)) < 1.4) {
        m.got = true;
        this.found.push(m.id);
        this.dust += 5;
        this.events.push({ type: "memory", id: m.id, x: m.x, y: m.y + 1.2, z: m.z });
      }
    }
    this.nav?.update(b, dt);
    this.cog?.step(this, dt);
    stepFoes(this, dt);
    this.stepSpits(dt);
    this.stepDust(dt);
    this.stepHeals(dt);
    this.stepShocks(dt);
    this.foes = this.foes.filter((f) => f.alive || f.age < 0.1);
  }

  // Kit from your pockets. Cocoa is kept when you are wide awake anyway.
  useItem(id) {
    if (this.opts.noTools || !(this.items[id] > 0) || this.hp <= 0) return;
    if (id === "cocoa" && this.hp >= this.maxHp) { this.events.push({ type: "itemNo", id }); return; }
    this.items[id]--;
    const b = this.body;
    if (id === "pillow") {
      // A pillow bomb: lobbed, bursts on whatever it meets in a cloud of feathers.
      const P = ITEM.pillow, [dx, dy, dz] = this.aimDir();
      this.balls.push({ x: b.x + dx * 0.7, y: b.eyeY + dy * 0.7 - 0.15, z: b.z + dz * 0.7, vx: dx * P.speed + b.vx * 0.5, vy: dy * P.speed + P.up, vz: dz * P.speed + b.vz * 0.5, kind: "pillow", life: 3, id: ++this.foeSeq, dmg: P.damage, splash: P.splash, sleep: P.sleep });
    } else if (id === "espresso") {
      this.boostT = ITEM.espresso.time;
      this.stamina = 1; this.winded = false;
    } else if (id === "cocoa") {
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + ITEM.cocoa.heal);
      this.events.push({ type: "heal", x: b.x, y: b.y + 1, z: b.z, amount: this.hp - before });
    }
    this.events.push({ type: "itemUse", id, left: this.items[id] });
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

  aimsAtBoss() {
    if (!this.boss?.alive || this.boss.invulnerable) return false;
    const b = this.body, d = this.aimDir();
    return this.boss.hitSpheres().some(([x, y, z, r]) => raySphere(b.x, b.eyeY, b.z, d[0], d[1], d[2], x, y, z, r) >= 0);
  }

  fire(tool, shot) {
    const d = tool.def, b = this.body;
    let [dx, dy, dz] = this.aimDir(shot.big ? 0 : d.spread * (1 + tool.heat * 1.5));
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
    let bossPart = null, bossMul = 1;
    if (this.boss?.alive) {
      for (const [x, y, z, r, mul, part] of this.boss.hitSpheres()) {
        const tt = raySphere(ox, oy, oz, dx, dy, dz, x, y, z, r + (shot.big ? 0.2 : 0));
        if (tt >= 0 && tt < t) { t = tt; foe = null; spit = null; bossPart = part; bossMul = mul; }
      }
    }
    if (bossPart) {
      this.stats.hits++;
      n = [-dx, -dy, -dz];
      this.boss.damage(this, shot.damage * bossMul, bossPart);
    }
    if (foe) {
      this.stats.hits++;
      n = [-dx, -dy, -dz];
      if (damageFoe(this, foe, shot.damage, dx, dz, shot.big)) this.stats.popped++;
    }
    if (spit) { spit.life = 0; this.events.push({ type: "spitPop", x: spit.x, y: spit.y, z: spit.z }); n = [-dx, -dy, -dz]; }
    // A bolt whizzing past (or smacking in) close to a glitch gets its
    // attention, even if it missed.
    const near = shot.big ? 4 : 2.6;
    for (const f of this.foes) {
      if (!f.alive || f.aware || f.group || f === foe) continue;
      const ex = f.px - ox, ey = f.cy - oy, ez = f.pz - oz;
      const u = Math.max(0, Math.min(t, ex * dx + ey * dy + ez * dz));
      if (Math.hypot(ex - dx * u, ey - dy * u, ez - dz * u) < near) startle(this, f);
    }
    this.events.push({
      type: "shot", tool: tool.id, big: shot.big,
      o: [ox, oy, oz], d: [dx, dy, dz], t, hit: !!(wall || foe || spit || bossPart) && t < d.range, boss: bossPart,
      n, foe: foe?.id ?? null,
    });
  }

  // ── The Fuzz Vacuum ──
  // A cone in front of you pulls things in; small glitches that reach the
  // nozzle are caught in the tank.
  inCone(x, y, z, range, cone) {
    const b = this.body, d = this.aimDir();
    const ex = x - b.x, ey = y - b.eyeY, ez = z - b.z, l = Math.hypot(ex, ey, ez);
    if (l > range || l < 1e-3) return l < 1e-3 ? 0.001 : 0;
    const cos = (ex * d[0] + ey * d[1] + ez * d[2]) / l;
    // Wider up close, so something right under the nozzle is not lost.
    const c = Math.min(1.1, cone + Math.max(0, 2.8 - l) * 0.35);
    return cos > Math.cos(c) ? l : 0;
  }

  suck(tool, dt) {
    const d = tool.def, b = this.body;
    const [ax, ay, az] = this.aimDir();
    const nx = b.x + ax * 0.6, ny = b.eyeY + ay * 0.6, nz = b.z + az * 0.6;
    const full = tool.tank.length >= d.tankSize;
    for (const f of this.foes) {
      if (!f.alive || f.state === "spawn") continue;
      const l = this.inCone(f.px, f.cy, f.pz, d.range, d.cone);
      if (!l || !this.canSee(f.px, f.cy, f.pz)) continue;
      // The stream wears everything down (knots unravel twice as fast).
      f.stream = (f.stream || 0) + d.stream * dt * (f.kind === "knot" ? 2 : 1);
      if (f.stream >= 0.5) {
        const dmg = f.stream; f.stream = 0;
        if (damageFoe(this, f, dmg, 0, 0, false)) { this.stats.popped++; continue; }
      }
      if (!f.def.catchable) continue;             // too big to move
      // Fresh ones fight the pull: only a glitch the stream has worn down
      // is drawn in properly (and caught).
      const worn = f.hp <= f.maxHp * d.worn;
      const ex = nx - f.px, ey = ny - f.cy, ez = nz - f.pz, el = Math.hypot(ex, ey, ez) || 1;
      // A full tank only draws weakly: shoot it empty first.
      const k = d.pull * (1.3 - Math.min(1, l / d.range)) * dt * (full ? 0.25 : 1) * (worn ? 1 : 0.3);
      if (f.body) {
        f.body.vx += ex / el * k * 1.6; f.body.vz += ez / el * k * 1.6;
        if (f.body.grounded && l < 4) { f.body.vy = 2.5; f.body.grounded = false; }
      } else { f.vx += ex / el * k * 1.4; f.vy += ey / el * k * 1.4; f.vz += ez / el * k * 1.4; }
      f.state = "sucked"; f.t = 0;
      if (l < d.catchAt && !full && worn) {
        // Caught: into the tank it goes (that counts as smoothed out).
        f.alive = false;
        tool.tank.push(f.kind);
        this.stats.popped++;
        this.events.push({ type: "catch", kind: f.kind, id: f.id, x: f.px, y: f.cy, z: f.pz, n: tool.tank.length });
        this.dropDust(f.px, f.cy, f.pz, f.def.dust);
        this.dropHeal(f);
        if (tool.tank.length >= d.tankSize) break;
      }
    }
    for (const s of this.spits) if (this.inCone(s.x, s.y, s.z, d.range, d.cone)) {
      const ex = nx - s.x, ey = ny - s.y, ez = nz - s.z, el = Math.hypot(ex, ey, ez) || 1;
      s.vx += ex / el * 40 * dt; s.vy += ey / el * 40 * dt; s.vz += ez / el * 40 * dt;
      if (el < 1.2) { s.life = 0; s.harmless = true; this.events.push({ type: "spitPop", x: s.x, y: s.y, z: s.z, sucked: true }); }
    }
    for (const m of this.dustMotes) if (m.t > 0.2 && this.inCone(m.x, m.y, m.z, d.range * 1.5, d.cone * 1.3)) {
      const ex = nx - m.x, ey = ny - m.y, ez = nz - m.z, el = Math.hypot(ex, ey, ez) || 1;
      m.vx += ex / el * 60 * dt; m.vy += ey / el * 60 * dt; m.vz += ez / el * 60 * dt;
      m.t = Math.max(m.t, 0.46);
    }
    // The boss feels the stream too (its bag more).
    const B = this.boss;
    if (B?.alive && !B.invulnerable) {
      for (const [x, y, z, r, mul, part] of B.hitSpheres()) {
        if (!this.inCone(x, y, z, d.range + r, d.cone + 0.15)) continue;
        B.stream = (B.stream || 0) + d.stream * dt * mul;
        if (B.stream >= 0.6) { B.damage(this, B.stream, part); B.stream = 0; }
        break;
      }
    }
  }

  // Shoot what the tank holds: a heavy yarn ball that bursts on impact.
  launch(tool, kind) {
    const d = tool.def.launch, b = this.body;
    const [dx, dy, dz] = this.aimDir();
    this.balls.push({ x: b.x + dx * 0.8, y: b.eyeY + dy * 0.8 - 0.1, z: b.z + dz * 0.8, vx: dx * d.speed, vy: dy * d.speed + 1.5, vz: dz * d.speed, kind, life: 3, id: ++this.foeSeq, dmg: d.damage, splash: d.splash });
    this.events.push({ type: "launch", kind });
  }

  // Empty tank: a puff of air that shoves glitches and orbs away.
  blast(tool) {
    const d = tool.def.blast;
    const [ax, , az] = this.aimDir();
    for (const f of this.foes) {
      if (!f.alive || f.kind === "knot") continue;
      if (!this.inCone(f.px, f.cy, f.pz, d.range, d.cone)) continue;
      damageFoe(this, f, d.damage, ax * d.push / 3.5, az * d.push / 3.5, true);
    }
    for (const s of this.spits) if (this.inCone(s.x, s.y, s.z, d.range, d.cone)) { s.vx = ax * 12; s.vz = az * 12; s.harmless = true; }
    this.boss?.blasted?.(this, ax, az, d);
    this.events.push({ type: "blast" });
  }

  stepBalls(dt) {
    for (const g of this.balls) {
      g.life -= dt;
      g.vy -= 9 * dt;
      const l = Math.hypot(g.vx, g.vy, g.vz) * dt;
      const hit = this.world.raycast(g.x, g.y, g.z, g.vx * dt / l, g.vy * dt / l, g.vz * dt / l, l + 0.25);
      g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
      let boom = !!hit || g.life <= 0;
      for (const f of this.foes) {
        if (!f.alive) continue;
        if ((f.px - g.x) ** 2 + (f.cy - g.y) ** 2 + (f.pz - g.z) ** 2 < (f.def.hitR + 0.3) ** 2) boom = true;
      }
      if (this.boss?.ballHit?.(this, g)) { g.life = 0; continue; }
      if (!boom) continue;
      g.life = 0;
      for (const f of this.foes) {
        if (!f.alive) continue;
        const d = Math.hypot(f.px - g.x, f.cy - g.y, f.pz - g.z);
        if (d < g.splash) {
          const k = 1 - d / g.splash * 0.5;
          damageFoe(this, f, g.dmg * k, (f.px - g.x) / (d || 1), (f.pz - g.z) / (d || 1), true);
          // A pillow leaves the ones it did not pop dozing for a moment.
          if (g.sleep && f.alive && f.def.knock > 0) { f.state = "stun"; f.t = -g.sleep; }
        }
      }
      this.boss?.splash?.(this, g);
      this.events.push({ type: "ballPop", kind: g.kind, x: g.x, y: g.y, z: g.z });
    }
    this.balls = this.balls.filter((g) => g.life > 0);
  }

  stepSpits(dt) {
    const b = this.body, cx = b.x, cy = b.y + 1.0, cz = b.z;
    for (const s of this.spits) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.g) s.vy -= s.g * dt;
      const l = Math.hypot(s.vx, s.vy, s.vz) * dt;
      const hit = this.world.raycast(s.x, s.y, s.z, s.vx * dt / l, s.vy * dt / l, s.vz * dt / l, l);
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      const landed = s.splash && s.vy < 0 && s.y <= s.ty + 0.1;
      if (hit || landed) { this.burstSpit(s); continue; }
      if (!s.harmless && (s.x - cx) ** 2 + ((s.y - cy) / 1.6) ** 2 + (s.z - cz) ** 2 < (s.splash ? 0.7 : 0.5) ** 2) {
        if (s.splash) { this.burstSpit(s); continue; }
        s.life = 0;
        this.hurt(s.dmg, s.x, s.z);
        this.events.push({ type: "spitPop", x: s.x, y: s.y, z: s.z, onYou: true, kind: s.kind });
      }
    }
    this.spits = this.spits.filter((s) => s.life > 0);
  }

  // An orb ends; a soap bubble bursts and soaks anyone near.
  burstSpit(s) {
    s.life = 0;
    if (s.splash && !s.harmless) {
      const b = this.body;
      if (Math.hypot(b.x - s.x, b.z - s.z) < s.splash && Math.abs(b.y + 0.8 - s.y) < 2) this.hurt(s.dmg, s.x, s.z);
    }
    this.events.push({ type: "spitPop", x: s.x, y: s.y, z: s.z, splash: s.splash || 0, kind: s.kind });
  }

  stepDust(dt) {
    const b = this.body, cx = b.x, cy = b.y + 0.9, cz = b.z;
    for (const m of this.dustMotes) {
      if (m.carry) { m.t = Math.min(m.t, 1); continue; }   // Cog has it
      m.t += dt;
      const dx = cx - m.x, dy = cy - m.y, dz = cz - m.z, d = Math.hypot(dx, dy, dz);
      m.pull = m.t > 0.45 && d < this.magnet;
      if (m.pull) {
        // Drawn to you, faster the closer it gets.
        const k = (14 / Math.max(d, 0.3)) * dt;
        m.vx += dx * k; m.vy += dy * k; m.vz += dz * k;
        m.vx *= 1 - 3 * dt; m.vy *= 1 - 3 * dt; m.vz *= 1 - 3 * dt;
      } else {
        m.vy -= 12 * dt;
        m.vx *= 1 - 1.5 * dt; m.vz *= 1 - 1.5 * dt;
      }
      m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
      const floor = m.floor + 0.45;          // they hover a little off the ground
      if (m.y < floor) { m.y = floor; m.vy = Math.abs(m.vy) * 0.35; }
      if (d < 0.7 && m.t > 0.45) { m.got = true; this.dust++; this.events.push({ type: "dust", x: m.x, y: m.y, z: m.z }); }
      if (m.t > 30) m.got = true;
    }
    this.dustMotes = this.dustMotes.filter((m) => !m.got);
  }
}

const NO_TOOL = { fire: false, alt: false };

function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  if (tca < 0) return -1;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return -1;
  return tca - Math.sqrt(r * r - d2);
}
