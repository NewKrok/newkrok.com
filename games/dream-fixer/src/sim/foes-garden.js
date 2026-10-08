import { AI } from "./foes.js";
import { WALKER } from "./foes-school.js";
import { FLYER } from "./foes-space.js";

// ── Grandpa Joe's garden: glitches of its own ───────────────────────────
// Like the school's and the kitchen's, each picks its move by how far you
// are and a roll of the dice.
//
//  gnome       (Kerti törpe) a garden gnome. Look at it and a moment later
//              it turns to stone: it cannot move, and hits barely scratch
//              it. Look away and it runs at you and bonks you with its
//              shovel. The trick: look away, let it come, turn and hit it
//              before it sets.
//  slinger     (Csúzlis törpe) a gnome with a slingshot, green hat. Sets to
//              stone just the same, but keeps its distance and shoots
//              pebbles, only while you are not looking: it gets you in the
//              back. Find it and stare it down, or catch it as it draws.
//  can         (Locsolókanna) a watering can flying about. Floats over you,
//              tips and pours a shower: stand under it and you get soaked
//              (it stings), unless an open umbrella is over your head.
//              From afar it squirts a few drops at you.
//  mower       (Fűnyíró) heavy, keeps its distance. Revs up and charges,
//              turning after you as it goes (step aside late; into a wall
//              it is dazed and soft). From afar it sprays a fan of grass
//              clippings.
//  sunflower   (Napraforgó) rooted, its face following you. Fires seeds in
//              a quick string, shakes a ring of petals off when you come
//              close (jump it), and the seeds it drops grow into gnomes.
//  ticket      (Menetjegy) a punched train ticket fluttering about the old
//              station (the Big Alarm Clock lets them out). It circles,
//              hangs shivering a moment, then swoops through where you
//              were with a paper cut; after a swoop it flutters, soft.

const TAU = Math.PI * 2;
const { move, touching, bonk, busy, potter, rr } = WALKER;

export const GNOME = {
  look: 0.32,                // you are looking at it within this (radians, plus its size)
  set: 0.5,                  // seconds you have to look at it before it is stone
  stone: 0.12,               // the share of a hit that a stone one feels
  rush: 1.7,                 // its speed when you are not
  cd: [1.6, 2.8], busy: 2,
  bonk: { near: 1.5, wind: 0.35, dmg: 6, cd: 1.3 },
};
export const SLINGER = {
  keep: [8, 14],             // the distance it keeps
  cd: [2, 3.2],
  pebble: { wind: 0.5, speed: 16, dmg: 4 },
};
export const TICKET = {
  orbit: [4, 7], speed: 4.2, cd: [1.6, 2.8], busy: 2,
  swoop: { near: 11, aim: 0.55, speed: 14, time: 0.8, dmg: 4, flutter: 1 },
};
export const CAN = {
  orbit: [5, 8], speed: 3.4, cd: [2.2, 3.6], busy: 2,
  pour: { near: 10, fly: 1.8, time: 2.4, r: 2.2, dmg: 2, every: 0.45 },
  squirt: { wind: 0.5, n: 3, gap: 0.12, speed: 15, dmg: 3 },
};
export const MOWER = {
  keep: [6, 11], cd: [2, 3.2],
  charge: { wind: 0.9, speed: 8.5, time: 2, turn: 1.1, dmg: 9, dizzy: 1.4 },
  clip: { min: 5, max: 15, wind: 0.6, n: 5, spread: 0.22, speed: 12, dmg: 3 },
};
export const SUNFLOWER = {
  kids: 2, every: [5, 7],
  volley: { max: 22, wind: 0.6, n: 6, gap: 0.13, speed: 14, dmg: 3, cd: 3.2 },
  petals: { near: 4.5, wind: 0.7, r: 6, dmg: 7, cd: 3.5 },
};

// Is your crosshair on it (within `cone` radians, plus its size), and can you see it?
function watched(run, f, cone) {
  const b = run.body, [dx, dy, dz] = run.aimDir();
  const ex = f.px - b.x, ey = f.cy - b.eyeY, ez = f.pz - b.z, l = Math.hypot(ex, ey, ez) || 1;
  if (l > 30 || (ex * dx + ey * dy + ez * dz) / l < Math.cos(cone + Math.atan(f.def.hitR / l))) return false;
  return run.canSee(f.px, f.cy, f.pz);
}

