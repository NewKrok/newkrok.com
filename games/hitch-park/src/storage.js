// ── Progress and settings ────────────────────────────────────────────────
// Stored in localStorage, guarded for private mode / blocked storage (the
// game still runs, it just forgets).

const KEY_PROGRESS = "hitch-park.progress.v2";
const KEY_SETTINGS = "hitch-park.settings.v1";

const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* private mode */ }
};

export const DEFAULT_SETTINGS = {
  master: 0.8, sfx: 0.9, music: 0.5,
  guide: true, rearCam: true, camMode: 0, quality: "high",
};

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(read(KEY_SETTINGS) ?? {}) };
}
export function saveSettings(s) { write(KEY_SETTINGS, s); }

// best[i] = { stars, score, time } for level i.
export function loadProgress() {
  const p = read(KEY_PROGRESS);
  return { best: Array.isArray(p?.best) ? p.best : [] };
}
export function saveProgress(p) { write(KEY_PROGRESS, p); }

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

// A level is open when it is the first one or the one before it is parked.
export const isUnlocked = (progress, i) => i === 0 || !!progress.best[i - 1];
export const totalStars = (progress) => progress.best.reduce((s, b) => s + (b?.stars ?? 0), 0);
export function firstUnfinished(progress, count) {
  for (let i = 0; i < count; i++) if (!progress.best[i]) return i;
  return count - 1;
}
