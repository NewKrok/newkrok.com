import { AI } from "./foes.js";

// ── Ethan's school: glitches of its own ─────────────────────────────────
// Not the park's with new looks: each has a few moves and picks one by
// how far you are and a roll of the dice, so they are harder to read.
//
//  plane      (Papírrepülő) circles you, now lazily, now in a rush. Then it
//             takes aim (it hangs in the air, nose on you) and either dives
//             straight at you, starts a dive and pulls up into a loop to
//             come down from above, or drops low and skims past at waist
//             height. A dive into a wall crumples it for a moment.
//  pencil     (Ceruza) pogoes along on its tip. Leaps high and comes down
//             where you stand (a ring shows where; the landing sends out a
//             ring to jump), spins like a top and comes after you (shots
//             glance off a spinning pencil; it is dizzy after, and soft),
//             or rocks back and jabs point first.
//  backpack   (Hátizsák) heavy, keeps its distance. Unzips and tosses a
//             handful of books that land round you (rings show where),
//             paws the ground and charges in a straight line (into a wall:
//             dazed, and soft), or snaps its zip shut on you up close.
//  sharpener  (Hegyező) sits still and spits out new pencils; grinds and
//             sprays shavings at you when you come close, lobs bits of
//             eraser at you from afar.
//
// f.guard multiplies the damage it takes (a spinning pencil 0.5, a dazed
// one more than 1).

const TAU = Math.PI * 2;
const rr = (run, [a, b]) => a + run.rnd() * (b - a);

export const PLANE = { orbit: [6, 10], slow: 2.6, fast: 6.5, aim: 0.55, dive: 14, diveT: 1.1, loopT: 0.9, swoop: 11, swoopT: 1.1, cd: [2.2, 4.2], divers: 2, crash: 1.4 };
export const PENCIL = {
  hop: 0.42, cd: [1.4, 2.8], busy: 2,
  pogo: { min: 4, max: 10, crouch: 0.5, T: 0.85, r: 3.6, dmg: 6 },
  spin: { near: 6, wind: 0.5, time: 1.6, speed: 6.5, dmg: 6, every: 0.6, dizzy: 1.3 },
  jab: { min: 1.6, max: 4.5, wind: 0.35, speed: 9.5, dmg: 7 },
};
export const PACK = {
  keep: [6, 12], cd: [1.8, 3.2],
  toss: { wind: 0.7, n: 4, gap: 0.13, dmg: 7, splash: 1.5, scatter: 2.6 },
  charge: { wind: 0.9, speed: 9, time: 1.7, dmg: 12, dizzy: 1.8 },
  chomp: { near: 2.6, wind: 0.45, dmg: 9 },
};
export const SHARP = { kids: 3, every: [3.6, 5.2], spray: { near: 7.5, wind: 0.6, n: 6, spread: 0.5, speed: 14, dmg: 3, cd: 2.8 }, lob: { min: 8, max: 22, wind: 0.5, n: 2, dmg: 6, cd: 3.6 } };

// ── Shared bits for the walkers ──

// Pottering about near where it started, minding its own business.
function potter(f, b, dt, intent) {
  f.home ??= [b.x, b.z];
  const hx = f.home[0] - b.x, hz = f.home[1] - b.z;
  f.yaw = Math.hypot(hx, hz) > 3 ? AI.angTo(b.x, b.z, f.home[0], f.home[1]) : f.yaw + Math.sin(f.age * 0.7 + f.phase) * dt * 1.5;
  intent.forward = Math.sin(f.age * 0.9 + f.phase) > 0 ? 0.35 : 0;
}

// Step the body. `hold`: keep its velocity in the air (a leap, a lunge).
function move(run, f, intent, dt, speedMul = 1, hold = false) {
  const b = f.body;
  b.yaw = f.yaw;
  if (!hold && AI.brink(run, b, intent)) { intent.forward = 0; intent.strafe = 0; intent.jumpPressed = false; }
  if (hold && !b.grounded) {
    const vx = b.vx, vz = b.vz;
    b.step(run.world, intent, dt, 0);
    b.vx = vx; b.vz = vz;
  } else { const was = b.grounded; b.step(run.world, intent, dt, speedMul); AI.keepOn(run, b, was); }
  if (b.fell) { f.alive = false; f.hp = 0; f.lost = true; }
}

