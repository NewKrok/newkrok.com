import * as T from "three";
import { make, MAT } from "./modelkit.js";
import { stabilizer, STABILIZER_MUZZLE, fuzzVacuum, VACUUM_MUZZLE, foamCannon, FOAM_MUZZLE, lullabyBell, BELL_MUZZLE, gustUmbrella, UMBRELLA_MUZZLE, starYoyo, YOYO_MUZZLE } from "./models/tools.js";
import { damp } from "../config.js";

// ── The tool in your hand ────────────────────────────────────────────────
// Drawn in its own little scene after the world, with the depth cleared,
// so it never sinks into walls. It sways against the turn of the view,
// bobs with your steps, kicks back on every shot, and the glowing core
// shifts from mint to orange to red as the tool heats up.

const REST = new T.Vector3(0.21, -0.19, -0.5);
const WARM = new T.Color(0xffb04a), HOT = new T.Color(0xff4a3a);
const TOOLS = {
  stabilizer: { build: stabilizer, muzzle: STABILIZER_MUZZLE, cool: new T.Color(0x7ff5e0) },
  vacuum: { build: fuzzVacuum, muzzle: VACUUM_MUZZLE, cool: new T.Color(0xffd27a), at: [0.015, -0.035, -0.08] },
  foam: { build: foamCannon, muzzle: FOAM_MUZZLE, cool: new T.Color(0x9fe0ff), at: [0.005, -0.02, -0.03] },
  bell: { build: lullabyBell, muzzle: BELL_MUZZLE, cool: new T.Color(0xc8b0ff), at: [0.01, -0.02, -0.02] },
  umbrella: { build: gustUmbrella, muzzle: UMBRELLA_MUZZLE, cool: new T.Color(0xa8f0c0), at: [0.01, -0.01, 0.03], s: 0.85 },
  yoyo: { build: starYoyo, muzzle: YOYO_MUZZLE, cool: new T.Color(0xffe27a), at: [0.01, -0.02, -0.01] },
};

export class ViewModel {
  constructor(env) {
    this.scene = new T.Scene();
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.5;
    this.camera = new T.PerspectiveCamera(50, 1, 0.01, 10);
    this.hemi = new T.HemisphereLight(0xdfe8ff, 0x6a5a4a, 1.3);
    this.key = new T.DirectionalLight(0xfff0d8, 1.5);
    this.key.position.set(-0.6, 1, 0.4);
    this.scene.add(this.hemi, this.key, this.camera);

    this.pivot = new T.Group();
    this.camera.add(this.pivot);
    this.tools = {};
    for (const [id, def] of Object.entries(TOOLS)) {
      const o = make(def.build, {}, { shadows: false });
      o.rotation.set(0.07, 0.035, 0.03);
      if (def.at) o.position.set(...def.at);
      if (def.s) o.scale.setScalar(def.s);
      o.visible = false;
      this.pivot.add(o);
      // The glowing parts get their own material so their colour can follow the heat.
      const glowMat = MAT.glow.clone();
      o.traverse((m) => { if (m.isMesh && m.material === MAT.glow) m.material = glowMat; });
      const muzzle = new T.Object3D();
      muzzle.position.set(...def.muzzle);
      o.add(muzzle);
      this.tools[id] = { o, glowMat, muzzle, cool: def.cool };
    }
    this.current = "stabilizer";
    this.tools.stabilizer.o.visible = true;
    this.suckT = 0; this.tankFill = 0; this.flapKick = 0;

    this.sway = new T.Vector2();
    this.bobT = 0; this.bobAmt = 0;
    this.kick = 0; this.charge = 0;
    this.drop = 0;        // lowered while switching or hidden
    this.flash = 0;
    this.airT = 0;
  }

  setLights(sunColor, sunDir, sky, ground) {
    this.key.color.set(sunColor);
    this.key.position.set(...sunDir);
    this.hemi.color.set(sky); this.hemi.groundColor.set(ground);
  }

  resize(aspect) { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }

