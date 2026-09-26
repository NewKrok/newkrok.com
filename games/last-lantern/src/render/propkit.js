import { GEO, tiltTo } from "./batch.js";

// Placement helpers shared by the stage prop builders. World (x, y) px →
// three (x, −y, z); `local` offsets in an obstacle's own rotated frame.
export const at = (o, z = 0) => [o.x, -o.y, z];
export function local(o, lx, ly, lz) {
  const a = -(o.rot || 0);
  return [o.x + lx * Math.cos(a) - ly * Math.sin(a), -o.y + lx * Math.sin(a) + ly * Math.cos(a), lz];
}
// A tapered limb from `base` along `dir`; returns its tip, so limbs chain.
export function limb(b, base, dir, L, r0, color, geo = GEO.taper) {
  const q = tiltTo(dir[0], dir[1], dir[2]);
  b.add(geo, base, q, [r0, r0, L], color);
  const d = Math.hypot(dir[0], dir[1], dir[2]);
  return [base[0] + dir[0] / d * L, base[1] + dir[1] / d * L, base[2] + dir[2] / d * L];
}
// A light source the stage's point-light pool may pick up.
export function light(env, x, y, z, color, i, flicker = true, d = 420) { env.sources.push({ x, y, z, color, i, flicker, ph: Math.random() * 6, d }); }
// Vary a colour a little (per stone, per plank).
export function vary(hex, rnd, k = 0.12) {
  const f = 1 + (rnd() - 0.5) * 2 * k;
  const r = Math.min(255, ((hex >> 16) & 255) * f), g = Math.min(255, ((hex >> 8) & 255) * f), b = Math.min(255, (hex & 255) * f);
  return (r << 16) | (g << 8) | b;
}
export function mix(a, b, t) {
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
