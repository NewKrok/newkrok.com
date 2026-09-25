import {
  Space, Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  PivotJoint, WeldJoint, AngleJoint,
  CbType, CbEvent, InteractionListener, InteractionType,
} from "@newkrok/nape-js";
import {
  DT, M, G, VEHICLES, TRAILERS, CAR_TYPES,
  PARK_ANGLE, PARK_SPEED, BUMP_SPEED, CRASH_SPEED, BUMP_COOLDOWN, HAZARD_TIME, PARKED_MU, CONE_MU,
  clamp, approach, wrapPi, localToWorld,
} from "./config.js";

// ── Physics simulation ───────────────────────────────────────────────────
// The towing vehicle (an estate car or a tractor unit) is a chassis plus four wheel bodies: rear wheels on WeldJoints,
// front wheels on PivotJoints steered by AngleJoints whose limits are
// rewritten every step (Ackermann geometry). Each wheel runs its own tyre
// model and only the front wheels drive, so the steered wheels pull the car
// round. The trailer hangs on a PivotJoint at the tow ball with an
// AngleJoint jack-knife stop. No DOM, no rendering: this runs in Node too.

const MAT_BODY = new Material(0.12, 0.6, 0.8, 1, 0.001);
const MAT_WHEEL = new Material(0, 0.6, 0.8, 6, 0.001);
const MAT_STATIC = new Material(0.15, 0.6, 0.8, 1, 0.001);
const MAT_CONE = new Material(0.3, 0.5, 0.6, 0.35, 0.001);
const MAT_HEAVY = new Material(0.12, 0.6, 0.8, 2.5, 0.001);
const MAT_HAY = new Material(0.05, 0.8, 0.9, 0.9, 0.001);
// Wheels never collide: they live inside the body outline, and the body is
// what hits things.
const FILTER_GHOST = () => new InteractionFilter(0, 0);

// Chamfered outline of a car / trailer bed in local metres → px vertices.
export function carOutline(len, wid, ch = 0.32) {
  const l = len / 2 * M, w = wid / 2 * M, c = ch * M;
  return [
    [l, -w + c], [l, w - c], [l - c, w], [-l + c * 0.7, w],
    [-l, w - c * 0.7], [-l, -w + c * 0.7], [-l + c * 0.7, -w], [l - c, -w],
  ];
}
const toVecs = (pts) => pts.map(([x, y]) => new Vec2(x, y));

export function ackermann(steer, side, spec) {
  // side: −1 = left wheel (y < 0 in a car facing +x), +1 = right wheel.
  if (Math.abs(steer) < 1e-4) return 0;
  const L = spec.wheelbase, T = spec.track;
  const R = L / Math.tan(Math.abs(steer));
  const inner = Math.sign(steer) === side;
  const a = Math.atan(L / (inner ? R - T / 2 : R + T / 2));
  return a * Math.sign(steer);
}

