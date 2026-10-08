import * as T from "three";
import { MODELS } from "./models/index.js";
import { make, MAT } from "./modelkit.js";
import { envMap } from "./look.js";

// ── The workbench preview ────────────────────────────────────────────────
// The thing picked on the bench, turning slowly on its own little canvas
// (drag to turn it yourself). The renderer is made when the bench opens
// and let go when it closes, so it costs nothing in a dream.

export class BenchPreview {
  constructor() {
    this.r = null;
    this.id = null;
    this.yaw = -0.6;
    this.frame = this.frame.bind(this);
  }

  init() {
    const r = this.r = new T.WebGLRenderer({ antialias: true, alpha: true });
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.setClearColor(0x000000, 0);
    r.domElement.className = "pv-canvas";
    this.scene = new T.Scene();
    this.scene.environment = envMap(r);
    this.scene.environmentIntensity = 0.5;
    this.scene.add(new T.HemisphereLight(0xfff2dc, 0x3a3044, 1.4));
    const sun = new T.DirectionalLight(0xfff0d8, 2.2);
    sun.position.set(2, 4, 3);
    this.scene.add(sun);
    this.glow = new T.PointLight(0x7ff5e0, 0, 3, 2);
    this.scene.add(this.glow);
    this.camera = new T.PerspectiveCamera(32, 1, 0.01, 50);
    // Drag to turn.
    const c = r.domElement;
    c.addEventListener("pointerdown", (e) => { this.drag = e.clientX; c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", (e) => { if (this.drag != null) { this.yaw -= (e.clientX - this.drag) * 0.012; this.drag = e.clientX; } });
    const up = () => { this.drag = null; };
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
  }

  // Put the canvas into host (again, after the bench redraws).
  mount(host) {
    if (!this.r) this.init();
    host.appendChild(this.r.domElement);
    this.host = host;
    this.t0 ??= performance.now();
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  }

  // The bench closed: drop the renderer and its GL context.
  unmount() {
    if (!this.r) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.r.domElement.remove();
    this.r.dispose();
    this.r.forceContextLoss();
    this.r = null; this.host = null; this.model = null; this.id = null;
  }

  // id: a model in the registry; glow: a light colour for it (Cog's modules).
  show(id, glow = null) {
    if (!this.r) return;
    this.glow.color.setHex(glow ?? 0xffffff);
    this.glow.intensity = glow ? 3 : 0;
    if (id === this.id) return;
    this.id = id;
    if (this.model) this.scene.remove(this.model);
    const def = MODELS[id];
    if (!def) { this.model = null; return; }
    const o = this.model = make(def.build, { ...def.opts, hand: false });   // a tool on the bench, not in your hand
    this.def = def;
    // Centred on the turntable, the camera backed off to fit it.
    const box = new T.Box3().setFromObject(o), c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
    o.position.sub(c);
    this.dist = size.length() / 2 / Math.tan(T.MathUtils.degToRad(this.camera.fov) / 2) * 1.08;
    this.glow.position.set(size.x * 0.6, size.y * 0.4, -size.z * 0.8 - 0.1);
    this.scene.add(o);
  }

  frame(now) {
    this.raf = requestAnimationFrame(this.frame);
    const r = this.r, host = this.host;
    if (!r || !host?.isConnected) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const w = host.clientWidth, h = host.clientHeight;
    if (w < 2 || h < 2) return;
    if (w !== this.w || h !== this.h) {
      this.w = w; this.h = h;
      r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      r.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.drag == null) this.yaw += dt * 0.7;
    const t = (now - this.t0) / 1000;
    if (this.model) this.def.anim?.(this.model, t);
    const d = this.dist ?? 1, p = 0.32;
    this.camera.position.set(Math.sin(this.yaw) * Math.cos(p) * d, Math.sin(p) * d, Math.cos(this.yaw) * Math.cos(p) * d);
    this.camera.lookAt(0, 0, 0);
    // (On low quality the game hands metal and glass its own reflections,
    // which live in the game's GL context: here they take this scene's.)
    const keep = [MAT.metal.envMap, MAT.glass.envMap];
    MAT.metal.envMap = MAT.glass.envMap = null;
    r.render(this.scene, this.camera);
    [MAT.metal.envMap, MAT.glass.envMap] = keep;
  }
}
