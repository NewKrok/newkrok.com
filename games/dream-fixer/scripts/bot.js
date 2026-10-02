// Plays a dream headless: walks to each anchor (clearing what comes for it
// on the way), tunes it and fights off the waves, then the boss. It fights
// like a player would: the Stabilizer by default, the Fuzz Vacuum on small
// glitches up close (and their catch shot back at the big ones, or into
// the boss's nozzle), backing off and circling instead of standing in a
// crowd, going for a pink heart when low. Prints how long each part took
// and how hard it was.
//
//   node scripts/bot.js [seed] [difficulty] [skill] [level]
//   skill: casual (slower, wobbly aim, reacts late) or sharp
import { Run } from "../src/sim/run.js";
import { LEVELS } from "../src/levels/index.js";
import { World } from "../src/sim/world.js";
import { DT } from "../src/config.js";

const seed = Number(process.argv[2] || 1), difficulty = process.argv[3] || "normal", skill = process.argv[4] || "casual";
const def = LEVELS[process.argv[5] || "park"];
if (!def?.botRoutes) { console.log("no bot routes for that level"); process.exit(1); }
const SKILL = { sharp: { turn: 0.12, pitch: 0.08, react: 0, wobble: 0 }, casual: { turn: 0.08, pitch: 0.05, react: 0.25, wobble: 0.03 } }[skill];
const SMALL = new Set(["fuzz", "bunny", "buzzer"]), BIG = new Set(["tub", "knot"]);

const run = new Run(def, { seed, difficulty, aimAssist: 0.03, tools: def.tools ?? ["stabilizer"] });
const B = run.body;
let minHp = 1e9, hurtTotal = 0, falls = 0, lastPos = [0, 0, 0];
const origHurt = run.hurt.bind(run);
run.hurt = (a, x, z) => { const before = run.hp; origHurt(a, x, z); hurtTotal += Math.max(0, before - run.hp); };

// ── Looking and shooting ──
let tgtRef = null, reactT = 0, wantTool = "stabilizer", wantT = 0, altT = 0;
const dist = (o) => Math.hypot(o.px - B.x, o.pz - B.z);
const toolIndex = (id) => run.tools.findIndex((t) => t.id === id);
const key = (o) => (o ? o.id ?? (o.orb ? "orb" : o.nozzle ? "nozzle" : "boss") : null);

// The glitch (or orb) most worth shooting: an orb about to hit, else the
// nearest in sight (a knot counts as much nearer), else the boss.
function pickTarget() {
  const s = run.spits.find((o) => !o.harmless && Math.hypot(o.x - B.x, o.z - B.z) < 6);
  if (s) return { px: s.x, cy: s.y, pz: s.z, orb: true };
  let best = null, bd = 1e9;
  for (const o of run.foes) {
    if (!o.alive || o.state === "spawn") continue;
    // A knot keeps spinning out more: it goes first unless something is on top of you.
    const d = dist(o) * (o.kind === "knot" ? 0.3 : 1);
    if (d < bd && d < 40 && run.canSee(o.px, o.cy, o.pz)) { bd = d; best = o; }
  }
  const S = run.boss;
  if ((!best || bd > 12) && S?.alive && !S.invulnerable) {
    // Its nozzle while it sucks and the tank holds something to clog it with.
    const vac = run.tools[toolIndex("vacuum")];
    if (S.state === "suck" && vac?.tank.length) return { px: S.nozzle[0], cy: S.nozzle[1], pz: S.nozzle[2], boss: true, nozzle: true };
    return { px: S.bag ? S.bag[0] : S.x, cy: S.bag ? S.bag[1] : S.y + 1.4, pz: S.bag ? S.bag[2] : S.z, boss: true };
  }
  return best;
}

// Which tool, by how things stand (not by the target of the moment, so
// it does not flap): the vacuum with a crowd of small ones close or a
// catch to shoot at a big one, the Stabilizer otherwise.
function toolFor(tgt) {
  const vac = run.tools[toolIndex("vacuum")];
  if (!vac || vac.overheated || tgt?.orb) return "stabilizer";
  if (tgt?.nozzle) return "vacuum";
  const small = run.foes.filter((o) => o.alive && SMALL.has(o.kind) && o.state !== "spawn" && dist(o) < vac.def.range * 0.85).length;
  const bigNear = run.foes.some((o) => o.alive && BIG.has(o.kind) && dist(o) < 16) || (run.boss?.alive && Math.hypot(run.boss.x - B.x, run.boss.z - B.z) < 16);
  if (vac.tank.length && bigNear) return "vacuum";
  if (small >= 2 && vac.tank.length < vac.def.tankSize) return "vacuum";
  if (vac.tank.length >= vac.def.tankSize && small) return "vacuum";
  return "stabilizer";
}

