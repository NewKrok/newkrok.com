// ── Runs: scoring, replays, level fingerprints ───────────────────────────
// Shared by the game and the leaderboard's replay check (scripts/
// verify-runs.js), so both score a run in exactly the same way. A run is
// the list of inputs given to sim.step(), one per physics step from the
// moment the rig drives off until it is parked; with the deterministic
// trig (detmath.js) replaying it on any engine gives the very same result.

import { DT, PARK_HOLD, SCORE, clamp } from "./config.js";

// Bump when the physics or the tuning changes in a way that alters how a
// run plays out: every level's fingerprint changes with it, so records set
// under the old rules drop off the boards instead of failing the check.
export const SIM_VERSION = 1;

// Analog inputs (stick, touch drag) are rounded to 1/64 before the sim
// sees them, so a replay can store them exactly in one byte.
const Q = 64;
const quant = (v) => Math.round(clamp(v, -1, 1) * Q) / Q;
export function quantizeInput(i) {
  return { throttle: quant(i.throttle), steer: quant(i.steer), brake: !!i.brake, holdSteer: !!i.holdSteer };
}

// ── Replay encoding ──────────────────────────────────────────────────────
// Runs of identical inputs, 4 bytes each: count (1–255), throttle + 64,
// steer + 64, flags (1 brake, 2 hold steer); base64 for transport. A
// keyboard run of a minute is a few hundred bytes.
export function createRecorder() {
  const bytes = [];
  let steps = 0;
  return {
    push(input) {
      const t = Math.round(input.throttle * Q) + Q, s = Math.round(input.steer * Q) + Q;
      const f = (input.brake ? 1 : 0) | (input.holdSteer ? 2 : 0);
      const n = bytes.length;
      if (n && bytes[n - 4] < 255 && bytes[n - 3] === t && bytes[n - 2] === s && bytes[n - 1] === f) bytes[n - 4]++;
      else bytes.push(1, t, s, f);
      steps++;
    },
    get steps() { return steps; },
    encode() { return toBase64(bytes); },
  };
}

// Inputs per step, or null when the data is malformed.
export function decodeReplay(str) {
  let bytes;
  try { bytes = fromBase64(str); } catch { return null; }
  if (!bytes.length || bytes.length % 4) return null;
  const out = [];
  for (let i = 0; i < bytes.length; i += 4) {
    const [n, t, s, f] = [bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]];
    if (!n || t > 2 * Q || s > 2 * Q || f > 3) return null;
    const input = { throttle: (t - Q) / Q, steer: (s - Q) / Q, brake: !!(f & 1), holdSteer: !!(f & 2) };
    for (let k = 0; k < n; k++) out.push(input);
  }
  return out;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    s += B64[n >> 18] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? B64[n & 63] : "=");
  }
  return s;
}
function fromBase64(s) {
  if (typeof s !== "string" || s.length % 4 || /[^A-Za-z0-9+/=]/.test(s)) throw new Error("bad base64");
  const out = [];
  for (let i = 0; i < s.length; i += 4) {
    const c = [0, 1, 2, 3].map((k) => (s[i + k] === "=" ? 0 : B64.indexOf(s[i + k])));
    const n = (c[0] << 18) | (c[1] << 12) | (c[2] << 6) | c[3];
    out.push(n >> 16);
    if (s[i + 2] !== "=") out.push((n >> 8) & 255);
    if (s[i + 3] !== "=") out.push(n & 255);
  }
  return out;
}

// ── Scoring ──────────────────────────────────────────────────────────────
export function scoreRun(level, { steps, hits, crashes, cones, acc }) {
  const time = steps * DT;
  const timeBonus = Math.max(0, Math.round((level.par - time) * SCORE.perSecond));
  const accBonus = Math.round(acc * SCORE.accuracy);
  const penalty = hits * SCORE.bump + crashes * SCORE.crash + cones * SCORE.cone;
  const score = Math.max(0, SCORE.base + timeBonus + accBonus - penalty);
  const stars = 1 + (hits + crashes === 0 ? 1 : 0) + (time <= level.par ? 1 : 0);
  return { score, stars, time, timeBonus, accBonus };
}

// Parking hold: stopped, square and inside the bay for PARK_HOLD seconds
// (it drains twice as fast as it fills). Returns the new hold.
export function holdStep(hold, ps) {
  return ps.inside && ps.aligned && ps.stopped ? hold + DT : Math.max(0, hold - DT * 2);
}

// Plays a run back on a sim and scores what really happens: the replay
// check takes this result, not the one the game claimed. A run that parks
// before its last input ends there; one that has not parked when the inputs
// run out gets up to `extend` more steps of braking to finish the hold.
// Fails only when the rig never parks or a mine goes off.
export const REPLAY_EXTEND = 180;            // 3 s
const BRAKE = { throttle: 0, steer: 0, brake: true, holdSteer: false };
export function replayRun(sim, level, inputs, { extend = 0 } = {}) {
  sim.load(level);
  sim.scoring = true;
  let hold = 0;
  for (let i = 0; i < inputs.length + extend; i++) {
    const ps = sim.step(i < inputs.length ? inputs[i] : BRAKE);
    if (sim.mines.some((m) => !m.live)) return { ok: false, reason: "mine", step: i + 1 };
    hold = holdStep(hold, ps);
    if (hold >= PARK_HOLD) {
      const stats = { steps: i + 1, hits: sim.hits, crashes: sim.crashes, cones: sim.coneHits, acc: ps.acc };
      return { ok: true, ...stats, ...scoreRun(level, stats) };
    }
  }
  return { ok: false, reason: "not parked", step: inputs.length + extend };
}

// ── Level fingerprint ────────────────────────────────────────────────────
// Everything that shapes how the level plays (not its texts or scenery),
// plus SIM_VERSION. A board only lists runs set on the current fingerprint,
// so a reworked level starts with a fresh board.
const COSMETIC = new Set(["name", "title", "brief", "index", "chapter", "season", "num", "first", "foliage", "cargo", "livery", "sun", "backdrop", "decor", "paint"]);
export function levelFingerprint(level) {
  const json = JSON.stringify({ sim: SIM_VERSION, ...level }, (k, v) => (COSMETIC.has(k) ? undefined : v));
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < json.length; i++) {
    const c = json.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519) ^ (h2 >>> 13);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}
