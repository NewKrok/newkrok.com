import { EN } from "./en.js";
import { HU } from "./hu.js";

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

export function applyDom(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
}
