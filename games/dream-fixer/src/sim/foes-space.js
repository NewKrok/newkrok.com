import { AI } from "./foes.js";
import { WALKER } from "./foes-school.js";

// ── Sophie's station: glitches of its own ───────────────────────────────
// Her childhood toys, loose in a station with hardly any weight. Like the
// other dreams' glitches, each picks its move by how far you are and a
// roll of the dice.
//
//  rocket   (Plüssrakéta) a plush toy rocket flying about. It hangs still,
//           shaking, aims (its flame sputters) and dashes straight through
//           where you were: step aside. After a dash it sputters for a
//           moment, soft. From afar it puffs a few stars at you.
//  robot    (Felhúzós robot) a little tin wind-up robot, marching after you.
//           Up close it claps its hands on you; a few metres off it cranks
//           its key and sprints at you; from afar it zaps you from its
//           antenna. Every so often its spring runs down: it stops dead,
//           soft, until it has wound itself up again.
//  top      (Búgócsiga) a big spinning top, heavy, keeping its distance.
//           Spins up and shoots off at you, bouncing off walls and edges
//           (jump it); then it wobbles, dazed and soft. From afar it flings
//           a fan of sparks.
//  mobile   (Bolygó-forgó) the planet mobile from over her bed, rooted. It
//           throws its planets at you one by one, swings them all out in a
//           ring when you come close (jump it), and new plush rockets come
//           off it.

const TAU = Math.PI * 2;
const { move, touching, bonk, busy, potter, rr } = WALKER;

export const ROCKET = {
  orbit: [5, 8], speed: 3.6, cd: [2, 3.4], busy: 2,
  dash: { near: 13, aim: 0.75, speed: 13, time: 1, dmg: 7, sputter: 1.2 },
  stars: { min: 6, max: 18, wind: 0.5, n: 3, gap: 0.16, speed: 12, dmg: 3 },
};
export const ROBOT = {
  cd: [1.4, 2.6], busy: 2,
  spring: [7, 10], down: 2.2,           // seconds of winding before it runs down; how long it stands
  clap: { near: 1.5, wind: 0.35, dmg: 6, cd: 1.3 },
  sprint: { min: 4, max: 11, wind: 0.6, time: 1.8, speed: 2.4, dmg: 6 },
  zap: { min: 6, max: 15, wind: 0.5, speed: 13, dmg: 4 },
};
export const TOP = {
  keep: [6, 11], cd: [2, 3.2],
  spin: { wind: 1, speed: 9, time: 2.6, bounces: 3, dmg: 9, wobble: 1.6 },
  fan: { min: 5, max: 15, wind: 0.6, n: 5, spread: 0.24, speed: 11, dmg: 3 },
};
export const MOBILE = {
  kids: 2, every: [5.5, 7.5],
  planets: { min: 4, max: 20, wind: 0.5, n: 3, gap: 0.4, speed: 10, dmg: 5, cd: 3.4 },
  ring: { near: 4.5, wind: 0.7, r: 6, dmg: 7, cd: 3.5 },
};

// A flyer drifting towards (tx, ty, tz), pushed out of walls, kept off
// the floor; it faces you.
function fly(run, f, dt, tx, ty, tz, steer, max, px, pz) {
  const ax = (tx - f.x) * steer, ay = (ty - f.y) * 2, az = (tz - f.z) * steer;
  f.vx += (ax - f.vx) * Math.min(1, dt * 2.5); f.vy += (ay - f.vy) * Math.min(1, dt * 2.5); f.vz += (az - f.vz) * Math.min(1, dt * 2.5);
  const sp = Math.hypot(f.vx, f.vz);
  if (sp > max) { f.vx *= max / sp; f.vz *= max / sp; }
  f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
  unstick(run, f);
  f.yaw = AI.angTo(f.x, f.z, px, pz);
}
// Out of walls, above the floor; true if a wall was in the way.
function unstick(run, f) {
  let hit = false;
  for (const c of run.world.query(f.x, f.z, f.def.r)) {
    if (c.y0 > f.y + 0.4 || run.topAt(c, f.x, f.z) < f.y - 0.4) continue;
    const pen = run.world.push2D(c, f.x, f.z, f.def.r);
    if (pen > 0) { f.x += run.world.nx * pen; f.z += run.world.nz * pen; hit = true; }
  }
  const fl = run.kit.floorAt(f.x, f.z, f.y + 0.5);
  if (f.y < fl + 0.7) { f.y = fl + 0.7; f.vy = Math.max(0, f.vy); }
  return hit;
}

