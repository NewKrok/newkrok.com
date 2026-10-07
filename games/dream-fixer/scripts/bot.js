// Plays a dream headless: walks to each anchor (clearing what comes for it
// on the way), tunes it and fights off the waves, then the boss. It fights
// like a player would: the Stabilizer by default, the Fuzz Vacuum on small
// glitches up close (and their catch shot back at the big ones, or into
// the boss's nozzle), the Lullaby Bell on the Pressure Cooker's lid, the
// Gust Umbrella on whatever is right in its face (and to glide and ride
// updrafts where a route says so), the Star Yo-Yo's lasso to ride star
// handles where a route says so and to pull the Moon Lamp down by its chain,
// backing off and circling instead of standing in a crowd, jumping the
// rings that run along the floor, going for a pink heart when low. Prints
// how long each part took and how hard it was.
//
//   node scripts/bot.js [seed] [difficulty] [skill] [level]
//   skill: casual (slower, wobbly aim, reacts late) or sharp
import { Run } from "../src/sim/run.js";
import { LEVELS } from "../src/levels/index.js";
import { World } from "../src/sim/world.js";
import { DT } from "../src/config.js";
import { TOOLS } from "../src/sim/tools.js";

const seed = Number(process.argv[2] || 1), difficulty = process.argv[3] || "normal", skill = process.argv[4] || "casual";
const def = LEVELS[process.argv[5] || "park"];
if (!def?.botRoutes) { console.log("no bot routes for that level"); process.exit(1); }
const SKILL = { sharp: { turn: 0.12, pitch: 0.08, react: 0, wobble: 0 }, casual: { turn: 0.08, pitch: 0.05, react: 0.25, wobble: 0.03 } }[skill];
const SMALL = new Set(["fuzz", "bunny", "buzzer", "clock", "pencil", "meatball", "pepper", "gnome", "slinger", "ticket", "can", "rocket", "robot"]), BIG = new Set(["tub", "knot", "backpack", "sharpener", "rollingpin", "grinder", "mower", "sunflower", "top", "mobile"]);

// A dream starts with the Stabilizer only; its own tool comes after the first anchor.
const run = new Run(def, { seed, difficulty, aimAssist: 0.03, tools: def.tools ?? ["stabilizer"] });
const B = run.body;
let minHp = 1e9, hurtTotal = 0, falls = 0, lastPos = [0, 0, 0];
const origHurt = run.hurt.bind(run);
run.hurt = (a, x, z, g) => { const before = run.hp; origHurt(a, x, z, g); hurtTotal += Math.max(0, before - run.hp); if (process.env.HURT && run.boss && before > run.hp) console.log("   hurt", (before - run.hp).toFixed(1), run.boss.state, new Error().stack.split("\n")[3].trim().slice(0, 70)); };

// ── Looking and shooting ──
let tgtRef = null, reactT = 0, wantTool = "stabilizer", wantT = 0, altT = 0, chainCd = 0;
const dist = (o) => Math.hypot(o.px - B.x, o.pz - B.z);
const toolIndex = (id) => run.tools.findIndex((t) => t.id === id);
const key = (o) => (o ? o.id ?? (o.orb ? "orb" : o.nozzle ? "nozzle" : "boss") : null);

