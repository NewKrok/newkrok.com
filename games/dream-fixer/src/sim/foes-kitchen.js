import { AI } from "./foes.js";
import { WALKER } from "./foes-school.js";

// ── Rosie's kitchen: glitches of its own ────────────────────────────────
// Food with opinions. Like the school's, each picks its move by how far
// you are and a roll of the dice.
//
//  meatball    (Húsgombóc) bounces along after you in little hops. It
//              squashes down and rolls at you in a straight line (into a
//              wall: splat, dazed and soft), or crouches and bounces high
//              to come down where you stand (a ring shows where; its
//              landing sends out a ring to jump). Smoothed out, a big one
//              splits into two little ones (the Fuzz Vacuum swallows it
//              whole).
//  pepper      (Borsszóró) a pepper shaker flying about. Floats over you
//              and shakes out a cloud of pepper that hangs over the floor:
//              stand in it and you sneeze (your aim jerks, and it stings).
//              From afar it fires a fan of peppercorns. Aim at it from
//              close by and it darts aside. The bell's ring blows a cloud
//              away, the Fuzz Vacuum sucks it up.
//  rollingpin  (Sodrófa) heavy, keeps its distance. Rocks back and rolls
//              at you across the floor, wide as a door: jump it (into a
//              wall: dazed, soft). Up close it stands on end and comes
//              down on you lengthwise (a ring shows where).
//  grinder     (Húsdaráló) sits still and cranks out new meatballs;
//              sprays mince at you up close, lobs blobs of sauce from
//              afar (rings show where they land).

const TAU = Math.PI * 2;
const { move, touching, bonk, lob, busy, potter, rr } = WALKER;

export const MEATBALL = {
  hop: 0.36, cd: [1.2, 2.4], busy: 2, bump: { dmg: 4, cd: 1.5 },
  roll: { min: 3, max: 11, wind: 0.45, speed: 10, time: 1.1, dmg: 7, dizzy: 1.2 },
  bounce: { min: 4, max: 9, crouch: 0.45, T: 0.8, r: 2.4, dmg: 6 },
  // A big one comes apart in two little ones this much of its hp each.
  split: { n: 2, hp: 0.34 },
};
export const PEPPER = {
  orbit: [4.5, 7.5], speed: 3.6, cd: [2, 3.4], busy: 2,
  shake: { near: 9, fly: 1.4, time: 1.4, r: 2.4, life: 5.5 },
  burst: { wind: 0.5, n: 5, spread: 0.2, speed: 12, dmg: 3 },
  dodge: { near: 14, aim: 0.07, cd: 2.6, speed: 10, time: 0.3 },
};
// You in a pepper cloud: a sneeze every `every` seconds, what it costs, how
// hard the view jerks.
export const SNEEZE = { every: 0.85, dmg: 2, yaw: 0.35, pitch: 0.2 };
export const PIN = {
  keep: [5, 10], cd: [1.8, 3],
  roll: { wind: 0.8, speed: 8, time: 1.8, dmg: 9, half: 1.25, dizzy: 1.5 },
  slam: { near: 3.6, wind: 0.65, len: 2.8, w: 0.9, dmg: 10 },
};
export const GRINDER = {
  kids: 3, every: [3.8, 5.4],
  spray: { near: 7.5, wind: 0.6, n: 7, spread: 0.45, speed: 13, dmg: 3, cd: 2.8 },
  lob: { min: 8, max: 22, wind: 0.6, n: 2, dmg: 7, splash: 1.5, cd: 3.8 },
};