function aimAndFire(intent) {
  const want = pickTarget();
  // Takes a moment to notice a new target (the same one just moves on).
  reactT -= DT;
  if (key(want) === key(tgtRef)) tgtRef = want;
  else if (reactT <= 0 || !tgtRef || tgtRef.alive === false) { tgtRef = want; reactT = SKILL.react; }
  let tgt = reactT > 0 && SKILL.react ? null : tgtRef;
  if (tgt && tgt.alive === false) tgt = null;
  // Tools: switch once the wish has held a moment (a player does not flap).
  const w = toolFor(tgt);
  wantT = w === wantTool ? wantT + DT : 0;
  wantTool = w;
  const ti = toolIndex(wantTool);
  if (wantT > 0.25 && ti >= 0 && ti !== run.tool) intent.toolTo = ti;
  if (!tgt) return null;
  const dx = tgt.px - B.x, dy = tgt.cy - B.eyeY, dz = tgt.pz - B.z;
  // Human-ish: turn towards it at a limited rate, fire when roughly on it.
  const wob = Math.sin(run.time * 2.3) * SKILL.wobble, wobP = Math.cos(run.time * 1.7) * SKILL.wobble * 0.6;
  const yaw = Math.atan2(-dx, -dz) + wob, pitch = Math.atan2(dy, Math.hypot(dx, dz)) + wobP;
  const d = Math.atan2(Math.sin(yaw - B.yaw), Math.cos(yaw - B.yaw));
  B.yaw += Math.max(-SKILL.turn, Math.min(SKILL.turn, d));
  B.pitch += Math.max(-SKILL.pitch, Math.min(SKILL.pitch, pitch - B.pitch));
  const tool = run.activeTool, on = Math.abs(d) < 0.2;
  if (tool.id === "vacuum") {
    // Shoot the catch back at a big one (a press: alt down for a step, then
    // up), or at anything once the tank is full.
    const big = tgt.boss || BIG.has(tgt.kind) || tool.tank.length >= tool.def.tankSize;
    altT -= DT;
    if (big && tool.tank.length && on && altT <= 0) { intent.alt = true; altT = 0.35; }
    else intent.fire = !big && Math.abs(d) < 0.35 && tool.heat < 0.9;
  } else intent.fire = on && tool.heat < 0.85 && !tool.overheated;
  return tgt;
}

// ── Moving ──
// Floor height under (x, z) standing at y, or -Infinity over the void.
function ground(x, z, y) {
  let best = -Infinity;
  for (const c of run.world.query(x, z, 0.05)) if (run.world.overlaps(c, x, z, 0.05)) { const t = World.topAt(c, x, z); if (t <= y + 0.6 && t > best) best = t; }
  return best;
}

// Walk the world direction (wx, wz), but not off an edge.
function move(intent, wx, wz, k = 1) {
  const l = Math.hypot(wx, wz);
  if (l < 1e-3) return;
  wx /= l; wz /= l;
  if (ground(B.x + wx * 1.4, B.z + wz * 1.4, B.y) < B.y - 1.5) {
    // Edge ahead: slide along it instead (whichever side is safe).
    const sx = -wz, sz = wx;
    if (ground(B.x + sx * 1.4, B.z + sz * 1.4, B.y) >= B.y - 1.5) { wx = sx; wz = sz; }
    else if (ground(B.x - sx * 1.4, B.z - sz * 1.4, B.y) >= B.y - 1.5) { wx = -sx; wz = -sz; }
    else return;
  }
  const sn = Math.sin(B.yaw), cs = Math.cos(B.yaw);
  intent.forward = (-sn * wx - cs * wz) * k;
  intent.strafe = (cs * wx - sn * wz) * k;
}

