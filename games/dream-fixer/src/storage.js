import { blankStats, XP } from "./data/progression.js";

// ── Progress and settings ────────────────────────────────────────────────
// localStorage, guarded for private mode / blocked storage (the game still
// runs, it just forgets).

const KEY_SETTINGS = "dream-fixer.settings.v1";
const KEY_PROGRESS = "dream-fixer.progress.v1";

const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
export const DEFAULT_SETTINGS = {
  lang: null, master: 0.8, sfx: 0.85, music: 0.5, voice: true, voiceVol: 0.9,
  quality: coarse ? "low" : "high",
  sensitivity: 1, touchSensitivity: 1, padSensitivity: 1, invertY: false,
  aimAssist: true, autoFire: coarse, shake: true,
};
export function loadSettings() { return { ...DEFAULT_SETTINGS, ...(read(KEY_SETTINGS) ?? {}) }; }
export function saveSettings(s) { write(KEY_SETTINGS, s); }

// log: the radio lines heard so far, in order (for the journal).
// upgrades: level per bench upgrade; items: kit in your pockets.
// tools: the tools you have earned (the Stabilizer from the start).
// hard: dreams fixed in deep sleep (hard); pickedHard: the job taken is one.
// xp, ach, stats: rank and achievements (see data/progression.js).
const VERSION = 3;
const blank = () => ({ version: VERSION, dust: 0, done: [], hard: [], memories: [], upgrades: {}, items: {}, tools: ["stabilizer"], night: 0, picked: null, pickedHard: false, introSeen: false, log: [], xp: 0, ach: {}, stats: blankStats() });

// An older save brought up to date, step by step.
function migrate(p) {
  if (!p.version) {
    // v1 kept a single flag for the Fuzz Vacuum (and a dream fixed meant you had it).
    p.tools = ["stabilizer", ...(p.vacuum || p.done?.includes("park") ? ["vacuum"] : [])];
    delete p.vacuum;
    p.version = 2;
  }
  if (p.version === 2) {
    // v2 had no rank: what the dreams already fixed would have earned, roughly.
    p.xp = (p.done?.length ?? 0) * 400 + (p.memories?.length ?? 0) * XP.memory;
    p.version = 3;
  }
  p.stats = { ...blankStats(), ...(p.stats ?? {}) };
  return p;
}
export function loadProgress() { const saved = read(KEY_PROGRESS); return { ...blank(), ...(saved ? migrate(saved) : {}) }; }
export function saveProgress(p) { write(KEY_PROGRESS, p); }
export function resetProgress(p) { for (const k of Object.keys(p)) delete p[k]; Object.assign(p, blank()); saveProgress(p); }
