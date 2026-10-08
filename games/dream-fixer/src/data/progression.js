import { CLIENTS, memoriesOf } from "../levels/index.js";
import { UPGRADES, level, maxLevel } from "./upgrades.js";

// ── Rank and achievements ────────────────────────────────────────────────
// Experience comes from the work in the dreams (glitches smoothed out,
// anchors tuned, nightmares put to bed, memories found) and raises your
// rank at the Factory; the rank opens up the workbench, a level at a time.
// A hard (deep sleep) fix pays half as much again (dream dust too).
//
// progress.xp: experience so far. progress.ach: { id: when it was earned }.
// progress.stats: lifetime counters the achievements read.

export const XP = { small: 2, big: 6, anchor: 25, boss: 120, memory: 15, fixed: 60, hard: 1.5 };

export const MAX_RANK = 15;
// Experience a rank starts at: 0, 100, 250, 450, 700, 1000… up to 11 (about
// one time through the game); the last four take a second time through
// (the top level of every upgrade waits there).
const TOP = { 12: 4300, 13: 5400, 14: 6600, 15: 7800 };
export const xpForRank = (r) => TOP[r] ?? 25 * (r - 1) * (r + 2);
export function rankFor(xp = 0) {
  let r = 1;
  while (r < MAX_RANK && xp >= xpForRank(r + 1)) r++;
  return r;
}
// How far into the current rank: [have, need] (need is 0 at the top).
export function rankProgress(xp = 0) {
  const r = rankFor(xp);
  if (r >= MAX_RANK) return [0, 0];
  return [xp - xpForRank(r), xpForRank(r + 1) - xpForRank(r)];
}

// Lifetime counters (kept in progress.stats).
export const blankStats = () => ({ popped: 0, anchors: 0, bosses: 0, falls: 0, faints: 0, zaps: 0, kit: 0, radio: 0, dust: 0, levels: 0 });

// Every achievement: an id (its name and text are `a_<id>` in the
// language packs), a little emblem for its card, and when it is earned:
// test(progress, ctx) is asked after anything that might have earned it;
// ctx carries the moment (the run just finished, an event).
const fixedAll = (P) => CLIENTS.every((c) => !c.level || P.done.includes(c.id));
const run = (ctx) => ctx?.fixed ?? null;
const dreamMemories = (P, id) => memoriesOf(id).every((m) => P.memories.includes(m));
const levelsBought = (P) => UPGRADES.reduce((n, u) => n + level(P.upgrades, u.id), 0);

export const ACHIEVEMENTS = [
  // ── The job ──
  { id: "first_fix", icon: "🌙", test: (P) => P.done.length >= 1 },
  { id: "all_fixed", icon: "🏭", test: fixedAll },
  { id: "no_faint", icon: "☕", test: (P, c) => !!run(c) && run(c).faints === 0 },
  { id: "quick", icon: "⏱", test: (P, c) => !!run(c) && run(c).time < 8 * 60 },
  { id: "hard_one", icon: "💤", test: (P) => (P.hard?.length ?? 0) >= 1 },
  { id: "hard_all", icon: "🛌", test: (P) => CLIENTS.every((c) => !c.level || P.hard?.includes(c.id)) },
  // ── Glitches ──
  { id: "pop_100", icon: "✦", test: (P) => P.stats.popped >= 100 },
  { id: "pop_500", icon: "✷", test: (P) => P.stats.popped >= 500 },
  { id: "pop_2000", icon: "✺", test: (P) => P.stats.popped >= 2000 },
  // ── Each nightmare's trick, done once ──
  { id: "clog", icon: "🧶", event: "bossClog" },
  { id: "blot", icon: "🫧", event: "penBlot" },
  { id: "lid", icon: "🔔", event: "cookerLid" },
  { id: "unwound", icon: "☂", event: "bigclockUnwound" },
  { id: "tether", icon: "🪀", event: "moonTethered" },
  { id: "goodnight", icon: "😴", event: "heartAsleep" },
  // ── Memories ──
  { id: "memory_one", icon: "🫧", test: (P) => P.memories.length >= 1 },
  { id: "memory_dream", icon: "📷", test: (P) => CLIENTS.some((c) => c.level && dreamMemories(P, c.id)) },
  { id: "memory_all", icon: "📚", test: (P) => CLIENTS.every((c) => !c.level || dreamMemories(P, c.id)) },
  // ── The Factory ──
  { id: "rank_5", icon: "⭐", test: (P) => rankFor(P.xp) >= 5 },
  { id: "rank_10", icon: "🌟", test: (P) => rankFor(P.xp) >= 10 },
  { id: "rank_15", icon: "🏅", test: (P) => rankFor(P.xp) >= MAX_RANK },
  { id: "bench_10", icon: "🔧", test: (P) => levelsBought(P) >= 10 },
  { id: "bench_max", icon: "⚙", test: (P) => UPGRADES.some((u) => level(P.upgrades, u.id) >= maxLevel(u)) },
  { id: "dust_1000", icon: "💰", test: (P) => P.stats.dust >= 1000 },
  { id: "cog_zap", icon: "⚡", test: (P) => P.stats.zaps >= 50 },
  { id: "kit_10", icon: "🎒", test: (P) => P.stats.kit >= 10 },
  { id: "radio", icon: "📻", test: (P) => P.stats.radio >= 10 },
  { id: "falls", icon: "🪂", test: (P) => P.stats.falls >= 10 },
];

// Everything newly earned (ids), given what just happened; marks them in
// progress.ach. ctx: { event (a sim event), fixed (the run just won) }.
export function checkAchievements(P, ctx = {}) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (P.ach[a.id]) continue;
    const ok = a.event ? ctx.event?.type === a.event && (a.event !== "cookerLid" || ctx.event.off) : a.test?.(P, ctx);
    if (ok) { P.ach[a.id] = Date.now(); got.push(a.id); }
  }
  return got;
}
