import { Body } from "./player.js";
import { World } from "./world.js";

// ── Glitches ─────────────────────────────────────────────────────────────
// What goes wrong in a dream. Nobody dies: a glitch that runs out of `hp`
// is smoothed out and pops into dream dust.
//
//  fuzz    (Kóc)     hops at you, winds up, bonks; from a few metres off
//                    it may lob a nut at you instead.
//  buzzer  (Zizegő)  circles overhead and spits slow, shootable orbs.
//  knot    (Csomó)   sits still and keeps tangling out new fuzzes.
//  bunny   (Porcica) a dust bunny: tiny, quick, comes in packs, nips; now
//                    and then it crouches and leaps at you from afar.
//  tub     (Fürdőkád) waddles about at a distance and lobs soap bubbles
//                    that burst where they land (a ring shows where).
//
// The dream skins them (a tangled squirrel in the park); the sim only
// knows the kind. Glitches already loose in a dream mind their own
// business until you come near.

// Melee walkers: how they wind up and lunge, and how many may attack at once.
const MELEE = {
  fuzz: { windup: 0.5, lunge: 7.5, reach: 1.8, cd: 1.8, attackers: 2 },
  bunny: { windup: 0.3, lunge: 6.5, reach: 1.3, cd: 1.4, attackers: 2 },
};
// The fuzz's nut: thrown from between min and max metres, a few at a time.
const THROW = { min: 4.5, max: 16, windup: 0.6, cd: 3.2, cdRand: 2.6, throwers: 2, speed: 12, dmg: 4 };
// The bathtub's shower: bubbles per volley, seconds between them, how far
// round you they scatter, and the rest between volleys.
const TUB = { volley: 5, gap: 0.14, scatter: 3.2, cd: 2.4, cdRand: 1.4 };
// The bunny's leap: from between min and max metres, one bunny at a time.
const LEAP = { min: 3.5, max: 9, crouch: 0.35, vy: 7, maxSpeed: 16, cd: 3.5, cdRand: 3.5, dmg: 5 };
// Hitting a glitch from afar brings it (and its neighbours) after you.
const ALERT = { hit: 14, notice: 9, provoked: 12 };
// A walker will not step off a drop deeper than this.
const DROP = 1.4;

export const FOES = {
  fuzz: { hp: 3, r: 0.36, h: 0.8, speed: 4.3, dmg: 7, dust: 3, hitR: 0.44, hitY: 0.4, knock: 1, catchable: true },
  bunny: { hp: 1, r: 0.22, h: 0.45, speed: 5.4, dmg: 3, dust: 1, hitR: 0.32, hitY: 0.22, knock: 1.4, catchable: true },
  tub: { hp: 17.5, r: 0.9, h: 1.3, speed: 2, dmg: 6, dust: 10, hitR: 0.95, hitY: 0.75, knock: 0.15 },
  buzzer: { hp: 4, r: 0.4, speed: 3.4, dmg: 7, dust: 4, hitR: 0.46, hitY: 0, fly: true, knock: 0.6, catchable: true },
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

// Only a few of each melee kind may be winding up or lunging at once; the
// rest circle round you and wait their turn. It keeps a crowd fair.

// ── Per-step update of every glitch ──
export function stepFoes(run, dt) {
  const P = run.body, px = P.x, pz = P.z, pcy = P.y + 1.0;
  run.attackers = { fuzz: 0, bunny: 0 };
  run.throwers = 0; run.leapers = 0;
  for (const f of run.foes) {
    if (!f.alive) continue;
    f.provoked = Math.max(0, (f.provoked || 0) - dt);
    f.alertT = Math.max(0, (f.alertT || 0) - dt);
    if (f.state === "crouch" || f.leap) run.leapers++;
    if (f.kind in run.attackers && (f.state === "windup" || f.state === "lunge")) run.attackers[f.kind]++;
    if (f.state === "throw") run.throwers++;
  }
  for (const f of run.foes) {
    f.lx = f.px; f.ly = f.py; f.lz = f.pz;      // for the renderer's interpolation
    f.age += dt; f.t += dt;
    f.flash = Math.max(0, f.flash - dt * 6);
    if (!f.alive) continue;
    if (f.state === "spawn") { if (f.t > 0.5) setState(f, "idle"); else continue; }
    if (f.kind === "fuzz" || f.kind === "bunny") fuzz(run, f, dt, px, pz);
    else if (f.kind === "tub") tub(run, f, dt, px, pz);
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
        shove(run, a.body, -dx * k, -dz * k); shove(run, b.body, dx * k, dz * k);
      }
    }
    const dx = a.body.x - px, dz = a.body.z - pz, d = Math.hypot(dx, dz), m = a.def.r + P.r;
    if (d < m && d > 1e-4 && Math.abs(a.body.y - P.y) < 1.2) shove(run, a.body, dx / d * (m - d), dz / d * (m - d));
  }
}

