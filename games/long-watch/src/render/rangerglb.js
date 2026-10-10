import * as T from "three";
import { make } from "./modelkit.js";
import { GUNS, GUN_RIG, RIG } from "./models/characters.js";
import { instanceAsset } from "./glb.js";
import { POSE, AIM, REST_L, POLE_R, POLE_L, SWAP_TIME } from "./rangerfig.js";
import { angDiff, clamp, lerp, damp } from "../config.js";

// ── A ranger figure on the generated, rigged model ───────────────────────
// The body comes from the Tripo clips (idle, walk, run, jump, hurt), blended
// by speed and state; everything the gun needs is done the way the
// code-built figure does it: the gun sits in a torso frame hung on the
// chest bone (the same stances, POSE / AIM), the two arms reach for it with
// a two-bone IK, the upper body turns toward the aim, the head looks there,
// a crouch lowers the hips and bends the knees. The clips are weaponless,
// so the arms are always ours.

const HEIGHT = 1.8;                      // the model is scaled to this
const WALK_REF = 1.4, RUN_REF = 4.6;     // m/s the walk and run clips cover at speed 1 (by eye)
const JUMP_HOLD = 0.42;                  // the jump clip holds at this fraction while in the air
const HURT_HOLD = 3.2;                   // s into the hurt clip where the figure lies still
export const RANGER_ASSET = ["ranger", { height: HEIGHT, parts: 2 }];
const TINT = { player: null, kessler: 0x9fb09a, guard: 0x9aa68c };
const HOLSTER = [0.15, -0.1, -0.02];     // the pistol on the right thigh (hips frame; the model's hips are narrower than the code-built ones)
const DOWN = { p: [0.22, 0.12, -0.3], r: [-0.4, 0.7, -0.2] };   // downed: the clip lies the body down, the gun just drops low

const _v = new T.Vector3(), _w = new T.Vector3(), _u = new T.Vector3(), _p = new T.Vector3(), _e = new T.Vector3();
const _S = new T.Vector3(), _H = new T.Vector3(), _d = new T.Vector3(), _m = new T.Matrix4(), _eu = new T.Euler();
const _q = new T.Quaternion(), _qp = new T.Quaternion(), _qw = new T.Quaternion(), _qr = new T.Quaternion(), _qd = new T.Quaternion();

// An Object3D under `bone` whose world transform at rest is `frame` (the
// root at the origin): a frame in metres with world axes that then rides
// on the bone.
function frameUnder(bone, frame) {
  const h = new T.Object3D();
  h.matrix.copy(bone.matrixWorld).invert().multiply(frame);
  h.matrix.decompose(h.position, h.quaternion, h.scale);
  bone.add(h);
  return h;
}
// Turns a bone by a world-space rotation (its parent's world matrix is current).
function turnWorld(bone, q) {
  bone.parent.getWorldQuaternion(_qp);
  bone.getWorldQuaternion(_qw).premultiply(q);
  bone.quaternion.copy(_qp).invert().multiply(_qw);
}
// Points a bone along a world direction, keeping its rest roll: the
// minimal rotation from the rest direction, in the root's frame.
function aimBone(bone, rest, dir, qRoot) {
  _d.copy(dir).applyQuaternion(_qr.copy(qRoot).invert());
  _q.setFromUnitVectors(rest.dir, _d);
  _qw.copy(qRoot).multiply(_q).multiply(rest.q);
  bone.parent.getWorldQuaternion(_qp);
  bone.quaternion.copy(_qp).invert().multiply(_qw);
}