// Does it touch you (and you it)?
const touching = (run, f, extra = 0.25) => {
  const P = run.body;
  return Math.hypot(P.x - f.px, P.z - f.pz) < f.def.r + P.r + extra && Math.abs(P.y - f.py) < 1.4;
};

function bonk(run, f, dmg, push = 0) {
  run.hurt(dmg, f.px, f.pz);
  run.events.push({ type: "bonk", x: f.px, z: f.pz });
  if (push) {
    const P = run.body, dx = P.x - f.px, dz = P.z - f.pz, d = Math.hypot(dx, dz) || 1;
    P.vx += dx / d * push; P.vz += dz / d * push; P.vy = Math.max(P.vy, 4.5); P.grounded = false;
  }
}

// An arc from (sx, sy, sz) landing at (tx, ty, tz) after T seconds.
function lob(run, f, sx, sy, sz, tx, ty, tz, T, o) {
  const g = 9;
  run.spit({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy + 0.5 * g * T * T) / T, vz: (tz - sz) / T, g, owner: f.id, ...o });
}

const busy = (run, kind, states) => run.foes.filter((o) => o.alive && o.kind === kind && states.includes(o.state)).length;

// ── The paper plane ──
function plane(run, f, dt, px, pcy, pz) {
  const P = run.body, d = f.def;
  f.cd -= dt;
  f.home ??= [f.x, f.y, f.z];
  const dist = Math.hypot(f.x - px, f.z - pz) || 0.01;
  const on = AI.aware(run, f, dist);
  const floor = run.kit.floorAt(f.x, f.z, f.y + 1);
  let steer = null;                 // [x, y, z, speed] to fly towards, or null: keep going
  switch (f.state) {
    case "idle":
    case "glide": {
      // Its pace changes now and then: a lazy glide or a quick dash round you.
      f.paceT = (f.paceT ?? 0) - dt;
      if (f.paceT <= 0) { f.fast = run.rnd() < 0.4; f.paceT = 1.2 + run.rnd() * 2.2; }
      const cx = on ? px : f.home[0], cz = on ? pz : f.home[2];
      const want = on ? PLANE.orbit[0] + (PLANE.orbit[1] - PLANE.orbit[0]) * (0.5 + 0.5 * Math.sin(f.age * 0.4 + f.phase)) : 3;
      const speed = on ? (f.fast ? PLANE.fast : PLANE.slow) : 2.2;
      const a = Math.atan2(f.z - cz, f.x - cx) + f.dir * (speed / want) * 0.6;
      const ty = (on ? Math.max(pcy + 1.6, floor + 1.4) : f.home[1]) + Math.sin(f.age * 1.3 + f.phase) * 0.6;
      steer = [cx + Math.cos(a) * want, ty, cz + Math.sin(a) * want, speed];
      if (on && f.cd <= 0 && dist < 20 && busy(run, "plane", ["aim", "dive", "loop", "swoop"]) < PLANE.divers && run.canSee(f.x, f.y, f.z)) {
        const r = run.rnd();
        f.attack = r < 0.5 ? "dive" : r < 0.75 ? "loop" : "swoop";
        f.looped = false;
        AI.setState(f, "aim");
        run.events.push({ type: "planeAim", id: f.id, x: f.x, z: f.z });
      }
      break;
    }
    case "aim": {
      // Hangs in the air, nose on you (a swoop first drops to your height).
      f.vx *= 1 - 3 * dt; f.vz *= 1 - 3 * dt;
      const ty = f.attack === "swoop" ? P.y + 1.0 : f.y;
      f.vy += ((ty - f.y) * 3 - f.vy) * Math.min(1, dt * 4);
      if (f.t > PLANE.aim) {
        const lead = f.attack === "swoop" ? 0.15 : 0.3;
        const tx = P.x + P.vx * lead, ty2 = P.y + 1.0, tz = P.z + P.vz * lead;
        const ex = tx - f.x, ey = ty2 - f.y, ez = tz - f.z, l = Math.hypot(ex, ey, ez) || 1;
        if (f.attack === "swoop") {
          // Flat and fast, through where you stand and on past.
          const h = Math.hypot(ex, ez) || 1;
          f.vx = ex / h * PLANE.swoop; f.vz = ez / h * PLANE.swoop; f.vy = 0;
          AI.setState(f, "swoop");
        } else {
          f.vx = ex / l * PLANE.dive; f.vy = ey / l * PLANE.dive; f.vz = ez / l * PLANE.dive;
          AI.setState(f, "dive");
        }
        f.hitDone = false;
        run.events.push({ type: "planeDive", id: f.id, x: f.x, z: f.z });
      }
      break;
    }
    case "dive":
    case "swoop": {
      if (!f.hitDone && Math.hypot(P.x - f.x, P.y + 1 - f.y, P.z - f.z) < 0.85) {
        f.hitDone = true; bonk(run, f, d.dmg);
        AI.setState(f, "pullup");
        break;
      }
      // A feint: pulls up into a loop and comes down again from above.
      if (f.attack === "loop" && !f.looped && f.t > 0.22) {
        f.loopDir = [f.vx, f.vz]; f.looped = true;
        AI.setState(f, "loop");
        break;
      }
      if (f.t > (f.state === "swoop" ? PLANE.swoopT : PLANE.diveT) || f.y < floor + 0.35) AI.setState(f, "pullup");
      break;
    }
    case "loop": {
      // Round a vertical circle over its own track, then dive at you again.
      const k = f.t / PLANE.loopT, a = k * TAU, [lx, lz] = f.loopDir, h = Math.hypot(lx, lz) || 1, s = 10;
      f.vx = lx / h * Math.cos(a) * s; f.vz = lz / h * Math.cos(a) * s; f.vy = Math.sin(a) * s;
      if (k >= 0.75) {
        f.attack = "dive"; AI.setState(f, "aim"); f.t = PLANE.aim * 0.6;
      }
      break;
    }
    case "pullup":
      f.vx *= 1 - 1.5 * dt; f.vz *= 1 - 1.5 * dt;
      f.vy += (4 - f.vy) * Math.min(1, dt * 3);
      if (f.t > 0.8) { AI.setState(f, "glide"); f.cd = rr(run, PLANE.cd); }
      break;
    case "crash":
      // Crumpled against a wall: flutters down, then shakes itself out.
      f.vx = 0; f.vz = 0; f.vy -= 9 * dt;
      if (f.t > PLANE.crash) { AI.setState(f, "pullup"); f.cd = rr(run, PLANE.cd); }
      break;
    case "stun":
      if (f.t > 0.3) AI.setState(f, "glide");
      break;
    case "sucked":
      f.vx *= 1 - 2 * dt; f.vy *= 1 - 2 * dt; f.vz *= 1 - 2 * dt;
      if (f.t > 0.15) AI.setState(f, "glide");
      break;
  }
  if (steer) {
    const [tx, ty, tz, speed] = steer;
    const ax = (tx - f.x) * 1.2, ay = (ty - f.y) * 2, az = (tz - f.z) * 1.2;
    f.vx += (ax - f.vx) * Math.min(1, dt * 2); f.vy += (ay - f.vy) * Math.min(1, dt * 2.5); f.vz += (az - f.vz) * Math.min(1, dt * 2);
    const sp = Math.hypot(f.vx, f.vz);
    if (sp > speed) { f.vx *= speed / sp; f.vz *= speed / sp; }
  }
  // Into a wall at speed: crumpled.
  const sp3 = Math.hypot(f.vx, f.vy, f.vz);
  if ((f.state === "dive" || f.state === "swoop") && sp3 > 1) {
    const hit = run.world.raycast(f.x, f.y, f.z, f.vx / sp3, f.vy / sp3, f.vz / sp3, sp3 * dt + 0.35);
    if (hit && hit.ny < 0.6) { AI.setState(f, "crash"); run.events.push({ type: "planeCrash", id: f.id, x: f.x, y: f.y, z: f.z }); }
  }
  f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
  for (const c of run.world.query(f.x, f.z, d.r)) {
    if (c.y0 > f.y + 0.3 || run.topAt(c, f.x, f.z) < f.y - 0.3) continue;
    const pen = run.world.push2D(c, f.x, f.z, d.r);
    if (pen > 0) { f.x += run.world.nx * pen; f.z += run.world.nz * pen; }
  }
  const low = f.state === "crash" ? 0.25 : f.state === "swoop" ? 0.6 : 0.5;
  const fl = run.kit.floorAt(f.x, f.z, f.y + 0.5);
  if (f.y < fl + low) { f.y = fl + low; f.vy = Math.max(0, f.vy); }
  // Nose along its flight; banks into turns.
  const h = Math.hypot(f.vx, f.vz);
  if (h > 0.3) {
    const yaw = Math.atan2(-f.vx, -f.vz), turn = Math.atan2(Math.sin(yaw - f.yaw), Math.cos(yaw - f.yaw));
    f.roll = (f.roll || 0) + (Math.max(-0.9, Math.min(0.9, turn * 3)) - (f.roll || 0)) * Math.min(1, dt * 5);
    f.yaw = yaw;
  }
  if (f.state === "aim") f.yaw = AI.angTo(f.x, f.z, px, pz);
  f.pitch = f.state === "aim" ? -0.35 : Math.atan2(f.vy, Math.max(h, 0.5));
}