function setState(f, s) { f.state = s; f.t = 0; }

// Crowding pushes a walker aside, but never over the edge of a drop (its
// far side has to stay over ground).
function shove(run, b, dx, dz) {
  const l = Math.hypot(dx, dz);
  if (l < 1e-6) return;
  const k = b.r + 0.15;
  if (b.grounded && floorBelow(run.world, b.x + dx + dx / l * k, b.z + dz + dz / l * k, b.y) < b.y - DROP) return;
  b.x += dx; b.z += dz;
}

// Ground all the way along the line, no drop deeper than a metre (a leap
// must not sail out over the void beside a bridge).
function groundAlong(run, x0, z0, x1, z1, y) {
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5);
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    if (floorBelow(run.world, x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, y + 0.5) < y - 1) return false;
  }
  return true;
}

// Is it paying attention to you? Wave glitches always are; loose ones only
// once you come close, and they give up if you get well away. Around the
// spot where you arrive the dream is calm: loose glitches leave you be
// there (time to listen to Margó and look round).
function aware(run, f, dist) {
  if (f.group) return true;
  if (f.provoked > 0) { notice(run, f); return true; }
  const c = run.calm, P = run.body;
  if (c && Math.hypot(P.x - c.x, P.z - c.z) < c.r) return (f.aware = false);
  if (dist < 14 && !f.aware) { notice(run, f); alert(run, f, ALERT.notice, 4); }
  else if (dist > 28) f.aware = false;      // lost you: back home
  return f.aware;
}

// The moment a loose glitch spots you: a "!" pops up over it for a second.
function notice(run, f) {
  if (f.aware || f.group) { f.aware = true; return; }
  f.aware = true;
  f.alertT = 1.1;
  run.events.push({ type: "notice", id: f.id, kind: f.kind, x: f.px, z: f.pz });
}

// A glitch that notices you (or is hit) calls the loose ones round it in.
function alert(run, f, r, provoked) {
  for (const o of run.foes) {
    if (o === f || !o.alive || o.group || o.kind === "knot") continue;
    if (Math.hypot(o.px - f.px, o.pz - f.pz) > r) continue;
    notice(run, o);
    o.provoked = Math.max(o.provoked || 0, provoked);
  }
}

// Where to walk to reach you: down the nav field when the way is not
// straight (round the pond, over the bridge), else straight at you. A
// third value is the floor height across a gap to hop over to.
function wayTo(run, b, px, pz, dist) {
  if (dist < 3) return [px, pz];
  const p = run.nav?.next(b.x, b.z, b.y);
  return p ? [p[0], p[1], p[3]] : [px, pz];
}

// Hop over a gap to (x, y, z) in an arc high enough to clear the edges.
function hopTo(b, x, y, z) {
  const g = 27, ex = x - b.x, ez = z - b.z, l = Math.hypot(ex, ez);
  const T = 0.5 + l * 0.07;
  b.vx = ex / T; b.vz = ez / T; b.vy = (y - b.y + 0.5 * g * T * T) / T; b.grounded = false;
}

