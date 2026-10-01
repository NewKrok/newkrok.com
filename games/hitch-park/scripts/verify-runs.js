// Replays the leaderboard runs waiting for a check with the game's own
// physics. The server keeps what the replay really does: a run that parks
// is accepted with the time and score of the replay (marked "adjusted" when
// that differs from what the game claimed, e.g. an engine that computed the
// physics differently); one that never parks is rejected. Run by the
// scheduled GitHub Action (.github/workflows/hitch-park-verify.yml).
//
// Usage: LB_API=https://newkrok.com/api/hitch-park LB_VERIFY_TOKEN=… npm run verify-runs [-- --dry]

import { createHash } from "node:crypto";
import { LEVELS } from "../src/levels.js";
import { createSim } from "../src/sim.js";
import { decodeReplay, replayRun, levelFingerprint, createRecorder, REPLAY_EXTEND } from "../src/run.js";

const API = (process.env.LB_API ?? "").replace(/\/$/, "");
const TOKEN = process.env.LB_VERIFY_TOKEN ?? "";
const DRY = process.argv.includes("--dry");
if (!API || !TOKEN) {
  console.log("LB_API / LB_VERIFY_TOKEN not set, nothing to do.");
  process.exit(0);
}

const byId = new Map(LEVELS.map((L) => [L.id, { L, fp: levelFingerprint(L) }]));
const sim = createSim();

// → { ok: true, steps, score, stars, hits, crashes, cones, adjusted } or { ok: false, reason }
export function check(run) {
  const lv = byId.get(run.level);
  if (!lv) return { ok: false, reason: "unknown level" };
  if (lv.fp !== run.fp) return { ok: false, reason: "level changed" };
  const inputs = decodeReplay(run.replay);
  if (!inputs || inputs.length !== run.steps) return { ok: false, reason: "bad replay" };
  const r = replayRun(sim, lv.L, inputs, { extend: REPLAY_EXTEND });
  if (!r.ok) return { ok: false, reason: `${r.reason} at ${r.step}` };
  const keys = ["steps", "score", "stars", "hits", "crashes", "cones"];
  const diff = keys.filter((k) => r[k] !== run[k]).map((k) => `${k} ${run[k]}→${r[k]}`).join(", ");
  // The inputs that really drove the run (cut at the park, padded with the
  // braking it was given): the server refuses the same run from a second
  // player, however the copy was padded.
  const rec = createRecorder();
  for (let i = 0; i < r.steps; i++) rec.push(inputs[i] ?? { throttle: 0, steer: 0, brake: true, holdSteer: false });
  const effective = createHash("sha256").update(rec.encode()).digest("hex");
  return { ok: true, ...Object.fromEntries(keys.map((k) => [k, r[k]])), adjusted: !!diff, reason: diff || undefined, effective };
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

let total = 0, rejected = 0, adjusted = 0;
for (let round = 0; round < 50; round++) {
  const { runs } = await api("GET");
  if (!runs.length) break;
  const results = runs.map((run) => {
    const r = check(run);
    const mark = !r.ok ? "✗" : r.adjusted ? "≈" : "✓";
    console.log(`${mark} #${run.id} ${run.level} ${run.score} pts, ${run.steps} steps${r.reason ? ` — ${r.reason}` : ""}`);
    if (!r.ok) rejected++;
    else if (r.adjusted) adjusted++;
    return { id: run.id, ...r };
  });
  total += runs.length;
  if (DRY) break;
  await api("POST", { results });
}
console.log(`\n${total} run(s) checked, ${adjusted} adjusted, ${rejected} rejected${DRY ? " (dry run, nothing reported)" : ""}`);
