// ── Units, tuning and small helpers ──────────────────────────────────────
// World units are pixels of the top-down arena (a hero is 14 px across the
// middle). The sim runs at a fixed 60 Hz step; the renderer reads from it.

export const DT = 1 / 60;
export const FPS = 60;

export const HERO_R = 14;
export const MAX_MON = 400;          // alive-monster cap (performance budget)
export const RECYCLE_DIST = 1150;    // strays further than this come back round
export const SPAWN_MIN = 560;
export const SPAWN_MAX = 660;
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;
export const MAX_WLEVEL = 7;
export const MAX_PLEVEL = 5;

// ── Collision filtering ──────────────────────────────────────────────────
// Collision bits decide who shoves whom; sensor bits decide who may be hit.
// Hero shots only name monsters in their sensor mask, monster spit only the
// hero, so friendly fire is impossible by construction.
export const G_HERO = 1 << 1;
export const G_MON = 1 << 2;
export const G_SOLID = 1 << 3;
export const G_SHOT = 1 << 4;
export const G_SPIT = 1 << 5;
export const G_ORB = 1 << 6;
export const G_PROP = 1 << 7;         // loose crates, barrels, pews
export const G_THROWN = 1 << 8;       // a monster hurled by the grave hook
export const G_CENSER = 1 << 9;       // the swinging censer
export const S_HERO = 1 << 10;
export const S_MON = 1 << 11;
export const S_SPIT = 1 << 12;
export const S_SHOT = 1 << 13;
export const S_ORB = 1 << 14;
export const S_PROP = 1 << 15;

// ── Helpers ──────────────────────────────────────────────────────────────
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const hyp = (dx, dy) => Math.hypot(dx, dy) || 1e-6;
export const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Seeded generator (mulberry32). The sim draws every random number from one
// of these, so a run can be replayed headless with the same seed.
export function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fmtTime(frames) {
  const s = Math.max(0, Math.floor(frames / FPS));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export const fmtSec = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
export const cssHex = (c) => parseInt(c.slice(1, 7), 16);
export const hexCss = (h) => `#${h.toString(16).padStart(6, "0")}`;

// XP needed for the next level.
export const xpFor = (level) => Math.floor(5 + level * 4 + level * level * 0.45);