// ── The plush rocket ──
function rocket(run, f, dt, px, pcy, pz) {
  const P = run.body, R = ROCKET;
  f.cd -= dt;
  f.guard = 1;
  f.home ??= [f.x, f.y, f.z];
  const dist = Math.hypot(f.x - px, f.z - pz) || 0.01;
  const on = AI.aware(run, f, dist);
  const floor = run.kit.floorAt(f.x, f.z, f.y + 1);
  const cx = on ? px : f.home[0], cz = on ? pz : f.home[2];
  const want = on ? R.orbit[0] + (R.orbit[1] - R.orbit[0]) * (0.5 + 0.5 * Math.sin(f.age * 0.5 + f.phase)) : 2;
  const a = Math.atan2(f.z - cz, f.x - cx) + f.dir * dt * (on ? 0.7 : 0.3);
  let tx = cx + Math.cos(a) * want, tz = cz + Math.sin(a) * want, steer = 1.3, max = R.speed;
  let ty = (on ? Math.max(pcy + 1.2, floor + 1.6) : f.home[1]) + Math.sin(f.age * 1.8 + f.phase) * 0.3;
  switch (f.state) {
    case "idle":
      if (!on || f.cd > 0 || !run.canSee(f.x, f.y, f.z)) break;
      if (dist < R.dash.near && run.rnd() < 0.6 && busy(run, "rocket", ["aim", "dash"]) < R.busy) { AI.setState(f, "aim"); run.events.push({ type: "rocketAim", x: f.x, z: f.z }); }
      else if (dist > R.stars.min && dist < R.stars.max) { AI.setState(f, "stars"); f.volley = R.stars.n; f.volleyT = R.stars.wind; }
      else f.cd = 0.5;
      break;
    case "aim":
      // Hangs still, nose on you, shaking; then off it goes at where you were.
      tx = f.x; ty = f.y; tz = f.z; steer = 0.3;
      if (f.t > R.dash.aim) {
        const ex = P.x - f.x, ey = P.y + 1 - f.y, ez = P.z - f.z, l = Math.hypot(ex, ey, ez) || 1;
        f.dash = [ex / l * R.dash.speed, ey / l * R.dash.speed, ez / l * R.dash.speed];
        f.hitDone = false;
        AI.setState(f, "dash");
        run.events.push({ type: "rocketDash", x: f.x, z: f.z });
      }
      break;
    case "dash": {
      const [vx, vy, vz] = f.dash;
      f.x += vx * dt; f.y += vy * dt; f.z += vz * dt;
      f.vx = vx; f.vy = vy; f.vz = vz;
      f.yaw = Math.atan2(-vx, -vz);
      const wall = unstick(run, f);
      if (!f.hitDone && Math.hypot(P.x - f.x, P.y + 1 - f.y, P.z - f.z) < f.def.r + 0.6) { f.hitDone = true; bonk(run, f, R.dash.dmg, 4); }
      if (wall || f.t > R.dash.time) { AI.setState(f, "sputter"); run.events.push({ type: "rocketSputter", x: f.x, z: f.z }); }
      return;
    }
    case "sputter":
      // Out of puff for a moment: drifting, soft.
      f.guard = 1.5; tx = f.x; tz = f.z; ty = f.y - 0.3; steer = 0.2;
      if (f.t > R.dash.sputter) { AI.setState(f, "idle"); f.cd = rr(run, R.cd); }
      break;
    case "stars":
      steer = 0.4;
      f.volleyT -= dt;
      if (f.volleyT <= 0) {
        const S = R.stars, l = Math.hypot(P.x - f.x, P.y + 1.1 - f.y, P.z - f.z) || 1;
        run.spit({ x: f.x, y: f.y, z: f.z, vx: (P.x - f.x) / l * S.speed, vy: (P.y + 1.1 - f.y) / l * S.speed, vz: (P.z - f.z) / l * S.speed, dmg: S.dmg, kind: "star", owner: f.id, life: 2 });
        run.events.push({ type: "rocketPuff", x: f.x, z: f.z });
        f.volleyT = S.gap;
        if (--f.volley <= 0) { AI.setState(f, "idle"); f.cd = rr(run, R.cd); }
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
  fly(run, f, dt, tx, ty, tz, steer, max, px, pz);
}

// ── The wind-up robot ──
function robot(run, f, dt, px, pcy, pz) {
  const b = f.body, P = run.body, R = ROBOT;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  f.guard = 1;
  f.spring ??= rr(run, R.spring);
  const intent = { forward: 0, strafe: 0 };
  let speedMul = 1;
  const on = AI.aware(run, f, dist);
  // Winding down as it goes; run down, it stops wherever it is.
  if (on && f.state !== "rundown") {
    f.spring -= dt;
    if (f.spring <= 0 && f.state !== "sprint") { AI.setState(f, "rundown"); run.events.push({ type: "robotDown", id: f.id, x: b.x, z: b.z }); }
  }
  switch (f.state) {
    case "idle":
    case "chase": {
      if (!on) { potter(f, b, dt, intent); break; }
      const [wx, wz] = AI.wayTo(run, b, px, pz, dist);
      f.yaw = AI.angTo(b.x, b.z, wx, wz);
      intent.forward = dist > 1.1 ? 1 : 0;
      if (f.cd > 0 || Math.abs(P.y - b.y) > 1.5) break;
      const sees = run.canSee(b.x, b.y + 0.7, b.z);
      if (dist < R.clap.near) { AI.setState(f, "wind"); run.events.push({ type: "robotWind", x: b.x, z: b.z }); }
      else if (dist > R.sprint.min && dist < R.sprint.max && sees && run.rnd() < 0.5 && AI.groundAlong(run, b.x, b.z, px, pz, b.y)) { AI.setState(f, "crank"); run.events.push({ type: "robotCrank", x: b.x, z: b.z }); }
      else if (dist > R.zap.min && dist < R.zap.max && sees && run.rnd() < 0.4 && busy(run, "robot", ["zap"]) < R.busy) AI.setState(f, "zap");
      else f.cd = 0.5;
      break;
    }
    case "wind":
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t > R.clap.wind) {
        if (dist < R.clap.near + 0.4 && Math.abs(P.y - b.y) < 1.2) bonk(run, f, R.clap.dmg, 3);
        run.events.push({ type: "robotClap", x: b.x, z: b.z });
        AI.setState(f, "chase"); f.cd = R.clap.cd;
      }
      break;
    case "crank":
      // Its key whirring round, then it is off at a run.
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t > R.sprint.wind) { f.hitDone = false; AI.setState(f, "sprint"); }
      break;
    case "sprint":
      f.yaw = AI.angTo(b.x, b.z, px, pz);
      intent.forward = 1; speedMul = R.sprint.speed;
      if (!f.hitDone && touching(run, f, 0.2)) { f.hitDone = true; bonk(run, f, R.sprint.dmg, 4); AI.setState(f, "chase"); f.cd = rr(run, R.cd); }
      else if (f.t > R.sprint.time) { AI.setState(f, "chase"); f.cd = rr(run, R.cd); }
      break;
    case "zap":
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t > R.zap.wind) {
        const Z = R.zap, sx = b.x, sy = b.y + f.def.h + 0.2, sz = b.z, l = Math.hypot(P.x - sx, P.y + 1.1 - sy, P.z - sz) || 1;
        run.spit({ x: sx, y: sy, z: sz, vx: (P.x - sx) / l * Z.speed, vy: (P.y + 1.1 - sy) / l * Z.speed, vz: (P.z - sz) / l * Z.speed, dmg: Z.dmg, kind: "zap", owner: f.id, life: 1.6 });
        run.events.push({ type: "robotZap", x: sx, z: sz });
        AI.setState(f, "chase"); f.cd = rr(run, R.cd);
      }
      break;
    case "rundown":
      // Stock still, soft, the key barely turning; then it winds itself up.
      speedMul = 0; f.guard = 1.6;
      if (f.t > R.down) { f.spring = rr(run, R.spring); AI.setState(f, "chase"); f.cd = 0.4; run.events.push({ type: "robotUp", id: f.id, x: b.x, z: b.z }); }
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

// ── The spinning top ──
function top(run, f, dt, px, pcy, pz) {
  const b = f.body, P = run.body, S = TOP.spin, K = TOP.fan;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  f.guard = 1;
  f.whirl = (f.whirl || 0) + dt * (f.state === "spin" ? 30 : f.state === "windup" ? 8 + f.t * 20 : f.state === "wobble" ? 3 : 6);
  const intent = { forward: 0, strafe: 0 };
  let speedMul = 1;
  switch (f.state) {
    case "idle": {
      if (!AI.aware(run, f, dist)) { potter(f, b, dt, intent); intent.forward *= 0.6; break; }
      const [wx, wz] = dist > TOP.keep[1] ? AI.wayTo(run, b, px, pz, dist) : [px, pz];
      f.yaw = AI.angTo(b.x, b.z, wx, wz);
      intent.forward = dist > TOP.keep[1] ? 1 : dist < TOP.keep[0] ? -0.7 : 0;
      intent.strafe = Math.sin(f.age * 0.6 + f.phase) * 0.5;
      if (f.cd > 0 || Math.abs(P.y - b.y) > 2) break;
      const sees = run.canSee(b.x, b.y + 0.6, b.z);
      if (run.rnd() < 0.55 && dist < 18 && sees) { AI.setState(f, "windup"); run.events.push({ type: "topWind", x: b.x, z: b.z }); }
      else if (dist > K.min && dist < K.max && sees) AI.setState(f, "fan");
      else f.cd = 0.6;
      break;
    }
    case "windup":
      speedMul = 0;
      if (f.t > S.wind) {
        const a = Math.atan2(dz, dx);
        f.dir2 = [Math.cos(a), Math.sin(a)];
        f.bounces = 0; f.hitDone = false;
        AI.setState(f, "spin");
        run.events.push({ type: "topGo", x: b.x, z: b.z });
      }
      break;
    case "spin": {
      // Off in a straight line, bouncing off walls and edges.
      const [ux, uz] = f.dir2;
      const ahead = AI.floorBelow(run.world, b.x + ux * (f.def.r + 0.4), b.z + uz * (f.def.r + 0.4), b.y);
      if (ahead < b.y - 1) { f.dir2 = [-ux, -uz]; f.bounces++; run.events.push({ type: "topBounce", x: b.x, z: b.z }); }
      f.yaw = Math.atan2(-f.dir2[0], -f.dir2[1]);
      intent.forward = 1; speedMul = S.speed / f.def.speed;
      const x0 = b.x, z0 = b.z;
      move(run, f, intent, dt, speedMul);
      // Held up by a wall: bounce off it (the way it went missing tells
      // which way the wall faces).
      const mx = ux * S.speed * dt, mz = uz * S.speed * dt, rx = mx - (b.x - x0), rz = mz - (b.z - z0), rl = Math.hypot(rx, rz);
      if (rl > Math.hypot(mx, mz) * 0.4 && f.t > 0.1) {
        const nx = rx / rl, nz = rz / rl, d = f.dir2[0] * nx + f.dir2[1] * nz;
        f.dir2 = [f.dir2[0] - 2 * d * nx, f.dir2[1] - 2 * d * nz];
        f.bounces++;
        run.events.push({ type: "topBounce", x: b.x, z: b.z });
      }
      if (!f.hitDone && touching(run, f, 0.2)) { f.hitDone = true; bonk(run, f, S.dmg, 7); }
      if (f.hitDone && !touching(run, f, 1)) f.hitDone = false;
      if (f.t > S.time || f.bounces > S.bounces) { AI.setState(f, "wobble"); run.events.push({ type: "dizzy", id: f.id, x: b.x, z: b.z, big: true }); }
      return;
    }
    case "wobble":
      // Toppling round and round: dazed, soft.
      speedMul = 0; f.guard = 1.6;
      if (f.t > S.wobble) { AI.setState(f, "idle"); f.cd = rr(run, TOP.cd); }
      break;
    case "fan":
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t > K.wind) {
        const base = Math.atan2(P.z - b.z, P.x - b.x), ey = (P.y + 1 - b.y - 0.6) / Math.max(dist, 1);
        for (let i = 0; i < K.n; i++) {
          const an = base + (i - (K.n - 1) / 2) * K.spread;
          run.spit({ x: b.x, y: b.y + 0.6, z: b.z, vx: Math.cos(an) * K.speed, vy: ey * K.speed + 0.5, vz: Math.sin(an) * K.speed, g: 2, dmg: K.dmg, kind: "spark", owner: f.id, life: 1.6 });
        }
        run.events.push({ type: "topFan", x: b.x, z: b.z });
        AI.setState(f, "idle"); f.cd = rr(run, TOP.cd);
      }
      break;
    case "stun":
    case "sucked":
      if (f.t > 0.3) AI.setState(f, "idle");
      break;
  }
  move(run, f, intent, dt, speedMul);
}

