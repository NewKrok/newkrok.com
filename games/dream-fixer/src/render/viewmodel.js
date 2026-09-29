import * as T from "three";
import { make, MAT } from "./modelkit.js";
import { stabilizer, STABILIZER_MUZZLE } from "./models/tools.js";
import { damp } from "../config.js";

// ── The tool in your hand ────────────────────────────────────────────────
// Drawn in its own little scene after the world, with the depth cleared,
// so it never sinks into walls. It sways against the turn of the view,
// bobs with your steps, kicks back on every shot, and the glowing core
// shifts from mint to orange to red as the tool heats up.

const REST = new T.Vector3(0.21, -0.19, -0.5);
const COOL = new T.Color(0x7ff5e0), WARM = new T.Color(0xffb04a), HOT = new T.Color(0xff4a3a);

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
    this.tool = make(stabilizer, {}, { shadows: false });
    this.tool.rotation.set(0.07, 0.035, 0.03);
    this.pivot.add(this.tool);
    // The core glows with its own material so its colour can follow the heat.
    this.glowMat = MAT.glow.clone();
    this.tool.traverse((o) => { if (o.isMesh && o.material === MAT.glow) o.material = this.glowMat; });
    this.muzzle = new T.Object3D();
    this.muzzle.position.set(...STABILIZER_MUZZLE);
    this.tool.add(this.muzzle);

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
    this.drop = damp(this.drop, s.hidden ? 1 : 0, 10, dt);

    const bx = Math.sin(this.bobT) * 0.012 * this.bobAmt, by = -Math.abs(Math.cos(this.bobT)) * 0.012 * this.bobAmt;
    const shake = this.charge > 0.05 ? (Math.sin(s.t * 90) * 0.0016 * this.charge) : 0;
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
    // Gauge needle and valve follow the heat.
    const N = this.tool.userData.nodes;
    if (N.needle) N.needle.rotation.y = -(-1.2 + s.heat * 2.4) + (s.overheated ? Math.sin(s.t * 40) * 0.08 : 0);
    if (N.valve) N.valve.rotation.z += dt * (1 + this.charge * 20);
    // Core colour: mint → orange → red, brighter on each shot and while charging.
    const c = this.glowMat.color;
    if (s.heat < 0.6) c.copy(COOL).lerp(WARM, s.heat / 0.6); else c.copy(WARM).lerp(HOT, (s.heat - 0.6) / 0.4);
    const pulse = s.overheated ? 0.55 + Math.sin(s.t * 18) * 0.25 : 1;
    c.multiplyScalar((1 + this.flash * 1.2 + this.charge * 1.5) * pulse);
  }

  // Where the muzzle is on screen, as normalised device coordinates.
  muzzleNDC(out = new T.Vector3()) {
    this.camera.updateMatrixWorld(true);
    this.muzzle.getWorldPosition(out);
    return out.project(this.camera);
  }
}
