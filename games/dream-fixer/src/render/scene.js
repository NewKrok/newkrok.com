import * as T from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { makeRenderer, envMap, skyDome, Sun } from "./look.js";
import { buildLevelMeshes } from "./levelview.js";
import { ViewModel } from "./viewmodel.js";
import { Fx } from "./fx.js";
import { FoeView } from "./foes.js";
import { BossView } from "./boss.js";
import { Companion, MemoryView } from "./companion.js";
import { AnchorView } from "./anchors.js";
import { DreamSky } from "./dreamsky.js";
import { WaterView } from "./water.js";
import { FoamView } from "./foam.js";
import { BellView } from "./bell.js";
import { UmbrellaView } from "./umbrella.js";
import { C } from "./palette.js";
import { damp, lerp } from "../config.js";

// ── The first-person view ────────────────────────────────────────────────
// World pass, then the tool in hand on top (depth cleared), then bloom.
// The camera rides the body's interpolated eye, smoothing step-ups and
// dipping a little on hard landings.

const LAMP_LIGHTS = 5;

export class GameView {
  constructor(container, settings) {
    this.renderer = makeRenderer(container);
    this.env = envMap(this.renderer);
    this.scene = new T.Scene();
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.35;
    this.camera = new T.PerspectiveCamera(72, 16 / 9, 0.05, 700);
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.vm = new ViewModel(this.env);
    this.fx = new Fx(this.scene);
    this.foes = new FoeView(this.scene, this.fx);
    this.bossView = new BossView(this.scene, this.fx);
    this.foamView = new FoamView(this.scene, this.fx);
    this.bellView = new BellView(this.scene, this.fx);
    this.umbrellaView = new UmbrellaView(this.scene, this.fx);
    this.companion = new Companion(this.scene);
    this.talking = false;
    this.shake = 0;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const vmPass = new RenderPass(this.vm.scene, this.vm.camera);
    vmPass.clear = false; vmPass.clearDepth = true;
    this.composer.addPass(vmPass);
    this.bloom = new UnrealBloomPass(new T.Vector2(256, 256), 0.55, 0.4, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.muzzleLight = new T.PointLight(0x9ffff0, 0, 7, 2);
    this.scene.add(this.muzzleLight);
    this.lamps = [];
    for (let i = 0; i < LAMP_LIGHTS; i++) { const l = new T.PointLight(0xffd08a, 0, 10, 1.6); this.lamps.push(l); this.scene.add(l); }

    this.level = null;
    this.pending = [];
    this.eyeOff = 0; this.bobT = 0; this.roll = 0;
    this.W = 1; this.H = 1;
    this.setQuality(settings.quality);
    this._v = new T.Vector3(); this._v2 = new T.Vector3();
  }

  setQuality(q) {
    this.quality = q;
    const hi = q === "high";
    this.scale = 1;
    this.perf = { ema: 1 / 60, slowT: 0, fastT: 0 };
    this.pr = hi ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1.25) * 0.8;
    this.applyScale();
    this.renderer.shadowMap.enabled = hi;
    this.bloom.enabled = hi;
    if (this.sun) this.sun.light.castShadow = hi;
    this.resize(this.W, this.H);
  }

  applyScale() {
    const pr = this.pr * this.scale;
    this.renderer.setPixelRatio(pr);
    this.composer.setPixelRatio(pr);
  }

  // Adaptive resolution: a weak GPU that keeps missing frames gets a lower
  // render scale (down to 55 %), then no bloom; a fast one climbs back.
  adapt(dt) {
    const P = this.perf;
    if (dt <= 0 || dt > 0.25) return;
    P.ema += (dt - P.ema) * 0.05;
    if (P.ema > 1 / 45) { P.slowT += dt; P.fastT = 0; } else if (P.ema < 1 / 58) { P.fastT += dt; P.slowT = 0; } else { P.slowT = 0; P.fastT = 0; }
    if (P.slowT > 2) {
      P.slowT = 0;
      if (this.scale > 0.56) { this.scale = Math.max(0.55, this.scale - 0.15); this.applyScale(); this.resize(this.W, this.H); }
      else if (this.bloom.enabled) this.bloom.enabled = false;
    } else if (P.fastT > 6 && this.scale < 1) {
      P.fastT = 0;
      this.scale = Math.min(1, this.scale + 0.15); this.applyScale(); this.resize(this.W, this.H);
    }
  }

