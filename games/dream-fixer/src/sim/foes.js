import { Body } from "./player.js";

// ── Glitches ─────────────────────────────────────────────────────────────
// What goes wrong in a dream. Nobody dies: a glitch that runs out of `hp`
// is smoothed out and pops into dream dust.
//
//  fuzz    (Kóc)     hops at you, winds up, bonks.
//  buzzer  (Zizegő)  circles overhead and spits slow, shootable orbs.
//  knot    (Csomó)   sits still and keeps tangling out new fuzzes.
//
// The dream skins them (a yarn squirrel in the park); the sim only knows
// the kind.

export const FOES = {
  fuzz: { hp: 3, r: 0.36, h: 0.8, speed: 4.3, dmg: 7, dust: 3, hitR: 0.44, hitY: 0.4, knock: 1 },
  buzzer: { hp: 4, r: 0.4, speed: 3.4, dmg: 7, dust: 4, hitR: 0.46, hitY: 0, fly: true, knock: 0.6 },
  knot: { hp: 16, r: 0.95, h: 1.4, dust: 12, hitR: 1.0, hitY: 0.75, still: true, knock: 0 },
};

const TAU = Math.PI * 2;
const angTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));

export class Foe {
  constructor(run, kind, x, y, z, o = {}) {
    const d = this.def = FOES[kind];
    this.kind = kind;
    this.id = ++run.foeSeq;
    this.hp = this.maxHp = d.hp * (o.hpMul ?? 1);
    this.alive = true;
    this.state = "spawn";
    this.t = 0;                   // time in the current state
    this.age = 0;
    this.cd = 0.6 + run.rnd() * 0.8;
    this.flash = 0;
    this.yaw = run.rnd() * TAU;
    this.group = o.group ?? null; // the wave / anchor / knot it belongs to
    this.parent = o.parent ?? null;
    this.phase = run.rnd() * TAU;
    this.pulse = 0;
    if (d.fly) {
      this.x = x; this.y = y; this.z = z;
      this.vx = 0; this.vy = 0; this.vz = 0;
      this.orbit = 6 + run.rnd() * 3; this.dir = run.rnd() < 0.5 ? -1 : 1;
    } else if (d.still) {
      this.x = x; this.y = y; this.z = z;
    } else {
      this.body = new Body(x, y, z, { radius: d.r, height: d.h, step: 0.5, speed: d.speed, accel: 30, airAccel: 6, jump: 6.2 });
      this.body.grounded = true;
    }
  }

  get px() { return this.body ? this.body.x : this.x; }
  get py() { return this.body ? this.body.y : this.y; }
  get pz() { return this.body ? this.body.z : this.z; }
  // Centre of the part you shoot at.
  get cy() { return this.py + this.def.hitY; }
}

// Only this many fuzzes may be winding up or lunging at once; the rest
// circle round you and wait their turn. It keeps a crowd fair.
const ATTACKERS = 2;

// ── Per-step update of every glitch ──
export function stepFoes(run, dt) {
  const P = run.body, px = P.x, pz = P.z, pcy = P.y + 1.0;
  run.attackers = 0;
  for (const f of run.foes) if (f.alive && (f.state === "windup" || f.state === "lunge")) run.attackers++;
  for (const f of run.foes) {
    f.lx = f.px; f.ly = f.py; f.lz = f.pz;      // for the renderer's interpolation
    f.age += dt; f.t += dt;
    f.flash = Math.max(0, f.flash - dt * 6);
    if (!f.alive) continue;
    if (f.state === "spawn") { if (f.t > 0.5) setState(f, "idle"); else continue; }
    if (f.kind === "fuzz") fuzz(run, f, dt, px, pz);
    else if (f.kind === "buzzer") buzzer(run, f, dt, px, pcy, pz);
    else if (f.kind === "knot") knot(run, f, dt, px, pz);
  }
  // Fuzzes do not stack on each other or on you.
  const list = run.foes;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.alive || !a.body) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (!b.alive || !b.body) continue;
      const dx = b.body.x - a.body.x, dz = b.body.z - a.body.z, d = Math.hypot(dx, dz), m = a.def.r + b.def.r;
      if (d < m && d > 1e-4) {
        const k = (m - d) / d * 0.5;
        a.body.x -= dx * k; a.body.z -= dz * k; b.body.x += dx * k; b.body.z += dz * k;
      }
    }
    const dx = a.body.x - px, dz = a.body.z - pz, d = Math.hypot(dx, dz), m = a.def.r + P.r;
    if (d < m && d > 1e-4 && Math.abs(a.body.y - P.y) < 1.2) { a.body.x += dx / d * (m - d); a.body.z += dz / d * (m - d); }
  }
}