// ── The planet mobile ──
function mobile(run, f, dt, px, pcy, pz) {
  const P = run.body, dist = Math.hypot(px - f.x, pz - f.z), M = MOBILE;
  f.cd -= dt;
  f.throwCd = (f.throwCd ?? 1.5) - dt;
  f.ringCd = (f.ringCd ?? 1) - dt;
  f.pulse = Math.max(0, (f.pulse || 0) - dt * 2);
  f.planets ??= 4;
  // The planets grow back one by one.
  f.regrow = (f.regrow || 0) + dt;
  if (f.planets < 4 && f.regrow > 2) { f.planets++; f.regrow = 0; }
  f.swing = (f.swing || 0) + dt * (f.state === "ring" ? 6 + f.t * 10 : 0.8);
  if (dist > 28) return;
  f.yaw = AI.angTo(f.x, f.z, px, pz);
  const hy = f.y + f.def.hitY;
  if (f.state === "throw") {
    f.volleyT -= dt;
    if (f.volleyT <= 0 && f.planets > 0) {
      const S = M.planets, a = f.swing, sx = f.x + Math.cos(a) * 0.9, sz = f.z + Math.sin(a) * 0.9;
      const T = Math.max(0.6, dist / S.speed), tx = P.x + P.vx * T * 0.6, ty = P.y + 1, tz = P.z + P.vz * T * 0.6, l = Math.hypot(tx - sx, ty - hy, tz - sz) || 1;
      run.spit({ x: sx, y: hy, z: sz, vx: (tx - sx) / l * S.speed, vy: (ty - hy) / l * S.speed, vz: (tz - sz) / l * S.speed, dmg: S.dmg, kind: "planet", owner: f.id, life: 3 });
      run.events.push({ type: "mobileThrow", x: f.x, z: f.z });
      f.planets--; f.regrow = 0;
      f.volleyT = S.gap;
      if (--f.volley <= 0 || f.planets <= 0) { f.throwCd = S.cd + run.rnd(); AI.setState(f, "idle"); }
    }
    return;
  }
  if (f.state === "ring") {
    f.pulse = Math.min(1, f.t / M.ring.wind);
    if (f.t > M.ring.wind) {
      run.shock(f.x, f.y, f.z, { max: M.ring.r, dmg: M.ring.dmg, speed: 8, color: 0x9fc8ff });
      run.events.push({ type: "slam", x: f.x, z: f.z, small: true });
      f.ringCd = M.ring.cd; AI.setState(f, "idle");
    }
    return;
  }
  const sees = run.canSee(f.x, hy, f.z);
  if (dist < M.ring.near && f.ringCd <= 0 && Math.abs(P.y - f.y) < 1.5) { AI.setState(f, "ring"); run.events.push({ type: "mobileSpin", x: f.x, z: f.z }); return; }
  if (dist > M.planets.min && dist < M.planets.max && f.throwCd <= 0 && sees && f.planets > 0) {
    AI.setState(f, "throw"); f.volley = M.planets.n; f.volleyT = M.planets.wind;
    return;
  }
  if (f.cd > 0) return;
  const kids = run.foes.filter((o) => o.alive && o.parent === f.id).length;
  if (kids >= M.kids) { f.cd = 1; return; }
  f.cd = rr(run, M.every);
  f.pulse = 1;
  const a = run.rnd() * TAU;
  run.spawn("rocket", f.x + Math.cos(a) * 1.5, f.z + Math.sin(a) * 1.5, { parent: f.id, group: f.group, y: f.y + 1 });
  run.events.push({ type: "mobilePop", x: f.x, z: f.z });
}

export const SPACE = { rocket, robot, top, mobile };
