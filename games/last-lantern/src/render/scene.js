import * as T from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { buildEnv, syncEnv, LOOKS } from "./env.js";
import { Rigs, buildHero, syncHero } from "./rigs.js";
import { Fx } from "./fx.js";
import { clamp } from "../config.js";

// ── The 3D view ──────────────────────────────────────────────────────────
// A tilted chase camera over the arena, moonlight with a shadow box that
// follows the hero, the hero's own lantern as the main warm light, and a
// bloom pass on high quality so fire, gems and eyes glow.

const ELEV = 1.08;            // camera elevation above the horizon (rad)
const DIST = 780;

export class Scene3D {
  constructor(container, quality = "high") {
    this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.domElement.className = "view3d";
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(42, 16 / 9, 5, 14000);
    this.camera.up.set(0, 0, 1);
    this.focus = { x: 0, y: 0 };
    this.zoom = 1;
    this.W = 1; this.H = 1;
    this.v = new T.Vector3();

    this.ambient = new T.AmbientLight(0x2c3a5c, 2);
    this.hemi = new T.HemisphereLight(0x5a6aa0, 0x1a1a14, 0.8);
    this.hemi.up.set(0, 0, 1);
    this.moon = new T.DirectionalLight(0xb8c8ff, 1.6);
    this.moon.castShadow = true;
    const sc = this.moon.shadow.camera;
    sc.left = -700; sc.right = 700; sc.top = 600; sc.bottom = -600; sc.near = 10; sc.far = 3000;
    this.moon.shadow.bias = -0.0008;
    this.moon.shadow.normalBias = 1.5;
    this.scene.add(this.ambient, this.hemi, this.moon, this.moon.target);
    this.heroLight = new T.PointLight(0xffb765, 40000, 520, 1.7);
    this.heroLight.castShadow = false;
    this.scene.add(this.heroLight);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new T.Vector2(512, 512), 0.7, 0.5, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.env = null; this.rigs = null; this.fx = null; this.hero = null;
    this.stageKey = "";
    this.setQuality(quality);
  }

  setQuality(q) {
    this.quality = q;
    const hi = q === "high";
    this.basePR = hi ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.resScale = 1;
    this.perf = { ema: 1 / 60, slowT: 0, fastT: 0, holdT: 0, bloomOff: false };
    this.renderer.setPixelRatio(this.basePR);
    this.composer.setPixelRatio(this.basePR);
    this.renderer.shadowMap.enabled = hi;
    this.moon.castShadow = hi;
    this.moon.shadow.mapSize.set(hi ? 2048 : 512, hi ? 2048 : 512);
    this.moon.shadow.map?.dispose();
    this.moon.shadow.map = null;
    this.useBloom = hi;
    this.wantBloom = hi;
    this.stageKey = "";           // rebuild the arena at the new quality
    this.resize(this.W, this.H);
  }

  resize(w, h) {
    this.W = Math.max(1, w); this.H = Math.max(1, h);
    this.renderer.setSize(this.W, this.H, false);
    this.composer.setSize(this.W, this.H);
    this.bloom.resolution.set(this.W / 2, this.H / 2);
    const aspect = this.W / this.H;
    this.camera.aspect = aspect;
    // Keep roughly the same world width in view on portrait phones.
    const ref = 16 / 9;
    this.camera.fov = aspect < ref ? Math.min(75, 2 * Math.atan(Math.tan((42 * Math.PI) / 360) * (ref / aspect) * 0.8) * 180 / Math.PI) : 42;
    this.camera.updateProjectionMatrix();
  }

  // (Re)build everything that depends on the run's stage.
  load(R) {
    const key = `${R.stage.id}|${R.heroDef.id}|${this.quality}|${R.seed}`;
    if (this.env) this.env.dispose();
    this.rigs?.dispose();
    if (this.hero) this.scene.remove(this.hero.g);
    this.stageKey = key;
    const L = R.stage.mood || LOOKS[R.stage.look];
    this.scene.fog = new T.FogExp2(L.fog, L.fogD);
    this.scene.background = new T.Color(L.fog);
    this.ambient.color.setHex(L.amb); this.ambient.intensity = L.ambI;
    this.hemi.color.setHex(L.hemiSky); this.hemi.groundColor.setHex(L.hemiGnd);
    this.moon.color.setHex(L.moon); this.moon.intensity = L.moonI;
    this.bloom.strength = L.bloom;
    this.env = buildEnv(this.scene, R, this.quality);
    this.rigs = new Rigs(this.scene);
    this.rigs.lowGeo = this.quality !== "high";
    if (!this.fx) this.fx = new Fx(this.scene);
    this.hero = buildHero(R.heroDef);
    this.scene.add(this.hero.g);
    this.R = R;
    this.snap = true;
  }

