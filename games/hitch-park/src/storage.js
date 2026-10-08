// ── Progress and settings ────────────────────────────────────────────────
// Stored in localStorage, guarded for private mode / blocked storage (the
// game still runs, it just forgets).

const KEY_PROGRESS = "hitch-park.progress.v3";
const KEY_SETTINGS = "hitch-park.settings.v1";

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

export const DEFAULT_SETTINGS = {
  master: 0.8, sfx: 0.9, music: 0.5,
  guide: true, rearCam: true, camMode: 0, quality: "high",
  autoCentre: "always",        // keyboard steering centres itself: always | forward (not in reverse) | never
  pointer: "full",             // mouse / touch drag: full (drive + steer) | steer (steering only)
  mouseLook: false,            // the camera turns with the mouse's position across the screen
  ghost: "best",               // ghost rig to drive against: off | best (own best run) | record
};

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(read(KEY_SETTINGS) ?? {}) };
}
export function saveSettings(s) { write(KEY_SETTINGS, s); }

// Saved by level id, so new levels can slot into a chapter without
// shifting anyone's results; in memory best[i] follows the level order.
// v2 saved a plain array in the order of the first thirty levels.
const KEY_PROGRESS_V2 = "hitch-park.progress.v2";
const V2_ORDER = [
  "garden", "barn", "fuel", "lake", "village", "docks", "school", "terminal", "retail", "club",
  "lane", "ferry", "oldtown", "timber", "beach", "site", "dealer", "services", "river", "hangar",
  "mountain", "harbour", "market", "farm", "festival", "dc", "truckstop", "port", "delivery", "ferrydeck",
];

let order = [];
export function loadProgress(levels) {
  order = levels.map((l) => l.id);
  let byId = read(KEY_PROGRESS)?.best;
  if (!byId || typeof byId !== "object" || Array.isArray(byId)) {
    byId = {};
    const old = read(KEY_PROGRESS_V2)?.best;
    if (Array.isArray(old)) old.forEach((b, i) => { if (b && V2_ORDER[i]) byId[V2_ORDER[i]] = b; });
  }
  return { best: order.map((id) => byId[id] ?? null) };
}
export function saveProgress(p) {
  const best = {};
  p.best.forEach((b, i) => { if (b && order[i]) best[order[i]] = b; });
  write(KEY_PROGRESS, { best });
}

export function recordResult(progress, index, { stars, score, time }) {
  const prev = progress.best[index];
  const isBest = !prev || score > prev.score;
  progress.best[index] = {
    stars: Math.max(stars, prev?.stars ?? 0),
    score: Math.max(score, prev?.score ?? 0),
    time: Math.min(time, prev?.time ?? Infinity),
  };
  saveProgress(progress);
  return { isBest, first: !prev };
}

// A level is open when it is the first one, already parked, or the one
// before it is parked (a level added mid-way doesn't lock the ones after it).
export const isUnlocked = (progress, i) => i === 0 || !!progress.best[i] || !!progress.best[i - 1];
export const totalStars = (progress) => progress.best.reduce((s, b) => s + (b?.stars ?? 0), 0);
export function firstUnfinished(progress, count) {
  for (let i = 0; i < count; i++) if (!progress.best[i]) return i;
  return count - 1;
}

// The replay of the best run per level, for the "my best" ghost. Kept with
// the level's fingerprint: a reworked level drops its old ghost.
const KEY_GHOSTS = "hitch-park.ghosts.v1";
export function loadGhost(levelId, fp) {
  const g = read(KEY_GHOSTS)?.[levelId];
  return g && g.fp === fp && typeof g.replay === "string" ? g : null;
}
export function saveGhost(levelId, ghost) {
  const all = read(KEY_GHOSTS) ?? {};
  all[levelId] = ghost;
  write(KEY_GHOSTS, all);
}