export class RangerGlb {
  constructor(scene, skin, slots = ["rifle", "pistol"]) {
    const F = this.F = instanceAsset("ranger");
    this.obj = F.root;
    const B = this.B = F.bones;
    if (TINT[skin]) F.scene.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.setHex(TINT[skin]); } });

    // Rest pose, the root at the origin: frames and measures.
    F.root.updateMatrixWorld(true);
    const hipsY = B.Hips.getWorldPosition(_v).y;
    this.torso = frameUnder(B.Spine2, _m.makeTranslation(0, hipsY + RIG.torso, 0));
    this.hipsF = frameUnder(B.Hips, _m.makeTranslation(0, hipsY, 0));
    this.gun = new T.Object3D(); this.torso.add(this.gun);
    this.stow = new T.Object3D(); this.stow.position.set(...RIG.stow); this.torso.add(this.stow);
    this.holster = new T.Object3D(); this.holster.position.set(...HOLSTER); this.hipsF.add(this.holster);
    this.arms = {};
    for (const side of ["Left", "Right"]) {
      const arm = B[`${side}Arm`], fore = B[`${side}ForeArm`], hand = B[`${side}Hand`];
      const a = arm.getWorldPosition(new T.Vector3()), f = fore.getWorldPosition(new T.Vector3()), h = hand.getWorldPosition(new T.Vector3());
      this.arms[side] = {
        arm, fore, L1: a.distanceTo(f), L2: f.distanceTo(h),
        restArm: { dir: f.clone().sub(a).normalize(), q: arm.getWorldQuaternion(new T.Quaternion()) },
        restFore: { dir: h.clone().sub(f).normalize(), q: fore.getWorldQuaternion(new T.Quaternion()) },
      };
    }

    // The weapons, in hand or parked (as in RangerFigure).
    this.guns = {};
    for (const [id, fn] of Object.entries(GUNS)) {
      const g = make(fn);
      g.visible = false;
      this.gun.add(g);
      this.guns[id] = g;
      const mag = g.userData.nodes.mag, bolt = g.userData.nodes.bolt;
      if (mag) mag.userData.p0 = mag.position.clone();
      if (bolt) bolt.userData.p0 = bolt.position.clone();
    }
    this.shown = slots[0] ?? null;
    this.slots = slots;
    this.swap = null;
    this.gp = new T.Vector3(...POSE.ready.p); this.gr = [...POSE.ready.r];
    this.lt = new T.Vector3(); this.ltK = 0;
    this.down = 0; this.breath = Math.random() * 6;
    this.headYaw = 0; this.headPitch = 0;
    this.torsoYaw = 0; this.torsoLean = 0;

    // Clips: the three gaits loop and blend; jump and hurt are one-shots.
    const A = this.A = F.actions;
    for (const a of Object.values(A)) { a.play(); a.setEffectiveWeight(0); a.enabled = true; }
    for (const k of ["jump", "fall", "hurt", "hit_to_body_01"]) if (A[k]) { A[k].setLoop(T.LoopOnce, 1); A[k].clampWhenFinished = true; }
    this.special = null; this.specialK = 0;
    this.walkT = 0; this.runT = 0;
    scene?.add(this.obj);
  }
  set visible(v) { this.obj.visible = v; }

  muzzle(out = [0, 0, 0]) {
    const rig = GUN_RIG[this.shown];
    if (!rig) return out;
    _v.set(...rig.muzzle).applyMatrix4(this.gun.matrixWorld);
    out[0] = _v.x; out[1] = _v.y; out[2] = _v.z;
    return out;
  }

  // The same state as RangerFigure.pose takes.
  pose(s, a, dt, t) {
    const b = s.body, B = this.B, A = this.A, F = this.F;
    this.obj.position.set(b.px + (b.x - b.px) * a, b.py + (b.y - b.py) * a, b.pz + (b.z - b.pz) * a);
    this.obj.rotation.set(0, s.face, 0);
    const sp = b.speed2D ?? 0, mk = s.moveK, ck = s.crouchK, air = !b.grounded;
    this.down = damp(this.down, s.downed ? 1 : 0, 6, dt);
    this.breath += dt;

    // ── Gait and state clips ──
    const special = s.downed ? "hurt" : air ? "jump" : null;
    if (special !== this.special) {
      this.special = special;
      if (special && A[special]) { A[special].reset(); A[special].paused = false; A[special].timeScale = 1; }
    }
    this.specialK = damp(this.specialK, special && A[special] ? 1 : 0, special ? 14 : 8, dt);
    const sk = this.specialK;
    const wRun = clamp((sp - 4.4) / 1.6, 0, 1), wWalk = clamp(sp / 1.1, 0, 1) * (1 - wRun), wIdle = 1 - wWalk - wRun;
    A.idle?.setEffectiveWeight(wIdle * (1 - sk));
    A.walk?.setEffectiveWeight(wWalk * (1 - sk));
    A.run?.setEffectiveWeight(wRun * (1 - sk));
    if (A.walk) A.walk.timeScale = clamp(sp / WALK_REF, 0.6, 2.4) * (1 - ck * 0.3);
    if (A.run) A.run.timeScale = clamp(sp / RUN_REF, 0.7, 1.6);
    for (const k of ["jump", "hurt"]) if (A[k]) A[k].setEffectiveWeight(special === k ? sk : 0);
    if (special === "jump" && A.jump) { const hold = A.jump.getClip().duration * JUMP_HOLD; if (A.jump.time > hold) A.jump.time = hold; }
    if (special === "hurt" && A.hurt && A.hurt.time > HURT_HOLD) A.hurt.time = HURT_HOLD;
    F.mixer.update(dt);
    this.obj.updateMatrixWorld(true);
    const qRoot = this.obj.quaternion;

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
      if (inHand) { if (g.parent !== this.gun) this.gun.add(g); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); }
      else if (parked) {
        const long = GUN_RIG[id].long, mount = long ? this.stow : this.holster;
        if (g.parent !== mount) mount.add(g);
        if (long) { g.position.set(0, 0, 0.02); g.rotation.set(Math.PI / 2 - 0.12, Math.PI, 0.45, "ZYX"); }
        else { g.position.set(0.02, -0.08, 0.0); g.rotation.set(-Math.PI / 2 + 0.15, 0.0, 0, "YXZ"); }
      }
    }
    const rig = GUN_RIG[this.shown] ?? GUN_RIG.rifle;

    // ── Crouch: the hips drop, the knees bend (on top of the clip) ──
    if (ck > 0.01 && !s.downed) {
      const still = ck * (1 - Math.min(1, mk * 3)), cmove = ck - still;
      B.Hips.getWorldPosition(_v); _v.y -= still * 0.4 + cmove * 0.28;
      B.Hips.position.copy(B.Hips.parent.worldToLocal(_v));
      B.Hips.updateMatrixWorld(true);
      for (const [side, thigh, shin] of [["Left", 1.1, -1.6], ["Right", 0.5, -1.7]]) {
        const kTh = still * thigh + cmove * 0.9, kSh = still * shin - cmove * 1.5;
        turnWorld(B[`${side}UpLeg`], this.#rootRot(kTh, 0));
        B[`${side}UpLeg`].updateMatrixWorld(true);
        turnWorld(B[`${side}Leg`], this.#rootRot(kSh, 0));
        B[`${side}Leg`].updateMatrixWorld(true);
        turnWorld(B[`${side}Foot`], this.#rootRot(-(kTh + kSh) * 0.9, 0));
        B[`${side}Foot`].updateMatrixWorld(true);
      }
    }

    // ── Torso: turns toward the aim (bladed), leans into a sprint or crouch ──
    const aim = Math.max(s.aimK, s.firing ? 1 : 0);
    const sprint = s.sprint ? 1 : 0;
    const yawD = clamp(angDiff(s.face, s.yaw), -0.75, 0.75);
    const blade = (rig.long ? AIM.long : AIM.short).blade * aim;
    this.torsoYaw = damp(this.torsoYaw, (yawD - blade) * aim, 16, dt);
    this.torsoLean = damp(this.torsoLean, -(ck * 0.2 + sprint * 0.22) * (1 - aim * 0.5), 10, dt);
    turnWorld(B.Spine1, this.#rootRot(this.torsoLean, this.torsoYaw));
    B.Spine1.updateMatrixWorld(true);

    // ── Head: looks where the aim is, else glances about ──
    const lookY = aim > 0.1 ? (angDiff(s.face, s.yaw) - this.torsoYaw) : (Math.sin(this.breath * 0.37) * 0.25 + yawD * 0.3) * (1 - mk) + yawD * 0.2 * mk;
    const lookP = aim > 0.1 ? s.pitch * 0.55 : Math.sin(this.breath * 0.23 + 1) * 0.05;
    this.headYaw = damp(this.headYaw, clamp(lookY, -1.0, 1.0), 12, dt);
    this.headPitch = damp(this.headPitch, clamp(lookP, -0.5, 0.5), 12, dt);
    turnWorld(B.Head, this.#rootRot(this.headPitch * (1 - this.down), this.headYaw * (1 - this.down)));
    B.Head.updateMatrixWorld(true);

    // ── The gun's stance (RangerFigure's, in the torso frame) ──
    let P = POSE.ready, hold = 1;
    if (s.downed) P = DOWN;
    else if (s.reloadK >= 0 && rig.mag) P = POSE.reload;
    else if (this.swap) P = GUN_RIG[this.shown]?.long === false ? POSE.stowShort : POSE.stow;
    else if (s.cover && !aim) P = POSE.cover;
    else if (sprint) P = POSE.sprint;
    else if (ck > 0.5) P = POSE.crouch;
    else if (!rig.long && mk < 0.2 && aim < 0.05) P = POSE.idlePistol;
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
    const ph = s.stepPhase * Math.PI;
    const bobY = Math.abs(Math.sin(ph)) * 0.02 * mk, bobX = Math.sin(ph) * 0.015 * mk;
    const rec = s.recoil ?? 0;
    const AM = rig.long ? AIM.long : AIM.short;
    const aimRx = s.pitch + rec * 3, aimRy = clamp(angDiff(s.face, s.yaw) - this.torsoYaw, -0.9, 0.9);
    _m.makeRotationFromEuler(_eu.set(aimRx, aimRy, 0, "YXZ"));
    _w.set(...AM.grip).applyMatrix4(_m).add(_v.set(...AM.pivot));
    const gun = this.gun;
    gun.position.set(lerp(this.gp.x + bobX, _w.x, aim), lerp(this.gp.y + bobY, _w.y, aim), lerp(this.gp.z, _w.z + rec * 1.5, aim));
    gun.rotation.set(lerp(this.gr[0] + rec * 2, aimRx, aim), lerp(this.gr[1], aimRy, aim), lerp(this.gr[2], 0, aim), "YXZ");
    gun.updateMatrix();
    gun.updateMatrixWorld(true);

    // ── Hands: right on the grip, left on the fore-end unless busy ──
    _H.set(0, -0.035, 0.02).applyMatrix4(gun.matrix);
    if (s.reach) _H.copy(s.reach);
    this.#reach("Right", _H, POLE_R);

    let lt = _v.set(...rig.fore).applyMatrix4(gun.matrix), ltSpeed = 20;
    const g = this.guns[this.shown], mag = g?.userData.nodes.mag, bolt = g?.userData.nodes.bolt;
    if (mag) mag.position.copy(mag.userData.p0), mag.visible = true;
    if (bolt) bolt.position.copy(bolt.userData.p0);
    if (this.swap) lt = _v.set(...RIG.chest);
    else if (P === POSE.idlePistol && aim < 0.05) lt = _v.set(...REST_L);
    else if (s.reloadK >= 0 && rig.mag) {
      const k = s.reloadK;
      const magAt = (f) => _v.set(rig.mag[0] + rig.magOut[0] * f, rig.mag[1] - 0.02 + rig.magOut[1] * f, rig.mag[2] + rig.magOut[2] * f).applyMatrix4(gun.matrix);
      if (k < 0.28) lt = magAt(0);
      else if (k < 0.42) { const f = (k - 0.28) / 0.14; lt = magAt(f); if (mag) mag.position.set(mag.userData.p0.x + rig.magOut[0] * f, mag.userData.p0.y + rig.magOut[1] * f, mag.userData.p0.z + rig.magOut[2] * f); }
      else if (k < 0.62) { lt = _v.set(...RIG.pouch); if (mag) mag.visible = false; }
      else if (k < 0.82) { const f = 1 - (k - 0.62) / 0.2; lt = magAt(f); if (k < 0.78) { if (mag) mag.visible = false; } else if (mag) mag.position.set(mag.userData.p0.x + rig.magOut[0] * f, mag.userData.p0.y + rig.magOut[1] * f, mag.userData.p0.z + rig.magOut[2] * f); ltSpeed = 30; }
      else if (rig.bolt) {
        const f = (k - 0.82) / 0.18, pull = Math.sin(f * Math.PI);
        lt = _v.set(rig.boltGrab[0] + rig.bolt[0] * pull, rig.boltGrab[1] + rig.bolt[1] * pull, rig.boltGrab[2] + rig.bolt[2] * pull).applyMatrix4(gun.matrix);
        if (bolt) bolt.position.set(bolt.userData.p0.x + rig.bolt[0] * pull, bolt.userData.p0.y + rig.bolt[1] * pull, bolt.userData.p0.z + rig.bolt[2] * pull);
        ltSpeed = 35;
      }
    } else if (s.downed) lt = _v.set(-0.3, 0.45, -0.1);
    if (!this.ltK) { this.lt.copy(lt); this.ltK = 1; }
    this.lt.x = damp(this.lt.x, lt.x, ltSpeed, dt); this.lt.y = damp(this.lt.y, lt.y, ltSpeed, dt); this.lt.z = damp(this.lt.z, lt.z, ltSpeed, dt);
    this.#reach("Left", this.lt, POLE_L);
    void t; void qRoot;
  }

  // A rotation given as pitch (about the figure's right) and yaw (about
  // up), in the root's frame, as a world quaternion.
  #rootRot(pitch, yaw) {
    _q.setFromEuler(_eu.set(pitch, yaw, 0, "YXZ"));
    return _qd.copy(this.obj.quaternion).multiply(_q).multiply(_qr.copy(this.obj.quaternion).invert());
  }

  // Two-bone IK for one arm: the hand to H (torso frame), the elbow toward
  // the pole; then the two bones are pointed along the result.
  #reach(side, H, pole) {
    const R = this.arms[side], torso = this.torso;
    _S.copy(torso.worldToLocal(R.arm.getWorldPosition(_v)));
    _u.subVectors(H, _S);
    let d = _u.length();
    const maxD = R.L1 + R.L2 - 0.004;
    if (d > maxD) { _u.multiplyScalar(maxD / d); d = maxD; }
    if (d < 0.05) { _u.set(0, -0.05, 0); d = 0.05; }
    _H.copy(_S).add(_u);
    _u.normalize();
    _p.copy(pole).addScaledVector(_u, -pole.dot(_u));
    if (_p.lengthSq() < 1e-6) _p.set(0, 0, 1).addScaledVector(_u, -_u.z);
    _p.normalize();
    const cosA = clamp((R.L1 * R.L1 + d * d - R.L2 * R.L2) / (2 * R.L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    _e.copy(_S).addScaledVector(_u, R.L1 * cosA).addScaledVector(_p, R.L1 * sinA);
    // To world directions, and onto the bones.
    torso.localToWorld(_S); torso.localToWorld(_e); torso.localToWorld(_H);
    _d.subVectors(_e, _S).normalize();
    aimBone(R.arm, R.restArm, _d, this.obj.quaternion);
    R.arm.updateMatrixWorld(true);
    _d.subVectors(_H, _e).normalize();
    aimBone(R.fore, R.restFore, _d, this.obj.quaternion);
    R.fore.updateMatrixWorld(true);
  }
}