// ── The gnome ──
function gnome(run, f, dt, px, pcy, pz) {
  const b = f.body, P = run.body, G = GNOME;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  f.guard = 1;
  const intent = { forward: 0, strafe: 0 };
  let speedMul = 1;
  const on = AI.aware(run, f, dist);
  // Seen for a moment: stone, whatever it was doing.
  const seen = on && watched(run, f, G.look);
  f.seenT = seen ? (f.seenT || 0) + dt : 0;
  // (A hit does not stop it setting: being shot at is being looked at.)
  if (f.seenT > G.set && f.state !== "stone" && f.state !== "sucked") {
    AI.setState(f, "stone");
    run.events.push({ type: "gnomeStone", id: f.id, x: b.x, z: b.z });
  }
  switch (f.state) {
    case "idle":
    case "chase": {
      if (!on) { potter(f, b, dt, intent); break; }
      const [wx, wz] = AI.wayTo(run, b, px, pz, dist);
      f.yaw = AI.angTo(b.x, b.z, wx, wz);
      intent.forward = dist > 1.1 ? 1 : 0;
      speedMul = G.rush;
      if (f.cd > 0 || Math.abs(P.y - b.y) > 1.5) break;
      if (dist < G.bonk.near) { AI.setState(f, "wind"); run.events.push({ type: "gnomeWind", x: b.x, z: b.z }); }
      else f.cd = 0.4;
      break;
    }
    case "stone":
      // Frozen mid-step, hard as stone; the moment you look away it is off again.
      speedMul = 0; f.guard = G.stone;
      if (!seen && f.t > 0.12) { AI.setState(f, "chase"); run.events.push({ type: "gnomeGo", id: f.id, x: b.x, z: b.z }); }
      break;
    case "wind":
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t > G.bonk.wind) {
        if (dist < G.bonk.near + 0.4 && Math.abs(P.y - b.y) < 1.2) bonk(run, f, G.bonk.dmg, 3);
        AI.setState(f, "chase"); f.cd = G.bonk.cd;
      }
      break;
    case "stun":
      if (f.t > 0.35) AI.setState(f, "chase");
      break;
    case "sucked":
      b.vx *= 1 - 2 * dt; b.vz *= 1 - 2 * dt;
      if (f.t > 0.15) AI.setState(f, "chase");
      break;
  }
  move(run, f, intent, dt, speedMul, f.state === "sucked" || f.state === "stun");
}

// ── The slingshot gnome ──
function slinger(run, f, dt, px, pcy, pz) {
  const b = f.body, P = run.body, G = GNOME, S = SLINGER;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  f.guard = 1;
  const intent = { forward: 0, strafe: 0 };
  let speedMul = 1;
  const on = AI.aware(run, f, dist);
  const seen = on && watched(run, f, G.look);
  f.seenT = seen ? (f.seenT || 0) + dt : 0;
  if (f.seenT > G.set && f.state !== "stone" && f.state !== "sucked") {
    AI.setState(f, "stone");
    run.events.push({ type: "gnomeStone", id: f.id, x: b.x, z: b.z });
  }
  switch (f.state) {
    case "idle":
    case "chase": {
      if (!on) { potter(f, b, dt, intent); break; }
      // Keeps its distance: in when too far (or out of sight), back when too close.
      const sees = run.canSee(b.x, b.y + 0.6, b.z);
      const [wx, wz] = AI.wayTo(run, b, px, pz, dist);
      f.yaw = AI.angTo(b.x, b.z, wx, wz);
      intent.forward = dist > S.keep[1] || !sees ? 1 : dist < S.keep[0] ? -0.8 : 0;
      intent.strafe = intent.forward ? 0 : Math.sin(f.age * 0.8 + f.phase) * 0.6;
      if (intent.forward < 0) f.yaw = AI.angTo(b.x, b.z, px, pz);
      // Draws only while you are not looking.
      if (f.cd <= 0 && sees && !seen && dist < S.keep[1] + 4) { AI.setState(f, "draw"); run.events.push({ type: "gnomeWind", x: b.x, z: b.z }); }
      break;
    }
    case "stone":
      speedMul = 0; f.guard = G.stone;
      if (!seen && f.t > 0.12) { AI.setState(f, "chase"); run.events.push({ type: "gnomeGo", id: f.id, x: b.x, z: b.z }); }
      break;
    case "draw":
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t > S.pebble.wind) {
        const Q = S.pebble, sx = b.x, sy = b.y + 0.7, sz = b.z, T = dist / Q.speed;
        const tx = P.x + P.vx * T * 0.6, ty = P.y + 1, tz = P.z + P.vz * T * 0.6, l = Math.hypot(tx - sx, ty - sy, tz - sz) || 1;
        run.spit({ x: sx, y: sy, z: sz, vx: (tx - sx) / l * Q.speed, vy: (ty - sy) / l * Q.speed + 1, vz: (tz - sz) / l * Q.speed, g: 2.5, dmg: Q.dmg, kind: "pebble", owner: f.id, life: 2 });
        run.events.push({ type: "nut", x: sx, z: sz });
        AI.setState(f, "chase"); f.cd = rr(run, S.cd);
      }
      break;
    case "stun":
      if (f.t > 0.35) AI.setState(f, "chase");
      break;
    case "sucked":
      b.vx *= 1 - 2 * dt; b.vz *= 1 - 2 * dt;
      if (f.t > 0.15) AI.setState(f, "chase");
      break;
  }
  move(run, f, intent, dt, speedMul, f.state === "sucked" || f.state === "stun");
}

