import { EN } from "./en.js";
import { HU } from "./hu.js";
import { DE } from "./de.js";
import { ES } from "./es.js";
import { FR } from "./fr.js";
import { ZH } from "./zh.js";

// ── Localisation ─────────────────────────────────────────────────────────
// Static page text carries data-i18n (plain) or data-i18n-html (with markup)
// keys; everything built in code goes through t() and the name helpers.

const PACKS = { en: EN, de: DE, es: ES, hu: HU, zh: ZH, fr: FR };
export const LANGS = [["en", "English"], ["de", "Deutsch"], ["es", "Español"], ["hu", "Magyar"], ["zh", "中文"], ["fr", "Français"]];

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
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
    applyDom();
  }
}

const P = () => PACKS[lang];
export function t(key, vars) {
  let s = P()[key] ?? EN[key];
  // Event banners fall back to the generic line for their kind.
  if (s === undefined && key.startsWith("ev_")) s = P()[key.split("_").slice(0, 2).join("_")] ?? EN[key.split("_").slice(0, 2).join("_")];
  if (s === undefined) s = key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
const pick = (group, id) => P()[group]?.[id] ?? EN[group]?.[id];
export const heroText = (id) => { const h = pick("heroes", id); return { name: h[0], epithet: h[1], active: h[2], activeDesc: h[3], trait: h[4] }; };
export const weaponText = (id) => { const w = pick("weapons", id); return { name: w[0], desc: w[1] }; };
export const passiveText = (id) => { const w = pick("passives", id); return { name: w[0], desc: w[1] }; };
export const stageText = (id) => { const s = pick("stages", id); return { name: s[0], place: s[1], intro: s[2], outro: s[3] }; };
export const monsterName = (id) => pick("monsters", id) ?? id;
export const monsterLore = (id) => pick("monsterLore", id) ?? "";
export const relicText = (id) => { const r = pick("relics", id); return { name: r[0], desc: r[1] }; };
export const storyText = () => P().story ?? EN.story;

export function applyDom(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-html]")) el.innerHTML = t(el.dataset.i18nHtml);
}
