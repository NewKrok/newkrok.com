import { CHAPTER1 } from "./levels/ch1.js";
import { CHAPTER2 } from "./levels/ch2.js";
import { CHAPTER3 } from "./levels/ch3.js";
import { CHAPTER4 } from "./levels/ch4.js";
import { CHAPTER5 } from "./levels/ch5.js";
import { CHAPTER6 } from "./levels/ch6.js";

// ── Levels ───────────────────────────────────────────────────────────────
// Thirty jobs in six chapters, every one on its own map. Each level is plain
// data built with the helpers in ./levels/kit.js.

export const CHAPTERS = [
  { name: "Learner plates", levels: CHAPTER1 },
  { name: "A working day", levels: CHAPTER2 },
  { name: "Out of town", levels: CHAPTER3 },
  { name: "Tight spots", levels: CHAPTER4 },
  { name: "Master of the tow", levels: CHAPTER5 },
  { name: "Big rigs", levels: CHAPTER6, truck: true },
];

export const LEVELS = CHAPTERS.flatMap((c, ci) => c.levels.map((l) => ({ ...l, chapter: ci }))).map((l, i) => ({ ...l, index: i }));