// In a fight: keep a few metres off the nearest glitch coming for you,
// circling; low on wakefulness, go for a heart.
function kite(intent, home = null, ring = 0) {
  let near = null, nd = 1e9;
  for (const o of run.foes) if (o.alive && (o.aware || o.group) && !o.def.still) { const d = dist(o); if (d < nd) { nd = d; near = o; } }
  const heart = run.hp < run.maxHp * 0.55 && run.heals.find((h) => Math.hypot(h.x - B.x, h.z - B.z) < 12);
  let wx = 0, wz = 0;
  if (heart) { wx = heart.x - B.x; wz = heart.z - B.z; }
  else if (near && nd < 7) {
    const ax = (B.x - near.px) / nd, az = (B.z - near.pz) / nd, away = nd < 4 ? 1 : 0.4;
    const side = Math.sin(run.time * 0.7 + seed) > 0 ? 1 : -1;
    wx = ax * away - az * side; wz = az * away + ax * side;
  } else wx = wz = 0;
  // Stay in the ring while tuning (drift back to the middle when out at its edge).
  if (home) {
    const hx = home.x - B.x, hz = home.z - B.z, hd = Math.hypot(hx, hz);
    if (hd > ring) { wx += hx / hd * 2; wz += hz / hd * 2; }
  }
  move(intent, wx, wz);
}

function step(intent) {
  run.step({ forward: 0, strafe: 0, jump: false, jumpPressed: false, usePressed: false, ...intent }, DT);
  minHp = Math.min(minHp, run.hp);
  for (const e of run.events) if (e.type === "respawn") { falls++; if (process.env.DEBUG) console.log("   fell from", lastPos.map((v) => v.toFixed(1)).join(", ")); }
  lastPos = [run.body.x, run.body.y, run.body.z];
  run.events.length = 0;
}

// Clear the glitches that have noticed you before going on (a while at most).
function clearAround(maxT = 25) {
  for (let i = 0; i < 60 * maxT; i++) {
    const after = run.foes.some((o) => o.alive && (o.aware || o.group) && dist(o) < 18);
    if (!after) return;
    const intent = {};
    aimAndFire(intent);
    kite(intent);
    step(intent);
  }
}

// Follow a route; false if it ended up back at a checkpoint on the way
// (a fall or a faint): the route has to start over from there.
function walk(route) {
  const f0 = falls, n0 = run.faints;
  for (const [x, z, jump] of route) {
    if (falls !== f0 || run.faints !== n0) return false;
    const sx = B.x, sz = B.z; let jumped = false, fights = 0;
    for (let i = 0; i < 900; i++) {
      const dx = x - B.x, dz = z - B.z;
      if (Math.hypot(dx, dz) < 0.45 && B.grounded) break;
      if (falls !== f0 || run.faints !== n0) return false;
      // Something has come for you: deal with it first.
      if (fights < 3 && run.foes.some((o) => o.alive && (o.aware || o.group) && !o.def.still && dist(o) < 9)) { fights++; clearAround(); continue; }
      B.yaw = Math.atan2(-dx, -dz); B.pitch = 0;
      const tr = Math.hypot(B.x - sx, B.z - sz);
      // Jump at the take-off point, or whenever it walks into a ledge.
      const j = B.grounded && ((jump && !jumped && tr >= 1.6) || (i > 10 && B.speed2D < 1));
      if (j) jumped = true;
      step({ forward: 1, jump: jumped && B.vy > 0, jumpPressed: j, toolTo: toolIndex("stabilizer") });
      B.yaw = Math.atan2(-(x - B.x), -(z - B.z));
    }
  }
  return true;
}

// The routes all start out from the middle of the dream. Standing at an
// anchor already fixed (where a faint puts you back, too), first walk its
// route back the other way.
function backToMiddle() {
  const at = run.anchors.find((o) => o.state === "fixed" && Math.hypot(o.x - B.x, o.z - B.z) < 12);
  if (at) walk(def.botRoutes[at.id].slice(0, -1).reverse());
}
function goTo(a, route) {
  for (let k = 0; k < 8 && Math.hypot(B.x - a.x, B.z - a.z) > 2.5; k++) { backToMiddle(); walk(route); }
}