  resize(w, h) {
    this.W = w; this.H = h;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // Keep a sensible horizontal view on tall phone screens.
    this.baseFov = this.camera.fov = w / h < 1.3 ? 80 : 72;
    this.camera.updateProjectionMatrix();
    this.vm.resize(w / h);
  }

  // Build the level's meshes, sky and light for a Run.
  load(run) {
    if (this.level) {
      this.scene.remove(this.level);
      this.level.traverse((o) => { if (o.isMesh && !o.userData.keep) o.geometry.dispose(); });
      this.scene.remove(this.sun.hemi, this.sun.light, this.sun.light.target);
      this.foes.clear();
      this.bossView.clear();
      this.foamView.clear();
    }
    this.bellView.load(run);
    this.umbrellaView.load(run);
    const def = run.def, kit = run.kit;
    this.foes.setSkins(def.skins);
    const g = this.level = new T.Group();
    const sky = skyDome(def.sky);
    g.add(sky);
    this.scene.fog = new T.Fog(def.fog.color, def.fog.near, def.fog.far);
    this.sun = new Sun(this.scene, { ...def.sun, box: 26, mapSize: 2048 });
    this.sun.light.castShadow = this.quality === "high";
    this.vm.setLights(def.sun.color, def.sun.dir, def.sun.sky, def.sun.ground);
    for (const m of buildLevelMeshes(kit)) g.add(m);
    this.anchors = new AnchorView(g, kit.anchors);
    this.weather = new DreamSky(g, def, kit, { sky, fog: this.scene.fog, sun: this.sun });
    this.memories = new MemoryView(g, run.memories);
    this.water = new WaterView(g, kit, this.fx);
    this.companion.placed = false;
    this.lampCount = Math.min(LAMP_LIGHTS, def.lamps ?? 3);
    this.lampSpots = kit.lights;
    this.scene.add(g);
  }

  // What the sim did this frame; applied in frame() once the camera has
  // moved, so bolts leave the muzzle where it is now.
  consume(events) { for (const e of events) this.pending.push(e); }