// ── The meatball ──
function meatball(run, f, dt, px, pcy, pz) {
  const b = f.body, P = run.body, M = MEATBALL;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  f.hopT = (f.hopT ?? 0) - dt;
  f.bumpCd = (f.bumpCd ?? 0) - dt;
  f.guard = 1;
  const intent = { forward: 0, strafe: 0, jump: false, jumpPressed: false };
  let speedMul = f.mini ? 1.25 : 1, hold = false;
  switch (f.state) {
    case "idle":
    case "chase": {
      if (!AI.aware(run, f, dist)) { potter(f, b, dt, intent); break; }
      const [wx, wz] = AI.wayTo(run, b, px, pz, dist);
      f.yaw = AI.angTo(b.x, b.z, wx, wz) + Math.sin(f.age * 2 + f.phase) * 0.3;
      intent.forward = dist > 0.9 ? 1 : 0;
      // Bouncing along.
      if (b.grounded && f.hopT <= 0) { intent.jumpPressed = true; f.hopT = M.hop * (f.mini ? 0.7 : 1); }
      // Bumps into you.
      if (f.bumpCd <= 0 && touching(run, f, 0.15)) { bonk(run, f, M.bump.dmg * (f.mini ? 0.6 : 1), 3); f.bumpCd = M.bump.cd; b.vx *= -0.5; b.vz *= -0.5; }
      if (f.mini || f.cd > 0 || busy(run, "meatball", ["wind", "roll", "crouch", "bounce"]) >= M.busy || Math.abs(P.y - b.y) > 1.5) break;
      if (!run.canSee(b.x, b.y + 0.5, b.z)) { f.cd = 0.4; break; }
      const r = run.rnd(), R = M.roll, B = M.bounce;
      if (dist > R.min && dist < R.max && r < 0.5 && AI.groundAlong(run, b.x, b.z, px, pz, b.y)) { AI.setState(f, "wind"); run.events.push({ type: "meatWind", x: b.x, z: b.z }); }
      else if (dist > B.min && dist < B.max && AI.groundAlong(run, b.x, b.z, px, pz, Math.min(b.y, P.y))) { AI.setState(f, "crouch"); run.events.push({ type: "pencilCrouch", x: b.x, z: b.z }); }
      else f.cd = 0.5;
      break;
    }
    case "wind":
      // Squashed down, lined up on you.
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t > M.roll.wind) { f.dir = f.yaw; f.hitDone = false; AI.setState(f, "roll"); run.events.push({ type: "meatRoll", x: b.x, z: b.z }); }
      break;
    case "roll":
      f.yaw = f.dir; intent.forward = 1; speedMul = M.roll.speed / f.def.speed;
      if (!f.hitDone && touching(run, f, 0.2)) { f.hitDone = true; bonk(run, f, M.roll.dmg, 6); }
      if (f.t > 0.3 && b.speed2D < 2) { AI.setState(f, "dazed"); run.events.push({ type: "dizzy", id: f.id, x: b.x, z: b.z }); break; }
      if (f.t > M.roll.time) { AI.setState(f, "recover"); f.cd = rr(run, M.cd); }
      break;
    case "dazed":
      f.guard = 1.6; speedMul = 0;
      if (f.t > M.roll.dizzy) { AI.setState(f, "chase"); f.cd = rr(run, M.cd); }
      break;
    case "crouch":
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t < 0.1) f.mark = [P.x + P.vx * 0.3, P.y, P.z + P.vz * 0.3, M.bounce.r * 0.6];
      else { f.mark[0] += (P.x + P.vx * 0.3 - f.mark[0]) * Math.min(1, dt * 4); f.mark[2] += (P.z + P.vz * 0.3 - f.mark[2]) * Math.min(1, dt * 4); }
      if (f.t > M.bounce.crouch) {
        const [tx, , tz] = f.mark, ty = AI.floorBelow(run.world, tx, tz, P.y + 0.3);
        if (ty === -Infinity || Math.abs(ty - b.y) > 1.6) { f.mark = null; AI.setState(f, "chase"); f.cd = 0.8; break; }
        const T = M.bounce.T, g = 27 * run.world.gravity;
        b.vx = (tx - b.x) / T; b.vz = (tz - b.z) / T; b.vy = (ty - b.y + 0.5 * g * T * T) / T; b.grounded = false;
        f.mark[1] = ty;
        AI.setState(f, "bounce");
        run.events.push({ type: "leap", x: b.x, z: b.z });
      }
      break;
    case "bounce":
      hold = true;
      if (f.t > 0.15 && b.grounded) {
        run.shock(b.x, b.y, b.z, { max: M.bounce.r, dmg: M.bounce.dmg, speed: 8, color: 0xc86a3a });
        run.events.push({ type: "slam", x: b.x, z: b.z, small: true });
        if (touching(run, f, 0.1)) bonk(run, f, f.def.dmg);
        b.vx *= 0.1; b.vz *= 0.1; f.mark = null;
        AI.setState(f, "recover"); f.cd = rr(run, M.cd);
      }
      break;
    case "recover":
      speedMul = 0;
      if (f.t > 0.4) AI.setState(f, "chase");
      break;
    case "stun":
      hold = true;
      if (f.t > 0.35) AI.setState(f, "chase");
      break;
    case "sucked":
      b.vx *= 1 - 2 * dt; b.vz *= 1 - 2 * dt;
      if (f.t > 0.15) AI.setState(f, "chase");
      break;
  }
  if (f.state !== "crouch" && f.state !== "bounce") f.mark = null;
  move(run, f, intent, dt, speedMul, hold || f.state === "sucked");
}

