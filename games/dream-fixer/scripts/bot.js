// Plays a level headless: walks to each anchor, tunes it and fights off
// the waves (aiming at the nearest glitch in sight, easing off the trigger
// when the tool runs hot). Prints how long each anchor took and how hard
// it was. node scripts/bot.js [seed] [difficulty]
import { Run } from "../src/sim/run.js";
import { park } from "../src/levels/park.js";
import { DT } from "../src/config.js";

const seed = Number(process.argv[2] || 1), difficulty = process.argv[3] || "normal", skill = process.argv[4] || "casual";
// A casual player turns slower, reacts later and wobbles off target.
const SKILL = { sharp: { turn: 0.12, pitch: 0.08, react: 0, wobble: 0 }, casual: { turn: 0.06, pitch: 0.04, react: 0.35, wobble: 0.035 } }[skill];
let tgtRef = null, reactT = 0;
const run = new Run(park, { seed, difficulty, aimAssist: 0.03 });
const B = run.body;
let minHp = 100, hurtTotal = 0;
const origHurt = run.hurt.bind(run);
run.hurt = (a, x, z) => { const before = run.hp; origHurt(a, x, z); hurtTotal += Math.max(0, before - run.hp); };

function aimAndFire(intent) {
  const f = run.target(Math.PI, B.x, B.eyeY, B.z, run.aimDir()) || null;
  let best = null, bd = 1e9;
  for (const o of run.foes) {
    if (!o.alive) continue;
    const d = Math.hypot(o.px - B.x, o.pz - B.z);
    if (d < bd && run.canSee(o.px, o.cy, o.pz)) { bd = d; best = o; }
  }
  const s = run.spits[0];
  const want = s && Math.hypot(s.x - B.x, s.z - B.z) < 6 ? { px: s.x, cy: s.y, pz: s.z } : best;
  // Takes a moment to notice a new target.
  reactT -= DT;
  if (want !== tgtRef && (reactT <= 0 || !tgtRef?.alive)) { tgtRef = want; reactT = SKILL.react; }
  let tgt = reactT > 0 && SKILL.react ? null : tgtRef;
  const S = run.boss;
  if ((!tgt || tgt.alive === false) && S?.alive && !S.invulnerable) tgt = { px: S.x, cy: S.y + 1.4, pz: S.z };
  if (!tgt || tgt.alive === false) return;
  const dx = tgt.px - B.x, dy = tgt.cy - B.eyeY, dz = tgt.pz - B.z;
  // Human-ish: turn towards it at a limited rate, fire when roughly on it.
  const wob = Math.sin(run.time * 2.3) * SKILL.wobble, wobP = Math.cos(run.time * 1.7) * SKILL.wobble * 0.6;
  const yaw = Math.atan2(-dx, -dz) + wob, pitch = Math.atan2(dy, Math.hypot(dx, dz)) + wobP;
  let d = Math.atan2(Math.sin(yaw - B.yaw), Math.cos(yaw - B.yaw));
  B.yaw += Math.max(-SKILL.turn, Math.min(SKILL.turn, d));
  B.pitch += Math.max(-SKILL.pitch, Math.min(SKILL.pitch, pitch - B.pitch));
  const tool = run.activeTool;
  intent.fire = Math.abs(d) < 0.2 && tool.heat < 0.85 && !tool.overheated;
  void f;
}

function step(intent) {
  run.step({ forward: 0, strafe: 0, jump: false, jumpPressed: false, usePressed: false, toolTo: 0, ...intent }, DT);
  minHp = Math.min(minHp, run.hp);
  run.events.length = 0;
}

function walk(route) {
  for (const [x, z, jump] of route) {
    const sx = B.x, sz = B.z; let jumped = false;
    for (let i = 0; i < 900; i++) {
      const dx = x - B.x, dz = z - B.z;
      if (Math.hypot(dx, dz) < 0.45 && B.grounded) break;
      B.yaw = Math.atan2(-dx, -dz); B.pitch = 0;
      const tr = Math.hypot(B.x - sx, B.z - sz);
      // Jump at the take-off point, or whenever it walks into a ledge.
      const j = B.grounded && ((jump && !jumped && tr >= 1.6) || (i > 10 && B.speed2D < 1));
      if (j) jumped = true;
      step({ forward: 1, jump: jumped && B.vy > 0, jumpPressed: j });
    }
  }
}

const t0 = run.time;
for (const a of run.anchors) {
  const route = park.botRoutes[a.id];
  const ts = run.time;
  walk(route);
  const tWalk = run.time - ts;
  // A faint mid-route leaves the bot back at the checkpoint: just put it there.
  if (Math.hypot(B.x - a.x, B.z - a.z) > 2.5) { const r = route[route.length - 1]; B.place(r[0], run.kit.floorAt(r[0], r[1]), r[1]); }
  step({ usePressed: true });
  if (a.state !== "tuning") { console.log(a.id, "could not start tuning at", B.x.toFixed(1), B.z.toFixed(1)); continue; }
  let i = 0;
  while (a.state === "tuning" && i++ < 60 * 120) {
    const intent = {};
    // Stay in the ring: drift back towards the anchor, strafing.
    const dx = a.x - B.x, dz = a.z - B.z, d = Math.hypot(dx, dz);
    aimAndFire(intent);
    const sn = Math.sin(B.yaw), cs = Math.cos(B.yaw);
    const wantX = d > 3.5 ? dx / d : 0, wantZ = d > 3.5 ? dz / d : 0;
    intent.forward = -sn * wantX - cs * wantZ;
    intent.strafe = cs * wantX - sn * wantZ + Math.sin(run.time * 0.8) * 0.6;
    step(intent);
  }
  // Mop up what is left of the ambient glitches nearby.
  console.log(`${a.id.padEnd(8)} walk ${tWalk.toFixed(1)}s  tune ${(i / 60).toFixed(1)}s  ${a.state}  hp ${Math.round(run.hp)}  faints ${run.faints}`);
}
// The boss.
const tb = run.time;
for (let i = 0; i < 60 * 240 && !run.won; i++) {
  const S = run.boss, intent = {};
  aimAndFire(intent);
  if (S) {
    const dx = B.x - S.x, dz = B.z - S.z, d = Math.hypot(dx, dz) || 1;
    // Back off while it sucks, circle otherwise; hop over the cord.
    const sn = Math.sin(B.yaw), cs = Math.cos(B.yaw);
    const away = S.state === "suck" ? 1 : d < 6 ? 0.6 : d > 11 ? -0.6 : 0;
    const wx = dx / d * away + (-dz / d) * 0.7, wz = dz / d * away + (dx / d) * 0.7;
    intent.forward = -sn * wx - cs * wz; intent.strafe = cs * wx - sn * wz;
    if (S.ring && Math.abs(d - S.ring.r) < 1.6 && B.grounded) { intent.jumpPressed = true; intent.jump = true; }
  }
  step(intent);
}
console.log(`boss     ${run.won ? "down" : "NOT down"} after ${(run.time - tb).toFixed(1)}s  faints ${run.faints}`);
console.log(`total ${(run.time - t0).toFixed(1)}s  popped ${run.stats.popped}  hits ${run.stats.hits}/${run.stats.shots}  dust ${run.dust}  min hp ${Math.round(minHp)}  hurt ${Math.round(hurtTotal)}  faints ${run.faints}  alive ${run.foes.filter((f) => f.alive).length}`);