  // s: { look: [dyaw, dpitch], speed, grounded, heat, charge, overheated, shot, big, t }
  update(dt, s) {
    // Sway: the tool lags behind the turn, then springs back.
    this.sway.x = damp(this.sway.x + s.look[0] * 0.9, 0, 9, dt);
    this.sway.y = damp(this.sway.y + s.look[1] * 0.9, 0, 9, dt);
    this.sway.x = Math.max(-0.12, Math.min(0.12, this.sway.x));
    this.sway.y = Math.max(-0.1, Math.min(0.1, this.sway.y));
    // Bob with the stride.
    const moving = s.grounded ? Math.min(1, s.speed / 6) : 0;
    this.bobAmt = damp(this.bobAmt, moving, 8, dt);
    this.bobT += dt * (5 + s.speed * 0.9);
    this.airT = s.grounded ? damp(this.airT, 0, 10, dt) : Math.min(1, this.airT + dt * 3);
    if (s.shot) { this.kick = Math.min(1.6, this.kick + (s.big ? 1.2 + s.big : 0.55)); this.flash = 1; }
    this.kick = damp(this.kick, 0, 14, dt);
    this.flash = damp(this.flash, 0, 18, dt);
    this.charge = damp(this.charge, s.charge, 20, dt);
    // Switching: lower the tool, swap it out of sight, raise the new one.
    const swapping = s.tool && s.tool !== this.current;
    this.drop = damp(this.drop, s.hidden || swapping ? 1 : 0, swapping ? 16 : 10, dt);
    if (swapping && this.drop > 0.85) {
      this.tools[this.current].o.visible = false;
      this.current = s.tool;
      this.tools[this.current].o.visible = true;
    }
    this.suckT = s.sucking ? this.suckT + dt : 0;
    if (s.launched) { this.kick = 1.4; this.flapKick = 1; this.flash = 1; }
    if (s.blasted) { this.kick = 0.9; this.flash = 1; }
    if (s.sprayed) { this.kick = Math.min(1.6, this.kick + 0.18); this.flash = Math.max(this.flash, 0.4); }
    if (s.blobbed) { this.kick = 1.2; this.pumpKick = 1; this.flash = 1; }
    this.pumpKick = damp(this.pumpKick || 0, 0, 7, dt);
    if (s.rang) { this.kick = Math.min(1.6, this.kick + 0.7); this.strike = 1; this.swing = 1; this.flash = 1; }
    if (s.lulled) { this.kick = Math.min(1.6, this.kick + 0.4); this.swing = 0.6; this.flash = 1; }
    this.strike = damp(this.strike || 0, 0, 9, dt);
    this.swing = damp(this.swing || 0, 0, 2.5, dt);
    this.flapKick = damp(this.flapKick, 0, 8, dt);
    // Umbrella: held open it goes up over your head; a gust snaps it open and shut.
    this.open = damp(this.open || 0, s.tool === "umbrella" && s.open && !swapping ? 1 : 0, 11, dt);
    if (s.gusted) { this.snap = 1; this.kick = Math.min(1.6, this.kick + 0.5); this.flash = 1; }
    this.snap = Math.max(0, (this.snap || 0) - dt / 0.28);
    // Yo-yo: a flick of the wrist on a throw, a circling hand while it spins.
    if (s.thrown) { this.kick = Math.min(1.6, this.kick + 0.6); this.flick = 1; this.flash = 1; }
    this.flick = damp(this.flick || 0, 0, 8, dt);
    this.whirl = damp(this.whirl || 0, s.tool === "yoyo" && s.spinning ? 1 : 0, 10, dt);

    const bx = Math.sin(this.bobT) * 0.012 * this.bobAmt, by = -Math.abs(Math.cos(this.bobT)) * 0.012 * this.bobAmt;
    const shake = (this.charge > 0.05 ? Math.sin(s.t * 90) * 0.0016 * this.charge : 0) + (s.sucking ? Math.sin(s.t * 70) * 0.0012 : 0);
    this.pivot.position.set(
      REST.x + bx - this.sway.x * 0.35 + shake,
      REST.y + by - this.sway.y * 0.3 - this.airT * 0.02 - this.drop * 0.35 + (s.overheated ? -0.03 : 0),
      REST.z + this.kick * 0.045 + this.charge * 0.02,
    );
    this.pivot.rotation.set(
      this.kick * 0.12 - this.sway.y * 0.6 + (s.overheated ? 0.12 : 0) + this.airT * 0.04,
      this.sway.x * 0.8,
      -this.sway.x * 0.5 + bx * 2,
    );
    if (this.current === "yoyo") {
      this.pivot.rotation.x -= this.flick * 0.5;
      this.pivot.position.x += Math.cos(s.t * 11) * 0.012 * this.whirl;
      this.pivot.position.y += Math.sin(s.t * 11) * 0.012 * this.whirl;
    }
    const up = this.current === "umbrella" ? this.open : 0;
    if (up) {
      this.pivot.position.x += up * 0.03; this.pivot.position.y += up * 0.1; this.pivot.position.z += up * 0.04;
      this.pivot.rotation.x += up * 1.05; this.pivot.rotation.z -= up * 0.35;
    }
    const tool = this.tools[this.current];
    const N = tool.o.userData.nodes;
    // Stabilizer: gauge needle and valve follow the heat.
    if (N.needle) N.needle.rotation.y = -(-1.2 + s.heat * 2.4) + (s.overheated ? Math.sin(s.t * 40) * 0.08 : 0);
    if (N.valve) N.valve.rotation.z += dt * (1 + this.charge * 20);
    // Vacuum: the fan spins up, the tank shows what it holds, the flap clacks.
    if (N.fan) N.fan.rotation.z += dt * (s.sucking ? 40 : 2);
    if (N.tank) {
      const n = s.tank?.length ?? 0;
      this.tankFill = damp(this.tankFill, 0.15 + n * 0.3, 10, dt);
      N.tank.scale.setScalar(0.4 + this.tankFill * 0.8 + (n ? Math.sin(s.t * 9) * 0.08 : 0));
    }
    if (N.flap) N.flap.rotation.x = -this.flapKick * 1.1;
    // Foam Cannon: the pump jerks back on a blob, the foam in the window sinks as it runs hot.
    if (N.pump) N.pump.position.z = -0.105 + 0.06 + this.pumpKick * 0.03;
    if (N.foam) N.foam.scale.y = Math.max(0.08, 1 - s.heat);
    // Lullaby Bell: the mallet is up and comes down on a ring; the clapper
    // swings after; the crank turns while you hum, and the glow inside swells.
    if (N.hammer) N.hammer.rotation.x = -0.55 * (1 - this.strike) + (this.strike > 0.85 ? 0.05 : 0) - this.charge * 0.25;
    if (N.clapper) N.clapper.rotation.x = Math.sin(s.t * 14) * 0.35 * this.swing;
    if (N.crank) N.crank.rotation.x += dt * this.charge * 14;
    if (N.hum) N.hum.scale.setScalar(1 + this.charge * 0.8 + this.flash * 0.3);
    if (N.canopy) {
      const k = 0.1 + 0.68 * Math.max(this.open, this.snap > 0 ? Math.sin(Math.PI * (1 - this.snap)) * 0.9 : 0);
      N.canopy.scale.set(k, k, 1 + (1 - k) * 0.55);
      N.canopy.rotation.z += dt * this.open * (s.gliding ? 2.5 : 0.3);
    }
    if (N.glow) N.glow.scale.setScalar(1 + this.flash * 0.6);
    if (N.yoyo) N.yoyo.visible = !s.yoyoOut;
    // Glow colour: cool → orange → red with the heat, brighter on each shot.
    const c = tool.glowMat.color;
    if (s.heat < 0.6) c.copy(tool.cool).lerp(WARM, s.heat / 0.6); else c.copy(WARM).lerp(HOT, (s.heat - 0.6) / 0.4);
    const pulse = s.overheated ? 0.55 + Math.sin(s.t * 18) * 0.25 : 1;
    c.multiplyScalar((1 + this.flash * 1.2 + this.charge * 1.5 + (s.sucking ? 0.5 + Math.sin(s.t * 25) * 0.2 : 0)) * pulse);
  }

  // Where the muzzle is on screen, as normalised device coordinates.
  muzzleNDC(out = new T.Vector3()) {
    this.camera.updateMatrixWorld(true);
    this.tools[this.current].muzzle.getWorldPosition(out);
    return out.project(this.camera);
  }
}