// The glitch (or orb) most worth shooting: an orb about to hit, else the
// nearest in sight (a knot counts as much nearer), else the boss.
function pickTarget() {
  const s = run.spits.find((o) => !o.harmless && Math.hypot(o.x - B.x, o.z - B.z) < 6);
  if (s) return { px: s.x, cy: s.y, pz: s.z, orb: true };
  // The Pressure Cooker's lid loose: that, before anything else.
  const C = run.boss;
  if (C?.alive && C.kind === "cooker" && C.state === "loose" && Math.hypot(C.x - B.x, C.z - B.z) < 12) { const [x, y, z] = C.hitSpheres()[1]; return { px: x, cy: y, pz: z, boss: true }; }
  let best = null, bd = 1e9, stone = null;
  for (const o of run.foes) {
    if (!o.alive || o.state === "spawn") continue;
    // A gnome gone to stone is not worth shooting: look away and let it come.
    if (o.state === "stone") { if (!stone || dist(o) < dist(stone)) stone = o; continue; }
    // A knot keeps spinning out more: it goes first unless something is on top of you.
    const d = dist(o) * (o.kind === "knot" ? 0.3 : 1);
    if (d < bd && d < 40 && run.canSee(o.px, o.cy, o.pz)) { bd = d; best = o; }
  }
  if (!best && stone && dist(stone) < 18) return { away: stone, px: stone.px, cy: stone.cy, pz: stone.pz, id: "away" };
  const S = run.boss;
  if ((!best || bd > 12) && S?.alive && !S.invulnerable) {
    // Its nozzle while it sucks and the tank holds something to clog it with.
    const vac = run.tools[toolIndex("vacuum")];
    if (S.state === "suck" && vac?.tank.length) return { px: S.nozzle[0], cy: S.nozzle[1], pz: S.nozzle[2], boss: true, nozzle: true };
    // The Red Pen: foam on its nib till it is blotted, then shoot.
    const foam = run.tools[toolIndex("foam")];
    if (S.kind === "pen" && S.state === "tired" && foam && !foam.overheated && Math.hypot(S.x - B.x, S.z - B.z) < 11) { const [x, y, z] = S.hitSpheres()[0]; return { px: x, cy: y, pz: z, boss: true, nib: true }; }
    // Its weakest spot (the highest damage multiplier).
    const [x, y, z] = S.hitSpheres().reduce((a, b) => (b[4] > a[4] ? b : a));
    return { px: x, cy: y, pz: z, boss: true };
  }
  return best;
}