// ── The train ticket ──
function ticket(run, f, dt, px, pcy, pz) {
  const P = run.body, R = TICKET;
  f.cd -= dt;
  f.guard = 1;
  f.home ??= [f.x, f.y, f.z];
  const dist = Math.hypot(f.x - px, f.z - pz) || 0.01;
  const on = AI.aware(run, f, dist);
  const floor = run.kit.floorAt(f.x, f.z, f.y + 1);
  const cx = on ? px : f.home[0], cz = on ? pz : f.home[2];
  const want = on ? R.orbit[0] + (R.orbit[1] - R.orbit[0]) * (0.5 + 0.5 * Math.sin(f.age * 0.6 + f.phase)) : 2;
  const a = Math.atan2(f.z - cz, f.x - cx) + f.dir * dt * (on ? 0.9 : 0.3);
  let tx = cx + Math.cos(a) * want, tz = cz + Math.sin(a) * want, steer = 1.4, max = R.speed;
  let ty = (on ? Math.max(pcy + 1, floor + 1.4) : f.home[1]) + Math.sin(f.age * 3 + f.phase) * 0.35;
  switch (f.state) {
    case "idle":
      if (!on || f.cd > 0 || !run.canSee(f.x, f.y, f.z)) break;
      if (dist < R.swoop.near && busy(run, "ticket", ["aim", "swoop"]) < R.busy) { AI.setState(f, "aim"); run.events.push({ type: "rocketAim", x: f.x, z: f.z }); }
      else f.cd = 0.5;
      break;
    case "aim":
      // Hangs shivering, edge on to you; then it swoops.
      tx = f.x; ty = f.y; tz = f.z; steer = 0.3;
      if (f.t > R.swoop.aim) {
        const ex = P.x - f.x, ey = P.y + 1 - f.y, ez = P.z - f.z, l = Math.hypot(ex, ey, ez) || 1;
        f.dash = [ex / l * R.swoop.speed, ey / l * R.swoop.speed, ez / l * R.swoop.speed];
        f.hitDone = false;
        AI.setState(f, "swoop");
      }
      break;
    case "swoop": {
      const [vx, vy, vz] = f.dash;
      f.x += vx * dt; f.y += vy * dt; f.z += vz * dt;
      f.vx = vx; f.vy = vy; f.vz = vz;
      f.yaw = Math.atan2(-vx, -vz);
      const wall = FLYER.unstick(run, f);
      if (!f.hitDone && Math.hypot(P.x - f.x, P.y + 1 - f.y, P.z - f.z) < f.def.r + 0.6) { f.hitDone = true; bonk(run, f, R.swoop.dmg, 2); }
      if (wall || f.t > R.swoop.time) AI.setState(f, "flutter");
      return;
    }
    case "flutter":
      // Fluttering down after a swoop, soft.
      f.guard = 1.5; tx = f.x; tz = f.z; ty = f.y - 0.4; steer = 0.2;
      if (f.t > R.swoop.flutter) { AI.setState(f, "idle"); f.cd = rr(run, R.cd); }
      break;
    case "stun":
      if (f.t > 0.3) AI.setState(f, "idle");
      break;
    case "sucked":
      f.vx *= 1 - 2 * dt; f.vy *= 1 - 2 * dt; f.vz *= 1 - 2 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      if (f.t > 0.15) AI.setState(f, "idle");
      return;
  }
  FLYER.fly(run, f, dt, tx, ty, tz, steer, max, px, pz);
}

