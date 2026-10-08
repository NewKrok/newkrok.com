import { CHAPTER1 } from "./levels/ch1.js";
import { CHAPTER2 } from "./levels/ch2.js";
import { CHAPTER3 } from "./levels/ch3.js";
import { CHAPTER4 } from "./levels/ch4.js";
import { CHAPTER5 } from "./levels/ch5.js";
import { CHAPTER6 } from "./levels/ch6.js";
import { CHAPTER7 } from "./levels/ch7.js";
import { CHAPTER8 } from "./levels/ch8.js";

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

export const LEVELS = CHAPTERS.flatMap((c, ci) => c.levels.map((l) => ({ ...l, chapter: ci }))).map((l, i) => ({ ...l, index: i }));
