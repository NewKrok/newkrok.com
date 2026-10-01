// ── Leaderboard client ───────────────────────────────────────────────────
// Talks to the PHP API next to the site (public/api/hitch-park/). Nothing
// here may break the game: every call resolves, failures come back as
// { error }. The player is a name plus a secret token the server handed
// out, kept in this browser only; there is no account.

import { levelFingerprint } from "./run.js";

const BASE = (import.meta.env.VITE_LB_API ?? "/api/hitch-park").replace(/\/$/, "");
const ENABLED = import.meta.env.PROD || !!import.meta.env.VITE_LB_API;
const KEY_PLAYER = "hitch-park.player.v1";

const read = () => { try { return JSON.parse(localStorage.getItem(KEY_PLAYER) || "null"); } catch { return null; } };
const write = (p) => { try { localStorage.setItem(KEY_PLAYER, JSON.stringify(p)); } catch { /* private mode */ } };

let player = read();
let available = false;
const runTokens = new Map();     // level id → promise of a run token not used yet

async function call(path, { method = "GET", body } = {}) {
  if (!ENABLED) return { error: "disabled" };
  try {
    const headers = { "Content-Type": "application/json" };
    if (player?.token) headers["X-Player-Token"] = player.token;
    const res = await fetch(`${BASE}/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({ error: "bad_response" }));
    return res.ok ? data : { error: data.error ?? `http_${res.status}` };
  } catch {
    return { error: "offline" };
  }
}

export const lb = {
  get available() { return available; },
  get player() { return player; },

  // One cheap request at boot: is there a working leaderboard at all?
  async probe() {
    const r = await call("board.php?scope=total&limit=1");
    available = !r.error;
    return available;
  },

  // Creates the player, or renames them. Resolves to { name } or { error }.
  async setName(name) {
    const r = await call("player.php", { method: "POST", body: { name, token: player?.token } });
    if (r.error) return r;
    player = { name: r.name, token: r.token };
    write(player);
    return { name: r.name };
  },

  // At the start of every attempt: a run token for the level. One that was
  // not used yet is kept for the retry (it only has to be older than the run).
  prepare(level) {
    if (!available || runTokens.has(level.id)) return;
    runTokens.set(level.id, call("start.php", { method: "POST", body: { level: level.id } }).then((r) => {
      if (r.error) runTokens.delete(level.id);
      return r.run ?? null;
    }));
  },

  // A finished run: { level, steps, score, stars, hits, crashes, cones, replay }.
  async submit(run) {
    if (!player) return { error: "no_player" };
    const L = run.level;
    if (!runTokens.has(L.id)) this.prepare(L);
    const token = await runTokens.get(L.id);
    if (!token) return { error: "offline" };
    runTokens.delete(L.id);
    const r = await call("submit.php", {
      method: "POST",
      body: {
        token: player.token, run: token, level: L.id, fp: levelFingerprint(L),
        steps: run.steps, score: run.score, stars: run.stars, hits: run.hits, crashes: run.crashes, cones: run.cones,
        replay: run.replay, browser: browserFamily(),
      },
    });
    if (r.error === "no_player") { player = null; write(null); }
    return r;
  },

  // Runs whose replay check changed the result or rejected them, each once.
  async notices() {
    if (!player) return [];
    const r = await call("notices.php");
    return r.notices ?? [];
  },

  level: (id, limit = 10) => call(`board.php?level=${encodeURIComponent(id)}&limit=${limit}`),
  overall: (limit = 10) => call(`board.php?scope=total&limit=${limit}`),
};

// Kept with each run, to spot an engine whose replays do not hold up.
function browserFamily() {
  const ua = navigator.userAgent;
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Edg\//.test(ua)) return "edge";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}
