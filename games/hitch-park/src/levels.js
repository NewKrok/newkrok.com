import { CHAPTER1 } from "./levels/ch1.js";
import { CHAPTER2 } from "./levels/ch2.js";
import { CHAPTER3 } from "./levels/ch3.js";
import { CHAPTER4 } from "./levels/ch4.js";
import { CHAPTER5 } from "./levels/ch5.js";
import { CHAPTER6 } from "./levels/ch6.js";
import { CHAPTER7 } from "./levels/ch7.js";
import { CHAPTER8 } from "./levels/ch8.js";
import { AUTUMN } from "./levels/autumn.js";

// ── Levels ───────────────────────────────────────────────────────────────
// Forty-eight jobs in eight chapters, every one on its own map. Each level is
// plain data built with the helpers in ./levels/kit.js. New levels go at the
// end of their chapter; progress is saved by level id (storage.js).

export const CHAPTERS = [
  { name: "Learner plates", levels: CHAPTER1 },
  { name: "A working day", levels: CHAPTER2 },
  { name: "Out of town", levels: CHAPTER3 },
  { name: "Tight spots", levels: CHAPTER4 },
  { name: "Master of the tow", levels: CHAPTER5 },
  { name: "Big rigs", levels: CHAPTER6, truck: true },
  { name: "Special cargo", levels: CHAPTER7 },
  { name: "On manoeuvres", levels: CHAPTER8 },
];

// Seasonal packs: a chapter's worth of jobs each, outside the main game.
// They open without the chapters, their jobs open one after another, and a
// pack stays playable after its season. New packs go at the end (texts:
// `season_<id>` and `seasons_<id>` in i18n/ui.js).
export const SEASONS = [
  { id: "autumn", icon: "🎃", levels: AUTUMN },
];

// Every level in one list (the main game first, so its indices never move);
// `num` counts within the main game or the pack, `first` opens by itself.
export const LEVELS = [
  ...CHAPTERS.flatMap((c, ci) => c.levels.map((l) => ({ ...l, chapter: ci }))),
  ...SEASONS.flatMap((s) => s.levels.map((l) => ({ ...l, season: s.id }))),
].map((l, i, all) => {
  const first = i === 0 || all[i - 1].season !== l.season;
  return { ...l, index: i, first, num: all.slice(0, i + 1).filter((o) => o.season === l.season).length };
});

export const MAIN_LEVELS = LEVELS.filter((l) => !l.season);
export const seasonOf = (L) => SEASONS.find((s) => s.id === L.season) ?? null;
// The levels of the main game or of the level's season pack.
export const packOf = (L) => LEVELS.filter((l) => l.season === L.season);
