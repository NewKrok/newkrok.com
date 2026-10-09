import * as T from "three";
import { make } from "./modelkit.js";
import { MODELS } from "./models/index.js";
import { GUNS, GUN_RIG, RIG } from "./models/characters.js";
import { angDiff, clamp, lerp, damp } from "../config.js";

// ── A ranger figure, posed procedurally ──────────────────────────────────
// The gun leads: every stance is a place and a tilt for the gun in the
// torso's frame (low ready, aimed at the shoulder, slung low for a sprint,
// up against the chest in cover, tilted for a reload, lying on the ground
// when downed), and the two arms reach for it with a two-bone IK: the
// right hand on the grip, the left on the fore-end, or on the magazine,
// the belt pouch and the charging handle during a reload, or let go for a
// swap. The legs swing with the stride, the torso leans, the head looks
// where the aim is. The other weapon rides on the back or in the holster.

const _S = new T.Vector3(), _H = new T.Vector3(), _u = new T.Vector3(), _p = new T.Vector3(), _e = new T.Vector3();
const _x = new T.Vector3(), _y = new T.Vector3(), _z = new T.Vector3(), _d = new T.Vector3(), _m = new T.Matrix4();
const _v = new T.Vector3(), _w = new T.Vector3(), _eu = new T.Euler();

// Two-bone IK in the torso's frame. `arm` hangs −y from the shoulder S,
// `fore` sits at −L1 on it and also hangs −y with the palm at −L2. Turns
// both so the palm lands on H, the elbow toward `pole`.
function reachArm(arm, fore, S, H, pole, L1 = RIG.upper, L2 = RIG.fore) {
  _u.subVectors(H, S);
  let d = _u.length();
  const maxD = L1 + L2 - 0.004;
  if (d > maxD) { _u.multiplyScalar(maxD / d); d = maxD; }
  if (d < 0.05) { _u.set(0, -0.05, 0); d = 0.05; }
  _H.copy(S).add(_u);
  _u.normalize();
  _p.copy(pole).addScaledVector(_u, -pole.dot(_u));
  if (_p.lengthSq() < 1e-6) _p.set(0, 0, 1).addScaledVector(_u, -_u.z);
  _p.normalize();
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  _e.copy(S).addScaledVector(_u, L1 * cosA).addScaledVector(_p, L1 * sinA);
  // Upper arm: −y to the elbow, z toward the elbow's side (the pad), so
  // the forearm bends about x toward −z.
  _y.subVectors(S, _e).normalize();
  _z.copy(_p).addScaledVector(_y, -_p.dot(_y)).normalize();
  _x.crossVectors(_y, _z).normalize();
  arm.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
  _d.subVectors(_H, _e).normalize();
  fore.rotation.set(Math.acos(clamp(-_y.dot(_d), -1, 1)), 0, 0);
}

// Gun stances: position and [rx, ry, rz] (YXZ) in the torso's frame. The
// arms are short (0.59 m from the shoulder), so every stance keeps the
// fore-end within the left hand's reach.
const POSE = {
  // Low ready: at the chest, held clear of the chest plate, the muzzle
  // down and across to the left (the fore-end near the left hip).
  ready: { p: [0.14, 0.32, -0.3], r: [-0.75, 0.95, -0.15] },
  crouch: { p: [0.13, 0.3, -0.28], r: [-0.8, 1.0, -0.15] },
  sprint: { p: [0.08, 0.3, -0.27], r: [-1.0, 0.75, 0.0] },        // slung low, across the body
  cover: { p: [0.12, 0.32, -0.27], r: [1.2, 0.1, 0.0] },          // up against the chest, muzzle high
  reload: { p: [0.08, 0.28, -0.28], r: [-0.45, 0.35, -0.5] },     // tilted so the magazine well faces the left hand
  stow: { p: [0.3, 0.08, 0.2], r: [1.5, 2.6, 0.3] },                // a long gun goes to the right hip, outside, muzzle up (the swap's midpoint)
  stowShort: { p: [0.24, -0.08, -0.06], r: [-1.4, 0, 0] },          // a pistol goes to the holster
  down: { p: [0.3, 0.55, -0.15], r: [1.4, 0, 0] },                // lying forward on the ground
  idlePistol: { p: [0.26, 0.1, -0.14], r: [-1.2, 0, 0] },         // by the leg, muzzle down
};
// Aiming: the stock stays at the shoulder (the pistol: arms out in front);
// the gun pitches and yaws about that pivot. The torso turns sideways a
// little ("bladed"), which brings the left shoulder forward to the fore-end.
const AIM = {
  long: { pivot: [0.24, 0.46, 0.0], grip: [0, -0.08, -0.17], blade: 0.5 },
  short: { pivot: [0.1, 0.4, 0.0], grip: [0, -0.02, -0.4], blade: 0.3 },
};
const REST_L = [-0.32, -0.1, -0.06];                               // a free left hand hangs
const POLE_R = new T.Vector3(0.35, -0.8, 0.7), POLE_L = new T.Vector3(-0.6, -0.8, 0.1);