// Highest floor under (x, z) that a body standing at y could drop onto,
// or −Infinity over the void.
function floorBelow(world, x, z, y) {
  let best = -Infinity;
  for (const c of world.query(x, z, 0.05)) {
    if (!world.overlaps(c, x, z, 0.05)) continue;
    const top = World.topAt(c, x, z);
    if (top <= y + 0.5 && top > best) best = top;
  }
  return best;
}

// Would walking this way take the body off a ledge? Walkers look a step
// ahead and stop at the brink instead of wandering off the island.
function brink(run, b, intent) {
  let f = intent.forward || 0, s = intent.strafe || 0;
  const len = Math.hypot(f, s);
  if (len < 0.05) return false;
  f /= len; s /= len;
  const sn = Math.sin(b.yaw), cs = Math.cos(b.yaw);
  const wx = -sn * f + cs * s, wz = -cs * f - sn * s;
  // In the air (a hop over a rope), measured from the floor below.
  const ref = b.grounded ? b.y : Math.min(b.y, floorBelow(run.world, b.x, b.z, b.y));
  if (ref === -Infinity) return false;
  for (const k of [b.r + 0.3]) {
    if (floorBelow(run.world, b.x + wx * k, b.z + wz * k, b.y) < ref - DROP) return true;
  }
  return false;
}