  // The world rect (px) the camera sees: the four screen corners cast onto
  // the ground, grown by `pad` for tall figures and things in the air.
  viewRect(pad) {
    const cam = this.camera;
    cam.updateMatrixWorld();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const o = cam.position, v = this.v;
    for (const [nx, ny] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      v.set(nx, ny, 0.5).unproject(cam).sub(o);
      // Rays that miss the ground (above the horizon) reach far instead.
      const t = v.z < -1e-3 ? -o.z / v.z : 6000 / v.length();
      const wx = o.x + v.x * t, wy = -(o.y + v.y * t);
      x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); y0 = Math.min(y0, wy); y1 = Math.max(y1, wy);
    }
    return { x0: x0 - pad, x1: x1 + pad, y0: y0 - pad * 1.6, y1: y1 + pad };
  }

  project(x, y, z = 0) {
    this.v.set(x, -y, z).project(this.camera);
    return { x: (this.v.x + 1) / 2 * this.W, y: (1 - this.v.y) / 2 * this.H, behind: this.v.z > 1 };
  }

  // Adaptive resolution: when frames run long for a while, render at a lower
  // pixel ratio (down to 55 %), then drop the bloom pass; when there is
  // headroom again for a good while, step back up. Hidden-tab or hitch
  // frames (> 80 ms) are ignored.
  adapt(dt) {
    const P = this.perf;
    if (!(dt > 0) || dt > 0.08) return;
    P.ema += (dt - P.ema) * 0.05;
    if (P.holdT > 0) { P.holdT -= dt; return; }
    if (P.ema > 1 / 45) { P.slowT += dt; P.fastT = 0; } else if (P.ema < 1 / 57) { P.fastT += dt; P.slowT = 0; } else { P.slowT = 0; P.fastT = 0; }
    let next = this.resScale;
    if (P.slowT > 1.5) {
      if (this.resScale > 0.56) next = Math.max(0.55, this.resScale - 0.1);
      else if (this.useBloom) { this.useBloom = false; P.bloomOff = true; }
      P.slowT = 0; P.holdT = 2.5;
    } else if (P.fastT > 6) {
      if (P.bloomOff && this.wantBloom) { this.useBloom = true; P.bloomOff = false; }
      else if (this.resScale < 1) next = Math.min(1, this.resScale + 0.05);
      P.fastT = 0; P.holdT = 2;
    }
    if (next !== this.resScale) {
      this.resScale = next;
      this.renderer.setPixelRatio(this.basePR * next);
      this.composer.setPixelRatio(this.basePR * next);
      this.resize(this.W, this.H);
    }
  }

  // opts: { time, dt, mode: "play" | "title", shake }
  render(R, opts) {
    this.adapt(opts.dt);
    if (R !== this.R) this.load(R);
    const { time, dt } = opts;
    const hp = R.hero.body.position;
    // Camera focus: the hero, with a little lead in the running direction.
    const v = R.hero.body.velocity;
    let tx = hp.x + v.x * 0.18, ty = hp.y + v.y * 0.18;
    let dist = DIST * this.zoom, elev = ELEV;
    if (opts.mode === "title") {
      // A slow orbit over the start.
      tx = hp.x; ty = hp.y - 40;
      dist = 820; elev = 0.62;
    }
    // When the keeper falls the camera turns to the beacon as it catches.
    if (R.bossKilledAt && R.frame - R.bossKilledAt > 30) {
      const b = R.world.beacon;
      tx = b.x; ty = b.y + 120; dist *= 1.1;
    }
    // Keep the view mostly inside the arena.
    const { W, H } = R.world, mx = Math.min(W / 2, 420), myTop = Math.min(H / 2, 230), myBot = Math.min(H / 2, 360);
    tx = clamp(tx, mx, W - mx); ty = clamp(ty, myTop, H - myBot);
    const k = this.snap ? 1 : 1 - Math.pow(R.bossKilledAt ? 0.2 : 0.001, dt);
    this.focus.x += (tx - this.focus.x) * k;
    this.focus.y += (ty - this.focus.y) * k;
    this.snap = false;
    const fx = this.focus.x + (opts.shake?.[0] || 0), fy = this.focus.y + (opts.shake?.[1] || 0);
    const yaw = opts.mode === "title" ? time * 0.05 : 0;
    const cx = fx + Math.sin(yaw) * Math.cos(elev) * dist;
    const cyWorld = fy + Math.cos(yaw) * Math.cos(elev) * dist;       // south of the focus = +y in world
    this.camera.position.set(cx, -cyWorld, Math.sin(elev) * dist);
    this.camera.lookAt(fx, -fy, 0);
    const pitch = Math.PI / 2 - elev;

    // Moonlight and its shadow box follow the focus.
    this.moon.position.set(fx - 500, -fy + 700, 1300);
    this.moon.target.position.set(fx, -fy, 0);
    this.moon.target.updateMatrixWorld();

    syncEnv(this.env, R, time, dt, this.focus);
    const view = this.viewRect(90);
    this.rigs.sync(R, time, view);
    syncHero(this.hero, R, time);
    // The lantern light walks with the hero.
    const lw = new T.Vector3();
    this.hero.lanternAt.getWorldPosition(lw);
    this.heroLight.position.set(lw.x, lw.y, Math.max(70, lw.z + 40));
    const flare = R.hero.flareT > 0 && !opts.calm ? R.hero.flareT / 40 : 0;
    this.heroLight.intensity = (R.hero.dig > 0 ? 4000 : 17000 * (0.94 + Math.sin(time * 11) * 0.04)) * (1 + flare * 3) * (R.eclipse ? 0.85 : 1);
    this.heroLight.distance = 620 * (R.eclipse ? 0.8 : 1);
    this.ambient.intensity = (R.stage.mood || LOOKS[R.stage.look]).ambI * (R.eclipse ? 0.45 : 1) * (1 + (R.beaconLit || 0) * 0.6);
    // Visible world rect for culling the instanced effects.
    this.fx.sync(R, time, pitch, view, opts.calm);
    this.bloom.strength = (R.stage.mood || LOOKS[R.stage.look]).bloom * (opts.calm ? 0.55 : 1);

    if (this.useBloom) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}