// ── The watering can ──
function can(run, f, dt, px, pcy, pz) {
  const P = run.body, d = f.def, S = CAN;
  f.cd -= dt;
  f.home ??= [f.x, f.y, f.z];
  const dist = Math.hypot(f.x - px, f.z - pz) || 0.01;
  const on = AI.aware(run, f, dist);
  const floor = run.kit.floorAt(f.x, f.z, f.y + 1);
  let tx, ty, tz, steer = 1.3, max = S.speed;
  const cx = on ? px : f.home[0], cz = on ? pz : f.home[2];
  const want = on ? S.orbit[0] + (S.orbit[1] - S.orbit[0]) * (0.5 + 0.5 * Math.sin(f.age * 0.5 + f.phase)) : 2;
  const a = Math.atan2(f.z - cz, f.x - cx) + f.dir * dt * (on ? 0.6 : 0.25);
  tx = cx + Math.cos(a) * want; tz = cz + Math.sin(a) * want;
  ty = (on ? Math.max(pcy + 1.8, floor + 1.8) : f.home[1]) + Math.sin(f.age * 1.6 + f.phase) * 0.3;
  f.tilt = 0;
  switch (f.state) {
    case "idle":
      if (!on || f.cd > 0) break;
      if (!run.canSee(f.x, f.y, f.z) || dist > 20 || busy(run, "can", ["fly", "pour", "squirt"]) >= S.busy) break;
      if (dist < S.pour.near && run.rnd() < 0.6) AI.setState(f, "fly");
      else { AI.setState(f, "squirt"); f.volley = S.squirt.n; f.volleyT = S.squirt.wind; run.events.push({ type: "canWind", x: f.x, z: f.z }); }
      break;
    case "fly":
      // Over you, then it tips and pours.
      tx = P.x; tz = P.z; ty = P.y + 3.4; steer = 2.2; max = S.speed * 1.6;
      if (Math.hypot(f.x - P.x, f.z - P.z) < 1.2 || f.t > S.pour.fly) {
        AI.setState(f, "pour");
        const fy = AI.floorBelow(run.world, f.x, f.z, f.y);
        f.rain = { id: ++run.foeSeq, x: f.x, y: fy > -Infinity ? fy : P.y, z: f.z, top: f.y, r: S.pour.r, t: 0, life: S.pour.time, owner: f.id };
        run.rains.push(f.rain);
        run.events.push({ type: "canPour", x: f.x, z: f.z });
      }
      break;
    case "pour":
      // Holds still over its shower, tipped right over.
      tx = f.x; tz = f.z; ty = f.y; steer = 0.2; f.tilt = 1;
      if (f.rain) { f.rain.x = f.x; f.rain.z = f.z; f.rain.top = f.y; }
      if (f.t > S.pour.time) { f.rain = null; AI.setState(f, "idle"); f.cd = rr(run, S.cd) + 0.6; }
      break;
    case "squirt": {
      // Spout up at you; a few quick drops.
      steer = 0.4; f.tilt = 0.5;
      f.volleyT -= dt;
      if (f.volleyT <= 0) {
        const Q = S.squirt, l = Math.hypot(P.x - f.x, P.y + 1.1 - f.y, P.z - f.z) || 1;
        run.spit({ x: f.x, y: f.y + 0.1, z: f.z, vx: (P.x - f.x) / l * Q.speed, vy: (P.y + 1.1 - f.y) / l * Q.speed, vz: (P.z - f.z) / l * Q.speed, dmg: Q.dmg, kind: "drop", owner: f.id, life: 2 });
        run.events.push({ type: "canSquirt", x: f.x, z: f.z });
        f.volleyT = Q.gap;
        if (--f.volley <= 0) { AI.setState(f, "idle"); f.cd = rr(run, S.cd); }
      }
      break;
    }
    case "stun":
      if (f.t > 0.3) AI.setState(f, "idle");
      break;
    case "sucked":
      f.vx *= 1 - 2 * dt; f.vy *= 1 - 2 * dt; f.vz *= 1 - 2 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      if (f.t > 0.15) AI.setState(f, "idle");
      return;
  }
  if (f.state !== "pour" && f.rain) f.rain = null;
  const ax = (tx - f.x) * steer, ay = (ty - f.y) * 2, az = (tz - f.z) * steer;
  f.vx += (ax - f.vx) * Math.min(1, dt * 2.5); f.vy += (ay - f.vy) * Math.min(1, dt * 2.5); f.vz += (az - f.vz) * Math.min(1, dt * 2.5);
  const sp = Math.hypot(f.vx, f.vz);
  if (sp > max) { f.vx *= max / sp; f.vz *= max / sp; }
  f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
  for (const c of run.world.query(f.x, f.z, d.r)) {
    if (c.y0 > f.y + 0.4 || run.topAt(c, f.x, f.z) < f.y - 0.4) continue;
    const pen = run.world.push2D(c, f.x, f.z, d.r);
    if (pen > 0) { f.x += run.world.nx * pen; f.z += run.world.nz * pen; }
  }
  const fl = run.kit.floorAt(f.x, f.z, f.y + 0.5);
  if (f.y < fl + 0.7) { f.y = fl + 0.7; f.vy = Math.max(0, f.vy); }
  f.yaw = AI.angTo(f.x, f.z, px, pz);
}

