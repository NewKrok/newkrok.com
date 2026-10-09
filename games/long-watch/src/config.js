// ── Units and tuning ─────────────────────────────────────────────────────
// Metres and seconds, +y up. The sim runs at a fixed step; the renderer
// interpolates between the last two steps.

export const DT = 1 / 60;

export const PLAYER = {
  radius: 0.36,
  height: 1.8,
  crouchHeight: 1.15,
  walk: 4.4,           // normal pace
  run: 7.4,            // sprinting
  crouch: 2.3,         // sneaking
  aimMul: 0.62,        // pace while aiming down the sights
  coverMul: 0.55,      // sliding along a wall
  accel: 60,
  airAccel: 14,
  friction: 12,
  jump: 7.4,
  gravity: 20,
  fallGravity: 27,
  maxFall: 34,
  step: 0.5,
  coyote: 0.12,
  buffer: 0.14,
  dash: 15,            // dash speed
  dashTime: 0.17,
  dashCool: 0.75,
  hp: 100,
  shield: 60,          // recharges after a few calm seconds
  shieldDelay: 4,
  shieldRate: 22,
  bleedOut: 22,        // seconds downed before the mission falls back to a checkpoint
  revive: 2.6,         // seconds the ally needs to get you up
};

// How far a sound carries (metres). The bugs are almost blind: they hear
// and feel the ground. Crouching and cover keep you quiet.
export const NOISE = {
  crouch: 1.6,
  walk: 6,
  run: 15,
  dash: 11,
  land: 9,
  coverMul: 0.5,
};

export const CAMERA = {
  dist: 3.6,
  aimDist: 2.0,
  height: 1.55,
  crouchHeight: 1.05,
  side: 0.72,          // over the right shoulder (mirrored when swapped)
  aimSide: 0.95,       // further out and a touch higher when aiming, so the gun shows under the pauldron
  aimRaise: 0.08,
  fov: 66,
  aimFov: 46,
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
export const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
export const dampAngle = (a, b, k, dt) => a + angDiff(a, b) * (1 - Math.exp(-k * dt));