export function createSim({ onEvent = () => {} } = {}) {
  const space = new Space(new Vec2(0, 0));
  const S = {
    space,
    level: null,
    gen: 0,                // bumps on every (re)build — the 3D scene watches it
    veh: null,
    parked: [],
    cones: [],
    movables: [],          // loose props you can shove: { body, def }
    statics: [],           // { body, def } incl. boundary walls
    hits: 0, crashes: 0, coneHits: 0,
    scoring: false,        // bumps only count while this is on
    time: 0,               // physics clock of the current attempt (s)
    park: null,
  };
  let cbVeh = null, cbThing = null, cbCone = null;
  let cooldown = new Map();

  function staticBody(def) {
    const b = new Body(BodyType.STATIC, new Vec2(def.x, def.y));
    const k = def.kind;
    const box = (w, h) => b.shapes.add(new Polygon(Polygon.box(w, h), MAT_STATIC));
    const boxAt = (x, y, w, h) => b.shapes.add(new Polygon(Polygon.rect(x - w / 2, y - h / 2, w, h), MAT_STATIC));
    const circ = (r) => b.shapes.add(new Circle(r, undefined, MAT_STATIC));
    if (k === "pillar") box(def.s, def.s);
    else if (k === "hay" || k === "rock") circ(def.r);
    else if (k === "bush") circ(def.r * 0.7);
    else if (k === "post") circ(def.r ?? 2.2);
    else if (k === "pine") circ(Math.max(2.5, def.r * 0.2));
    else if (k === "plane") {
      const k = def.s ?? 1;
      boxAt(0, 0, 70 * k, 10 * k); boxAt(8 * k, 0, 14 * k, 96 * k); boxAt(-30 * k, 0, 8 * k, 30 * k);
    } else if (k === "parkedsemi") {
      const t = TRAILERS.semi, v = VEHICLES.truck;
      box(t.len * M, t.wid * M);
      boxAt((t.len / 2 + t.bar - v.hitchX) * M, 0, v.len * M, v.wid * M);
    }
    else if (k === "bollard") circ(def.r ?? 3);
    else if (k === "lamp") circ(2.6);
    else if (k === "hydrant") circ(2.8);
    else if (k === "bin") circ(4.5);
    else if (k === "barrel") circ(4.2);
    else if (k === "tree") circ(Math.max(3, def.r * 0.24));
    else if (k === "firepit") circ(7);
    else if (k === "table") box(12, 20);
    else if (k === "tractor") box(44, 24);
    else if (k === "digger") box(def.w ?? 60, def.h ?? 30);
    else if (k === "skip") box(def.w ?? 44, def.h ?? 26);
    else if (k === "vancaravan") {
      const t = TRAILERS.caravan;
      box(t.len * M, t.wid * M);
    } else box(def.w, def.h);
    if (def.a) b.rotation = def.a;
    b.userData._static = def;
    b.cbTypes.add(cbThing);
    b.space = space;
    S.statics.push({ body: b, def });
    return b;
  }

  // Site edges: `sides` lists which of n / s / e / w are closed.
  function boundaryWalls(W, H, sides) {
    const T = 14;
    const defs = [];
    if (sides.includes("w")) defs.push({ x: -T / 2 + 2, y: H / 2, w: T, h: H + 40, side: "w" });
    if (sides.includes("e")) defs.push({ x: W + T / 2 - 2, y: H / 2, w: T, h: H + 40, side: "e" });
    if (sides.includes("s")) defs.push({ x: W / 2, y: H + T / 2 - 2, w: W + 40, h: T, side: "s" });
    if (sides.includes("n")) defs.push({ x: W / 2, y: -T / 2 + 2, w: W + 40, h: T, side: "n" });
    for (const d of defs) staticBody({ kind: "boundary", ...d });
  }

  function createParked(p) {
    const spec = CAR_TYPES[p.type];
    const b = new Body(BodyType.DYNAMIC, new Vec2(p.x, p.y));
    b.rotation = p.a;
    b.shapes.add(new Polygon(toVecs(carOutline(spec.len, spec.wid, spec.lorry ? 0.15 : 0.32)), spec.lorry ? MAT_HEAVY : MAT_BODY));
    b.cbTypes.add(cbThing);
    b.space = space;
    const rec = { body: b, spec, type: p.type, color: p.color, hazard: 0, shoved: 0, x0: p.x, y0: p.y };
    b.userData._parked = rec;
    return rec;
  }

  // Which surface is under a point: the last level surface that covers it
  // (they are painted in order), else the level's base. Mud is the blob
  // drawn inside its rectangle.
  function surfaceAt(x, y) {
    const list = S.level.surfaces;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      if (s.pts) {
        const r = s.width / 2;
        for (let k = 0; k < s.pts.length - 1; k++) {
          const [x0, y0] = s.pts[k], [x1, y1] = s.pts[k + 1];
          const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
          const t = clamp(((x - x0) * dx + (y - y0) * dy) / l2, 0, 1);
          if (Math.hypot(x - x0 - dx * t, y - y0 - dy * t) <= r) return s.k;
        }
      } else if (s.rad != null) {
        if (Math.hypot(x - s.x, y - s.y) <= s.rad) return s.k;
      } else if (s.poly) {
        let inside = false;
        for (let a = 0, b = s.poly.length - 1; a < s.poly.length; b = a++) {
          const [xa, ya] = s.poly[a], [xb, yb] = s.poly[b];
          if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
        }
        if (inside) return s.k;
      } else if (s.k === "mud") {
        const ex = (x - (s.x0 + s.x1) / 2) / ((s.x1 - s.x0) / 2), ey = (y - (s.y0 + s.y1) / 2) / ((s.y1 - s.y0) / 2);
        if (ex * ex + ey * ey <= 0.8) return s.k;
      } else if (x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1) return s.k;
    }
    return S.level.base;
  }

  // Props that sit loose on the ground (hay bales): pushed about by the rig,
  // slowed by ground friction, and a knock counts as a bump.
  const MOVABLE = new Set(["hay"]);
  function createMovable(def) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(def.x, def.y));
    b.shapes.add(new Circle(def.r, undefined, MAT_HAY));
    b.cbTypes.add(cbThing);
    b.space = space;
    b.userData._movable = def;
    return { body: b, def };
  }

  function createCone(c) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(c.x, c.y));
    b.shapes.add(new Circle(3.3, undefined, MAT_CONE));
    b.cbTypes.add(cbCone);
    b.space = space;
    const rec = { body: b, down: false, hit: false, tip: 0, tipA: 0 };
    b.userData._cone = rec;
    return rec;
  }

  function makeWheel(parent, lx, ly, r, w, opts) {
    const p = parent.position, a = parent.rotation;
    const wp = localToWorld(p.x, p.y, a, lx, ly);
    const b = new Body(BodyType.DYNAMIC, new Vec2(wp.x, wp.y));
    b.rotation = a;
    b.shapes.add(new Polygon(Polygon.box(r * 2, w), MAT_WHEEL, FILTER_GHOST()));
    b.space = space;
    const rec = { body: b, lx, ly, r, w, front: !!opts.front, side: Math.sign(ly), spin: 0, steer: 0, fLong: 0, fLat: 0, skid: 0, vLong: 0, joint: null };
    if (opts.front) {
      const pj = new PivotJoint(parent, b, new Vec2(lx, ly), new Vec2(0, 0));
      pj.ignore = true;
      pj.space = space;
      const aj = new AngleJoint(parent, b, 0, 0);
      aj.ignore = true;
      aj.space = space;
      rec.joint = aj;
    } else {
      const wj = new WeldJoint(parent, b, new Vec2(lx, ly), new Vec2(0, 0));
      wj.ignore = true;
      wj.space = space;
    }
    return rec;
  }

  function createVehicle(start, vehicleKey, trailerKey) {
    const spec = VEHICLES[vehicleKey];
    const c = new Body(BodyType.DYNAMIC, new Vec2(start.x, start.y));
    c.rotation = start.a;
    c.shapes.add(new Polygon(toVecs(carOutline(spec.len, spec.wid, vehicleKey === "truck" ? 0.18 : 0.32)), new Material(0.12, 0.6, 0.8, spec.density, 0.001)));
    c.cbTypes.add(cbVeh);
    c.space = space;
    c.userData._veh = true;
    const ax = spec.wheelbase / 2 * M, ty = spec.track / 2 * M;
    const r = spec.wheelR * M, w = spec.wheelW * M;
    const wheels = [
      makeWheel(c, ax, -ty, r, w, { front: true }),
      makeWheel(c, ax, ty, r, w, { front: true }),
      makeWheel(c, -ax, -ty, r, w, {}),
      makeWheel(c, -ax, ty, r, w, {}),
    ];

    // Trailer, straight behind the tow point.
    const t = TRAILERS[trailerKey];
    const hitchX = spec.hitchX * M;
    const couplerX = (t.len / 2 + t.bar) * M;
    const hp = localToWorld(start.x, start.y, start.a, hitchX, 0);
    const tp = localToWorld(hp.x, hp.y, start.a, -couplerX, 0);
    const tb = new Body(BodyType.DYNAMIC, new Vec2(tp.x, tp.y));
    tb.rotation = start.a;
    const tmat = new Material(0.12, 0.6, 0.8, t.density, 0.001);
    tb.shapes.add(new Polygon(toVecs(carOutline(t.len, t.wid, trailerKey === "caravan" ? 0.35 : 0.08)), tmat));
    const bx = t.len / 2 * M;
    if (t.bar > 0) tb.shapes.add(new Polygon([new Vec2(bx - 1, -t.wid * 0.28 * M), new Vec2(couplerX, -1.2), new Vec2(couplerX, 1.2), new Vec2(bx - 1, t.wid * 0.28 * M)], tmat));
    const wOut = t.wid / 2 + t.wheelOut;
    if (t.wheelOut > 0) {
      // Fenders stick out past the bed: they are part of what can hit things.
      tb.shapes.add(new Polygon(Polygon.rect(t.axle * M - t.wheelR * 1.25 * M, -(wOut + t.wheelW / 2 + 0.04) * M, t.wheelR * 2.5 * M, (wOut + t.wheelW / 2 + 0.04) * 2 * M), tmat));
    }
    tb.cbTypes.add(cbVeh);
    tb.space = space;
    tb.userData._veh = true;
    const twheels = [
      makeWheel(tb, t.axle * M, -wOut * M, t.wheelR * M, t.wheelW * M, {}),
      makeWheel(tb, t.axle * M, wOut * M, t.wheelR * M, t.wheelW * M, {}),
    ];
    // The hitch joint also switches off contacts between the two bodies —
    // a semi-trailer's nose overhangs the tractor.
    const hj = new PivotJoint(c, tb, new Vec2(hitchX, 0), new Vec2(couplerX, 0));
    hj.ignore = true;
    hj.space = space;
    const lim = new AngleJoint(c, tb, -spec.hitchLimit, spec.hitchLimit);
    lim.ignore = true;
    lim.space = space;

    const massOf = (b, ws) => b.mass + ws.reduce((s, q) => s + q.body.mass, 0);
    return {
      key: vehicleKey, spec,
      chassis: c, wheels,
      carMass: massOf(c, wheels),
      trailer: { body: tb, spec: t, key: trailerKey, wheels: twheels, couplerX, mass: massOf(tb, twheels) },
      hitchX,
      steer: 0, gear: 1, throttle: 0, braking: false, holding: true, speed: 0,
      dent: 0, skid: 0,
    };
  }

  function installListeners() {
    cbVeh = new CbType();
    cbThing = new CbType();
    cbCone = new CbType();
    const pair = (cb) => {
      const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
      const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
      return b1?.userData?._veh ? [b1, b2] : [b2, b1];
    };
    const contactPoint = (cb, fallback) => {
      try {
        const arb = cb.arbiters.at(0)?.collisionArbiter;
        const ct = arb?.contacts.at(0);
        if (ct) return { x: ct.position.x, y: ct.position.y };
      } catch { /* no contact data */ }
      return fallback;
    };
    space.listeners.add(new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, cbVeh, cbThing, (cb) => {
      const [vb, ob] = pair(cb);
      if (!vb || !ob) return;
      const pv = vb.userData._pv ?? { x: 0, y: 0 };
      const po = ob.userData._pv ?? { x: 0, y: 0 };
      const rel = Math.hypot(pv.x - po.x, pv.y - po.y);
      const pt = contactPoint(cb, { x: (vb.position.x + ob.position.x) / 2, y: (vb.position.y + ob.position.y) / 2 });
      registerBump(ob, rel, pt);
    }));
    space.listeners.add(new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, cbVeh, cbCone, (cb) => {
      const [vb, ob] = pair(cb);
      const rec = ob?.userData?._cone;
      if (!rec) return;
      const pv = vb.userData._pv ?? { x: 0, y: 0 };
      const rel = Math.hypot(pv.x, pv.y);
      if (!rec.hit && rel > 3 && S.scoring) {
        rec.hit = true;
        S.coneHits++;
        onEvent("cone", { x: ob.position.x, y: ob.position.y, speed: rel });
      }
      if (rel > 14) { rec.down = true; rec.tipA = Math.atan2(pv.y, pv.x); }
    }));
  }

  function registerBump(ob, rel, pt) {
    if (!S.scoring || rel < BUMP_SPEED) return;
    const now = S.time;
    const last = cooldown.get(ob) ?? -99;
    cooldown.set(ob, now);
    if (now - last < BUMP_COOLDOWN) return;
    const crash = rel > CRASH_SPEED;
    if (crash) S.crashes++; else S.hits++;
    const pk = ob.userData._parked;
    if (pk) { pk.hazard = HAZARD_TIME; pk.shoved++; }
    if (S.veh) S.veh.dent = 1;
    onEvent(crash ? "crash" : "bump", { x: pt.x, y: pt.y, speed: rel, parked: !!pk });
  }

  function load(level) {
    S.level = level;
    S.gen++;
    space.clear();
    installListeners();
    S.parked = [];
    S.cones = [];
    S.movables = [];
    S.statics = [];
    cooldown = new Map();
    boundaryWalls(level.w, level.h, level.walls ?? "nsew");
    for (const s of level.statics) {
      if (MOVABLE.has(s.kind)) S.movables.push(createMovable(s));
      else staticBody(s);
    }
    for (const p of level.parked) S.parked.push(createParked(p));
    for (const c of level.cones) S.cones.push(createCone(c));
    S.veh = createVehicle(level.start, level.vehicle ?? "car", level.trailer);
    S.hits = 0; S.crashes = 0; S.coneHits = 0;
    S.time = 0;
    S.scoring = false;
    S.park = evalParking();
  }

  // ── Vehicle dynamics ───────────────────────────────────────────────────
  // One tyre: grip against sideways slip, drive / braking / rolling losses
  // along the wheel, all inside one friction circle. Applied to the wheel
  // body itself — the joints carry it into the chassis.
  // Ground effects: mud drags hard and grips badly, sand drags a little,
  // snow is slippery. { drag: m/s², grip: × mu, power: × drive }
  const GROUND = {
    mud: { drag: 1.4, grip: 0.65, power: 0.8 },
    sand: { drag: 1.0, grip: 0.85, power: 0.85 },
    snow: { drag: 0.2, grip: 0.7, power: 0.9 },
  };
  const LOOSE = new Set(["grass", "gravel", "dirt", "mud", "sand", "snow"]);

  function tyre(spec, w, share, drive, brake, engineBrake) {
    const b = w.body;
    w.surf = surfaceAt(b.position.x, b.position.y);
    const gnd = GROUND[w.surf];
    const a = b.rotation, c = Math.cos(a), s = Math.sin(a);
    const vx = b.velocity.x, vy = b.velocity.y;
    const vLong = vx * c + vy * s;
    const vLat = -vx * s + vy * c;
    let jLat = -vLat * share * 0.85;
    let jLong;
    if (drive !== 0) {
      jLong = drive * DT * (gnd ? gnd.power : 1);
      if (gnd?.drag) jLong -= Math.sign(vLong) * Math.min(Math.abs(vLong) * share, gnd.drag * M * share * DT);
    } else {
      let dec = spec.roll * M + (engineBrake ? spec.engineBrake * M : 0);
      if (brake) dec = spec.brake * M;
      if (gnd?.drag) dec += gnd.drag * M;
      const kill = Math.min(Math.abs(vLong) * share, dec * share * DT);
      jLong = -Math.sign(vLong) * kill;
    }
    const cap = spec.mu * (gnd ? gnd.grip : 1) * share * G * DT;
    const mag = Math.hypot(jLat, jLong);
    w.skid = 0;
    if (mag > cap) {
      const k = cap / mag;
      jLat *= k; jLong *= k;
      w.skid = Math.min(1, (mag - cap) / cap);
    }
    b.applyImpulse(new Vec2(c * jLong - s * jLat, s * jLong + c * jLat));
    w.fLong = jLong / DT;
    w.fLat = jLat / DT;
    w.spin += vLong * DT / w.r;
    w.vLong = vLong;
    // A real slide: over the grip limit AND moving (a slow full-lock
    // scrub while parking is not a skid).
    const moving = Math.hypot(vx, vy);
    w.sliding = moving > 18 ? clamp(w.skid * 1.6, 0, 1) * clamp((moving - 18) / 30, 0, 1) : 0;
    w.loose = LOOSE.has(w.surf);
  }

  function driveVehicle(input) {
    const v = S.veh, spec = v.spec;
    const c = v.chassis;
    const a = c.rotation, fx = Math.cos(a), fy = Math.sin(a);
    const speed = c.velocity.x * fx + c.velocity.y * fy;
    v.speed = speed;

    // Steering rack: rate-limited, self-centring when you let go.
    const target = input.steer * spec.maxSteer;
    v.steer = input.steer !== 0
      ? approach(v.steer, target, spec.steerRate * DT)
      : approach(v.steer, 0, spec.steerReturn * DT);
    for (const w of v.wheels) {
      if (!w.front) continue;
      const ang = ackermann(v.steer, w.side, spec);
      w.steer = ang;
      w.joint.jointMin = ang;
      w.joint.jointMax = ang;
    }

    // Gearbox: ↑ drives forward (brakes first if rolling back), ↓ reverses.
    let dir = 0, brake = !!input.brake;
    if (!brake) {
      if (input.throttle > 0) { if (speed < -5) brake = true; else { dir = 1; v.gear = 1; } }
      else if (input.throttle < 0) { if (speed > 5) brake = true; else { dir = -1; v.gear = -1; } }
    }
    const hold = dir === 0 && !brake && Math.abs(speed) < 3;
    v.braking = brake;
    v.holding = hold;
    v.throttle = dir * Math.abs(input.throttle);

    const vmax = (dir > 0 ? spec.vmaxF : spec.vmaxR) * M;
    const ratio = clamp(Math.abs(speed) / vmax, 0, 1);
    const curve = dir !== 0 && Math.sign(speed) === dir ? Math.max(0, 1 - ratio * ratio) : 1;
    // A towing car pulls with its front wheels, a tractor unit pushes with
    // its rear axle.
    const driveF = dir * Math.abs(input.throttle) * spec.drive * M * v.carMass * curve;
    const share = v.carMass / 4;
    let skid = 0;
    v.skidLoose = false;
    for (const w of v.wheels) {
      const driven = spec.driveRear ? !w.front : w.front;
      tyre(spec, w, share, driven ? driveF / 2 : 0, brake || hold, driven && dir === 0);
      if (w.sliding > skid) { skid = w.sliding; v.skidLoose = w.loose; }
    }
    const t = v.trailer;
    const tshare = t.mass / 2 * 0.9;
    for (const w of t.wheels) {
      tyre(spec, w, tshare, 0, hold && Math.abs(speed) < 1.5, false);
      if (w.sliding > skid) { skid = w.sliding; v.skidLoose = w.loose; }
    }
    v.skid = skid;
  }

  function parkedFriction() {
    const dv = PARKED_MU * G * DT;
    for (const p of S.parked) {
      const b = p.body;
      const vx = b.velocity.x, vy = b.velocity.y;
      const sp = Math.hypot(vx, vy);
      if (sp > 0) {
        const k = sp <= dv ? 0 : (sp - dv) / sp;
        b.velocity.setxy(vx * k, vy * k);
      }
      const dw = dv / (p.spec.len * M * 0.3);
      b.angularVel = approach(b.angularVel, 0, dw);
      if (p.hazard > 0) p.hazard = Math.max(0, p.hazard - DT);
    }
    // Hay drags on the ground about like a parked car.
    for (const m of S.movables) {
      const b = m.body;
      const vx = b.velocity.x, vy = b.velocity.y;
      const sp = Math.hypot(vx, vy);
      if (sp > 0) {
        const k = sp <= dv * 0.8 ? 0 : (sp - dv * 0.8) / sp;
        b.velocity.setxy(vx * k, vy * k);
      }
      b.angularVel *= 0.9;
    }
    const cv = CONE_MU * G * DT;
    for (const c of S.cones) {
      const b = c.body;
      const vx = b.velocity.x, vy = b.velocity.y;
      const sp = Math.hypot(vx, vy);
      if (sp > 0) {
        const k = sp <= cv ? 0 : (sp - cv) / sp;
        b.velocity.setxy(vx * k, vy * k);
      }
      b.angularVel *= 0.9;
      if (c.down) c.tip = Math.min(1, c.tip + DT * 6);
    }
  }

  // ── Parking check ──────────────────────────────────────────────────────
  function trailerCorners() {
    const t = S.veh.trailer, b = t.body;
    const l = t.spec.len / 2 * M, w = t.spec.wid / 2 * M;
    const p = b.position, a = b.rotation;
    return [[l, -w], [l, w], [-l, w], [-l, -w]].map(([x, y]) => localToWorld(p.x, p.y, a, x, y));
  }

  function evalParking() {
    const bay = S.level.bay;
    const tb = S.veh.trailer.body;
    const corners = trailerCorners();
    const ca = Math.cos(-bay.a), sa = Math.sin(-bay.a);
    let inside = true, maxOut = 0;
    for (const q of corners) {
      const dx = q.x - bay.x, dy = q.y - bay.y;
      const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
      const ox = Math.abs(lx) - bay.l / 2, oy = Math.abs(ly) - bay.w / 2;
      const o = Math.max(ox, oy);
      // 1.5 px of slack: backing onto a wall pushes the tail a hair into it.
      if (o > 1.5) inside = false;
      maxOut = Math.max(maxOut, o);
    }
    let angErr = Math.abs(wrapPi(tb.rotation - bay.a));
    if (bay.both) angErr = Math.min(angErr, Math.abs(wrapPi(tb.rotation - bay.a - Math.PI)));
    const aligned = angErr < PARK_ANGLE;
    const tsp = Math.hypot(tb.velocity.x, tb.velocity.y);
    const csp = Math.hypot(S.veh.chassis.velocity.x, S.veh.chassis.velocity.y);
    const stopped = tsp < PARK_SPEED && csp < PARK_SPEED;
    // Accuracy: how centred and how square.
    const dx = tb.position.x - bay.x, dy = tb.position.y - bay.y;
    const lat = Math.abs(dx * sa + dy * ca);
    const room = Math.max(1, bay.w / 2 - S.veh.trailer.spec.wid / 2 * M);
    const acc = clamp(100 - (lat / room) * 45 - (angErr / PARK_ANGLE) * 55, 0, 100);
    const near = Math.hypot(dx, dy) < bay.l * 1.4 + 20;
    return { inside, aligned, stopped, acc, angErr, maxOut, near, corners };
  }

  // Distance (px) from the trailer's tail to the nearest obstacle behind
  // it — drives the parking-sensor beeper.
  function rearClearance() {
    const t = S.veh.trailer, b = t.body;
    const a = b.rotation, c = Math.cos(a), s = Math.sin(a);
    const back = t.spec.len / 2 * M;
    const rx = b.position.x - c * back, ry = b.position.y - s * back;
    let best = Infinity;
    const test = (body) => {
      const bb = body.bounds;
      const dx = Math.max(bb.min.x - rx, 0, rx - bb.max.x);
      const dy = Math.max(bb.min.y - ry, 0, ry - bb.max.y);
      // Only things behind the tail count.
      const cx = (bb.min.x + bb.max.x) / 2 - rx, cy = (bb.min.y + bb.max.y) / 2 - ry;
      if (cx * -c + cy * -s < -6) return;
      const d = Math.hypot(dx, dy);
      if (d < best) best = d;
    };
    for (const p of S.parked) test(p.body);
    for (const st of S.statics) test(st.body);
    return best;
  }

  // One fixed physics step. `input` = { throttle, steer, brake }.
  function step(input) {
    const v = S.veh;
    // Pre-step velocities for bump strength (BEGIN fires after the solver).
    for (const b of [v.chassis, v.trailer.body]) b.userData._pv = { x: b.velocity.x, y: b.velocity.y };
    for (const p of S.parked) p.body.userData._pv = { x: p.body.velocity.x, y: p.body.velocity.y };
    driveVehicle(input);
    parkedFriction();
    space.step(DT, 10, 4);
    S.time += DT;
    if (v.dent) v.dent = Math.max(0, v.dent - DT * 2);
    S.park = evalParking();
    return S.park;
  }

  // Predicted path of the trailer axle for the current steering (kinematic
  // car + trailer model, integrated a few seconds ahead in the current gear).
  function predictPath(n = 26, dt = 0.12) {
    const v = S.veh;
    if (!v) return [];
    const c = v.chassis, t = v.trailer;
    const L = v.spec.wheelbase * M;
    const b = -v.hitchX - v.spec.wheelbase / 2 * M;     // rear axle → hitch (negative: ahead of it)
    const d = t.couplerX - t.spec.axle * M;             // hitch → trailer axle
    let th = c.rotation, ph = t.body.rotation;
    let x = c.position.x - Math.cos(th) * L / 2, y = c.position.y - Math.sin(th) * L / 2;
    const dir = v.gear;
    const sp = dir * Math.max(18, Math.abs(v.speed));
    const tanD = Math.tan(v.steer);
    const out = [];
    for (let i = 0; i < n; i++) {
      const w = sp / L * tanD;
      const rel = th - ph;
      const dph = (sp / d) * Math.sin(rel) - (b * w / d) * Math.cos(rel);
      x += Math.cos(th) * sp * dt;
      y += Math.sin(th) * sp * dt;
      th += w * dt;
      ph += dph * dt;
      const hx = x - Math.cos(th) * b, hy = y - Math.sin(th) * b;
      // Axle position, and the trailer's tail (what the guide dots follow).
      const ax = hx - Math.cos(ph) * d, ay = hy - Math.sin(ph) * d;
      const back = t.spec.len / 2 * M + t.spec.axle * M;
      out.push({ x: ax, y: ay, a: ph, rx: ax - Math.cos(ph) * back, ry: ay - Math.sin(ph) * back });
    }
    return out;
  }

  const hitchAngle = () => wrapPi(S.veh.chassis.rotation - S.veh.trailer.body.rotation);

  return Object.assign(S, { load, step, predictPath, rearClearance, hitchAngle });
}
