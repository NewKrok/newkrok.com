import { factory } from "./factory.js";
import { park } from "./park.js";
import { school } from "./school.js";
import { kitchen } from "./kitchen.js";
import { garden } from "./garden.js";
import { space } from "./space.js";
import { lab } from "./lab.js";
import { belllab } from "./belllab.js";
import { umbrellalab } from "./umbrellalab.js";
import { yoyolab } from "./yoyolab.js";

// ── Every level, and the job board ───────────────────────────────────────
// LEVELS by id (the Factory, the dreams, and dev-only test levels).
// CLIENTS is the board in story order: a client whose dream is built has a
// `level`; `after` is the dream that has to be fixed before they call.

export const LEVELS = { factory, park, school, kitchen, garden, space, lab, belllab, umbrellalab, yoyolab };

export const CLIENTS = [
  { id: "park", level: "park" },
  { id: "school", level: "school", after: "park" },
  { id: "kitchen", level: "kitchen", after: "school" },
  { id: "garden", level: "garden", after: "kitchen" },
  { id: "space", level: "space", after: "garden" },
];

// Is the client's dream on the board for the taking?
export const isOpen = (c, progress) => !!c.level && (!c.after || progress.done.includes(c.after));

// Which dream each memory belongs to (the board's counters, the journal).
export const MEMORY_OWNER = Object.fromEntries(Object.values(LEVELS).flatMap((L) => (L.memories ?? []).map(([id]) => [id, L.id])));
export const memoriesOf = (id) => (LEVELS[id]?.memories ?? []).map(([m]) => m);