// ── The pencil ──
function pencil(run, f, dt, px, pcy, pz) {
  const b = f.body, P = run.body;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  f.hopT = (f.hopT ?? 0) - dt;
  f.guard = 1;
  const intent = { forward: 0, strafe: 0, jump: false, jumpPressed: false };
  let speedMul = 1, hold = false;
  switch (f.state) {
    case "idle":
    case "chase": {
      if (!AI.aware(run, f, dist)) { potter(f, b, dt, intent); break; }
      const [wx, wz] = AI.wayTo(run, b, px, pz, dist);
      f.yaw = AI.angTo(b.x, b.z, wx, wz) + Math.sin(f.age * 1.7 + f.phase) * 0.25;
      intent.forward = dist > 1.4 ? 1 : 0;
      // It gets about in little pogo hops.
      if (b.grounded && f.hopT <= 0) { intent.jumpPressed = true; intent.jump = true; f.hopT = PENCIL.hop; }
      if (f.cd > 0 || busy(run, "pencil", ["crouch", "pogo", "spinup", "spin", "rock", "jab"]) >= PENCIL.busy || Math.abs(P.y - b.y) > 1.5) break;
      const r = run.rnd(), J = PENCIL.jab, S = PENCIL.spin, G = PENCIL.pogo;
      if (dist > J.min && dist < J.max && r < 0.4) { AI.setState(f, "rock"); run.events.push({ type: "windup", kind: "pencil", x: b.x, z: b.z }); }
      else if (dist < S.near && r < 0.75) { AI.setState(f, "spinup"); run.events.push({ type: "pencilSpin", x: b.x, z: b.z }); }
      else if (dist > G.min && dist < G.max && AI.groundAlong(run, b.x, b.z, px, pz, Math.min(b.y, P.y))) {
        AI.setState(f, "crouch"); run.events.push({ type: "pencilCrouch", x: b.x, z: b.z });
      } else f.cd = 0.4;
      break;
    }
    case "crouch": {
      // Squats on its tip; the ring on the ground shows where it will land.
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t < 0.1) f.mark = [P.x + P.vx * 0.35, P.y, P.z + P.vz * 0.35, PENCIL.pogo.r * 0.6];
      else { f.mark[0] += (P.x + P.vx * 0.35 - f.mark[0]) * Math.min(1, dt * 4); f.mark[2] += (P.z + P.vz * 0.35 - f.mark[2]) * Math.min(1, dt * 4); }
      if (f.t > PENCIL.pogo.crouch) {
        const [tx, , tz] = f.mark, ty = AI.floorBelow(run.world, tx, tz, P.y + 0.3);
        if (ty === -Infinity || Math.abs(ty - b.y) > 1.6) { f.mark = null; AI.setState(f, "chase"); f.cd = 0.8; break; }
        const T = PENCIL.pogo.T, g = 27;
        b.vx = (tx - b.x) / T; b.vz = (tz - b.z) / T; b.vy = (ty - b.y + 0.5 * g * T * T) / T; b.grounded = false;
        f.mark[1] = ty;
        AI.setState(f, "pogo");
        run.events.push({ type: "leap", x: b.x, z: b.z });
      }
      break;
    }
    case "pogo":
      hold = true;
      if (f.t > 0.15 && b.grounded) {
        // Lands point first: a ring runs out from it.
        run.shock(b.x, b.y, b.z, { max: PENCIL.pogo.r, dmg: PENCIL.pogo.dmg, speed: 9 });
        run.events.push({ type: "slam", x: b.x, z: b.z, small: true });
        if (touching(run, f, 0.1)) bonk(run, f, f.def.dmg);
        b.vx *= 0.1; b.vz *= 0.1; f.mark = null;
        AI.setState(f, "recover"); f.cd = rr(run, PENCIL.cd);
      }
      break;
    case "spinup":
      speedMul = 0; f.spin = Math.min(1, f.t / PENCIL.spin.wind);
      if (f.t > PENCIL.spin.wind) { AI.setState(f, "spin"); f.hitT = 0; }
      break;
    case "spin": {
      // A top after you: hard to hurt, but it wears itself out.
      f.guard = 0.5; f.spin = 1;
      f.yaw = AI.angTo(b.x, b.z, px, pz);
      intent.forward = 1; speedMul = PENCIL.spin.speed / f.def.speed;
      f.hitT -= dt;
      if (f.hitT <= 0 && touching(run, f)) { bonk(run, f, PENCIL.spin.dmg, 5); f.hitT = PENCIL.spin.every; }
      if (f.t > PENCIL.spin.time) { AI.setState(f, "dizzy"); run.events.push({ type: "dizzy", id: f.id, x: b.x, z: b.z }); }
      break;
    }
    case "dizzy":
      f.guard = 1.5; speedMul = 0; f.spin = Math.max(0, 1 - f.t);
      f.yaw += Math.sin(f.t * 9) * dt * 3;
      if (f.t > PENCIL.spin.dizzy) { AI.setState(f, "chase"); f.cd = rr(run, PENCIL.cd); f.spin = 0; }
      break;
    case "rock":
      // Rocks back on its tip, then jabs point first.
      speedMul = 0; f.yaw = AI.angTo(b.x, b.z, px, pz);
      if (f.t > PENCIL.jab.wind) {
        const k = PENCIL.jab.speed / Math.max(dist, 0.1);
        b.vx = dx * k; b.vz = dz * k; b.vy = 1.8; b.grounded = false; f.hitDone = false;
        AI.setState(f, "jab");
      }
      break;
    case "jab":
      hold = true;
      if (!f.hitDone && touching(run, f)) { f.hitDone = true; bonk(run, f, PENCIL.jab.dmg, 3); b.vx *= -0.3; b.vz *= -0.3; }
      if (f.t > 0.25 && b.grounded) { b.vx *= 0.2; b.vz *= 0.2; AI.setState(f, "recover"); f.cd = rr(run, PENCIL.cd); }
      break;
    case "recover":
      speedMul = 0;
      if (f.t > 0.5) AI.setState(f, "chase");
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
  if (f.state !== "crouch" && f.state !== "pogo") f.mark = null;
  move(run, f, intent, dt, speedMul, hold || f.state === "sucked");
}