  applyEvents(run) {
    const events = this.pending;
    for (const e of events) {
      this.water.onEvent(e);
      if (e.type.startsWith("foam")) {
        this.foamView.onEvent(e);
        if (e.type === "foamSpray") this.sprayed = true;
        if (e.type === "foamBlob") { this.blobbed = true; this.muzzleFlash = Math.max(this.muzzleFlash || 0, 0.5); }
        if (e.type === "foamSet" && Math.hypot(e.x - run.body.x, e.z - run.body.z) < 6) this.shake = Math.min(1, this.shake + 0.12);
      } else if (e.type === "bellRing" || e.type === "bellLull") {
        if (e.type === "bellRing") { this.rang = true; this.muzzleFlash = Math.max(this.muzzleFlash || 0, 0.8); }
        else { this.lulled = true; this.ringBurst(run, 0x9fc8ff, 20); }
      } else if (["bellBat", "foeSleep", "foeWake", "jellyWobble", "jellySquish", "boing", "souffleFall"].includes(e.type)) {
        this.bellView.onEvent(e, run);
        if (e.type === "souffleFall" && Math.hypot(e.x - run.body.x, e.z - run.body.z) < 10) this.shake = Math.min(1, this.shake + 0.2);
      } else if (["gust", "gustHop", "foeToss", "foeLand", "foeSlap", "umbrellaBlock", "spitBlown", "pinwheel"].includes(e.type)) {
        this.umbrellaView.onEvent(e, run, this.muzzleWorld());
        if (e.type === "gust") { this.gusted = true; this.muzzleFlash = Math.max(this.muzzleFlash || 0, 0.6); }
        if (e.type === "umbrellaBlock") this.shake = Math.min(1, this.shake + 0.1);
      } else if (e.type === "shot") {
        const end = [e.o[0] + e.d[0] * e.t, e.o[1] + e.d[1] * e.t, e.o[2] + e.d[2] * e.t];
        const from = this.muzzleWorld();
        const big = e.big;
        this.fx.bolt(from, end, big ? C.dreamPink : C.dream, big ? 0.05 + big * 0.05 : 0.022);
        if (e.hit) {
          this.fx.burst(end, e.n, big ? C.dreamPink : C.dream, big ? 26 : 9, big ? 6 : 4, big ? 0.08 : 0.05);
          this.fx.ring(end, e.n, big ? C.dreamPink : C.dream, big ? 0.9 : 0.35, big ? 0.35 : 0.2);
        }
        this.muzzleFlash = big ? 1.6 : 1;
        this.shotThisFrame = big || 0.0001;
      } else if (e.type === "anchorFixed") {
        this.anchors.onEvent(e, this.fx);
        this.shake = Math.min(1, this.shake + 0.3);
      } else if (e.type === "pop" || e.type === "spitPop") {
        this.foes.onEvent(e);
      } else if (e.type === "hurt") {
        this.shake = Math.min(1, this.shake + 0.5);
      } else if (e.type === "dust") {
        // Caught: a ring of gold flecks spreading round you at waist height
        // (not in front of the eye), and a flash.
        this.ringBurst(run, C.dreamGold, 6);
        this.muzzleFlash = Math.max(this.muzzleFlash || 0, 0.25);
      } else if (e.type === "heal") {
        this.ringBurst(run, 0xff7aa0, 18);
      } else if (e.type === "slam") {
        this.shake = Math.min(1, this.shake + (Math.hypot(e.x - run.body.x, e.z - run.body.z) < 9 ? 0.45 : 0.15));
        this.fx.puff(e.x, run.kit.floorAt(e.x, e.z) + 0.3, e.z, 1.4);
      } else if (e.type === "sneeze") {
        this.shake = Math.min(1, this.shake + 0.45);
        this.ringBurst(run, 0x6a5a4c, 10);
      } else if (e.type === "cloudBlown") {
        this.fx.puff(e.x, e.y, e.z, 1.4);
      } else if (e.type === "meatSplit") {
        this.fx.burst([e.x, e.y, e.z], [0, 1, 0], 0xc8302a, 12, 3, 0.06);
      } else if (e.type.startsWith("boss") || e.type.startsWith("pen") || e.type.startsWith("cooker")) {
        this.bossView.onEvent(e, run);
        if (e.type === "bossRise" || e.type === "bossPop") this.shake = Math.min(1, this.shake + 0.7);
        if (e.type === "bossGulp") this.shake = 1;
        if (e.type === "bossHit") { /* the flash is enough */ }
      } else if (e.type === "memory") {
        this.fx.burst([e.x, e.y, e.z], [0, 1, 0], C.dreamGold, 30, 4, 0.07);
        this.fx.ring([e.x, e.y, e.z], [0, 1, 0], C.dreamGold, 1.6, 0.5);
        this.fx.puff(e.x, e.y, e.z, 0.6);
      } else if (e.type === "catch") {
        this.fx.puff(e.x, e.y, e.z, 0.5);
        this.fx.burst([e.x, e.y, e.z], [0, 1, 0], C.dreamGold, 10, 3, 0.05);
      } else if (e.type === "launch") {
        this.launched = true;
      } else if (e.type === "blast") {
        this.blasted = true;
        const m = this.muzzleWorld(), d = run.aimDir();
        for (let i = 0; i < 24; i++) {
          const k = 6 + Math.random() * 6, j = () => (Math.random() - 0.5) * 3;
          this.fx.spark(m[0], m[1], m[2], d[0] * k + j(), d[1] * k + j(), d[2] * k + j(), 0.35, 0.05, 0xffffff, 0);
        }
      } else if (e.type === "ballPop" && e.kind === "pillow") {
        // Feathers everywhere, drifting down slowly.
        this.fx.puff(e.x, e.y, e.z, 1.8);
        this.fx.ring([e.x, e.y, e.z], [0, 1, 0], 0xd8c8ff, 4.2, 0.45);
        for (let i = 0; i < 60; i++) {
          const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), v = 2 + Math.random() * 5;
          this.fx.spark(e.x, e.y, e.z, Math.cos(a) * s * v, u * v + 2.5, Math.sin(a) * s * v, 1.2 + Math.random() * 1.2, 0.05 + Math.random() * 0.06, i % 4 ? 0xffffff : 0xd8c8ff, 1.2);
        }
        this.shake = Math.min(1, this.shake + 0.3);
      } else if (e.type === "cogZap") {
        this.fx.bolt(e.from, e.to, C.dream, 0.018, 90);
        this.fx.burst(e.to, [0, 1, 0], C.dream, 8, 3, 0.04);
      } else if (e.type === "cogGrab") {
        this.fx.burst([e.x, e.y, e.z], [0, 1, 0], C.dreamGold, 10, 2.5, 0.04);
      } else if (e.type === "itemUse" && e.id === "espresso") {
        this.ringBurst(run, 0xc8864a, 16);
      } else if (e.type === "ballPop") {
        this.fx.puff(e.x, e.y, e.z, 1.1);
        this.fx.ring([e.x, e.y, e.z], [0, 1, 0], C.dreamGold, 2.4, 0.35);
        this.foes.onEvent({ type: "pop", kind: e.kind, x: e.x, y: e.y, z: e.z, big: false });
        this.shake = Math.min(1, this.shake + 0.2);
      } else if (e.type === "land") {
        this.eyeOff -= Math.min(0.22, (e.speed - 4) * 0.025);
      } else if (e.type === "respawn") {
        this.eyeOff = 0;
      }
    }
    events.length = 0;
  }

  // Flecks bursting outwards in a ring round you, a metre or more off.
  ringBurst(run, color, n) {
    const b = run.body;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 0.4;
      this.fx.spark(b.x + Math.cos(a) * r, b.y + 0.7 + Math.random() * 0.5, b.z + Math.sin(a) * r, Math.cos(a) * 2.2, 1 + Math.random() * 1.5, Math.sin(a) * 2.2, 0.45, 0.04, k % 2 ? color : 0xffffff, 2);
    }
  }

  suckStream(run, dt) {
    const m = this.muzzleWorld(), d = run.aimDir();
    this.suckAcc = (this.suckAcc || 0) + dt * 60;
    while (this.suckAcc > 1) {
      this.suckAcc -= 1;
      // Start somewhere in the cone, fly back to the nozzle.
      const L = 2 + Math.random() * 5, a = Math.random() * Math.PI * 2, r = Math.random() * L * 0.35;
      const up = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const sx = d[1] * up[2] - d[2] * up[1], sy = d[2] * up[0] - d[0] * up[2], sz = d[0] * up[1] - d[1] * up[0];
      const sl = Math.hypot(sx, sy, sz) || 1;
      const ux = sy * d[2] - sz * d[1], uy = sz * d[0] - sx * d[2], uz = sx * d[1] - sy * d[0];
      const px = m[0] + d[0] * L + (sx / sl * Math.cos(a) + ux / sl * Math.sin(a)) * r;
      const py = m[1] + d[1] * L + (sy / sl * Math.cos(a) + uy / sl * Math.sin(a)) * r;
      const pz = m[2] + d[2] * L + (sz / sl * Math.cos(a) + uz / sl * Math.sin(a)) * r;
      const life = 0.3;
      this.fx.spark(px, py, pz, (m[0] - px) / life, (m[1] - py) / life, (m[2] - pz) / life, life, 0.025, Math.random() < 0.3 ? C.dreamGold : 0xffffff, 0);
    }
  }

  // The muzzle of the tool in hand, placed in the world just in front of the eye.
  muzzleWorld() {
    const ndc = this.vm.muzzleNDC(this._v);
    const cam = this.camera;
    const dir = this._v2.set(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize();
    return [cam.position.x + dir.x * 0.6, cam.position.y + dir.y * 0.6, cam.position.z + dir.z * 0.6];
  }

  frame(run, alpha, dt, look, t) {
    const b = run.body;
    // Eye: interpolated, step-ups absorbed and eased back, a light bob.
    if (b.stepUp > 0) this.eyeOff -= b.stepUp;
    b.stepUp = 0;
    this.eyeOff = damp(this.eyeOff, 0, 12, dt);
    const sp = b.grounded ? Math.min(1, b.speed2D / 6.4) : 0;
    this.bobT += dt * (b.speed2D * 1.35);
    const bob = Math.sin(this.bobT * 2) * 0.03 * sp;
    const x = lerp(b.px, b.x, alpha), y = lerp(b.py, b.y, alpha), z = lerp(b.pz, b.z, alpha);
    this.camera.position.set(x, y + 1.58 + this.eyeOff + bob, z);
    // Lean a hair into strafes.
    const sn = Math.sin(b.yaw), cs = Math.cos(b.yaw);
    const side = (b.vx * cs - b.vz * sn) / 6.4;
    this.roll = damp(this.roll, -side * 0.025, 8, dt);
    this.shake = damp(this.shake, 0, 7, dt);
    const sh = this.shake * this.shake * 0.05;
    this.camera.rotation.set(b.pitch + Math.sin(t * 61) * sh, b.yaw + Math.sin(t * 47) * sh, this.roll + Math.sin(t * 53) * sh);
    // Running widens the view a touch.
    this.runK = damp(this.runK || 0, run.sprinting && b.speed2D > 7 ? 1 : 0, 6, dt);
    const fov = this.baseFov + this.runK * 6;
    if (Math.abs(fov - this.camera.fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.camera.updateMatrixWorld();

    this.sun.follow(x, y, z);
    this.applyEvents(run);

    // The nearest lamps light up the place around you.
    if (this.lampSpots?.length) {
      const near = this.lampSpots.map((l) => [l, (l.x - x) ** 2 + (l.z - z) ** 2]).sort((a, c) => a[1] - c[1]);
      this.lamps.forEach((L, i) => {
        const s = i < this.lampCount ? near[i]?.[0] : null;
        if (!s) { L.intensity = 0; return; }
        L.position.set(s.x, s.y, s.z); L.color.set(s.color); L.distance = s.dist;
        L.intensity = s.intensity * (0.95 + Math.sin(t * 7 + i) * 0.05);
      });
    }

    this.anchors.update(run, dt, t, this.fx);
    this.weather.update(run, dt, t);
    this.water.update(run, dt, t);
    this.memories.update(dt, t, this.fx);
    this.companion.update(run, dt, t, this.talking);
    // Cog healing you: little pink motes drifting from him to you.
    if (run.cog?.healing && Math.random() < dt * 5) {
      const p = this.companion.pos, life = 0.7;
      this.fx.spark(p.x, p.y - 0.2, p.z, (b.x - p.x) / life, (b.y + 1.1 - p.y) / life, (b.z - p.z) / life, life, 0.035, 0xff7aa0, 0);
    }

    const tool = run.activeTool;
    this.vm.update(dt, {
      look, speed: b.speed2D, grounded: b.grounded, t, tool: tool.id,
      heat: tool.heat, charge: tool.charge, overheated: tool.overheated,
      shot: !!this.shotThisFrame, big: this.shotThisFrame || 0, hidden: run.opts.noTools,
      sucking: tool.sucking, tank: tool.tank, launched: this.launched, blasted: this.blasted,
      sprayed: this.sprayed, blobbed: this.blobbed, rang: this.rang, lulled: this.lulled,
      open: tool.open, gusted: this.gusted, gliding: tool.open && !b.grounded,
    });
    this.shotThisFrame = 0; this.launched = false; this.blasted = false; this.sprayed = false; this.blobbed = false; this.rang = false; this.lulled = false; this.gusted = false;
    // The vacuum's stream: flecks rushing into the nozzle.
    if (tool.sucking) this.suckStream(run, dt);
    this.muzzleFlash = damp(this.muzzleFlash || 0, 0, 20, dt);
    const m = this.muzzleWorld();
    this.muzzleLight.position.set(m[0], m[1], m[2]);
    this.muzzleLight.intensity = this.muzzleFlash * 6 + tool.charge * 3;

    this.foes.update(run, alpha, dt, t);
    this.bossView.update(run, alpha, dt, t);
    this.foamView.update(run, alpha, dt, t, m);
    this.bellView.update(run, dt, t);
    this.umbrellaView.update(run, dt, t);
    this.fx.update(dt);
    this.adapt(dt);
    this.composer.render(dt);
  }
}
