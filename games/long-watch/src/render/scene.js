import * as T from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { makeRenderer, envMap, Sun } from "./look.js";
import { moonSky } from "./sky.js";
import { groundMeshes, staticMeshes } from "./levelview.js";
import { Actors } from "./actors.js";
import { Fx } from "./fx.js";
import { MAT } from "./modelkit.js";
import { cameraRig } from "../sim/camrig.js";
import { CAMERA, damp, lerp } from "../config.js";

// ── The third-person view ────────────────────────────────────────────────
// Sky, ground, the built level, everyone who moves and the effects; the
// camera over the ranger's shoulder (or on a cutscene's rails), bloom on
// the glowing bits. Quality "low" drops shadows, bloom and most lamps.

const LAMPS = 6;

export class GameView {
  constructor(container, settings) {
    this.renderer = makeRenderer(container, { antialias: false });
    this.env = envMap(this.renderer);
    this.scene = new T.Scene();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.3;
    this.camera = new T.PerspectiveCamera(CAMERA.fov, 16 / 9, 0.08, 900);
    this.camera.rotation.order = "YXZ";
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new T.Vector2(256, 256), 0.45, 0.4, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.fx = new Fx(this.scene);
    this.actors = new Actors(this.scene);
    this.lamps = [];
    for (let i = 0; i < LAMPS; i++) { const l = new T.PointLight(0xffd9a0, 0, 14, 1.6); this.scene.add(l); this.lamps.push(l); }
    // The noise ring at the ranger's feet: how far your steps carry.
    this.noiseRing = new T.Mesh(new T.RingGeometry(0.94, 1, 48).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xf0a040, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending }));
    this.scene.add(this.noiseRing);
    this.cam = {}; this.shake = 0; this.fovK = 0;
    this.W = 1; this.H = 1;
    this.power = false; this.relay = false;
    this.setQuality(settings.quality);
    this._v = new T.Vector3();
  }

  setQuality(q) {
    this.quality = q;
    const hi = q === "high";
    this.pr = hi ? Math.min(devicePixelRatio || 1, 1.75) : Math.min(devicePixelRatio || 1, 1) * 0.8;
    this.renderer.setPixelRatio(this.pr); this.composer.setPixelRatio(this.pr);
    this.bloom.enabled = hi;
    this.renderer.shadowMap.enabled = hi;
    if (this.sun) this.sun.light.castShadow = hi;
    this.lampCount = hi ? LAMPS : 2;
    MAT.solid.needsUpdate = MAT.metal.needsUpdate = true;
    this.resize(this.W, this.H);
  }

  resize(w, h) {
    this.W = w; this.H = h;
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // The level's static part, once.
  load(level) {
    const kit = level.kit;
    this.kit = kit;
    const sky = moonSky();
    this.scene.add(sky);
    this.scene.fog = new T.Fog(0xb57a58, 60, 330);
    this.scene.background = new T.Color(0xb57a58);
    this.sun = new Sun(this.scene, { color: 0xffe2c0, intensity: 2.7, dir: [0.5, 0.45, -0.4], sky: 0xd8b49a, ground: 0x6a3a2a, hemi: 1.05, box: 34, mapSize: 2048 });
    this.sun.light.castShadow = this.quality === "high";
    this.sun.light.shadow.camera.far = 220;
    for (const m of groundMeshes(kit)) this.scene.add(m);
    const st = staticMeshes(kit);
    for (const m of st.meshes) this.scene.add(m);
    this.dyn = st.dynamic;
    for (const d of this.dyn) this.scene.add(d.obj);
    this.vents = this.dyn.filter((d) => d.model === "vent");
    for (const v of this.vents) v.obj.userData.nodes.charge.visible = false;
    this.door = this.dyn.find((d) => d.model === "bunkerDoor");
    this.gen = this.dyn.find((d) => d.model === "generator");
    this.tower = this.dyn.find((d) => d.model === "relayTower");
    this.doorOpen = 0; this.doorWant = 0; this.genSpin = 0; this.genK = 0;
  }

  // A fresh run on the loaded level (after a fall-back too).
  reset() {
    this.actors.clear();
    this.power = false; this.relay = false; this.doorWant = 0; this.doorOpen = 0; this.genK = 0;
    for (const v of this.vents) { v.obj.userData.nodes.charge.visible = false; v.obj.userData.nodes.glow.visible = true; v.blown = false; }
  }

  // ── Sim events ──
  handle(e, run) {
    const F = this.fx;
    switch (e.type) {
      case "tracer": {
        if (e.src !== "ally" || Math.random() < 0.8) F.tracer(e.x0, e.y0, e.z0, e.x1, e.y1, e.z1, e.color);
        if (e.hit === "spark") F.sparks(e.x1, e.y1, e.z1, e.nx, e.ny, e.nz, 5, 0xffc27a, 3);
        if (e.hit === "spark") F.puff(e.x1, e.y1, e.z1, 2, 0x8a6a58, 0.25, 0.8, 0.5, 0.3);
        if (e.hit === "armor") F.sparks(e.x1, e.y1, e.z1, -e.nx, 0.5, -e.nz, 8, 0xfff0c0, 5);
        if (e.hit === "splat") F.sparks(e.x1, e.y1, e.z1, 0, 0.6, 0, 7, 0x9cff3a, 3, 0.4, 0.08, 12);
        break;
      }
      case "shot": F.flash(e.x, e.y, e.z, e.dx, e.dy, e.dz, e.id === "launcher" ? 1.6 : e.id === "pistol" ? 0.8 : 1, e.id === "laser" ? 0x7ef9ff : 0xffd27a); if (e.src === "player") this.kick(e.id === "launcher" ? 0.25 : 0.05); break;
      case "blast": F.blast(e.x, e.y, e.z, e.r); this.kick(Math.max(0, 0.9 - Math.hypot(run.player.body.x - e.x, run.player.body.z - e.z) / 30)); break;
      case "bugDie": F.sparks(e.x, e.y + 0.4, e.z, 0, 1, 0, e.boss ? 80 : 18, 0x9cff3a, e.boss ? 8 : 4, 0.6, e.boss ? 0.2 : 0.1, 10); F.puff(e.x, e.y, e.z, e.boss ? 30 : 6, 0x5a3a40, e.boss ? 2 : 0.6); break;
      case "emerge": case "burrow": F.puff(e.x, e.y, e.z, 12, 0x8e4a31, 0.8, 2.5, 1.0, 2.5); break;
      case "acidSplash": F.sparks(e.x, e.y + 0.1, e.z, 0, 1, 0, 10 * e.size, 0x9cff3a, 3, 0.5, 0.1, 10); break;
      case "acidHit": F.sparks(e.x, e.y, e.z, 0, 1, 0, 12, 0x9cff3a, 3, 0.4, 0.1, 10); break;
      case "land": F.puff(run.player.body.x, run.player.body.y, run.player.body.z, 8, 0x9a6a50, 0.6, 2, 0.8, 0.4); break;
      case "dash": F.puff(e.x, e.y, e.z, 8, 0x9a6a50, 0.5, 2, 0.6, 0.3); break;
      case "slam": F.puff(e.x, e.y, e.z, 40, 0x8e4a31, 1.6, 8, 1.4, 1); this.kick(0.8); break;
      case "charge": if (e.boss) this.kick(0.2); break;
      case "ram": this.kick(0.5); break;
      case "hurt": this.kick(e.kind === "bite" ? 0.12 : 0.25); break;
      case "sacPop": F.sparks(e.x, e.y, e.z, 0, 1, 0, 50, 0x9cff3a, 6, 0.8, 0.16, 10); F.blast(e.x, e.y, e.z, 2.5, 0x9cff3a); break;
      case "quake": this.kick(1.2); break;
      case "powerOn": this.power = true; this.genK = e.instant ? 1 : this.genK; break;
      case "genSpin": this.genSpin = 1; break;
      case "relayOn": this.relay = true; break;
      case "bunkerOpen": this.doorWant = 1; break;
      case "ventCharge": { const v = this.vents[e.vent - 1]; if (v) v.obj.userData.nodes.charge.visible = true; break; }
    }
    if (e.type === "ventBlown") {
      const v = this.vents[e.vent - 1];
      if (v && !v.blown) {
        v.blown = true;
        v.obj.userData.nodes.charge.visible = false; v.obj.userData.nodes.glow.visible = false;
        if (!e.instant) { const p = v.obj.position; F.blast(p.x, p.y + 0.5, p.z, 6); F.puff(p.x, p.y, p.z, 30, 0x6a4a3a, 2, 6, 2.5, 3); }
      }
    }
  }
  kick(k) { this.shake = Math.min(1.2, this.shake + k); }

  // ── A frame ──
  // look: { yaw, pitch } the live view angles (the mouse moves them between
  // sim steps), a: interpolation 0…1, t: seconds.
  render(run, look, a, dt, t, settings) {
    const p = run.player, b = p.body;
    this.actors.update(run, a, dt, t);
    this.fx.sync(run);
    this.fx.update(dt);

    // Camera.
    const cam = this.camera;
    const cc = run.cutCamera();
    if (cc) {
      cam.position.set(cc.x, cc.y, cc.z);
      cam.lookAt(cc.lx, cc.ly, cc.lz);
      cam.fov = 50;
    } else {
      const ix = b.px + (b.x - b.px) * a, iy = b.py + (b.y - b.py) * a, iz = b.pz + (b.z - b.pz) * a;
      const proxy = { aimK: p.aimK, shoulder: p.shoulder, crouchK: p.crouchK, peekX: p.peekX, peekZ: p.peekZ, yaw: look.yaw, pitch: look.pitch + p.recoil * 0.6 };
      this.smoothShoulder = damp(this.smoothShoulder ?? p.shoulder, p.shoulder, 10, dt);
      proxy.shoulder = this.smoothShoulder;
      cameraRig(run.space, proxy, ix, iy - (p.downed ? 0.5 : 0), iz, this.cam);
      // Smooth the pull-in against walls a little (no popping).
      const c = this.cam;
      cam.position.set(c.x, c.y, c.z);
      cam.rotation.set(proxy.pitch, look.yaw, 0, "YXZ");
      this.fovK = damp(this.fovK, p.aimK, 14, dt);
      cam.fov = lerp(CAMERA.fov, CAMERA.aimFov, this.fovK) + (p.sprinting ? 4 : 0);
    }
    if (this.shake > 0 && settings.shake !== false) {
      const s = this.shake * this.shake * 0.12;
      cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; cam.position.z += (Math.random() - 0.5) * s;
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);
    cam.updateProjectionMatrix();
    // Kessler right in front of the lens is hidden rather than filling the screen.
    const kb = run.ally.body;
    this.actors.kessler.visible = !!cc || Math.hypot(kb.x - cam.position.x, kb.y + 1 - cam.position.y, kb.z - cam.position.z) > 1.6;

    // The noise ring.
    const nr = run.cut ? 0 : p.noiseR;
    this.noiseRing.position.set(b.px + (b.x - b.px) * a, b.y + 0.06, b.pz + (b.z - b.pz) * a);
    this.noiseRing.scale.setScalar(Math.max(0.3, nr));
    this.noiseRing.material.opacity = Math.min(0.45, nr * 0.05);
    this.noiseRing.material.color.setHex(nr > 10 ? 0xff6040 : nr > 3 ? 0xf0a040 : 0x6fe8ff);

    // Light follows the ranger.
    this.sun.follow(b.x, b.y, b.z);

    // Dynamic props.
    this.doorOpen = damp(this.doorOpen, this.doorWant, 2, dt);
    if (this.door) this.door.obj.userData.nodes.door.position.y = this.doorOpen * 2.4;
    if (this.door) this.door.obj.userData.nodes.lamp.children.forEach((m) => { m.visible = this.doorWant ? true : Math.sin(t * 4) > 0; });
    if (this.gen) {
      this.genK = damp(this.genK, this.power ? 1 : this.genSpin ? 0.6 : 0, 0.8, dt);
      const core = this.gen.obj.userData.nodes.core;
      core.rotation.x += dt * this.genK * 12;
      core.scale.setScalar(0.85 + this.genK * 0.15 + Math.sin(t * 30) * 0.02 * this.genK);
      core.visible = this.genK > 0.05;
    }
    if (this.tower) this.tower.obj.userData.nodes.beacon.visible = this.relay ? Math.sin(t * 3) > 0 : false;
    for (const v of this.vents) if (v.obj.userData.nodes.charge.visible) v.obj.userData.nodes.charge.children.forEach((m, i) => { if (i === 1) m.visible = Math.sin(t * 10) > 0; });

    // The nearest lamps get the real lights (dim and red until the power is on).
    if (!this.lampT || t - this.lampT > 0.4) {
      this.lampT = t;
      const near = this.kit.lights.map((l) => [l, Math.hypot(l.x - cam.position.x, l.z - cam.position.z)]).sort((x, y) => x[1] - y[1]);
      this.lamps.forEach((L, i) => {
        const e = near[i]?.[0];
        if (!e || i >= this.lampCount) { L.intensity = 0; return; }
        L.position.set(e.x, e.y, e.z); L.distance = e.r;
        const colony = Math.hypot(e.x, e.z) < 60;
        L.color.setHex(colony && !this.power ? 0xff4030 : e.color);
        L.userData.k = (colony && !this.power ? 0.35 : 1) * e.k * 30;
      });
    }
    for (const L of this.lamps) L.intensity = L.userData.k ?? 0;

    this.composer.render(dt);
  }

  // World → screen (pixels), null when behind the camera.
  project(x, y, z) {
    const v = this._v.set(x, y, z).project(this.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * this.W, y: (-v.y * 0.5 + 0.5) * this.H, behind: false, nx: v.x, ny: v.y };
  }
}