export const SWAP_TIME = 0.45;

export class RangerFigure {
  constructor(scene, skin, slots = ["rifle", "pistol"]) {
    this.obj = make(MODELS.ranger, { skin });
    this.n = this.obj.userData.nodes;
    this.guns = {};
    // A model per weapon, in hand (child of the gun node) or parked on
    // the back or in the holster.
    for (const [id, fn] of Object.entries(GUNS)) {
      const g = make(fn);
      g.visible = false;
      this.n.gun.add(g);
      this.guns[id] = g;
      const mag = g.userData.nodes.mag, bolt = g.userData.nodes.bolt;
      if (mag) mag.userData.p0 = mag.position.clone();
      if (bolt) bolt.userData.p0 = bolt.position.clone();
    }
    this.n.magL.visible = false;
    this.shown = slots[0] ?? null;
    this.slots = slots;
    this.swap = null;             // { from, to }
    this.gp = new T.Vector3(...POSE.ready.p); this.gr = [...POSE.ready.r];
    this.lt = new T.Vector3();    // the left hand's current target
    this.ltK = 0;
    this.down = 0; this.breath = Math.random() * 6;
    this.headYaw = 0; this.headPitch = 0;
    this.reach = null;
    scene?.add(this.obj);
  }
  set visible(v) { this.obj.visible = v; }

  // Where the muzzle of the gun in hand is (world), from the last pose.
  muzzle(out = [0, 0, 0]) {
    const rig = GUN_RIG[this.shown];
    if (!rig) return out;
    _v.set(...rig.muzzle).applyMatrix4(this.n.gun.matrixWorld);
    out[0] = _v.x; out[1] = _v.y; out[2] = _v.z;
    return out;
  }

  // s: { body, face, yaw, pitch, aimK, crouchK, moveK, stepPhase, firing,
  // recoil, downed, gun, slots, sprint, reloadK (0…1 or -1), swapT, cover
  // ("low" | "high" | null), reach (world point for the free hand or null) }
  pose(s, a, dt, t) {
    const n = this.n, b = s.body;
    this.obj.position.set(b.px + (b.x - b.px) * a, b.py + (b.y - b.py) * a, b.pz + (b.z - b.pz) * a);
    this.obj.rotation.set(0, s.face, 0);
    const ph = s.stepPhase * Math.PI, mk = s.moveK, ck = s.crouchK;
    const air = !b.grounded;
    this.down = damp(this.down, s.downed ? 1 : 0, 6, dt);
    const dn = this.down;
    this.breath += dt;

    // ── Which gun is in hand, which are parked ──
    if (s.slots) this.slots = s.slots;
    if (s.gun && s.gun !== this.shown) {
      if (s.swapT > 0) { if (!this.swap) this.swap = { from: this.shown, to: s.gun }; }
      else { this.shown = s.gun; this.swap = null; }
    }
    if (this.swap) {
      if (!(s.swapT > 0)) { this.shown = this.swap.to; this.swap = null; }
      else if (s.swapT <= SWAP_TIME * 0.5) this.shown = this.swap.to;
    }
    for (const [id, g] of Object.entries(this.guns)) {
      const inHand = id === this.shown, parked = !inHand && this.slots.includes(id);
      g.visible = inHand || parked;
      if (inHand) { if (g.parent !== n.gun) n.gun.add(g); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); }
      else if (parked) {
        const long = GUN_RIG[id].long, mount = long ? n.stow : n.holster;
        if (g.parent !== mount) mount.add(g);
        if (long) { g.position.set(0, 0, 0.02); g.rotation.set(Math.PI / 2 - 0.12, Math.PI, 0.45, "ZYX"); }
        else { g.position.set(0.02, -0.08, 0.0); g.rotation.set(-Math.PI / 2 + 0.15, 0.0, 0, "YXZ"); }
      }
    }
    const rig = GUN_RIG[this.shown] ?? GUN_RIG.rifle;

