import { HEROES, WEAPON_IDS, WEAPON_META } from "./data/meta.js";
import { STAGES, BEACONS } from "./data/stages.js";
import { ITEM_IDS } from "./data/items.js";

// ── Progress and settings ────────────────────────────────────────────────
// localStorage, guarded for private mode / blocked storage (the game still
// runs, it just forgets).

const KEY_PROGRESS = "last-lantern.progress.v1";
const KEY_SETTINGS = "last-lantern.settings.v1";

const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

export const DEFAULT_SETTINGS = { master: 0.8, sfx: 0.85, music: 0.55, quality: "high", numbers: true, shake: true, calm: false, safetySeen: false, hero: "wren", stage: 0, blood: false };
export function loadSettings() { return { ...DEFAULT_SETTINGS, ...(read(KEY_SETTINGS) ?? {}) }; }
export function saveSettings(s) { write(KEY_SETTINGS, s); }

const blank = () => ({
  embers: 0, hearth: {}, cleared: [], clearedBlood: [], best: [],
  totalKills: 0, maxLevel: 0, runs: 0, seenMonsters: [], seenWeapons: [], seenRelics: [], storyRead: 0,
  heroWins: {}, items: {}, itemsUsed: 0, ach: {},
});
export function loadProgress() { return { ...blank(), ...(read(KEY_PROGRESS) ?? {}) }; }
export function saveProgress(p) { write(KEY_PROGRESS, p); }
export function resetProgress(p) { Object.assign(p, blank()); saveProgress(p); }

// Unlock rules: { stage: i } = that beacon lit, { level } in one run, { kills } in total.
export function meets(p, rule) {
  if (!rule) return true;
  if (rule.stage !== undefined) return !!p.cleared[rule.stage];
  if (rule.level !== undefined) return p.maxLevel >= rule.level;
  if (rule.kills !== undefined) return p.totalKills >= rule.kills;
  return true;
}
export const heroUnlocked = (p, h) => meets(p, h.unlock);
// The Vigil opens once all five beacons burn.
export const stageUnlocked = (p, i) => (STAGES[i]?.rush ? STAGES.slice(0, BEACONS).every((_, k) => p.cleared[k]) : i === 0 || !!p.cleared[i - 1]);
export function unlockedWeapons(p) {
  return new Set(WEAPON_IDS.filter((id) => meets(p, WEAPON_META[id].unlock)));
}

// Fold a finished run into the progress; returns what it newly unlocked.
export function recordRun(p, s) {
  const before = { heroes: HEROES.filter((h) => heroUnlocked(p, h)).map((h) => h.id), weapons: [...unlockedWeapons(p)], stages: STAGES.filter((_, i) => stageUnlocked(p, i)).map((x) => x.id) };
  p.runs++;
  p.embers += s.embers;
  p.totalKills += s.kills;
  p.maxLevel = Math.max(p.maxLevel, s.level);
  if (s.won) {
    if (s.blood) p.clearedBlood[s.stage] = true;
    p.cleared[s.stage] = true;
    p.heroWins = p.heroWins || {};
    p.heroWins[s.hero] = (p.heroWins[s.hero] || 0) + 1;
  }
  const b = p.best[s.stage];
  const more = (s.keepers || 0) - (b?.keepers || 0);
  if (!b || s.won && !b.won || (s.won === !!b.won && (more > 0 || more === 0 && s.time > b.time))) p.best[s.stage] = { time: Math.round(s.time), kills: s.kills, won: s.won, keepers: s.keepers || 0 };
  for (const id of s.monstersSeen || []) if (!p.seenMonsters.includes(id)) p.seenMonsters.push(id);
  for (const id of s.weaponsSeen || []) if (!p.seenWeapons.includes(id)) p.seenWeapons.push(id);
  p.seenRelics = p.seenRelics || [];
  for (const id of s.relicsSeen || []) if (!p.seenRelics.includes(id)) p.seenRelics.push(id);
  saveProgress(p);
  const unlocked = [];
  for (const h of HEROES) if (heroUnlocked(p, h) && !before.heroes.includes(h.id)) unlocked.push({ kind: "hero", id: h.id });
  for (const id of unlockedWeapons(p)) if (!before.weapons.includes(id)) unlocked.push({ kind: "weapon", id });
  STAGES.forEach((st, i) => { if (stageUnlocked(p, i) && !before.stages.includes(st.id)) unlocked.push({ kind: "stage", id: st.id }); });
  return unlocked;
}

// The satchel: consumables bought from the Pedlar, kept between runs.
export function useItem(p, id) {
  if (!ITEM_IDS.includes(id) || !(p.items?.[id] > 0)) return;
  p.items[id]--;
  p.itemsUsed = (p.itemsUsed || 0) + 1;
  saveProgress(p);
}
