// ── Hitch & Park — shared constants ──────────────────────────────────────
// World units are pixels of the 900 × 500 site (12 px per metre). The 3D
// scene uses the same units: world (x, y) → three (x, −y, z) with z up.

export const DT = 1 / 60;
export const VIEW_W = 900;
export const VIEW_H = 500;
export const M = 12;                   // pixels per metre
export const G = 9.81 * M;             // gravity in px/s² (tyre normal loads)

// ── Vehicles ─────────────────────────────────────────────────────────────
// Lengths in metres; converted with M when a body is built. `hitchX` is the
// tow point from the body centre (negative = behind it).
export const VEHICLES = {
  car: {
    name: "Estate car",
    len: 4.4, wid: 1.8, h: 1.48, wheelbase: 2.62, track: 1.64,
    wheelR: 0.33, wheelW: 0.24,
    hitch: 0.42,                  // tow ball behind the rear bumper
    hitchX: -(4.4 / 2 + 0.42),
    maxSteer: 0.62,               // rad at the "centre" wheel
    steerRate: 1.9,               // rad/s at the steering rack
    steerReturn: 1.1,             // rad/s self-centring with no input
    drive: 4.2,                   // m/s² at standstill
    driveRear: false,             // front-wheel drive
    vmaxF: 9.0, vmaxR: 4.2,       // m/s
    brake: 7.5,                   // m/s² per braked wheel
    roll: 0.35, engineBrake: 1.4, // m/s² coasting losses
    mu: 1.0,                      // tyre grip coefficient
    density: 1,
    hitchLimit: 1.32,             // rad either way before the drawbar hits the bumper
    hitchWarn: 0.9,
  },
  truck: {
    name: "Tractor unit",
    len: 6.2, wid: 2.5, h: 3.4, wheelbase: 3.8, track: 2.05,
    wheelR: 0.52, wheelW: 0.36,
    hitch: -2.75,                 // fifth wheel sits over the rear axle
    hitchX: -3.8 / 2 + 0.35,      // just ahead of the rear axle
    maxSteer: 0.62,
    steerRate: 1.25,
    steerReturn: 0.8,
    drive: 3.4,
    driveRear: true,
    vmaxF: 7.0, vmaxR: 3.2,
    brake: 5.5,
    roll: 0.3, engineBrake: 1.0,
    mu: 1.0,
    density: 1.1,
    hitchLimit: 1.5,              // a semi can fold to almost a right angle
    hitchWarn: 1.1,
  },
};
export const CAR = VEHICLES.car;

// Trailers: `len`/`wid` is the load bed (the collision box, and what has to
// fit in the bay); `bar` is the drawbar from the bed to the coupler (negative
// for a semi-trailer, whose kingpin sits under the bed); `axle` is the axle
// position from the bed centre (negative = behind it).
export const TRAILERS = {
  box:     { name: "Box trailer", len: 2.7, wid: 1.62, bar: 1.35, axle: -0.12, wheelR: 0.28, wheelW: 0.2, wheelOut: 0.14, density: 0.75 },
  boat:    { name: "Boat trailer", len: 4.9, wid: 1.9, bar: 1.15, axle: -0.55, wheelR: 0.3, wheelW: 0.2, wheelOut: 0.12, density: 0.45 },
  caravan: { name: "Caravan", len: 5.3, wid: 2.24, bar: 1.2, axle: -0.2, wheelR: 0.32, wheelW: 0.22, wheelOut: -0.12, density: 0.4 },
  semi:    { name: "Semi-trailer", len: 13.6, wid: 2.5, bar: -1.2, axle: -5.0, wheelR: 0.5, wheelW: 0.36, wheelOut: -0.3, density: 0.45, axles: 3 },
};
export const HITCH_LIMIT = CAR.hitchLimit;
export const HITCH_WARN = CAR.hitchWarn;

// Parked-car body styles (top-down proportions along the length, measured
// from the front: windscreen foot, roof front, roof back, rear-glass foot).
export const CAR_TYPES = {
  hatch:  { len: 4.0, wid: 1.76, h: 1.46, ws: 0.2,  rf: 0.35, rb: 0.8,  rg: 0.92, hood: 0.72 },
  sedan:  { len: 4.65, wid: 1.8, h: 1.44, ws: 0.24, rf: 0.38, rb: 0.66, rg: 0.8,  hood: 0.7 },
  wagon:  { len: 4.4, wid: 1.8,  h: 1.48, ws: 0.23, rf: 0.37, rb: 0.88, rg: 0.95, hood: 0.7 },
  suv:    { len: 4.7, wid: 1.95, h: 1.72, ws: 0.2,  rf: 0.32, rb: 0.88, rg: 0.95, hood: 0.78 },
  van:    { len: 5.0, wid: 2.0,  h: 2.0,  ws: 0.08, rf: 0.2,  rb: 0.97, rg: 0.99, hood: 0.62 },
  pickup: { len: 5.3, wid: 1.98, h: 1.8,  ws: 0.22, rf: 0.33, rb: 0.52, rg: 0.55, hood: 0.8, bed: true },
  // A rigid lorry: cab plus a box body.
  lorry:  { len: 8.5, wid: 2.5,  h: 3.4,  ws: 0.03, rf: 0.06, rb: 0.24, rg: 0.26, hood: 0.1, lorry: true },
};
export const PARKED_COLORS = [0x3d6fb6, 0xe8e8e4, 0x2b2d31, 0xb8bcc2, 0x8a1f24, 0x2f6b4a, 0xd9a13a, 0x5b4a8a, 0x1f3a5a, 0x9aa3ab, 0x6b3b2a, 0xf2f0e6];
export const PLAYER_COLOR = 0xd9342b;

// ── Match ────────────────────────────────────────────────────────────────
export const PARK_HOLD = 1.1;          // seconds stopped inside the bay to count
export const PARK_ANGLE = 0.2;         // rad heading tolerance
export const PARK_SPEED = 4;           // px/s — "stopped"
export const BUMP_SPEED = 9;           // px/s relative — slower touches are free
export const CRASH_SPEED = 45;         // px/s relative — a bump above this is a crash
export const BUMP_COOLDOWN = 0.7;      // s per obstacle
export const HAZARD_TIME = 4.5;        // s of hazard lights on a shoved car
export const PARKED_MU = 0.55;         // handbrake grip of a parked car
export const CONE_MU = 0.35;

export const SCORE = { base: 500, perSecond: 10, accuracy: 3, bump: 60, crash: 150, cone: 25 };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
export const wrapPi = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };

// Deterministic pseudo-random (same lot every time).
export function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function localToWorld(x, y, a, lx, ly) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x + lx * c - ly * s, y: y + lx * s + ly * c };
}

export const fmtTime = (t) => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
};
export const fmtPar = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;
