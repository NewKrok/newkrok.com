import { HEROES, HEARTH, RELIC_IDS } from "./meta.js";
import { STAGES, BEACONS } from "./stages.js";

// ── Deeds ────────────────────────────────────────────────────────────────
// Achievements, each with an ember reward. `run(s)` looks at one finished
// run (the summary from sim/run.js), `test(p)` at the whole progress; either
// one earns it. `prog(p)` gives [have, need] for a bar on the deeds page.
// Names and descriptions live in i18n (ach_<id> / achd_<id>).

const beacons = (list) => STAGES.slice(0, BEACONS).every((_, i) => list[i]);
const ROSTER = [...new Set(STAGES.flatMap((s) => [...s.mix.map((m) => m[0]), ...s.events.map((e) => e[2]), s.boss].filter(Boolean)))];

export const ACHIEVEMENTS = [
  { id: "firstLight", icon: "flare",     reward: 50,  test: (p) => p.cleared.some(Boolean) },
  { id: "allBeacons", icon: "beacon",    reward: 300, test: (p) => beacons(p.cleared), prog: (p) => [p.cleared.slice(0, BEACONS).filter(Boolean).length, BEACONS] },
  { id: "vigil",      icon: "crown",     reward: 600, test: (p) => !!p.cleared[BEACONS] },
  { id: "bloodMoon",  icon: "bloodmoon", reward: 150, test: (p) => p.clearedBlood.some(Boolean) },
  { id: "bloodAll",   icon: "bloodmoon", reward: 800, test: (p) => beacons(p.clearedBlood), prog: (p) => [p.clearedBlood.slice(0, BEACONS).filter(Boolean).length, BEACONS] },
  ...HEROES.map((h) => ({ id: "win_" + h.id, icon: h.active, reward: 100, test: (p) => (p.heroWins?.[h.id] || 0) > 0 })),
  { id: "kills1000",  icon: "skull",     reward: 100, run: (s) => s.kills >= 1000 },
  { id: "kills2500",  icon: "skull",     reward: 250, run: (s) => s.kills >= 2500 },
  { id: "slayer",     icon: "banish",    reward: 200, test: (p) => p.totalKills >= 10000, prog: (p) => [p.totalKills, 10000] },
  { id: "legend",     icon: "banish",    reward: 500, test: (p) => p.totalKills >= 50000, prog: (p) => [p.totalKills, 50000] },
  { id: "level40",    icon: "growth",    reward: 150, run: (s) => s.level >= 40 },
  { id: "evolve",     icon: "sunflail",  reward: 100, run: (s) => s.evolved.length >= 1 },
  { id: "evolve3",    icon: "toll",      reward: 300, run: (s) => s.evolved.length >= 3 },
  { id: "relics2",    icon: "reliquary", reward: 100, run: (s) => s.relics.length >= 2 },
  { id: "swiftKeeper", icon: "haste",    reward: 200, run: (s) => !!s.fastKeeper },
  { id: "unbowed",    icon: "plate",     reward: 250, run: (s) => s.won && s.damageTaken < 100 },
  { id: "hearthMax",  icon: "ember",     reward: 100, test: (p) => HEARTH.some((u) => !u.hero && (p.hearth[u.id] || 0) >= u.max) },
  { id: "mastery",    icon: "tome",      reward: 150, test: (p) => HEARTH.some((u) => u.hero && (p.hearth[u.id] || 0) >= u.max) },
  { id: "pedlar",     icon: "satchel",   reward: 100, test: (p) => (p.itemsUsed || 0) >= 10, prog: (p) => [p.itemsUsed || 0, 10] },
  { id: "runs25",     icon: "revival",   reward: 100, test: (p) => p.runs >= 25, prog: (p) => [p.runs, 25] },
  { id: "relicHunter", icon: "keys",     reward: 200, test: (p) => (p.seenRelics || []).length >= 8, prog: (p) => [(p.seenRelics || []).length, 8] },
  { id: "allRelics",  icon: "saintsbone", reward: 400, test: (p) => (p.seenRelics || []).length >= RELIC_IDS.length, prog: (p) => [(p.seenRelics || []).length, RELIC_IDS.length] },
  { id: "bestiary",   icon: "raven",  reward: 200, test: (p) => ROSTER.every((id) => p.seenMonsters.includes(id)), prog: (p) => [ROSTER.filter((id) => p.seenMonsters.includes(id)).length, ROSTER.length] },
];

// Grants what is newly earned (embers included) and returns it.
export function checkAchievements(p, s = null) {
  p.ach = p.ach || {};
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (p.ach[a.id]) continue;
    if ((s && a.run?.(s)) || a.test?.(p)) {
      p.ach[a.id] = Date.now();
      p.embers += a.reward;
      got.push(a);
    }
  }
  return got;
}