// ── The pepper shaker ──
function pepper(run, f, dt, px, pcy, pz) {
  const P = run.body, d = f.def, S = PEPPER;
  f.cd -= dt;
  f.dodgeCd = (f.dodgeCd ?? 1) - dt;
  f.home ??= [f.x, f.y, f.z];
  const dist = Math.hypot(f.x - px, f.z - pz) || 0.01;
  const on = AI.aware(run, f, dist);
  const floor = run.kit.floorAt(f.x, f.z, f.y + 1);
  let tx, ty, tz, steer = 1.3, max = S.speed;
  // Orbiting you at a distance (lazily over home if it has not noticed you).
  const cx = on ? px : f.home[0], cz = on ? pz : f.home[2];
  const want = on ? S.orbit[0] + (S.orbit[1] - S.orbit[0]) * (0.5 + 0.5 * Math.sin(f.age * 0.5 + f.phase)) : 2;
  const a = Math.atan2(f.z - cz, f.x - cx) + f.dir * dt * (on ? 0.6 : 0.25);
  tx = cx + Math.cos(a) * want; tz = cz + Math.sin(a) * want;
  ty = (on ? Math.max(pcy + 1.6, floor + 1.6) : f.home[1]) + Math.sin(f.age * 1.8 + f.phase) * 0.3;
  f.tilt = 0;
  switch (f.state) {
    case "idle": {
      // Aimed at from close by: it darts aside.
      if (on && f.dodgeCd <= 0 && dist < S.dodge.near && aimedAt(run, f, S.dodge.aim)) {
        const ax = f.x - P.x, az = f.z - P.z, l = Math.hypot(ax, az) || 1, side = run.rnd() < 0.5 ? 1 : -1;
        f.vx = -az / l * side * S.dodge.speed; f.vz = ax / l * side * S.dodge.speed;
        AI.setState(f, "dodge"); f.dodgeCd = S.dodge.cd;
        run.events.push({ type: "pepperDodge", x: f.x, z: f.z });
        break;
      }
      if (!on || f.cd > 0) break;
      if (!run.canSee(f.x, f.y, f.z) || dist > 20 || busy(run, "pepper", ["fly", "shake", "burst"]) >= S.busy) break;
      if (dist < S.shake.near && run.rnd() < 0.6 && run.clouds.length < 4) AI.setState(f, "fly");
      else { AI.setState(f, "burst"); run.events.push({ type: "pepperWind", x: f.x, z: f.z }); }
      break;
    }
    case "dodge":
      f.x += f.vx * dt; f.z += f.vz * dt;
      f.vx *= 1 - 4 * dt; f.vz *= 1 - 4 * dt;
      if (f.t > S.dodge.time) AI.setState(f, "idle");
      tx = f.x; tz = f.z; steer = 0;
      break;
    case "fly":
      // Over you, then it tips and shakes.
      tx = P.x; tz = P.z; ty = P.y + 3.2; steer = 2.2; max = S.speed * 1.6;
      if (Math.hypot(f.x - P.x, f.z - P.z) < 1.2 || f.t > 2.2) {
        AI.setState(f, "shake");
        run.events.push({ type: "pepperShake", x: f.x, z: f.z });
      }
      break;
    case "shake": {
      // A cloud of pepper settling on the floor under it.
      tx = f.x; tz = f.z; ty = f.y; steer = 0.3; f.tilt = Math.PI * 0.8;
      if (!f.shook && f.t > 0.35) {
        f.shook = true;
        const fy = AI.floorBelow(run.world, f.x, f.z, f.y);
        if (fy > -Infinity) run.clouds.push({ id: ++run.foeSeq, x: f.x, y: fy, z: f.z, r: S.shake.r, t: 0, life: S.shake.life });
      }
      if (f.t > S.shake.time) { f.shook = false; AI.setState(f, "idle"); f.cd = rr(run, S.cd) + 1; }
      break;
    }
    case "burst":
      // Tips its head at you, then a fan of peppercorns.
      steer = 0.4; f.tilt = Math.min(1, f.t / S.burst.wind) * 0.9;
      if (f.t > S.burst.wind) {
        const B = S.burst, base = Math.atan2(P.z - f.z, P.x - f.x), ey = (P.y + 1.1 - f.y) / Math.max(dist, 1);
        for (let i = 0; i < B.n; i++) {
          const an = base + (i - (B.n - 1) / 2) * B.spread;
          run.spit({ x: f.x, y: f.y + 0.2, z: f.z, vx: Math.cos(an) * B.speed, vy: ey * B.speed, vz: Math.sin(an) * B.speed, dmg: B.dmg, kind: "peppercorn", owner: f.id, life: 2 });
        }
        run.events.push({ type: "pepperBurst", x: f.x, z: f.z });
        AI.setState(f, "idle"); f.cd = rr(run, S.cd);
      }
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
  if (f.state !== "dodge") {
    const ax = (tx - f.x) * steer, ay = (ty - f.y) * 2, az = (tz - f.z) * steer;
    f.vx += (ax - f.vx) * Math.min(1, dt * 2.5); f.vy += (ay - f.vy) * Math.min(1, dt * 2.5); f.vz += (az - f.vz) * Math.min(1, dt * 2.5);
    const sp = Math.hypot(f.vx, f.vz);
    if (sp > max) { f.vx *= max / sp; f.vz *= max / sp; }
    f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
  } else f.y += (ty - f.y) * Math.min(1, dt * 2);
  for (const c of run.world.query(f.x, f.z, d.r)) {
    if (c.y0 > f.y + 0.4 || run.topAt(c, f.x, f.z) < f.y - 0.4) continue;
    const pen = run.world.push2D(c, f.x, f.z, d.r);
    if (pen > 0) { f.x += run.world.nx * pen; f.z += run.world.nz * pen; }
  }
  const fl = run.kit.floorAt(f.x, f.z, f.y + 0.5);
  if (f.y < fl + 0.7) { f.y = fl + 0.7; f.vy = Math.max(0, f.vy); }
  f.yaw = AI.angTo(f.x, f.z, px, pz);
}

// Is your crosshair on it (within `cone` radians)?
function aimedAt(run, f, cone) {
  const b = run.body, [dx, dy, dz] = run.aimDir();
  const ex = f.x - b.x, ey = f.y - b.eyeY, ez = f.z - b.z, l = Math.hypot(ex, ey, ez) || 1;
  return (ex * dx + ey * dy + ez * dz) / l > Math.cos(cone + Math.atan(f.def.hitR / l));
}

// ── The rolling pin ──
function rollingpin(run, f, dt, px, pcy, pz) {
  const b = f.body, P = run.body, R = PIN.roll, S = PIN.slam;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  f.guard = 1;
  // (For the look: up = stood on end, fall = come down forward.)
  f.up = Math.max(0, (f.up || 0) - dt * 3); f.fall = Math.max(0, (f.fall || 0) - dt * 3);
  const intent = { forward: 0, strafe: 0 };
  let speedMul = 1;
  const turnTo = (a, rate) => { const d = Math.atan2(Math.sin(a - f.yaw), Math.cos(a - f.yaw)); f.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); };
  switch (f.state) {
    case "idle": {
      if (!AI.aware(run, f, dist)) { potter(f, b, dt, intent); intent.forward *= 0.6; break; }
      const [wx, wz] = dist > PIN.keep[1] ? AI.wayTo(run, b, px, pz, dist) : [px, pz];
      turnTo(AI.angTo(b.x, b.z, wx, wz), 2);
      intent.forward = dist > PIN.keep[1] ? 1 : dist < PIN.keep[0] && dist > S.near ? -0.6 : 0;
      intent.strafe = Math.sin(f.age * 0.5 + f.phase) * 0.4;
      if (f.cd > 0 || Math.abs(P.y - b.y) > 1.5) break;
      const sees = run.canSee(b.x, b.y + 0.4, b.z);
      if (dist < S.near && sees) { AI.setState(f, "rise"); run.events.push({ type: "pinRise", x: b.x, z: b.z }); }
      else if (dist < 18 && sees && AI.groundAlong(run, b.x, b.z, px, pz, b.y)) { AI.setState(f, "rock"); run.events.push({ type: "pinRock", x: b.x, z: b.z }); }
      else f.cd = 0.6;
      break;
    }
    case "rock":
      // Rocks back and forth, lined up on you: then it rolls.
      speedMul = 0; turnTo(AI.angTo(b.x, b.z, px, pz), 3);
      if (f.t > R.wind) { f.dir = f.yaw; f.hitDone = false; AI.setState(f, "roll"); run.events.push({ type: "pinRoll", x: b.x, z: b.z }); }
      break;
    case "roll": {
      f.yaw = f.dir; intent.forward = 1; speedMul = R.speed / f.def.speed;
      // Wide as a door and low: jump it.
      if (!f.hitDone && P.y < b.y + 0.55 && across(b, f.yaw, P) < R.half + P.r && along(b, f.yaw, P) < 0.8) { f.hitDone = true; bonk(run, f, R.dmg, 7); }
      if (f.t > 0.35 && b.speed2D < 2) { AI.setState(f, "dazed"); run.events.push({ type: "dizzy", id: f.id, x: b.x, z: b.z, big: true }); break; }
      if (f.t > R.time) { AI.setState(f, "idle"); f.cd = rr(run, PIN.cd); }
      break;
    }
    case "dazed":
      f.guard = 1.6; speedMul = 0;
      if (f.t > R.dizzy) { AI.setState(f, "idle"); f.cd = rr(run, PIN.cd); }
      break;
    case "rise": {
      // Stands on end, leaning at you; the ring shows where it comes down.
      speedMul = 0; turnTo(AI.angTo(b.x, b.z, px, pz), 4);
      f.up = Math.min(1, f.t / 0.3);
      const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw);
      f.mark = [b.x + fx * S.len * 0.55, b.y, b.z + fz * S.len * 0.55, S.len * 0.5];
      if (f.t > S.wind) { AI.setState(f, "slam"); f.hitDone = false; }
      break;
    }
    case "slam":
      speedMul = 0; f.up = 1; f.fall = Math.min(1, f.t / 0.15);
      if (!f.hitDone && f.t > 0.15) {
        f.hitDone = true;
        const a = along(b, f.yaw, P, true);
        if (a > -0.4 && a < S.len + 0.3 && across(b, f.yaw, P) < S.w + P.r && P.y < b.y + 1) bonk(run, f, S.dmg, 6);
        const m = f.mark;
        run.shock(m[0], m[1], m[2], { max: 2.6, dmg: 5, speed: 7, color: 0xc89a5a });
        run.events.push({ type: "slam", x: m[0], z: m[2] });
      }
      if (f.t > 0.7) { f.mark = null; AI.setState(f, "idle"); f.cd = rr(run, PIN.cd); }
      break;
    case "stun":
    case "sucked":
      if (f.t > 0.3) AI.setState(f, "idle");
      break;
  }
  if (f.state !== "rise" && f.state !== "slam") f.mark = null;
  move(run, f, intent, dt, speedMul);
}
// How far you are across / along a rolling pin facing yaw (along: signed if asked).
function across(b, yaw, P) { return Math.abs((P.x - b.x) * Math.cos(yaw) - (P.z - b.z) * Math.sin(yaw)); }
function along(b, yaw, P, signed = false) { const a = -(P.x - b.x) * Math.sin(yaw) - (P.z - b.z) * Math.cos(yaw); return signed ? a : Math.abs(a); }