function setState(f, s) { f.state = s; f.t = 0; }

function fuzz(run, f, dt, px, pz) {
  const b = f.body, d = f.def;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  const dy = run.body.y - b.y;
  f.cd -= dt;
  let intent = { forward: 0, strafe: 0, jump: false, jumpPressed: false };
  let speedMul = 1;
  switch (f.state) {
    case "idle":
    case "chase": {
      const aware = dist < 26 || f.group;
      if (!aware) { f.yaw += Math.sin(f.age * 0.7 + f.phase) * dt; intent.forward = 0.3; break; }
      // Head for you, weaving a little so a crowd does not form a line.
      const waiting = run.attackers >= ATTACKERS || f.cd > 0;
      f.yaw = angTo(b.x, b.z, px, pz) + Math.sin(f.age * 2.1 + f.phase) * 0.35;
      if (waiting && dist < 3.4) {
        // Not its turn: keep a little distance and sidle round you.
        intent.forward = dist < 2.6 ? -0.6 : 0;
        intent.strafe = Math.sin(f.phase) > 0 ? 0.7 : -0.7;
      } else intent.forward = dist > 1.2 ? 1 : 0;
      // Stuck against a ledge: hop.
      if (b.grounded && dist > 2 && b.speed2D < 0.8 && f.t > 0.3 && !waiting) { intent.jumpPressed = true; f.t = 0; }
      if (dist < 1.8 && Math.abs(dy) < 1.2 && !waiting) { setState(f, "windup"); run.attackers++; run.events.push({ type: "windup", x: b.x, z: b.z }); }
      break;
    }
    case "windup":
      f.yaw = angTo(b.x, b.z, px, pz);
      speedMul = 0;
      if (f.t > 0.5) {
        setState(f, "lunge");
        const k = 7.5 / Math.max(dist, 0.1);
        b.vx = dx * k; b.vz = dz * k; b.vy = 3.2; b.grounded = false;
        f.hitDone = false;
      }
      break;
    case "lunge":
      if (!f.hitDone && dist < d.r + run.body.r + 0.25 && Math.abs(dy) < 1.3) {
        f.hitDone = true;
        run.hurt(d.dmg, b.x, b.z);
        run.events.push({ type: "bonk", x: b.x, z: b.z });
        b.vx *= -0.3; b.vz *= -0.3;
      }
      if (f.t > 0.35 && b.grounded) { setState(f, "recover"); f.cd = 1.8 + run.rnd() * 0.9; }
      break;
    case "recover":
      if (f.t > 0.45) setState(f, "chase");
      break;
    case "stun":
      if (f.t > 0.35) setState(f, "chase");
      break;
    case "sucked":
      // Caught in the vacuum's stream: helpless until it lets go.
      b.vx *= 1 - 2 * dt; b.vz *= 1 - 2 * dt;
      if (f.t > 0.15) setState(f, "chase");
      break;
  }
  const holdVel = f.state === "lunge" || f.state === "stun" || f.state === "sucked";
  b.yaw = f.yaw;
  if (holdVel && (!b.grounded || f.state === "sucked")) {
    // Airborne lunge / knockback: keep the velocity, only gravity and walls.
    const vx = b.vx, vz = b.vz;
    b.step(run.world, intent, dt, 0);
    b.vx = vx; b.vz = vz;
  } else b.step(run.world, intent, dt, speedMul);
  if (b.fell) { f.alive = false; f.hp = 0; f.lost = true; }
}