// ── The backpack ──
function backpack(run, f, dt, px, pcy, pz) {
  const b = f.body, P = run.body, C = PACK.charge;
  const dx = px - b.x, dz = pz - b.z, dist = Math.hypot(dx, dz);
  f.cd -= dt;
  f.guard = 1;
  const intent = { forward: 0, strafe: 0 };
  let speedMul = 1;
  const turnTo = (a, rate) => { const d = Math.atan2(Math.sin(a - f.yaw), Math.cos(a - f.yaw)); f.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); };
  switch (f.state) {
    case "idle": {
      if (!AI.aware(run, f, dist)) { potter(f, b, dt, intent); intent.forward *= 0.6; break; }
      const [wx, wz] = dist > PACK.keep[1] ? AI.wayTo(run, b, px, pz, dist) : [px, pz];
      turnTo(AI.angTo(b.x, b.z, wx, wz), 2);
      intent.forward = dist > PACK.keep[1] ? 1 : dist < PACK.keep[0] ? -0.7 : 0;
      intent.strafe = Math.sin(f.age * 0.5 + f.phase) * 0.5;
      if (f.cd > 0 || Math.abs(P.y - b.y) > 2) break;
      const r = run.rnd(), sees = run.canSee(b.x, b.y + 1, b.z);
      if (dist < PACK.chomp.near) { AI.setState(f, "chomp"); run.events.push({ type: "packWindup", x: b.x, z: b.z, chomp: true }); }
      else if (r < 0.45 && dist < 16 && sees && AI.groundAlong(run, b.x, b.z, px, pz, b.y)) { AI.setState(f, "paw"); run.events.push({ type: "packWindup", x: b.x, z: b.z }); }
      else if (dist < 22 && sees) { AI.setState(f, "toss"); run.events.push({ type: "packWindup", x: b.x, z: b.z, toss: true }); f.volley = PACK.toss.n; f.volleyT = PACK.toss.wind; }
      else f.cd = 0.6;
      break;
    }
    case "toss": {
      // Unzipped: books flung up in arcs, landing round you.
      speedMul = 0; turnTo(AI.angTo(b.x, b.z, px, pz), 3);
      f.volleyT -= dt;
      if (f.volleyT <= 0) {
        const T = 1.0 + run.rnd() * 0.35, first = f.volley === PACK.toss.n;
        const a = run.rnd() * TAU, r = first ? 0 : 1 + run.rnd() * PACK.toss.scatter;
        const tx = P.x + P.vx * T * 0.6 + Math.cos(a) * r, tz = P.z + P.vz * T * 0.6 + Math.sin(a) * r, ty = run.kit.floorAt(tx, tz, P.y + 1);
        lob(run, f, b.x, b.y + 1.5, b.z, tx, ty, tz, T, { splash: PACK.toss.splash, dmg: PACK.toss.dmg, kind: "book", tx, ty, tz });
        f.volleyT = PACK.toss.gap;
        if (--f.volley <= 0) { AI.setState(f, "idle"); f.cd = rr(run, PACK.cd); }
      }
      break;
    }
    case "paw":
      // Scrapes the ground, lined up on you: then it goes.
      speedMul = 0; turnTo(AI.angTo(b.x, b.z, px, pz), 2.5);
      if (f.t > C.wind) { f.dir = f.yaw; f.hitDone = false; AI.setState(f, "charge"); run.events.push({ type: "packCharge", x: b.x, z: b.z }); }
      break;
    case "charge": {
      f.yaw = f.dir;
      intent.forward = 1; speedMul = C.speed / f.def.speed;
      if (!f.hitDone && touching(run, f, 0.3)) { f.hitDone = true; bonk(run, f, C.dmg, 9); }
      // Ran into something (not you): dazed.
      if (f.t > 0.35 && b.speed2D < 2) { AI.setState(f, "dazed"); run.events.push({ type: "dizzy", id: f.id, x: b.x, z: b.z, big: true }); break; }
      if (f.t > C.time) { AI.setState(f, "idle"); f.cd = rr(run, PACK.cd); }
      break;
    }
    case "dazed":
      f.guard = 1.6; speedMul = 0;
      if (f.t > C.dizzy) { AI.setState(f, "idle"); f.cd = rr(run, PACK.cd); }
      break;
    case "chomp":
      speedMul = 0; turnTo(AI.angTo(b.x, b.z, px, pz), 4);
      if (f.t > PACK.chomp.wind) {
        const fx = -Math.sin(f.yaw), fz = -Math.cos(f.yaw);
        if (dist < PACK.chomp.near + 0.4 && (dx * fx + dz * fz) / Math.max(dist, 0.1) > 0.4 && Math.abs(P.y - b.y) < 1.4) bonk(run, f, PACK.chomp.dmg, 6);
        run.events.push({ type: "packChomp", x: b.x, z: b.z });
        AI.setState(f, "idle"); f.cd = rr(run, PACK.cd);
      }
      break;
    case "stun":
    case "sucked":
      if (f.t > 0.3) AI.setState(f, "idle");
      break;
  }
  move(run, f, intent, dt, speedMul);
}