    // ── Legs ──
    // Standing: the stride. Crouched and still: a kneel, left knee up,
    // right knee down; crouched and moving: a low squat-walk.
    const swingK = Math.min(1, mk * 1.6);
    const sw = Math.sin(ph) * (0.6 + 0.35 * mk) * swingK;
    const kneeA = Math.max(0, Math.sin(ph + 1.4)) * (0.8 + 0.5 * mk) * swingK, kneeB = Math.max(0, Math.sin(ph + 1.4 + Math.PI)) * (0.8 + 0.5 * mk) * swingK;
    const still = ck * (1 - Math.min(1, mk * 3)), cmove = ck - still;
    // (+x swings a leg forward; a knee only bends back.)
    n.legL.rotation.x = air ? 0.7 : sw * (1 - ck * 0.4) + still * 1.25 + cmove * 0.9;
    n.legR.rotation.x = air ? -0.25 : -sw * (1 - ck * 0.4) + still * 0.3 + cmove * 0.9;
    n.legL.rotation.z = ck * 0.1; n.legR.rotation.z = -ck * 0.14;
    n.shinL.rotation.x = air ? -1.1 : -(kneeA * (1 - ck * 0.5) + still * 1.45 + cmove * 1.6);
    n.shinR.rotation.x = air ? -0.5 : -(kneeB * (1 - ck * 0.5) + still * 1.75 + cmove * 1.6);
    n.hips.position.y = RIG.hips - still * 0.4 - cmove * 0.3 + Math.abs(Math.sin(ph)) * (0.03 + 0.03 * mk) * mk - dn * 0.62;
    n.hips.rotation.y = Math.sin(ph) * 0.1 * mk + still * 0.25;
    n.hips.rotation.z = Math.sin(ph) * 0.04 * mk;

    // ── Torso ──
    const aim = Math.max(s.aimK, s.firing ? 1 : 0);
    const sprint = s.sprint ? 1 : 0;
    const yawD = clamp(angDiff(s.face, s.yaw), -0.75, 0.75);
    const breath = Math.sin(this.breath * 1.6) * 0.012 * (1 - mk);
    n.torso.rotation.x = -(ck * 0.28 + mk * 0.12 + sprint * 0.3) * (1 - aim * 0.5) + breath - dn * 0.4;
    const blade = (rig.long ? AIM.long : AIM.short).blade * aim;
    n.torso.rotation.y = (yawD - blade) * aim - n.hips.rotation.y * 0.7 * (1 - aim);
    n.torso.rotation.z = -n.hips.rotation.z * 0.6;
    n.torso.position.y = RIG.torso + breath * 0.5;

    // ── Head: looks where the aim is, else glances about ──
    const lookY = aim > 0.1 ? (angDiff(s.face, s.yaw) - n.torso.rotation.y) : (Math.sin(this.breath * 0.37) * 0.25 + yawD * 0.3) * (1 - mk) + yawD * 0.2 * mk;
    const lookP = aim > 0.1 ? s.pitch * 0.55 : Math.sin(this.breath * 0.23 + 1) * 0.05;
    this.headYaw = damp(this.headYaw, clamp(lookY, -1.0, 1.0), 12, dt);
    this.headPitch = damp(this.headPitch, clamp(lookP, -0.5, 0.5), 12, dt);
    n.head.rotation.set(this.headPitch - n.torso.rotation.x * 0.5 + dn * 0.9, this.headYaw, 0);

    // ── The gun's stance ──
    let P = POSE.ready, hold = 1;
    if (s.downed) P = POSE.down;
    else if (s.reloadK >= 0 && rig.mag) P = POSE.reload;
    else if (this.swap) P = GUN_RIG[this.shown]?.long === false ? POSE.stowShort : POSE.stow;
    else if (s.cover && !aim) P = POSE.cover;
    else if (sprint) P = POSE.sprint;
    else if (ck > 0.5) P = POSE.crouch;
    else if (!rig.long && mk < 0.2 && aim < 0.05) P = POSE.idlePistol;
    // Swap: the old gun goes over the shoulder, the new one comes back
    // from there; the stow pose is reached at the midpoint.
    if (this.swap) {
      const k = 1 - clamp(s.swapT / SWAP_TIME, 0, 1);
      hold = k < 0.5 ? k * 2 : 1 - (k - 0.5) * 2;
      hold = hold * hold * (3 - 2 * hold);
    }
    const spd = this.swap ? 30 : 9;
    _v.set(...P.p);
    if (this.swap) _v.lerpVectors(_w.set(...POSE.ready.p), _v, hold);
    this.gp.x = damp(this.gp.x, _v.x, spd, dt); this.gp.y = damp(this.gp.y, _v.y, spd, dt); this.gp.z = damp(this.gp.z, _v.z, spd, dt);
    for (let i = 0; i < 3; i++) this.gr[i] = damp(this.gr[i], this.swap ? lerp(POSE.ready.r[i], P.r[i], hold) : P.r[i], spd, dt);
    // Walking sway and the recoil.
    const bobY = Math.abs(Math.sin(ph)) * 0.02 * mk, bobX = Math.sin(ph) * 0.015 * mk;
    const rec = s.recoil ?? 0;
    // Aimed: pitched with the view about the shoulder pivot; blended in by aimK.
    const A = rig.long ? AIM.long : AIM.short;
    const aimRx = s.pitch + rec * 3, aimRy = clamp(angDiff(s.face, s.yaw) - n.torso.rotation.y, -0.9, 0.9);
    _m.makeRotationFromEuler(_eu.set(aimRx, aimRy, 0, "YXZ"));
    _w.set(...A.grip).applyMatrix4(_m).add(_v.set(...A.pivot));
    const gun = n.gun;
    gun.position.set(lerp(this.gp.x + bobX, _w.x, aim), lerp(this.gp.y + bobY, _w.y, aim), lerp(this.gp.z, _w.z + rec * 1.5, aim));
    gun.rotation.set(lerp(this.gr[0] + rec * 2, aimRx, aim), lerp(this.gr[1], aimRy, aim), lerp(this.gr[2], 0, aim), "YXZ");
    gun.updateMatrix();

