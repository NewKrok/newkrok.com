import { EN } from "./en.js";
import { HU } from "./hu.js";
import { LINES_EN, MEMORIES_EN, OUTRO_EN, NOTES_EN } from "./lines-en.js";
import { LINES_HU, MEMORIES_HU, OUTRO_HU, NOTES_HU } from "./lines-hu.js";

// ── Localisation ─────────────────────────────────────────────────────────
// Page text carries data-i18n keys; code goes through t().

const PACKS = { en: EN, hu: HU };
export const LANGS = [["en", "English"], ["hu", "Magyar"]];
let lang = "en";
export const getLang = () => lang;

export function detectLang(saved) {
  if (saved && PACKS[saved]) return saved;
  const prefs = (typeof navigator !== "undefined" && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
  for (const p of prefs) {
    const code = String(p || "").slice(0, 2).toLowerCase();
    if (PACKS[code]) return code;
  }
  return "en";
}

export function setLang(code) {
  lang = PACKS[code] ? code : "en";
  if (typeof document !== "undefined") { document.documentElement.lang = lang; applyDom(); }
}

export function t(key, vars) {
  let s = PACKS[lang][key] ?? EN[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

const STORY = { en: { lines: LINES_EN, memories: MEMORIES_EN, outro: OUTRO_EN, notes: NOTES_EN }, hu: { lines: LINES_HU, memories: MEMORIES_HU, outro: OUTRO_HU, notes: NOTES_HU } };
// [speaker, text] of a story line.
export const line = (id) => STORY[lang].lines[id] ?? LINES_EN[id] ?? ["margo", id];
// Is there a line with this id? (English is always complete.)
export const hasLine = (id) => id in LINES_EN;
export const memoryText = (id) => STORY[lang].memories[id] ?? MEMORIES_EN[id] ?? [id, ""];
// The closing words on a dream's result card.
export const outroText = (dream) => STORY[lang].outro[dream] ?? OUTRO_EN[dream] ?? "";
// [title, text] of the journal note a line unlocks, or null.
export const noteText = (id) => STORY[lang].notes[id] ?? NOTES_EN[id] ?? null;

export function applyDom(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
}