// ── The dream ──
const t0 = run.time, rows = [];
for (const a of run.anchors) {
  const route = def.botRoutes[a.id];
  const ts = run.time, f0 = run.faints, fl0 = falls;
  goTo(a, route);
  const tWalk = run.time - ts;
  if (Math.hypot(B.x - a.x, B.z - a.z) > 2.5) { const r = route[route.length - 1]; B.place(r[0], run.kit.floorAt(r[0], r[1]), r[1]); }
  step({ usePressed: true });
  if (a.state !== "tuning") { console.log(a.id, "could not start tuning at", B.x.toFixed(1), B.z.toFixed(1)); continue; }
  let i = 0, rewalks = 0;
  const tt = run.time;
  while (a.state === "tuning" && i++ < 60 * 150) {
    const intent = {};
    // Drifted out of the dream and back at another anchor: walk back.
    if (Math.hypot(a.x - B.x, a.z - B.z) > a.ring + 3 && rewalks++ < 4) goTo(a, route);
    aimAndFire(intent);
    kite(intent, a, a.ring - 2);
    step(intent);
    if (process.env.DEBUG && i % 300 === 0) console.log("   tune", a.id, (i / 60) | 0, "p", a.progress.toFixed(2), "in", a.inside, "hp", run.hp | 0, "tool", run.activeTool.id, "foes", run.foes.filter((f) => f.alive).map((f) => f.kind[0]).join(""));
  }
  clearAround(15);
  rows.push(`${a.id.padEnd(8)} walk ${tWalk.toFixed(1)}s  tune ${(run.time - tt).toFixed(1)}s  ${a.state}  hp ${Math.round(run.hp)}  faints ${run.faints - f0}  falls ${falls - fl0}  dust ${run.dust}`);
  console.log(rows[rows.length - 1]);
}
// The boss.
if (def.boss) {
  // Back from the last anchor, out onto the arena.
  for (let k = 0; k < 4 && Math.hypot(B.x - def.boss.x, B.z - def.boss.z) > 12; k++) { backToMiddle(); walk([[def.boss.x, def.boss.z + 7]]); }
  const tb = run.time, f0 = run.faints;
  for (let i = 0; i < 60 * 240 && !run.won; i++) {
    const S = run.boss, intent = {};
    aimAndFire(intent);
    if (S?.alive) {
      const dx = B.x - S.x, dz = B.z - S.z, d = Math.hypot(dx, dz) || 1;
      // Back off while it sucks, circle otherwise; hop over the cord.
      const away = S.state === "suck" ? 1 : d < 6 ? 0.6 : d > 11 ? -0.6 : 0;
      move(intent, dx / d * away + (-dz / d) * 0.7, dz / d * away + (dx / d) * 0.7);
      if (S.ring && Math.abs(d - S.ring.r) < 1.6 && B.grounded) { intent.jumpPressed = true; intent.jump = true; }
      // Low and a heart about: get it.
      if (run.hp < run.maxHp * 0.4) kite(intent);
    }
    step(intent);
    if (process.env.DEBUG && i % 600 === 0) console.log("  t", (i / 60) | 0, "boss", S ? `${S.state} ${S.hp | 0} d${Math.hypot(S.x - B.x, S.z - B.z).toFixed(1)}` : "-", "hp", run.hp | 0, run.activeTool.id, "tank", run.tools[1]?.tank.length, "tgt", tgtRef?.kind ?? (tgtRef?.boss ? "boss" : "-"), tgtRef ? Math.hypot(tgtRef.px - B.x, tgtRef.pz - B.z).toFixed(1) : "", "you", B.x.toFixed(1), B.y.toFixed(1), B.z.toFixed(1), "near", run.foes.filter((f) => f.alive && dist(f) < 12).map((f) => f.kind + (f.group ?? "") + dist(f).toFixed(0)).join(" "));
  }
  console.log(`boss     ${run.won ? "down" : "NOT down"} after ${(run.time - tb).toFixed(1)}s  faints ${run.faints - f0}`);
}
console.log(`total ${(run.time - t0).toFixed(1)}s  popped ${run.stats.popped}  hits ${run.stats.hits}/${run.stats.shots}  dust ${run.dust}  min hp ${Math.round(minHp)}  hurt ${Math.round(hurtTotal)}  faints ${run.faints}  falls ${falls}  alive ${run.foes.filter((f) => f.alive).length}`);
