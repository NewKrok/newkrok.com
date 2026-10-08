// The level list the leaderboard's PHP checks submissions against: per
// level its fingerprint (a board only lists runs on the current one), par
// and the fewest steps a run can take. Written into the game's build by
// vite.config.js as leaderboard-levels.json; `node scripts/leaderboard-levels.js`
// prints it.
import { LEVELS } from "../src/levels.js";
import { levelFingerprint, SIM_VERSION } from "../src/run.js";
import { DT, PARK_HOLD } from "../src/config.js";

export function leaderboardLevels() {
  const levels = {};
  for (const L of LEVELS) levels[L.id] = { fp: levelFingerprint(L), par: L.par, minSteps: Math.ceil(PARK_HOLD / DT) + 1, index: L.index };
  return { sim: SIM_VERSION, levels };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(leaderboardLevels(), null, 1));