// ── The meat grinder ──
function grinder(run, f, dt, px, pcy, pz) {
  const P = run.body, dist = Math.hypot(px - f.x, pz - f.z), G = GRINDER;
  f.cd -= dt;
  f.sprayCd = (f.sprayCd ?? 1.5) - dt;
  f.lobCd = (f.lobCd ?? 2) - dt;
  f.pulse = Math.max(0, (f.pulse || 0) - dt * 2);
  f.crank = (f.crank || 0) + dt * (f.state === "grind" ? 14 : f.state === "crank" ? 8 : 1.5);
  if (dist > 26) return;
  const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw);
  const sx = f.x + fx * 0.9, sy = f.y + 0.9, sz = f.z + fz * 0.9;
  // Turns its spout to you, slowly.
  const want = AI.angTo(f.x, f.z, px, pz), dd = Math.atan2(Math.sin(want - f.yaw), Math.cos(want - f.yaw));
  f.yaw += Math.max(-1.5 * dt, Math.min(1.5 * dt, dd));
  if (f.state === "grind") {
    f.pulse = Math.min(1, f.t / G.spray.wind);
    if (f.t > G.spray.wind) {
      const S = G.spray, base = Math.atan2(P.z - sz, P.x - sx), ey = (P.y + 1 - sy) / Math.max(dist, 1);
      for (let i = 0; i < S.n; i++) {
        const a = base + (run.rnd() - 0.5) * S.spread * 2, v = S.speed * (0.85 + run.rnd() * 0.3);
        run.spit({ x: sx, y: sy, z: sz, vx: Math.cos(a) * v, vy: ey * v + (run.rnd() - 0.4) * 1.5, vz: Math.sin(a) * v, dmg: S.dmg, kind: "mince", owner: f.id, life: 0.8 });
      }
      f.sprayCd = S.cd; AI.setState(f, "idle");
    }
    return;
  }
  if (f.state === "crank") {
    f.pulse = Math.min(1, f.t / G.lob.wind) * 0.6;
    if (f.t > G.lob.wind) {
      for (let i = 0; i < G.lob.n; i++) {
        const T = Math.min(1.5, Math.max(0.8, dist / 12)) + i * 0.15, a = run.rnd() * TAU, r = i ? 1 + run.rnd() * 1.8 : 0;
        const tx = P.x + P.vx * T * 0.6 + Math.cos(a) * r, tz = P.z + P.vz * T * 0.6 + Math.sin(a) * r, ty = run.kit.floorAt(tx, tz, P.y + 1);
        lob(run, f, sx, sy + 0.4, sz, tx, ty, tz, T, { dmg: G.lob.dmg, kind: "sauce", splash: G.lob.splash, tx, ty, tz });
      }
      f.lobCd = G.lob.cd + run.rnd(); AI.setState(f, "idle");
    }
    return;
  }
  const sees = run.canSee(sx, sy + 0.3, sz);
  if (dist < G.spray.near && f.sprayCd <= 0 && sees && Math.abs(P.y - f.y) < 2 && Math.abs(dd) < 0.6) { AI.setState(f, "grind"); run.events.push({ type: "grindWind", x: f.x, z: f.z }); return; }
  if (dist > G.lob.min && dist < G.lob.max && f.lobCd <= 0 && sees) { AI.setState(f, "crank"); run.events.push({ type: "grindWind", x: f.x, z: f.z, lob: true }); return; }
  if (f.cd > 0) return;
  const kids = run.foes.filter((o) => o.alive && o.parent === f.id).length;
  if (kids >= G.kids) { f.cd = 1; return; }
  f.cd = rr(run, G.every);
  f.pulse = 1;
  // A fresh meatball, squeezed out of the spout.
  run.spawn("meatball", sx + fx * 0.6, sz + fz * 0.6, { parent: f.id, group: f.group });
  run.events.push({ type: "grindPop", x: f.x, z: f.z });
}

export const KITCHEN = { meatball, pepper, rollingpin, grinder };