// ── The sharpener ──
function sharpener(run, f, dt, px, pcy, pz) {
  const P = run.body, dist = Math.hypot(px - f.x, pz - f.z);
  f.cd -= dt;
  f.sprayCd = (f.sprayCd ?? 1.5) - dt;
  f.lobCd = (f.lobCd ?? 2) - dt;
  f.pulse = Math.max(0, (f.pulse || 0) - dt * 2);
  f.crank = (f.crank || 0) + dt * (f.state === "grind" ? 14 : f.state === "crank" ? 8 : 1.5);
  if (dist > 26) return;
  const sx = f.x, sy = f.y + 0.6, sz = f.z;
  f.yaw = AI.angTo(f.x, f.z, px, pz);
  if (f.state === "grind") {
    // Grinding up, then a spray of shavings straight at you.
    f.pulse = Math.min(1, f.t / SHARP.spray.wind);
    if (f.t > SHARP.spray.wind) {
      const S = SHARP.spray, base = Math.atan2(P.z - sz, P.x - sx), ey = (P.y + 1 - sy) / Math.max(dist, 1);
      for (let i = 0; i < S.n; i++) {
        const a = base + (run.rnd() - 0.5) * S.spread * 2, v = S.speed * (0.85 + run.rnd() * 0.3);
        run.spit({ x: sx, y: sy, z: sz, vx: Math.cos(a) * v, vy: ey * v + (run.rnd() - 0.4) * 1.5, vz: Math.sin(a) * v, dmg: S.dmg, kind: "shaving", owner: f.id, life: 0.7 });
      }
      f.sprayCd = S.cd; AI.setState(f, "idle");
    }
    return;
  }
  if (f.state === "crank") {
    f.pulse = Math.min(1, f.t / SHARP.lob.wind) * 0.6;
    if (f.t > SHARP.lob.wind) {
      for (let i = 0; i < SHARP.lob.n; i++) {
        const T = Math.min(1.5, Math.max(0.7, dist / 12)) + i * 0.15, a = run.rnd() * TAU, r = i ? 1 + run.rnd() * 1.5 : 0;
        const tx = P.x + P.vx * T * 0.6 + Math.cos(a) * r, tz = P.z + P.vz * T * 0.6 + Math.sin(a) * r;
        lob(run, f, sx, sy + 0.4, sz, tx, P.y + 0.5, tz, T, { dmg: SHARP.lob.dmg, kind: "eraser" });
      }
      f.lobCd = SHARP.lob.cd + run.rnd(); AI.setState(f, "idle");
    }
    return;
  }
  const sees = run.canSee(sx, sy + 0.5, sz);
  if (dist < SHARP.spray.near && f.sprayCd <= 0 && sees && Math.abs(P.y - f.y) < 2) { AI.setState(f, "grind"); run.events.push({ type: "sharpGrind", x: f.x, z: f.z }); return; }
  if (dist > SHARP.lob.min && dist < SHARP.lob.max && f.lobCd <= 0 && sees) { AI.setState(f, "crank"); run.events.push({ type: "sharpGrind", x: f.x, z: f.z, lob: true }); return; }
  if (f.cd > 0) return;
  const kids = run.foes.filter((o) => o.alive && o.parent === f.id).length;
  if (kids >= SHARP.kids) { f.cd = 1; return; }
  f.cd = rr(run, SHARP.every);
  f.pulse = 1;
  // A fresh pencil, popped out of the hole towards you.
  const a = Math.atan2(P.z - f.z, P.x - f.x) + (run.rnd() - 0.5) * 1.2;
  run.spawn("pencil", f.x + Math.cos(a) * 1.5, f.z + Math.sin(a) * 1.5, { parent: f.id, group: f.group });
  run.events.push({ type: "sharpPop", x: f.x, z: f.z });
}

export const SCHOOL = { plane, pencil, backpack, sharpener };