// ── The lawnmower ──
function mower(run, f, dt, px, pcy, pz) {
  const b = f.body, P = run.body, C = MOWER.charge, K = MOWER.clip;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  f.guard = 1;
  const intent = { forward: 0, strafe: 0 };
  let speedMul = 1;
  const turnTo = (a, rate) => { const d = Math.atan2(Math.sin(a - f.yaw), Math.cos(a - f.yaw)); f.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); };
  switch (f.state) {
    case "idle": {
      if (!AI.aware(run, f, dist)) { potter(f, b, dt, intent); intent.forward *= 0.6; break; }
      const [wx, wz] = dist > MOWER.keep[1] ? AI.wayTo(run, b, px, pz, dist) : [px, pz];
      turnTo(AI.angTo(b.x, b.z, wx, wz), 2);
      intent.forward = dist > MOWER.keep[1] ? 1 : dist < MOWER.keep[0] ? -0.7 : 0;
      intent.strafe = Math.sin(f.age * 0.5 + f.phase) * 0.5;
      if (f.cd > 0 || Math.abs(P.y - b.y) > 2) break;
      const sees = run.canSee(b.x, b.y + 0.7, b.z);
      if (run.rnd() < 0.55 && dist < 18 && sees && AI.groundAlong(run, b.x, b.z, px, pz, b.y)) { AI.setState(f, "rev"); run.events.push({ type: "mowerRev", x: b.x, z: b.z }); }
      else if (dist > K.min && dist < K.max && sees) { AI.setState(f, "clip"); run.events.push({ type: "mowerRev", x: b.x, z: b.z, small: true }); }
      else f.cd = 0.6;
      break;
    }
    case "rev":
      speedMul = 0; turnTo(AI.angTo(b.x, b.z, px, pz), 3);
      if (f.t > C.wind) { f.hitDone = false; AI.setState(f, "charge"); run.events.push({ type: "mowerCharge", x: b.x, z: b.z }); }
      break;
    case "charge":
      // Turns after you as it goes, but not fast: a late step aside beats it.
      turnTo(AI.angTo(b.x, b.z, px, pz), C.turn);
      intent.forward = 1; speedMul = C.speed / f.def.speed;
      if (!f.hitDone && touching(run, f, 0.25)) { f.hitDone = true; bonk(run, f, C.dmg, 7); }
      if (f.t > 0.35 && b.speed2D < 2) { AI.setState(f, "dazed"); run.events.push({ type: "dizzy", id: f.id, x: b.x, z: b.z, big: true }); break; }
      if (f.t > C.time) { AI.setState(f, "idle"); f.cd = rr(run, MOWER.cd); }
      break;
    case "dazed":
      f.guard = 1.6; speedMul = 0;
      if (f.t > C.dizzy) { AI.setState(f, "idle"); f.cd = rr(run, MOWER.cd); }
      break;
    case "clip":
      speedMul = 0; turnTo(AI.angTo(b.x, b.z, px, pz), 3);
      if (f.t > K.wind) {
        const base = Math.atan2(P.z - b.z, P.x - b.x), ey = (P.y + 1 - b.y - 0.5) / Math.max(dist, 1);
        for (let i = 0; i < K.n; i++) {
          const an = base + (i - (K.n - 1) / 2) * K.spread;
          run.spit({ x: b.x, y: b.y + 0.5, z: b.z, vx: Math.cos(an) * K.speed, vy: ey * K.speed + 1, vz: Math.sin(an) * K.speed, g: 3, dmg: K.dmg, kind: "clipping", owner: f.id, life: 1.6 });
        }
        run.events.push({ type: "mowerClip", x: b.x, z: b.z });
        AI.setState(f, "idle"); f.cd = rr(run, MOWER.cd);
      }
      break;
    case "stun":
    case "sucked":
      if (f.t > 0.3) AI.setState(f, "idle");
      break;
  }
  move(run, f, intent, dt, speedMul);
}