function buzzer(run, f, dt, px, pcy, pz) {
  const d = f.def;
  if (f.state === "sucked") {
    f.vx *= 1 - 2 * dt; f.vy *= 1 - 2 * dt; f.vz *= 1 - 2 * dt;
    f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    if (f.t > 0.15) setState(f, "idle");
    return;
  }
  const dx = f.x - px, dz = f.z - pz, dist = Math.hypot(dx, dz) || 0.01;
  f.cd -= dt;
  // Orbit you at a distance, bobbing, a few metres up.
  const a = Math.atan2(dz, dx) + f.dir * dt * 0.55;
  const want = f.orbit + Math.sin(f.age * 0.6 + f.phase) * 1.5;
  const tx = px + Math.cos(a) * want, tz = pz + Math.sin(a) * want;
  const floor = run.kit.floorAt(f.x, f.z, f.y + 1);
  const ty = Math.max(pcy + 2.2, floor + 1.6) + Math.sin(f.age * 1.7 + f.phase) * 0.5;
  const slow = f.state === "windup" ? 0.25 : 1;
  const ax = (tx - f.x) * 1.4, ay = (ty - f.y) * 2, az = (tz - f.z) * 1.4;
  f.vx += (ax - f.vx) * Math.min(1, dt * 2.5); f.vy += (ay - f.vy) * Math.min(1, dt * 2.5); f.vz += (az - f.vz) * Math.min(1, dt * 2.5);
  const sp = Math.hypot(f.vx, f.vz), max = d.speed * slow;
  if (sp > max) { f.vx *= max / sp; f.vz *= max / sp; }
  f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
  // Keep out of solid things around its height.
  for (const c of run.world.query(f.x, f.z, d.r)) {
    if (c.y0 > f.y + 0.4 || run.topAt(c, f.x, f.z) < f.y - 0.4) continue;
    const pen = run.world.push2D(c, f.x, f.z, d.r);
    if (pen > 0) { f.x += run.world.nx * pen; f.z += run.world.nz * pen; }
  }
  if (f.y < floor + 0.6) { f.y = floor + 0.6; f.vy = Math.max(0, f.vy); }
  f.yaw = angTo(f.x, f.z, px, pz);

  if (f.state === "idle" && f.cd <= 0 && dist < 22 && run.canSee(f.x, f.y, f.z)) setState(f, "windup");
  if (f.state === "windup" && f.t > 0.6) {
    // Spit an orb at where you are going to be.
    const B = run.body, lead = Math.min(1, dist / 8);
    const tx2 = B.x + B.vx * lead * 0.6, ty2 = B.y + 1.1, tz2 = B.z + B.vz * lead * 0.6;
    const ex = tx2 - f.x, ey = ty2 - f.y, ez = tz2 - f.z, l = Math.hypot(ex, ey, ez) || 1;
    const v = 8.5;
    run.spit({ x: f.x - Math.sin(f.yaw) * 0.4, y: f.y - 0.05, z: f.z - Math.cos(f.yaw) * 0.4, vx: ex / l * v, vy: ey / l * v, vz: ez / l * v, dmg: d.dmg, owner: f.id });
    f.cd = 2.2 + run.rnd() * 1.4;
    setState(f, "idle");
  }
  if (f.state === "stun" && f.t > 0.3) setState(f, "idle");
}

function knot(run, f, dt, px, pz) {
  const dist = Math.hypot(px - f.x, pz - f.z);
  f.cd -= dt;
  f.pulse = Math.max(0, (f.pulse || 0) - dt * 2);
  if (f.cd > 0 || dist > 26) return;
  const kids = run.foes.filter((o) => o.alive && o.parent === f.id).length;
  if (kids >= 3) { f.cd = 1; return; }
  f.cd = 4.2 + run.rnd() * 1.2;
  f.pulse = 1;
  const a = run.rnd() * TAU;
  run.spawn("fuzz", f.x + Math.cos(a) * 1.4, f.z + Math.sin(a) * 1.4, { parent: f.id, group: f.group });
}

// Hit a glitch; returns true if that finished it.
export function damageFoe(run, f, dmg, dx, dz, big) {
  if (!f.alive || f.state === "spawn" && f.t < 0.2) return false;
  f.hp -= dmg;
  f.flash = 1;
  const k = f.def.knock * (big ? 2.2 : 1);
  if (f.body && k > 0) {
    f.body.vx += dx * 3.5 * k; f.body.vz += dz * 3.5 * k;
    if (big) { f.body.vy = 3; f.body.grounded = false; }
    if (f.state !== "lunge") { f.state = "stun"; f.t = 0; }
  } else if (f.def.fly) {
    f.vx += dx * 4 * k; f.vz += dz * 4 * k;
    if (f.state === "windup") { f.state = "stun"; f.t = 0; f.cd = 1.2; }
  }
  if (f.hp <= 0) {
    f.alive = false;
    run.events.push({ type: "pop", kind: f.kind, id: f.id, x: f.px, y: f.cy, z: f.pz, big: f.kind === "knot" });
    run.dropDust(f.px, f.cy, f.pz, f.def.dust);
    return true;
  }
  run.events.push({ type: "foeHit", id: f.id, kind: f.kind });
  return false;
}