function fuzz(run, f, dt, px, pz) {
  const b = f.body, d = f.def, M = MELEE[f.kind];
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  const dy = run.body.y - b.y;
  f.cd -= dt;
  if (f.state !== "lunge") f.leap = false;
  let intent = { forward: 0, strafe: 0, jump: false, jumpPressed: false };
  let speedMul = 1;
  switch (f.state) {
    case "idle":
    case "chase": {
      if (!aware(run, f, dist)) {
        // Minding its own business: pottering about near where it started.
        f.home ??= [b.x, b.z];
        const hx = f.home[0] - b.x, hz = f.home[1] - b.z;
        f.yaw = Math.hypot(hx, hz) > 3 ? angTo(b.x, b.z, f.home[0], f.home[1]) : f.yaw + Math.sin(f.age * 0.7 + f.phase) * dt * 1.5;
        intent.forward = Math.sin(f.age * 0.9 + f.phase) > 0 ? 0.35 : 0;
        break;
      }
      // Head for you, weaving a little so a crowd does not form a line.
      const waiting = run.attackers[f.kind] >= M.attackers || f.cd > 0;
      const [wx, wz, wy] = wayTo(run, b, px, pz, dist);
      f.yaw = angTo(b.x, b.z, wx, wz) + Math.sin(f.age * 2.1 + f.phase) * (dist < 8 ? 0.35 : 0.15);
      // The way goes over a gap: crouch, then hop across.
      if (wy !== undefined && b.grounded) { f.yaw = angTo(b.x, b.z, wx, wz); f.hop = [wx, wy, wz]; setState(f, "hop"); break; }
      if (waiting && dist < 3.4) {
        // Not its turn: keep a little distance and sidle round you.
        intent.forward = dist < 2.6 ? -0.6 : 0;
        intent.strafe = Math.sin(f.phase) > 0 ? 0.7 : -0.7;
      } else intent.forward = dist > 1.2 ? 1 : 0;
      // Stuck against a ledge: hop.
      if (b.grounded && dist > 2 && b.speed2D < 0.8 && f.t > 0.3 && !waiting) { intent.jumpPressed = true; f.t = 0; }
      if (dist < M.reach && Math.abs(dy) < 1.2 && !waiting) { setState(f, "windup"); run.attackers[f.kind]++; run.events.push({ type: "windup", kind: f.kind, x: b.x, z: b.z }); break; }
      // A fuzz a little way off (or one that cannot reach you) may stop and
      // lob a nut instead (not the nightmare's own: the boss is busy enough).
      f.throwCd = (f.throwCd ?? 1 + run.rnd() * 2.5) - dt;
      if (f.kind === "fuzz" && f.group !== "boss" && f.throwCd <= 0 && b.grounded && dist > THROW.min && dist < THROW.max && run.throwers < THROW.throwers) {
        if (run.canSee(b.x, b.y + 0.7, b.z)) {
          setState(f, "throw"); run.throwers++;
          run.events.push({ type: "nutWindup", x: b.x, z: b.z });
        } else f.throwCd = 0.5;
      }
      // A bunny a few hops off may crouch and leap at you.
      f.leapCd = (f.leapCd ?? 1.5 + run.rnd() * 3) - dt;
      if (f.kind === "bunny" && f.leapCd <= 0 && b.grounded && dist > LEAP.min && dist < LEAP.max && Math.abs(dy) < 1.5 && run.leapers < 1) {
        if (run.canSee(b.x, b.y + 0.3, b.z) && groundAlong(run, b.x, b.z, px, pz, Math.min(b.y, run.body.y))) {
          setState(f, "crouch"); run.leapers++;
          run.events.push({ type: "windup", kind: "bunny", x: b.x, z: b.z });
        } else f.leapCd = 0.6;
      }
      break;
    }
    case "hop":
      speedMul = 0;
      if (f.t > 0.22) { hopTo(b, f.hop[0], f.hop[1], f.hop[2]); setState(f, "flying"); }
      break;
    case "flying":
      if (f.t > 0.15 && b.grounded) { b.vx *= 0.2; b.vz *= 0.2; setState(f, "chase"); }
      break;
    case "crouch":
      f.yaw = angTo(b.x, b.z, px, pz);
      speedMul = 0;
      if (f.t > LEAP.crouch) {
        // Up and over in an arc that comes down where you are headed (or
        // where you are, if that is not over ground). Out of reach by now,
        // or nothing but void between: it thinks better of it.
        const P = run.body, g = 27;
        const T0 = (LEAP.vy + Math.sqrt(Math.max(0, LEAP.vy ** 2 + 2 * g * (b.y - P.y)))) / g;
        let tx = P.x + P.vx * T0 * 0.5, tz = P.z + P.vz * T0 * 0.5;
        // Land on the ground there (you may be in the air), a little short.
        const reach = (x, z) => groundAlong(run, b.x, b.z, x + (x - b.x) * 0.15, z + (z - b.z) * 0.15, b.y);
        if (!reach(tx, tz)) { tx = P.x; tz = P.z; }
        const ty = floorBelow(run.world, tx, tz, P.y + 0.3);
        const ex = tx - b.x, ez = tz - b.z, l = Math.hypot(ex, ez) || 1;
        const T = Math.max(T0, l / LEAP.maxSpeed);
        f.leapCd = LEAP.cd + run.rnd() * LEAP.cdRand;
        if (T > 0.85 || Math.abs(ty - b.y) > 1.2 || !reach(tx, tz)) { setState(f, "chase"); break; }
        b.vx = ex / T; b.vz = ez / T; b.vy = (ty - b.y + 0.5 * g * T * T) / T; b.grounded = false;
        f.leap = true; f.hitDone = false;
        setState(f, "lunge");
        run.events.push({ type: "leap", x: b.x, z: b.z });
      }
      break;
    case "throw":
      f.yaw = angTo(b.x, b.z, px, pz);
      speedMul = 0;
      if (f.t > THROW.windup) {
        throwNut(run, f);
        f.throwCd = THROW.cd + run.rnd() * THROW.cdRand;
        setState(f, "chase");
      }
      break;
    case "windup":
      f.yaw = angTo(b.x, b.z, px, pz);
      speedMul = 0;
      if (f.t > M.windup) {
        setState(f, "lunge");
        // Over a drop, only as far as you (a full lunge would overshoot the edge).
        const ux = dx / Math.max(dist, 0.1), uz = dz / Math.max(dist, 0.1);
        const edge = floorBelow(run.world, b.x + ux * 2.2, b.z + uz * 2.2, b.y) < b.y - DROP;
        const k = (edge ? Math.min(M.lunge, dist / 0.3) : M.lunge) / Math.max(dist, 0.1);
        b.vx = dx * k; b.vz = dz * k; b.vy = f.kind === "bunny" ? 2.6 : 3.2; b.grounded = false;
        f.hitDone = false;
      }
      break;
    case "lunge":
      if (!f.hitDone && dist < d.r + run.body.r + 0.25 && Math.abs(dy) < 1.3) {
        f.hitDone = true;
        run.hurt(f.leap ? LEAP.dmg : d.dmg, b.x, b.z);
        run.events.push({ type: "bonk", x: b.x, z: b.z });
        b.vx *= -0.3; b.vz *= -0.3;
      }
      if (f.t > 0.35 && b.grounded) {
        // A leap lands with a skid, not a slide off the island.
        if (f.leap) { b.vx *= 0.15; b.vz *= 0.15; }
        setState(f, "recover"); f.cd = M.cd + run.rnd() * 0.9; f.leap = false;
      }
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
  const holdVel = f.state === "lunge" || f.state === "stun" || f.state === "sucked" || f.state === "flying";
  b.yaw = f.yaw;
  if (!holdVel && brink(run, b, intent)) {
    intent.forward = 0; intent.strafe = 0; intent.jumpPressed = false;
    // Held up at the brink on its way to you: hop over if there is a way.
    const j = f.state === "chase" && f.aware !== false && dist > 3 && run.nav?.jumpFrom(b.x, b.z, b.y);
    if (j) { f.hop = [j[0], j[2], j[1]]; f.yaw = angTo(b.x, b.z, j[0], j[1]); setState(f, "hop"); }
  }
  if (holdVel && (!b.grounded || f.state === "sucked")) {
    // Airborne lunge / knockback: keep the velocity, only gravity and walls.
    const vx = b.vx, vz = b.vz;
    b.step(run.world, intent, dt, 0);
    b.vx = vx; b.vz = vz;
  } else b.step(run.world, intent, dt, speedMul);
  if (b.fell) { f.alive = false; f.hp = 0; f.lost = true; }
}

// A nut lobbed in an arc at where you are headed: slow enough to dodge or
// shoot down, and it only stings.
function throwNut(run, f) {
  const b = f.body, P = run.body;
  const sx = b.x - Math.sin(f.yaw) * 0.25, sy = b.y + f.def.h + 0.15, sz = b.z - Math.cos(f.yaw) * 0.25;
  const d0 = Math.hypot(P.x - sx, P.z - sz);
  const T = Math.min(1.4, Math.max(0.45, d0 / THROW.speed)), g = 9;
  const lead = 0.55 + run.rnd() * 0.3;
  const tx = P.x + P.vx * T * lead, ty = P.y + 1.0, tz = P.z + P.vz * T * lead;
  run.spit({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy + 0.5 * g * T * T) / T, vz: (tz - sz) / T, g, dmg: THROW.dmg, kind: "nut", owner: f.id });
  run.events.push({ type: "nut", x: sx, z: sz });
}