// ── The sunflower ──
function sunflower(run, f, dt, px, pcy, pz) {
  const P = run.body, dist = Math.hypot(px - f.x, pz - f.z), S = SUNFLOWER;
  f.cd -= dt;
  f.volleyCd = (f.volleyCd ?? 1.5) - dt;
  f.petalCd = (f.petalCd ?? 1) - dt;
  f.pulse = Math.max(0, (f.pulse || 0) - dt * 2);
  if (dist > 28) return;
  // Its face follows you round, like the sun.
  const want = AI.angTo(f.x, f.z, px, pz), dd = Math.atan2(Math.sin(want - f.yaw), Math.cos(want - f.yaw));
  f.yaw += Math.max(-1.8 * dt, Math.min(1.8 * dt, dd));
  const hx = f.x - Math.sin(f.yaw) * 0.35, hy = f.y + f.def.hitY, hz = f.z - Math.cos(f.yaw) * 0.35;
  if (f.state === "volley") {
    f.pulse = 0.7;
    f.volleyT -= dt;
    if (f.volleyT <= 0) {
      const V = S.volley, tx = P.x + P.vx * 0.15, ty = P.y + 1.1, tz = P.z + P.vz * 0.15, l = Math.hypot(tx - hx, ty - hy, tz - hz) || 1;
      run.spit({ x: hx, y: hy, z: hz, vx: (tx - hx) / l * V.speed, vy: (ty - hy) / l * V.speed, vz: (tz - hz) / l * V.speed, dmg: V.dmg, kind: "seed", owner: f.id, life: 2.2 });
      run.events.push({ type: "sunSeed", x: f.x, z: f.z });
      f.volleyT = V.gap;
      if (--f.volley <= 0) { f.volleyCd = V.cd + run.rnd(); AI.setState(f, "idle"); }
    }
    return;
  }
  if (f.state === "shake") {
    f.pulse = Math.min(1, f.t / S.petals.wind);
    if (f.t > S.petals.wind) {
      run.shock(f.x, f.y, f.z, { max: S.petals.r, dmg: S.petals.dmg, speed: 8, color: 0xffd040 });
      run.events.push({ type: "slam", x: f.x, z: f.z, small: true });
      run.events.push({ type: "sunPetals", x: f.x, y: hy, z: f.z });
      f.petalCd = S.petals.cd; AI.setState(f, "idle");
    }
    return;
  }
  const sees = run.canSee(hx, hy, hz);
  if (dist < S.petals.near && f.petalCd <= 0 && Math.abs(P.y - f.y) < 1.5) { AI.setState(f, "shake"); run.events.push({ type: "sunShake", x: f.x, z: f.z }); return; }
  if (dist < S.volley.max && f.volleyCd <= 0 && sees && Math.abs(dd) < 0.4) {
    AI.setState(f, "volley"); f.volley = S.volley.n; f.volleyT = S.volley.wind;
    run.events.push({ type: "sunWind", x: f.x, z: f.z });
    return;
  }
  if (f.cd > 0) return;
  const kids = run.foes.filter((o) => o.alive && o.parent === f.id).length;
  if (kids >= S.kids) { f.cd = 1; return; }
  f.cd = rr(run, S.every);
  f.pulse = 1;
  // A seed drops and a gnome grows out of it.
  const a = run.rnd() * TAU;
  run.spawn("gnome", f.x + Math.cos(a) * 1.6, f.z + Math.sin(a) * 1.6, { parent: f.id, group: f.group });
  run.events.push({ type: "sunSprout", x: f.x, z: f.z });
}

export const GARDEN = { gnome, slinger, can, mower, sunflower, ticket };
