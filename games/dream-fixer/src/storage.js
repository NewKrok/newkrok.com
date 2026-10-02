// ── Progress and settings ────────────────────────────────────────────────
// localStorage, guarded for private mode / blocked storage (the game still
// runs, it just forgets).

const KEY_SETTINGS = "dream-fixer.settings.v1";
const KEY_PROGRESS = "dream-fixer.progress.v1";

const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
export const DEFAULT_SETTINGS = {
  lang: null, master: 0.8, sfx: 0.85, music: 0.5,
  quality: coarse ? "low" : "high",
  sensitivity: 1, touchSensitivity: 1, padSensitivity: 1, invertY: false,
  aimAssist: true, autoFire: coarse, difficulty: "normal", shake: true,
};
export function loadSettings() { return { ...DEFAULT_SETTINGS, ...(read(KEY_SETTINGS) ?? {}) }; }
export function saveSettings(s) { write(KEY_SETTINGS, s); }

const blank = () => ({ dust: 0, done: [], memories: [], upgrades: {}, night: 0, picked: null, vacuum: false, introSeen: false });
export function loadProgress() { return { ...blank(), ...(read(KEY_PROGRESS) ?? {}) }; }
export function saveProgress(p) { write(KEY_PROGRESS, p); }
export function resetProgress(p) { for (const k of Object.keys(p)) delete p[k]; Object.assign(p, blank()); saveProgress(p); }
