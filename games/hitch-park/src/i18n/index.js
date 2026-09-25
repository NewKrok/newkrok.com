import { UI } from "./ui.js";
import { LEVEL_TEXT } from "./levels.js";

// ── Localisation ─────────────────────────────────────────────────────────
// Static page text carries data-i18n (plain) or data-i18n-html (with markup)
// keys; everything drawn or built in code goes through t().

export const LANGS = [["en", "English"], ["de", "Deutsch"], ["es", "Español"], ["hu", "Magyar"], ["zh", "中文"], ["fr", "Français"]];

let lang = "en";
export const getLang = () => lang;

export function detectLang(saved) {
  if (saved && UI[saved]) return saved;
  const prefs = (typeof navigator !== "undefined" && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
  for (const p of prefs) {
    const code = String(p || "").slice(0, 2).toLowerCase();
    if (UI[code]) return code;
  }
  return "en";
}

export function setLang(code) {
  lang = UI[code] ? code : "en";
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
    applyDom();
  }
}

export function t(key, vars) {
  let s = UI[lang][key] ?? UI.en[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

// Name, title and brief of a level in the current language.
export function levelText(l) {
  const tr = LEVEL_TEXT[lang]?.[l.id];
  return tr ? { name: tr[0], title: tr[1], brief: tr[2] } : { name: l.name, title: l.title, brief: l.brief };
}

export function applyDom(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-html]")) el.innerHTML = t(el.dataset.i18nHtml);
}