// Which tool, by how things stand (not by the target of the moment, so
// it does not flap): the vacuum with a crowd of small ones close or a
// catch to shoot at a big one, the Stabilizer otherwise.
function toolFor(tgt) {
  // The Pressure Cooker: ring its lid off with the bell, then shoot inside.
  const S = run.boss;
  if (tgt?.boss && S?.kind === "cooker" && S.state === "loose" && toolIndex("bell") >= 0 && !run.tools[toolIndex("bell")].overheated && Math.hypot(S.x - B.x, S.z - B.z) < 9) return "bell";
  if (tgt?.nib) return "foam";
  // Something right in your face (not a flyer): the umbrella's gust.
  const umb = run.tools[toolIndex("umbrella")];
  if (umb && !umb.overheated && tgt && !tgt.orb && !tgt.boss && !tgt.def?.fly && dist(tgt) < 3.8) return "umbrella";
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
  // Turned away from a stone gnome, waiting for it to come.
  if (tgt?.away) {
    const a = Math.atan2(tgt.px - B.x, tgt.pz - B.z), d = Math.atan2(Math.sin(a - B.yaw), Math.cos(a - B.yaw));
    B.yaw += Math.max(-SKILL.turn, Math.min(SKILL.turn, d));
    return null;
  }
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
  if (tool.id === "bell" || tool.id === "umbrella") intent.fire = on && !tool.overheated;
  else if (tool.id === "vacuum") {
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
  let wx, wz;
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
  // A ring running along the floor about to reach you: jump it.
  if (B.grounded && run.shocks.some((s) => { const d = Math.hypot(B.x - s.x, B.z - s.z); return d > s.r && d - s.r < 1.2 && B.y - s.y < 0.45; })) { intent.jumpPressed = true; intent.jump = true; }
  run.step({ forward: 0, strafe: 0, jump: false, jumpPressed: false, usePressed: false, ...intent }, DT);
  minHp = Math.min(minHp, run.hp);
  for (const e of run.events) if (e.type === "respawn" && !e.pulled) { falls++; if (process.env.DEBUG) console.log("   fell from", lastPos.map((v) => v.toFixed(1)).join(", ")); }
  if (process.env.DEBUG && run.body.y < -0.5 && lastPos[1] >= -0.5) console.log("   dropping at", lastPos.map((v) => v.toFixed(2)).join(", "), "v", run.body.vx.toFixed(1), run.body.vz.toFixed(1), "t", run.time.toFixed(1));
  lastPos = [run.body.x, run.body.y, run.body.z];
  run.events.length = 0;
}

// Clear the glitches that have noticed you before going on (a while at most).
function clearAround(maxT = 25) {
  for (let i = 0; i < 60 * maxT; i++) {
    const after = run.foes.some((o) => o.alive && (o.aware || o.group) && dist(o) < 18 && run.canSee(o.px, o.cy, o.pz));
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
  for (const p of route) {
    const [x, z, jump] = p;
    if (falls !== f0 || run.faints !== n0) return false;
    // The sand sack: face (x, z), tip the view, pour a path.
    if (x === "sand") { sandPath(p[1], p[2], p[3]); continue; }
    // A lock Cog opens: wait for him (fighting what comes meanwhile).
    if (x === "gate") { const g = run.gates.find((o) => o.id === z); for (let i = 0; i < 60 * 12 && g && !g.open; i++) { const it = {}; aimAndFire(it); step(it); } continue; }
    // A foam step to climb: set where a well-aimed blob would land, on
    // whatever is there (the floor, or a step already standing).
    if (x === "foam") { foamStep(z, jump); continue; }
    // The umbrella: a glide over a gap, a gust at a pinwheel, a ride up an updraft.
    if (x === "glide") { if (!glide(z, jump)) return false; continue; }
    if (x === "gust") { gustAt(z); continue; }
    if (x === "draft") { draft(z); continue; }
    // The yo-yo: lasso a star handle and ride the string to it.
    if (x === "hook") { if (!hookTo(z)) return false; continue; }
    // Something the bell sets off (a soufflé, a jelly): rung, as if from here.
    if (x === "bell") { const g = run.ringables.find((o) => o.id === z); if (g) { run.bell.setOff(run, g); if (g.kind === "jelly") g.wobbleT = 30; step({}); } continue; }
    const sx = B.x, sz = B.z; let jumped = false, fights = 0;
    for (let i = 0; i < 900; i++) {
      const dx = x - B.x, dz = z - B.z;
      if (Math.hypot(dx, dz) < 0.45 && B.grounded) break;
      if (falls !== f0 || run.faints !== n0) return false;
      // Something has come for you: deal with it first.
      if (fights < 3 && run.foes.some((o) => o.alive && (o.aware || o.group) && !o.def.still && dist(o) < 9 && run.canSee(o.px, o.cy, o.pz))) { fights++; clearAround(); continue; }
      B.yaw = Math.atan2(-dx, -dz); B.pitch = 0;
      const tr = Math.hypot(B.x - sx, B.z - sz);
      // Jump at the take-off point, or whenever it walks into a ledge.
      const j = B.grounded && ((jump && !jumped && tr >= 1.6) || (i > 10 && B.speed2D < 1));
      if (j) jumped = true;
      step({ forward: 1, jump: jumped && B.vy > 0, jumpPressed: j, toolTo: toolIndex("stabilizer") });
      B.yaw = Math.atan2(-(x - B.x), -(z - B.z));
      if (process.env.DEBUG && i === 899) console.log("   stuck walking to", x, z, "at", B.x.toFixed(1), B.y.toFixed(1), B.z.toFixed(1), run.world.query(B.x, B.z, 0.6).map((c) => `${c.kind}/${c.tag}@${c.x.toFixed(1)},${c.z.toFixed(1)} y${c.y0}-${c.y1.toFixed(2)}`).join(" "));
    }
  }
  return true;
}

const holdUmbrella = () => {
  const ui = toolIndex("umbrella");
  if (ui < 0 || run.tool === ui) return ui >= 0;
  step({ toolTo: ui });
  for (let i = 0; i < 20; i++) step({ alt: !B.grounded });
  return true;
};

// Run at the edge facing (x, z), jump off it with the umbrella open, glide
// there, land. (Already in the air, off the top of an updraft: glide on.)
function glide(x, z) {
  if (!holdUmbrella()) return false;
  const f0 = falls;
  let air = !B.grounded;
  for (let i = 0; i < 900; i++) {
    if (falls !== f0) return false;
    const dx = x - B.x, dz = z - B.z, d = Math.hypot(dx, dz);
    if (air && B.grounded) return true;
    if (!air && d < 0.6) return true;
    B.yaw = Math.atan2(-dx, -dz); B.pitch = 0;
    const edge = B.grounded && ground(B.x - Math.sin(B.yaw), B.z - Math.cos(B.yaw), B.y) < B.y - 1.5;
    if (!B.grounded) air = true;
    step({ forward: d > 0.6 ? 1 : 0, alt: air || edge, jumpPressed: edge, jump: edge || (air && B.vy > 0) });
  }
  return true;
}

// Lasso a star handle (the yo-yo's right click: a press) and ride the
// string to it; it lets go at the end, and the next step of the route
// steers on from there (another handle, or a landing).
function hookTo(id) {
  const h = run.yoyo.hooks.find((o) => o.id === id), yi = toolIndex("yoyo");
  if (!h || yi < 0) return false;
  if (run.tool !== yi) { step({ toolTo: yi }); for (let i = 0; i < 19; i++) step({ jump: B.vy > 0 }); }
  const f0 = falls;
  for (let i = 0; i < 90 && !run.yoyo.reeling; i++) {
    if (falls !== f0) return false;
    const [hx, hy, hz] = [h.x, h.y, h.z], dx = hx - B.x, dz = hz - B.z;
    B.yaw = Math.atan2(-dx, -dz); B.pitch = Math.atan2(hy - B.eyeY, Math.hypot(dx, dz));
    step({ alt: i % 2 === 0 && !run.yoyo.ball, jump: B.vy > 0 });
  }
  if (!run.yoyo.reeling) return false;
  for (let i = 0; i < 300 && run.yoyo.reeling; i++) step({});
  return falls === f0;
}

// A gust at a pinwheel from where you stand.
function gustAt(id) {
  const w = run.umbrella.wheels.find((o) => o.id === id);
  if (!w || !holdUmbrella()) return;
  for (let i = 0; i < 90 && !(w.spinT > 0); i++) {
    const dx = w.x - B.x, dy = w.y + w.h - B.eyeY, dz = w.z - B.z;
    B.yaw = Math.atan2(-dx, -dz); B.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    step({ fire: true });
  }
}

// Onto an updraft's well, then up it with the umbrella open to near its top.
function draft(id) {
  const d = run.umbrella.drafts.find((o) => o.id === id);
  if (!d) return;
  walk([[d.x, d.z]]);
  if (!holdUmbrella()) return;
  for (let i = 0; i < 600; i++) {
    step({ alt: true });
    if (B.y > d.top - 1.8 && Math.abs(B.vy) < 1.5) break;
  }
}

function sandPath(x, z, pitch) {
  const si = toolIndex("sand");
  if (si < 0) return;
  if (run.tool !== si) { step({ toolTo: si }); for (let i = 0; i < 19; i++) step({}); }
  for (let i = 0; i < 120 && run.activeTool.overheated; i++) step({});
  B.yaw = Math.atan2(-(x - B.x), -(z - B.z)); B.pitch = pitch;
  step({ alt: true });
  step({});
  B.pitch = 0;
}

function foamStep(x, z) {
  const S = run.tools.find((t) => t.id === "foam")?.def.step ?? TOOLS.foam.step;
  run.foam.set(run, S, x, ground(x, z, B.y + 1.5), z, 0, 1, 0);
  step({});
}

// The routes all start out from the middle of the dream. Standing at an
// anchor already fixed (where a faint puts you back, too), first walk its
// route back the other way.
function backToMiddle() {
  const at = run.anchors.find((o) => o.state === "fixed" && Math.hypot(o.x - B.x, o.z - B.z) < 12);
  if (at && def.botBack?.[at.id]) walk(def.botBack[at.id]);
  else if (at) walk(def.botRoutes[at.id].filter((p) => typeof p[0] === "number").slice(0, -1).reverse());
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
    if (Math.hypot(a.x - B.x, a.z - B.z) > a.ring + 3 && rewalks++ < 8) goTo(a, route);
    // Fallen off a ledge the anchor stands on: climb back up the end of the route.
    else if (B.y < a.y - 2 && B.grounded && rewalks++ < 8) { const k = route.findIndex((p) => typeof p[0] === "string"); walk(route.slice(Math.max(0, k - 1))); }
    aimAndFire(intent);
    kite(intent, a, a.ring - 2);
    step(intent);
    if (process.env.DEBUG && i % 300 === 0) console.log("   tune", a.id, (i / 60) | 0, "p", a.progress.toFixed(2), "in", a.inside, "hp", run.hp | 0, "at", B.x.toFixed(1), B.y.toFixed(1), B.z.toFixed(1), "d", Math.hypot(a.x - B.x, a.z - B.z).toFixed(1), "tool", run.activeTool.id, "foes", run.foes.filter((f) => f.alive).map((f) => f.kind.slice(0, 2)).join(""));
  }
  clearAround(15);
  rows.push(`${a.id.padEnd(8)} walk ${tWalk.toFixed(1)}s  tune ${(run.time - tt).toFixed(1)}s  ${a.state}  hp ${Math.round(run.hp)}  faints ${run.faints - f0}  falls ${falls - fl0}  dust ${run.dust}`);
  console.log(rows[rows.length - 1]);
}
// The boss.
if (def.boss) {
  // Back from the last anchor, out onto the arena.
  const intoArena = () => { for (let k = 0; k < 4 && !run.boss && run.coreT < 0 && !run.won; k++) { backToMiddle(); walk(def.botBoss ?? [[def.boss.x, def.boss.z + 7]]); } };
  intoArena();
  const tb = run.time, f0 = run.faints;
  let tries = 1;
  for (let i = 0; i < 60 * 300 && !run.won; i++) {
    // Fainted: the fight starts over once it walks back in.
    if (!run.boss && run.coreT < 0) { tries++; intoArena(); }
    const S = run.boss, intent = {};
    // The Big Alarm Clock's key: close by, jump, a gust at your feet for a
    // lift, then a gust at the key.
    if (S?.alive && S.kind === "bigclock" && S.state === "loose" && keyTry(S)) continue;
    // The Moon Lamp's pull-chain: the lasso, now and then, from a few metres.
    if (S?.alive && S.kind === "moon" && S.state === "doze" && chainTry(S)) continue;
    aimAndFire(intent);
    if (S?.alive) {
      const dx = B.x - S.x, dz = B.z - S.z, d = Math.hypot(dx, dz) || 1;
      // Back off while it sucks, circle otherwise; hop over the cord.
      let away = S.state === "suck" ? 1 : d < 6 ? 0.6 : d > 11 ? -0.6 : 0;
      // The Big Alarm Clock: close in for a go at its key (not while its hands sweep).
      if (S.kind === "bigclock" && toolIndex("umbrella") >= 0 && S.state === "loose") away = d < 2.4 ? 0.6 : d > 3.4 ? -0.9 : 0;
      // The Pressure Cooker's lid loose: in, within the bell's reach.
      if (S.kind === "cooker" && S.state === "loose") away = d > 5 ? -1 : 0;
      // A strike lining up on you: step sideways out of its track.
      const side = S.state === "aim" ? 2 : 0.7;
      move(intent, dx / d * away + (-dz / d) * side, dz / d * away + (dx / d) * side);
      if (S.ring && Math.abs(d - S.ring.r) < 1.6 && B.grounded) { intent.jumpPressed = true; intent.jump = true; }
      // Any ring running along the floor about to reach you: jump it.
      if (B.grounded && run.shocks.some((r) => !r.hit && Math.hypot(B.x - r.x, B.z - r.z) - r.r < 1.4 && Math.hypot(B.x - r.x, B.z - r.z) > r.r)) { intent.jumpPressed = true; intent.jump = true; }
      // A steam jet sweeping round at you: jump it.
      if (S.jets?.some((a) => Math.abs(Math.atan2(Math.sin(Math.atan2(-(B.x - S.x), -(B.z - S.z)) - a), Math.cos(Math.atan2(-(B.x - S.x), -(B.z - S.z)) - a))) < 0.45) && d < 11 && B.grounded) { intent.jumpPressed = true; intent.jump = true; }
      // A spotlight on you: out of the circle.
      for (const m of S.marks ?? []) { const mx = B.x - m[0], mz = B.z - m[2], md = Math.hypot(mx, mz) || 1; if (md < m[3] + 1.2) move(intent, mx / md, mz / md); }
      // Its landing spot: get out from under.
      if (S.mark) { const mx = B.x - S.mark[0], mz = B.z - S.mark[2], md = Math.hypot(mx, mz) || 1; if (md < S.mark[3] + 1) move(intent, mx / md, mz / md); }
      // Low and a heart about: get it.
      if (run.hp < run.maxHp * 0.4) kite(intent);
      // A slab about to fall under you: off it, onto one that holds. Falling
      // already: open the umbrella and glide to one.
      if (run.tiles.length) {
        const on = (p) => Math.abs(B.x - p.x) < p.w / 2 && Math.abs(B.z - p.z) < p.d / 2;
        const under = run.tiles.find(on), falling = !B.grounded && B.y < -0.4;
        if ((under && under.state === "warn") || falling) {
          const safe = run.tiles.filter((p) => p.state === "set" && p !== under).sort((a, c) => Math.hypot(a.x - B.x, a.z - B.z) - Math.hypot(c.x - B.x, c.z - B.z))[0];
          if (safe) {
            const sx = safe.x - B.x, sz = safe.z - B.z, sl = Math.hypot(sx, sz) || 1, sn = Math.sin(B.yaw), cs = Math.cos(B.yaw);
            intent.forward = (-sn * sx - cs * sz) / sl; intent.strafe = (cs * sx - sn * sz) / sl;
          }
          if (falling) { intent.toolTo = toolIndex("umbrella"); intent.alt = true; intent.fire = false; }
        }
      }
    }
    step(intent);
    if (process.env.DEBUG && i % 600 === 0) console.log("  t", (i / 60) | 0, "boss", S ? `${S.state} ${S.hp | 0} d${Math.hypot(S.x - B.x, S.z - B.z).toFixed(1)}` : "-", "hp", run.hp | 0, run.activeTool.id, "tank", run.tools[1]?.tank.length, "tgt", tgtRef?.kind ?? (tgtRef?.boss ? "boss" : "-"), tgtRef ? Math.hypot(tgtRef.px - B.x, tgtRef.pz - B.z).toFixed(1) : "", "you", B.x.toFixed(1), B.y.toFixed(1), B.z.toFixed(1), "near", run.foes.filter((f) => f.alive && dist(f) < 12).map((f) => f.kind + (f.group ?? "") + dist(f).toFixed(0)).join(" "));
  }
  console.log(`boss     ${run.won ? "down" : "NOT down"} after ${(run.time - tb).toFixed(1)}s  faints ${run.faints - f0}  tries ${tries}`);
}
// One go at the Moon Lamp's chain with the lasso (true if it threw).
function chainTry(S) {
  chainCd -= DT;
  const yi = toolIndex("yoyo"), [x, y, z] = S.hitSpheres()[0], d = Math.hypot(x - B.x, y - B.eyeY, z - B.z);
  if (yi < 0 || chainCd > 0 || d > 10 || run.tools[yi].overheated || !run.canSee(x, y, z) || (S.marks?.length && S.marks.some((m) => Math.hypot(B.x - m[0], B.z - m[2]) < m[3] + 1))) return false;
  chainCd = 2 + Math.random();
  if (run.tool !== yi) { step({ toolTo: yi }); for (let i = 0; i < 19; i++) step({}); }
  for (let i = 0; i < 40; i++) {
    const [cx, cy, cz] = S.hitSpheres()[0];
    B.yaw = Math.atan2(-(cx - B.x), -(cz - B.z)); B.pitch = Math.atan2(cy - B.eyeY, Math.hypot(cx - B.x, cz - B.z));
    step({ alt: i === 0 || i === 6 });
    if (S.tethered) break;
  }
  return true;
}

// One go at the Big Alarm Clock's key (true if it tried).
function keyTry(S) {
  const ui = toolIndex("umbrella"), d = Math.hypot(S.x - B.x, S.z - B.z);
  if (ui < 0 || !B.grounded || d < 2.3 || d > 3.6 || run.tools[ui].overheated || Math.abs(B.y - S.y) > 0.5) return false;
  if (run.tool !== ui) { step({ toolTo: ui }); for (let i = 0; i < 19; i++) step({}); }
  step({ jumpPressed: true, jump: true });
  let hopped = false;
  for (let i = 0; i < 70 && !B.grounded; i++) {
    const intent = { jump: true };
    if (!hopped && B.vy < 2.5) { B.pitch = -1.3; intent.fire = true; hopped = true; }
    else if (hopped) {
      const [x, y, z] = S.hitSpheres()[0];
      B.yaw = Math.atan2(-(x - B.x), -(z - B.z)); B.pitch = Math.atan2(y - B.eyeY, Math.hypot(x - B.x, z - B.z));
      intent.fire = run.activeTool.cd <= 0;
    }
    step(intent);
    if (S.state === "unwound") break;
  }
  return true;
}

console.log(`total ${(run.time - t0).toFixed(1)}s  popped ${run.stats.popped}  hits ${run.stats.hits}/${run.stats.shots}  dust ${run.dust}  min hp ${Math.round(minHp)}  hurt ${Math.round(hurtTotal)}  faints ${run.faints}  falls ${falls}  alive ${run.foes.filter((f) => f.alive).length}`);
