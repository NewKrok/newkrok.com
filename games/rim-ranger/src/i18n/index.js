import { EN } from "./en.js";
import { HU } from "./hu.js";
import { LINES_EN } from "./lines-en.js";
import { LINES_HU } from "./lines-hu.js";

// ── Languages ────────────────────────────────────────────────────────────
// UI text and subtitles. English and Hungarian for now; the other site
// languages (de, es, fr, zh) come once the texts settle.

const UI = { en: EN, hu: HU };
const LINES = { en: null, hu: LINES_HU };
export const LANGS = [["en", "English"], ["hu", "Magyar"]];

let lang = "en";
export function setLang(l) { lang = UI[l] ? l : "en"; document.documentElement.lang = lang; }
export function getLang() { return lang; }
export function guessLang() {
  const l = (navigator.language || "en").slice(0, 2).toLowerCase();
  return UI[l] ? l : "en";
}

export function t(key, vars) {
  let s = UI[lang][key] ?? EN[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// A story line: { speaker, name, text }.
export function line(id) {
  const en = LINES_EN[id];
  if (!en) return null;
  const text = LINES[lang]?.[id] ?? en[1];
  return { speaker: en[0], name: t(`speaker_${en[0]}`), text };
}
