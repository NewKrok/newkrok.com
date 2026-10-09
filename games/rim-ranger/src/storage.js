// ── Settings and the last checkpoint ─────────────────────────────────────
// localStorage, guarded for private mode / blocked storage (the game still
// runs, it just forgets).

const KEY_SETTINGS = "rim-ranger.settings.v1";
const KEY_SAVE = "rim-ranger.save.v1";

const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

export const DEFAULT_SETTINGS = {
  lang: null, master: 0.8, sfx: 0.85, music: 0.5, voice: true, voiceVol: 0.9, subtitles: true,
  quality: "high", sensitivity: 1, padSensitivity: 1, invertY: false, aimAssist: true, shake: true,
  difficulty: "normal",
};
export function loadSettings() { return { ...DEFAULT_SETTINGS, ...(read(KEY_SETTINGS) ?? {}) }; }
export function saveSettings(s) { write(KEY_SETTINGS, s); }

// { level, cp, done }: the checkpoint to continue from.
export function loadSave() { return read(KEY_SAVE); }
export function saveSave(s) { write(KEY_SAVE, s); }
export function clearSave() { try { localStorage.removeItem(KEY_SAVE); } catch { /* */ } }