    // ── Hands ──
    // Right hand on the grip; left on the fore-end unless busy.
    _S.set(RIG.shoulder[0], RIG.shoulder[1], RIG.shoulder[2]);
    _H.set(0, -0.035, 0.02).applyMatrix4(gun.matrix);
    if (s.reach) _H.copy(s.reach);
    reachArm(n.armR, n.foreR, _S, _H, POLE_R);

    let lt = _v.set(...rig.fore).applyMatrix4(gun.matrix), ltSpeed = 20;
    const g = this.guns[this.shown], mag = g?.userData.nodes.mag, bolt = g?.userData.nodes.bolt;
    if (mag) mag.position.copy(mag.userData.p0), mag.visible = true;
    if (bolt) bolt.position.copy(bolt.userData.p0);
    n.magL.visible = false;
    if (this.swap) lt = _v.set(...RIG.chest);
    else if (P === POSE.idlePistol && aim < 0.05) lt = _v.set(...REST_L);
    else if (s.reloadK >= 0 && rig.mag) {
      // Out with the old magazine, a fresh one from the belt, in, rack.
      const k = s.reloadK;
      const magAt = (f) => _v.set(rig.mag[0] + rig.magOut[0] * f, rig.mag[1] - 0.02 + rig.magOut[1] * f, rig.mag[2] + rig.magOut[2] * f).applyMatrix4(gun.matrix);
      if (k < 0.28) lt = magAt(0);
      else if (k < 0.42) { const f = (k - 0.28) / 0.14; lt = magAt(f); if (mag) mag.position.set(mag.userData.p0.x + rig.magOut[0] * f, mag.userData.p0.y + rig.magOut[1] * f, mag.userData.p0.z + rig.magOut[2] * f); }
      else if (k < 0.62) { lt = _v.set(...RIG.pouch); if (mag) mag.visible = false; if (k > 0.52) n.magL.visible = true; }
      else if (k < 0.82) { const f = 1 - (k - 0.62) / 0.2; lt = magAt(f); if (k < 0.78) { if (mag) mag.visible = false; n.magL.visible = true; } else if (mag) mag.position.set(mag.userData.p0.x + rig.magOut[0] * f, mag.userData.p0.y + rig.magOut[1] * f, mag.userData.p0.z + rig.magOut[2] * f); ltSpeed = 30; }
      else if (rig.bolt) {
        const f = (k - 0.82) / 0.18, pull = Math.sin(f * Math.PI);
        lt = _v.set(rig.boltGrab[0] + rig.bolt[0] * pull, rig.boltGrab[1] + rig.bolt[1] * pull, rig.boltGrab[2] + rig.bolt[2] * pull).applyMatrix4(gun.matrix);
        if (bolt) bolt.position.set(bolt.userData.p0.x + rig.bolt[0] * pull, bolt.userData.p0.y + rig.bolt[1] * pull, bolt.userData.p0.z + rig.bolt[2] * pull);
        ltSpeed = 35;
      }
    } else if (s.downed) lt = _v.set(-0.3, 0.45, -0.1);
    if (!this.ltK) { this.lt.copy(lt); this.ltK = 1; }
    this.lt.x = damp(this.lt.x, lt.x, ltSpeed, dt); this.lt.y = damp(this.lt.y, lt.y, ltSpeed, dt); this.lt.z = damp(this.lt.z, lt.z, ltSpeed, dt);
    _S.set(-RIG.shoulder[0], RIG.shoulder[1], RIG.shoulder[2]);
    reachArm(n.armL, n.foreL, _S, this.lt, POLE_L);

    // Down: lying on the ground, propped up a little.
    this.obj.rotation.x = -dn * 1.45;
    this.obj.position.y += dn * 0.24;
    void t;
  }
}
