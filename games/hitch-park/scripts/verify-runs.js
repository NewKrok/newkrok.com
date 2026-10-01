// Replays the leaderboard runs waiting for a check with the game's own
// physics and reports each one as verified or rejected. A run passes only
// when its inputs park the rig on exactly the last step with the claimed
// score, stars, bumps, crashes and cones. Run by the scheduled GitHub
// Action (.github/workflows/hitch-park-verify.yml).
//
// Usage: LB_API=https://newkrok.com/api/hitch-park LB_VERIFY_TOKEN=… npm run verify-runs [-- --dry]

import { LEVELS } from "../src/levels.js";
import { createSim } from "../src/sim.js";
import { decodeReplay, replayRun, levelFingerprint } from "../src/run.js";

const API = (process.env.LB_API ?? "").replace(/\/$/, "");
const TOKEN = process.env.LB_VERIFY_TOKEN ?? "";
const DRY = process.argv.includes("--dry");
if (!API || !TOKEN) {
  console.log("LB_API / LB_VERIFY_TOKEN not set, nothing to do.");
  process.exit(0);
}

const byId = new Map(LEVELS.map((L) => [L.id, { L, fp: levelFingerprint(L) }]));
const sim = createSim();

export function check(run) {
  const lv = byId.get(run.level);
  if (!lv) return "unknown level";
  if (lv.fp !== run.fp) return "level changed";
  const inputs = decodeReplay(run.replay);
  if (!inputs || inputs.length !== run.steps) return "bad replay";
  const r = replayRun(sim, lv.L, inputs);
  if (!r.ok) return `${r.reason} at ${r.step}`;
  for (const k of ["score", "stars", "hits", "crashes", "cones"]) if (r[k] !== run[k]) return `${k} ${run[k]} vs ${r[k]}`;
  return null;
}

async function api(method, body) {
  const res = await fetch(`${API}/verify.php${method === "GET" ? "?limit=200" : ""}`, {
    method,
    headers: { "X-Verify-Token": TOKEN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} verify.php: ${res.status} ${await res.text()}`);
  return res.json();
}

let total = 0, rejected = 0;
for (let round = 0; round < 50; round++) {
  const { runs } = await api("GET");
  if (!runs.length) break;
  const results = runs.map((run) => {
    const reason = check(run);
    console.log(`${reason ? "✗" : "✓"} #${run.id} ${run.level} ${run.score} pts, ${run.steps} steps${reason ? ` — ${reason}` : ""}`);
    if (reason) rejected++;
    return { id: run.id, ok: !reason, reason: reason ?? undefined };
  });
  total += runs.length;
  if (DRY) break;
  await api("POST", { results });
}
console.log(`\n${total} run(s) checked, ${rejected} rejected${DRY ? " (dry run, nothing reported)" : ""}`);