// The bathtub: keeps its distance and lobs soap bubbles in an arc at where
// you are headed. Slow, heavy, and too big to vacuum.
function tub(run, f, dt, px, pz) {
  const b = f.body, P = run.body;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  const intent = { forward: 0, strafe: 0 };
  if (f.state === "sucked" || f.state === "stun") { if (f.t > 0.3) setState(f, "idle"); }
  else if (!aware(run, f, dist)) { f.yaw += Math.sin(f.age * 0.4 + f.phase) * dt * 0.6; }
  else {
    const [wx, wz] = dist > 13 ? wayTo(run, b, px, pz, dist) : [px, pz];
    const turn = angTo(b.x, b.z, wx, wz);
    let dd = Math.atan2(Math.sin(turn - f.yaw), Math.cos(turn - f.yaw));
    f.yaw += Math.max(-1.5 * dt, Math.min(1.5 * dt, dd));
    if (f.state === "idle") {
      intent.forward = dist > 13 ? 1 : dist < 8 ? -0.8 : 0;
      intent.strafe = Math.sin(f.age * 0.5 + f.phase) * 0.5;
      if (f.cd <= 0 && dist < 22 && run.canSee(b.x, b.y + 1.6, b.z)) { setState(f, "windup"); run.events.push({ type: "tubWindup", x: b.x, z: b.z }); }
    } else if (f.state === "windup" && f.t > 0.8) {
      f.volley = TUB.volley; f.volleyT = 0;
      setState(f, "volley");
    } else if (f.state === "volley") {
      // A shower of soap bubbles: the first where you will be when it
      // lands, the rest scattered round you (each ring shows where).
      f.volleyT -= dt;
      if (f.volleyT <= 0) {
        const T = 1.05 + run.rnd() * 0.35, g = 9, first = f.volley === TUB.volley;
        const a = run.rnd() * TAU, r = first ? 0 : 1.2 + run.rnd() * TUB.scatter;
        const tx = P.x + P.vx * T * 0.7 + Math.cos(a) * r, tz = P.z + P.vz * T * 0.7 + Math.sin(a) * r, ty = run.kit.floorAt(tx, tz, P.y + 1);
        const sx = b.x - Math.sin(f.yaw) * 0.2, sy = b.y + 2.1, sz = b.z - Math.cos(f.yaw) * 0.2;
        run.spit({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy + 0.5 * g * T * T) / T, vz: (tz - sz) / T, g, splash: 1.6, dmg: f.def.dmg, kind: "bubble", tx, ty, tz, owner: f.id });
        f.volleyT = TUB.gap;
        if (--f.volley <= 0) { f.cd = TUB.cd + run.rnd() * TUB.cdRand; setState(f, "idle"); }
      }
    }
  }
  b.yaw = f.yaw;
  if (brink(run, b, intent)) { intent.forward = 0; intent.strafe = 0; }
  b.step(run.world, intent, dt, f.state === "idle" || f.state === "volley" ? 1 : 0);
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
  // Orbit you at a distance, bobbing, a few metres up; a loose one that has
  // not noticed you circles lazily over where it started.
  f.home ??= [f.x, f.y, f.z];
  const on = aware(run, f, dist);
  const cx = on ? px : f.home[0], cz = on ? pz : f.home[2];
  const ox = f.x - cx, oz = f.z - cz;
  const a = Math.atan2(oz, ox) + f.dir * dt * (on ? 0.55 : 0.3);
  const want = on ? f.orbit + Math.sin(f.age * 0.6 + f.phase) * 1.5 : 2.5;
  const tx = cx + Math.cos(a) * want, tz = cz + Math.sin(a) * want;
  const floor = run.kit.floorAt(f.x, f.z, f.y + 1);
  const ty = (on ? Math.max(pcy + 2.2, floor + 1.6) : f.home[1]) + Math.sin(f.age * 1.7 + f.phase) * 0.5;
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

  if (on && f.state === "idle" && f.cd <= 0 && dist < 22 && run.canSee(f.x, f.y, f.z)) setState(f, "windup");
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
  // Hit from afar: it comes for you, and so do the ones round it. The calm
  // of the arrival spot is over once you start a fight.
  if (!f.group) { notice(run, f); f.provoked = ALERT.provoked; alert(run, f, ALERT.hit, ALERT.provoked); }
  run.calm = null;
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
