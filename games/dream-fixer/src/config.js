// ── Units and tuning ─────────────────────────────────────────────────────
// Metres and seconds, +y up. The sim runs at a fixed step; the renderer
// interpolates between the last two steps.

export const DT = 1 / 60;

export const PLAYER = {
  radius: 0.34,
  height: 1.72,
  eye: 1.58,
  speed: 6.4,          // run speed on the ground
  accel: 70,           // how fast it gets there
  airAccel: 16,
  friction: 14,        // stopping when no key is held
  jump: 7.2,           // take-off speed
  gravity: 21,
  fallGravity: 27,     // heavier on the way down: jumps feel less floaty
  maxFall: 32,
  step: 0.45,          // highest ledge walked up without jumping
  coyote: 0.12,        // a jump still counts this long after leaving a ledge
  buffer: 0.14,        // …and this long before landing
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
