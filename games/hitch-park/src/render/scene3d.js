import * as T from "three";
import { M, VEHICLES, TRAILERS, CAR_TYPES, PLAYER_COLOR, PARK_HOLD, clamp, wrapPi, lcg } from "../config.js";
import { drawGround, makeCanvas, xform, rectPts } from "./topdown.js";

// ── 3D scene ─────────────────────────────────────────────────────────────
// World (x, y) px maps to three (x, −y, z) with z up; a body's rotation a
// becomes rotation.z = −a. Everything static is built once per level into
// one group (parked cars are merged per material, so each is a handful of
// draw calls); the player's car keeps separate wheel groups so they can
// spin and steer from the wheel bodies.

export const SUNS = {
  noon:   { dir: [-0.35, 0.5, 1], color: 0xfff1dc, i: 2.7, sky: 0xc4dcff, gnd: 0x6a6050, hemi: 1.15, top: "#6fa6e0", bot: "#dbe9f5", fog: 0xd6e2ec, lamps: false, env: 1 },
  deck:   { dir: [0.35, 0.55, 1], color: 0xffffff, i: 2.3, sky: 0xd2e0f0, gnd: 0x6a6a6a, hemi: 1.35, top: "#8fb0d4", bot: "#e8eef4", fog: 0xdfe6ee, lamps: false, env: 1 },
  marina: { dir: [-0.55, 0.25, 0.9], color: 0xfff0d8, i: 2.9, sky: 0xb8dcff, gnd: 0x5a6a70, hemi: 1.1, top: "#4f93dc", bot: "#cfe6f7", fog: 0xcfe2ee, lamps: false, env: 1 },
  golden: { dir: [-0.8, -0.3, 0.45], color: 0xffc27a, i: 2.4, sky: 0x9ab8e0, gnd: 0x5a6a30, hemi: 0.95, top: "#6f9ad0", bot: "#f6d6a0", fog: 0xe8d8b8, lamps: false, env: 0.85 },
  dusk:   { dir: [0.9, 0.3, 0.26], color: 0xff9a5a, i: 1.5, sky: 0x46558a, gnd: 0x2a2424, hemi: 0.6, top: "#1d2447", bot: "#f0a066", fog: 0x6a5060, lamps: true, env: 0.45 },
  night:  { dir: [0.35, 0.55, 0.85], color: 0xa8bcff, i: 0.5, sky: 0x3a4a78, gnd: 0x141418, hemi: 0.42, top: "#03050d", bot: "#1c2748", fog: 0x0c1222, lamps: true, env: 0.16 },
};

function owned(x) { x.userData.owned = true; return x; }

function canvasTex(w, h, draw, opts = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const t = new T.CanvasTexture(c);
  t.colorSpace = opts.linear ? T.NoColorSpace : T.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
  t.anisotropy = 8;
  return t;
}

// Minimal geometry merge (position / normal / uv), so a parked car or a
// batch of static props costs one draw call per material.
function mergeGeos(list, withColor = false) {
  let n = 0;
  const parts = list.map(({ geo, m }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    if (!g.attributes.uv) g.setAttribute("uv", new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    n += g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const col = withColor ? new Float32Array(n * 3) : null;
  let o = 0;
  parts.forEach((g, i) => {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    if (col) {
      const c = list[i].mat.color;
      for (let k = 0; k < cnt; k++) { col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b; }
    }
    o += cnt;
    g.dispose();
  });
  const out = new T.BufferGeometry();
  out.setAttribute("position", new T.BufferAttribute(pos, 3));
  out.setAttribute("normal", new T.BufferAttribute(nor, 3));
  out.setAttribute("uv", new T.BufferAttribute(uv, 2));
  if (col) out.setAttribute("color", new T.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return owned(out);
}

function roundedRectShape(l, w, r) {
  const s = new T.Shape();
  const hl = l / 2, hw = w / 2;
  r = Math.min(r, hl, hw);
  s.moveTo(-hl + r, -hw);
  s.lineTo(hl - r, -hw); s.quadraticCurveTo(hl, -hw, hl, -hw + r);
  s.lineTo(hl, hw - r); s.quadraticCurveTo(hl, hw, hl - r, hw);
  s.lineTo(-hl + r, hw); s.quadraticCurveTo(-hl, hw, -hl, hw - r);
  s.lineTo(-hl, -hw + r); s.quadraticCurveTo(-hl, -hw, -hl + r, -hw);
  return s;
}

// A box whose top is a smaller rectangle — car cabins and roofs.
function taperGeo(bx0, bx1, bw, tx0, tx1, tw, h) {
  const b = [[bx1, -bw / 2, 0], [bx1, bw / 2, 0], [bx0, bw / 2, 0], [bx0, -bw / 2, 0]];
  const t = [[tx1, -tw / 2, h], [tx1, tw / 2, h], [tx0, tw / 2, h], [tx0, -tw / 2, h]];
  const v = [];
  const quad = (a, bb, c, d) => v.push(...a, ...bb, ...c, ...a, ...c, ...d);
  quad(t[0], t[1], t[2], t[3]);
  quad(b[0], b[1], t[1], t[0]);
  quad(b[2], b[3], t[3], t[2]);
  quad(b[1], b[2], t[2], t[1]);
  quad(b[3], b[0], t[0], t[3]);
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.BufferAttribute(new Float32Array(v), 3));
  g.setAttribute("uv", new T.BufferAttribute(new Float32Array((v.length / 3) * 2), 2));
  g.computeVertexNormals();
  return owned(g);
}

export class Scene3D {
  constructor(container, quality = "high") {
    this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.domElement.className = "view3d";
    container.appendChild(this.renderer.domElement);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(45, 16 / 9, 1, 9000);
    this.camera.up.set(0, 0, 1);
    this.W = 1; this.H = 1;
    this.lv = null;
    this.camPos = null; this.camTgt = null; this.camYaw = 0;
    this.pv = new T.Vector3();
    this.v = new T.Vector3();
    this.dummy = new T.Object3D();
    this.mats = new Map();
    this.#initShared();
    this.setQuality(quality);
  }

  setQuality(q) {
    this.quality = q;
    const hi = q === "high";
    const size = hi ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.renderer.setPixelRatio(hi ? Math.min(window.devicePixelRatio || 1, 2) : 1);
    this.resize(this.W, this.H);
  }

  resize(w, h) {
    this.W = Math.max(1, w); this.H = Math.max(1, h);
    this.renderer.setSize(this.W, this.H, false);
    const aspect = this.W / this.H;
    this.camera.aspect = aspect;
    // Keep the horizontal view of a 16:9 frame on narrower screens.
    const base = 45, ref = 16 / 9;
    if (aspect < ref) {
      const hFov = 2 * Math.atan(Math.tan((base / 2) * Math.PI / 180) * ref);
      const vFov = 2 * Math.atan(Math.tan(hFov / 2) / aspect);
      this.camera.fov = Math.min(80, vFov * 180 / Math.PI);
    } else this.camera.fov = base;
    this.camera.updateProjectionMatrix();
  }

  #initShared() {
    const scene = this.scene;
    const sun = new T.DirectionalLight(0xffffff, 2.5);
    sun.castShadow = true;
    const sc = sun.shadow.camera;
    sc.left = -620; sc.right = 620; sc.top = 420; sc.bottom = -420; sc.near = 10; sc.far = 3200;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.8;
    const tgt = new T.Object3D();
    tgt.position.set(450, -250, 0);
    sun.target = tgt;
    scene.add(sun, tgt);
    this.sun = sun;
    this.hemi = new T.HemisphereLight(0xc4dcff, 0x6a6050, 1.1);
    this.hemi.up.set(0, 0, 1);
    this.hemi.position.set(0, 0, 1);
    scene.add(this.hemi);

    const g = this;
    // Shared unit geometries.
    g.box = new T.BoxGeometry(1, 1, 1);
    g.cyl = new T.CylinderGeometry(1, 1, 1, 18);            // axis along y
    g.cylZ = new T.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2);
    g.cylZ8 = new T.CylinderGeometry(1, 1, 1, 8).rotateX(Math.PI / 2);
    g.disc = new T.CircleGeometry(1, 18);
    g.sphere = new T.SphereGeometry(1, 14, 10);
    g.ico = new T.IcosahedronGeometry(1, 0);
    g.plane = new T.PlaneGeometry(1, 1);
    g.cone = new T.ConeGeometry(1, 1, 14).rotateX(Math.PI / 2);

    // Shared materials. `vcm` ones only lend their colour to the shared
    // vertex-coloured material when merged.
    const std = (key, o) => { const mt = new T.MeshStandardMaterial(o); g.mats.set(key, mt); return mt; };
    const vcm = (key, o) => { const mt = std(key, o); mt.userData.vc = true; return mt; };
    g.vcMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.66, metalness: 0.18 });
    g.glass = std("glass", { color: 0x121a24, metalness: 0.85, roughness: 0.12 });
    g.trim = vcm("trim", { color: 0x1d1f23, roughness: 0.7, metalness: 0.2 });
    g.chrome = vcm("chrome", { color: 0xd8dde3, roughness: 0.25, metalness: 0.9 });
    g.tire = vcm("tire", { color: 0x16171a, roughness: 0.92 });
    g.rim = std("rim", { color: 0xffffff, map: canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = "#23262b"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#c9ced6"; c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#3a3f47";
      for (let i = 0; i < 5; i++) { c.save(); c.translate(32, 32); c.rotate(i * Math.PI * 2 / 5); c.beginPath(); c.moveTo(-5, 8); c.lineTo(5, 8); c.lineTo(3, 26); c.lineTo(-3, 26); c.fill(); c.restore(); }
      c.fillStyle = "#8a9099"; c.beginPath(); c.arc(32, 32, 6, 0, Math.PI * 2); c.fill();
    }), roughness: 0.35, metalness: 0.7 });
    g.rimFlat = vcm("rimFlat", { color: 0xb9bec6, roughness: 0.4, metalness: 0.6 });
    g.head = vcm("head", { color: 0xfff6dc, emissive: 0xfff2cc, emissiveIntensity: 0.4, roughness: 0.2 });
    g.tail = vcm("tail", { color: 0x5a0a0a, emissive: 0xff1a1a, emissiveIntensity: 0.25, roughness: 0.3 });
    g.plate = vcm("plate", { color: 0xf2f2ea, roughness: 0.5 });
    g.concrete = vcm("concrete", { color: 0xa9aba9, roughness: 0.92 });
    g.darkConcrete = vcm("darkConcrete", { color: 0x7d7f80, roughness: 0.95 });
    g.metal = vcm("metal", { color: 0x8b939c, roughness: 0.4, metalness: 0.75 });
    g.darkMetal = vcm("darkMetal", { color: 0x2c3036, roughness: 0.5, metalness: 0.6 });
    g.yellow = vcm("yellow", { color: 0xf2c230, roughness: 0.55 });
    g.white = vcm("white", { color: 0xf1f1ec, roughness: 0.55 });
    g.red = vcm("red", { color: 0xc62d2d, roughness: 0.5 });
    g.wood = std("wood", { color: 0xffffff, roughness: 0.85, map: canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = "#9a7040"; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { c.fillStyle = y % 32 ? "#8a6236" : "#a57a48"; c.fillRect(0, y, w, 14); c.fillStyle = "#4d3518"; c.fillRect(0, y + 14, w, 2); }
      const rnd = lcg(5);
      c.globalAlpha = 0.25; c.strokeStyle = "#5a3f1e";
      for (let i = 0; i < 40; i++) { const y = rnd() * h; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + (rnd() - 0.5) * 6); c.stroke(); }
    }, { repeat: true }) });
    g.hazardStripe = std("hazardStripe", { color: 0xffffff, roughness: 0.7, map: canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = "#1b1b1b"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#f2c230";
      for (let k = -64; k < 128; k += 32) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 16, 0); c.lineTo(k + 16 - 64, 64); c.lineTo(k - 64, 64); c.fill(); }
    }, { repeat: true }) });
    g.barrierStripe = std("barrierStripe", { color: 0xffffff, roughness: 0.6, map: canvasTex(64, 16, (c, w, h) => {
      c.fillStyle = "#f4f4ef"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#d33a2c"; c.fillRect(0, 0, 16, h); c.fillRect(32, 0, 16, h);
    }, { repeat: true }) });
    g.hedge = std("hedge", { color: 0xffffff, roughness: 0.95, map: canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = "#2f5f22"; c.fillRect(0, 0, w, h);
      const rnd = lcg(9);
      for (let i = 0; i < 900; i++) { c.fillStyle = ["#3d7a2a", "#24501a", "#4d8c34", "#1d4015"][i % 4]; c.beginPath(); c.arc(rnd() * w, rnd() * h, 1.5 + rnd() * 3, 0, Math.PI * 2); c.fill(); }
    }, { repeat: true }) });
    g.leaf = [0x3d7a2a, 0x4d8c34, 0x2f6a24, 0x5f9e3f].map((c, i) => std("leaf" + i, { color: c, roughness: 0.9, flatShading: true }));
    g.trunk = vcm("trunk", { color: 0x5a3d24, roughness: 0.95 });
    g.coneM = std("coneMat", { color: 0xff6a12, roughness: 0.5 });
    g.poolMat = new T.MeshBasicMaterial({ map: canvasTex(128, 128, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, "rgba(255,226,170,0.9)"); gr.addColorStop(0.5, "rgba(255,200,120,0.35)"); gr.addColorStop(1, "rgba(255,190,110,0)");
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    }), transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    g.beamTex = canvasTex(64, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, "rgba(255,245,220,0.85)"); gr.addColorStop(1, "rgba(255,245,220,0)");
      c.fillStyle = gr;
      c.beginPath(); c.moveTo(w * 0.4, h); c.lineTo(w * 0.6, h); c.lineTo(w, 0); c.lineTo(0, 0); c.fill();
    });
    g.fadeTex = canvasTex(8, 64, (c, w, h) => {
      const gr = c.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });

    // Environment for the car paint and glass: a sky / horizon / ground
    // gradient through PMREM. Without it a metallic finish renders black.
    try {
      const pm = new T.PMREMGenerator(this.renderer);
      const envTex = canvasTex(256, 128, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "#7fb0e8"); gr.addColorStop(0.46, "#e8f0f8"); gr.addColorStop(0.52, "#8a8c86"); gr.addColorStop(1, "#3a3c3a");
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.fillStyle = "rgba(255,255,255,0.9)"; c.fillRect(40, 20, 50, 16); c.fillRect(150, 30, 60, 12);
      });
      envTex.mapping = T.EquirectangularReflectionMapping;
      const env = pm.fromEquirectangular(envTex).texture;
      if (env) scene.environment = env;
      envTex.dispose();
      pm.dispose();
    } catch { /* no PMREM — paint just looks flatter */ }

    g.rearCam = new T.PerspectiveCamera(72, 16 / 9, 1, 3000);
    g.rearCam.up.set(0, 0, 1);
  }

  // Paint materials are cached per colour.
  paintMat(hex) {
    const key = "paint" + hex;
    let m = this.mats.get(key);
    if (!m) {
      m = new T.MeshStandardMaterial({ color: hex, metalness: 0.45, roughness: 0.32 });
      this.mats.set(key, m);
    }
    return m;
  }
  matCached(key, make) {
    let m = this.mats.get(key);
    if (!m) { m = make(); this.mats.set(key, m); }
    return m;
  }

  parts() { return new Parts(this); }

  // ── Car model ──────────────────────────────────────────────────────────
  // Returns { body (merged), wheels: [{ pivot, spin, lx, ly, front }] }.
  // Wheel groups are left out of the merge when `live` is set.
  buildCarModel(spec, color, o = {}) {
    const g = this;
    const L = spec.len * M, W = spec.wid * M, H = spec.h * M;
    const X = (f) => L / 2 - f * L;
    const z0 = 2.6, zb = Math.min(H * 0.55, 10.6);
    const P = this.parts();
    const paint = this.paintMat(color);
    const bs = 1.4;
    const bodyGeo = owned(new T.ExtrudeGeometry(roundedRectShape(L - bs * 2, W - bs * 2, 4), { depth: zb - z0 - bs * 2, bevelEnabled: true, bevelThickness: bs, bevelSize: bs, bevelSegments: 2, curveSegments: 3 }));
    P.add(bodyGeo, paint, 0, 0, z0 + bs);
    const cabTop = H - 1.1;
    P.add(taperGeo(X(spec.rg), X(spec.ws), W * 0.9, X(spec.rb), X(spec.rf), W * 0.74, cabTop - (zb - 0.5)), g.glass, 0, 0, zb - 0.5);
    const rl = X(spec.rf) - X(spec.rb);
    P.add(taperGeo(-rl / 2 - 0.3, rl / 2 + 0.3, W * 0.76, -rl / 2 + 0.6, rl / 2 - 0.6, W * 0.7, 1.2), paint, (X(spec.rf) + X(spec.rb)) / 2, 0, cabTop);
    if (spec.bed) {
      const bx0 = X(0.97), bx1 = X(0.58), bl = bx1 - bx0;
      P.add(g.box, g.trim, (bx0 + bx1) / 2, 0, zb + 0.2, 0, bl, W - 3, 0.6);
      for (const s of [-1, 1]) P.add(g.box, paint, (bx0 + bx1) / 2, s * (W / 2 - 1), zb + 1.8, 0, bl, 1.2, 3.6);
      P.add(g.box, paint, bx0 + 0.6, 0, zb + 1.8, 0, 1.2, W - 1, 3.6);
    }
    if (o.rails) for (const s of [-1, 1]) P.add(g.box, g.darkMetal, (X(spec.rf) + X(spec.rb)) / 2, s * W * 0.3, cabTop + 1.8, 0, rl * 0.9, 0.9, 0.9);
    for (const s of [-1, 1]) P.add(g.box, g.trim, s * (L / 2 - 0.4), 0, z0 + 2, 0, 1.8, W - 2.5, 3.2);
    P.add(g.box, g.trim, L / 2 + 0.25, 0, zb - 3, 0, 0.6, W * 0.45, 2.4);
    for (const s of [-1, 1]) P.add(g.box, o.headMat || g.head, L / 2 - 0.2, s * (W / 2 - 3.2), zb - 2, 0, 1, 4, 1.8);
    const tailMat = o.tailMat || g.tail;
    for (const s of [-1, 1]) P.add(g.box, tailMat, -L / 2 + 0.2, s * (W / 2 - 2.9), zb - 1.8, 0, 1, 4.2, 2);
    if (o.revMat) for (const s of [-1, 1]) P.add(g.box, o.revMat, -L / 2 + 0.15, s * (W / 2 - 5.9), zb - 1.8, 0, 0.9, 1.6, 1.4);
    if (o.hazardMat) {
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) P.add(g.box, o.hazardMat, sx * (L / 2 - 1.6), sy * (W / 2 + 0.05), zb - 1.9, 0, 2, 0.6, 1.2);
    }
    P.add(g.box, g.plate, -L / 2 - 0.15, 0, z0 + 3.4, 0, 0.3, 6, 1.6);
    P.add(g.box, g.plate, L / 2 + 0.15, 0, z0 + 2.4, 0, 0.3, 6, 1.4);
    for (const s of [-1, 1]) P.add(g.box, paint, X(spec.ws) - 1.2, s * (W / 2 + 1), zb + 1.1, 0, 2.2, 1.8, 1.4);
    // Live (player) wheels sit where the physics wheels are.
    const r = (o.wheelR ?? VEHICLES.car.wheelR) * M, ww = (o.wheelW ?? VEHICLES.car.wheelW) * M;
    const axF = o.wheelbase ? o.wheelbase / 2 * M : L / 2 - 0.9 * M;
    const axR = o.wheelbase ? -o.wheelbase / 2 * M : -(L / 2 - 0.95 * M);
    // Tyres stand a pixel proud of the body so their faces never share a plane with it.
    const wy = W / 2 - ww / 2 + 1.1;
    const wheels = [];
    const wheelParts = (PP, x, y) => {
      PP.add(g.cyl, g.tire, x, y, r, 0, r, ww, r);
      const side = Math.sign(y) || 1;
      PP.add(g.disc, g.rimFlat, x, y + side * (ww / 2 + 0.45), r, 0, r * 0.64, r * 0.64, 1, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    };
    for (const [lx, ly, front] of [[axF, wy, true], [axF, -wy, true], [axR, wy, false], [axR, -wy, false]]) {
      if (o.live) wheels.push({ lx, ly, front });
      else wheelParts(P, lx, ly);
    }
    // The shell sits in its own group so it can lean without the wheels.
    const shell = P.merged();
    const body = new T.Group();
    body.add(shell);
    if (o.live) {
      for (const w of wheels) {
        const pivot = new T.Group();
        pivot.position.set(w.lx, w.ly, 0);
        const spin = new T.Group();
        spin.position.set(0, 0, r);
        const PP = this.parts();
        PP.add(g.cyl, g.tire, 0, 0, 0, 0, r, ww, r);
        const side = Math.sign(w.ly);
        PP.add(g.disc, g.rim, 0, side * (ww / 2 + 0.45), 0, 0, r * 0.64, r * 0.64, 1, side > 0 ? -Math.PI / 2 : Math.PI / 2);
        for (const p of PP.list) {
          const mesh = new T.Mesh(p.geo, p.mat);
          mesh.matrixAutoUpdate = false;
          mesh.matrix.copy(p.m);
          mesh.castShadow = true;
          spin.add(mesh);
        }
        pivot.add(spin);
        body.add(pivot);
        w.pivot = pivot; w.spin = spin;
      }
    }
    return { body, shell, wheels, L, W, H, zb };
  }

  // ── Trailer models ─────────────────────────────────────────────────────
  buildTrailerModel(key, o = {}) {
    const g = this;
    const t = TRAILERS[key];
    const L = t.len * M, W = t.wid * M;
    const ax = t.axle * M, r = t.wheelR * M, ww = t.wheelW * M;
    const wo = (t.wid / 2 + t.wheelOut) * M;
    const cx = L / 2 + t.bar * M;
    const P = this.parts();
    const tail = o.tailMat || g.tail;
    const bedZ = r * 1.55;
    const barLen = Math.hypot(cx - L / 2, W * 0.3);
    const barA = Math.atan2(W * 0.3, cx - L / 2);
    for (const s of [-1, 1]) P.add(g.box, g.darkMetal, (L / 2 + cx) / 2, s * W * 0.15, bedZ - 1, -s * barA, barLen, 1.4, 1.6);
    P.add(g.box, g.darkMetal, cx - 1.5, 0, bedZ - 0.6, 0, 4, 2.2, 2.2);
    P.add(g.sphere, g.darkMetal, cx, 0, bedZ - 0.5, 0, 1.6, 1.6, 1.4);
    P.add(g.cylZ, g.darkMetal, L / 2 + t.bar * M * 0.45, -W * 0.12, bedZ / 2, 0, 0.8, 0.8, bedZ);
    P.add(g.cyl, g.tire, L / 2 + t.bar * M * 0.45, -W * 0.12, 1.2, 0, 1.2, 1, 1.2);
    const wheels = [];
    const addWheel = (y) => wheels.push({ lx: ax, ly: y });
    if (key === "box") {
      P.add(g.box, g.darkMetal, 0, W * 0.3, bedZ - 1.2, 0, L, 1.6, 1.8);
      P.add(g.box, g.darkMetal, 0, -W * 0.3, bedZ - 1.2, 0, L, 1.6, 1.8);
      P.add(g.box, g.wood, 0, 0, bedZ, 0, L, W, 1);
      const sideH = 4.2;
      for (const s of [-1, 1]) {
        P.add(g.box, g.metal, 0, s * (W / 2 - 0.4), bedZ + sideH / 2, 0, L, 0.8, sideH);
        P.add(g.box, g.metal, s * (L / 2 - 0.4), 0, bedZ + sideH / 2, 0, 0.8, W, sideH);
        P.add(g.box, g.darkMetal, ax, s * wo, r * 2.1, 0, r * 2.6, ww + 2.2, 0.8);
        P.add(g.box, g.darkMetal, ax, s * (wo + ww / 2 + 1), r * 1.3, 0, r * 2.6, 0.6, r * 1.6);
      }
      const tarp = owned(new T.ExtrudeGeometry(roundedRectShape(L * 0.72, W * 0.68, 3), { depth: 5, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.6, bevelSegments: 3, curveSegments: 4 }));
      P.add(tarp, this.paintMat(0x2f6d57), -1, 0, bedZ + 1.2);
      const rope = this.matCached("rope", () => new T.MeshStandardMaterial({ color: 0xd6c38a, roughness: 0.9 }));
      for (const k of [-0.25, 0.1]) P.add(g.box, rope, k * L, 0, bedZ + 9.3, 0, 0.6, W * 0.74, 0.4);
      for (const s of [-1, 1]) P.add(g.box, tail, -L / 2 - 0.2, s * (W / 2 - 1.8), bedZ + 1.2, 0, 0.6, 3.2, 1.6);
      P.add(g.box, g.plate, -L / 2 - 0.3, 0, bedZ - 0.4, 0, 0.3, 5.5, 1.6);
      addWheel(wo); addWheel(-wo);
    } else if (key === "boat") {
      for (const s of [-1, 1]) {
        P.add(g.box, g.darkMetal, 0, s * W * 0.28, bedZ - 0.6, 0, L + 2, 1.4, 1.6);
        P.add(g.box, g.darkMetal, ax, s * wo, r * 2.1, 0, r * 2.5, ww + 2, 0.7);
      }
      P.add(g.box, g.darkMetal, L / 2 + 2, 0, bedZ + 3, 0, 1.4, 1.4, 7);
      P.add(g.cylZ, g.chrome, L / 2 + 2, 0, bedZ + 6.4, 0, 1.4, 1.4, 1.8, Math.PI / 2);
      for (let k = -2; k <= 2; k++) P.add(g.cyl, g.trim, k * L * 0.18, 0, bedZ + 0.6, 0, 0.9, W * 0.3, 0.9);
      for (const s of [-1, 1]) P.add(g.box, tail, -L / 2 - 0.5, s * (W / 2 - 1.2), bedZ, 0, 0.6, 2.6, 1.4);
      addWheel(wo); addWheel(-wo);
    } else {
      // Caravan: side profile extruded across the width, rounded at the front.
      const H = 2.35 * M, z0 = r * 1.3;
      const s = new T.Shape();
      const hl = L / 2;
      s.moveTo(-hl, z0);
      s.lineTo(hl - 6, z0);
      s.quadraticCurveTo(hl, z0, hl, z0 + 6);
      s.lineTo(hl, H - 12);
      s.quadraticCurveTo(hl - 1, H, hl - 14, H);
      s.lineTo(-hl + 3, H);
      s.quadraticCurveTo(-hl, H, -hl, H - 3);
      s.lineTo(-hl, z0);
      const shell = owned(new T.ExtrudeGeometry(s, { depth: W - 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 5 }));
      shell.rotateX(Math.PI / 2);
      shell.translate(0, W / 2 - 1, 0);
      P.add(shell, g.white);
      P.add(g.box, this.paintMat(0xc0392b), 0, W / 2 + 0.2, z0 + 7, 0, L - 6, 0.4, 1.4);
      P.add(g.box, this.paintMat(0xc0392b), 0, -W / 2 - 0.2, z0 + 7, 0, L - 6, 0.4, 1.4);
      P.add(g.box, this.paintMat(0x3a4a5a), 0, W / 2 + 0.2, z0 + 5.6, 0, L - 6, 0.4, 0.6);
      P.add(g.box, this.paintMat(0x3a4a5a), 0, -W / 2 - 0.2, z0 + 5.6, 0, L - 6, 0.4, 0.6);
      for (const [x, w] of [[L * 0.25, 12], [-L * 0.22, 14]]) for (const sd of [-1, 1]) P.add(g.box, g.glass, x, sd * (W / 2 + 0.25), z0 + 14, 0, w, 0.5, 6);
      P.add(g.box, g.glass, hl + 0.3, 0, z0 + 13, 0, 0.6, W - 8, 5);
      P.add(g.box, this.paintMat(0xdad6ca), -L * 0.02, -W / 2 - 0.25, z0 + 9.5, 0, 6.5, 0.5, 15);
      P.add(g.box, this.paintMat(0xe0e3e7), -L * 0.1, 0, H + 1.9, 0, 12, 9, 1.6);
      P.add(g.box, this.paintMat(0xd0d4d8), L * 0.2, 0, H + 1.7, 0, 6, 6, 1.2);
      P.add(g.box, this.paintMat(0xe7e2d6), hl + 5, 0, bedZ + 2, 0, 5, 7, 4);
      for (const sd of [-1, 1]) P.add(g.box, tail, -hl - 0.3, sd * (W / 2 - 2.6), z0 + 3, 0, 0.6, 3.6, 2.2);
      P.add(g.box, g.trim, -hl - 0.1, 0, z0 + 0.6, 0, 1, W - 1, 1.4);
      addWheel(wo); addWheel(-wo);
    }
    const body = P.merged();
    const out = { body, wheels: [], L, W, bedZ };
    for (const w of wheels) {
      const pivot = new T.Group();
      // Caravan wheels sit under the body: keep their faces clear of its sides.
      pivot.position.set(w.lx, w.ly + Math.sign(w.ly) * (key === "caravan" ? 1.4 : 0), r);
      const spin = new T.Group();
      const tire = new T.Mesh(g.cyl, g.tire);
      tire.scale.set(r, ww, r);
      tire.castShadow = true;
      const rim = new T.Mesh(g.disc, g.rim);
      const side = Math.sign(w.ly);
      rim.position.y = side * (ww / 2 + 0.45);
      rim.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      rim.scale.set(r * 0.62, r * 0.62, 1);
      spin.add(tire, rim);
      pivot.add(spin);
      body.add(pivot);
      out.wheels.push({ pivot, spin });
    }
    if (key === "boat") {
      const hull = this.buildBoatHull(L * 0.98, W * 0.96, 0x1f5a8a);
      hull.position.set(-L * 0.02, 0, bedZ + 1.4);
      body.add(hull);
    }
    return out;
  }

  // Boat hull: top-view outline with a pointed bow, deck white, sides coloured.
  buildBoatHull(L, W, hullHex) {
    const g = this;
    const s = new T.Shape();
    s.moveTo(L / 2, 0);
    s.quadraticCurveTo(L * 0.3, W / 2, L * 0.05, W / 2);
    s.lineTo(-L / 2, W / 2 - 1);
    s.lineTo(-L / 2, -W / 2 + 1);
    s.lineTo(L * 0.05, -W / 2);
    s.quadraticCurveTo(L * 0.3, -W / 2, L / 2, 0);
    const geo = owned(new T.ExtrudeGeometry(s, { depth: 8, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.4, bevelSegments: 2, curveSegments: 8 }));
    const grp = new T.Group();
    const hull = new T.Mesh(geo, [g.white, this.paintMat(hullHex)]);
    hull.castShadow = true;
    hull.receiveShadow = true;
    grp.add(hull);
    const P = this.parts();
    P.add(g.box, this.paintMat(0xd8d4c8), -L * 0.12, 0, 10.2, 0, L * 0.4, W * 0.62, 0.6);
    P.add(g.box, g.white, L * 0.08, 0, 12, 0, 5, W * 0.38, 4);
    P.add(taperGeo(-1.5, 1.5, W * 0.44, -1.2, 0, W * 0.4, 4), g.glass, L * 0.08 + 3.6, 0, 11.4);
    P.add(g.box, this.paintMat(0x6c5a44), -L * 0.12, W * 0.16, 11.5, 0, 5, 4, 2.4);
    P.add(g.box, this.paintMat(0x6c5a44), -L * 0.12, -W * 0.16, 11.5, 0, 5, 4, 2.4);
    P.add(g.box, g.trim, -L / 2 - 1.8, 0, 10, 0, 3.4, 4, 6);
    P.add(g.box, g.darkMetal, -L / 2 - 2.2, 0, 4.5, 0, 1.4, 1.4, 7);
    P.add(g.box, g.chrome, L / 2 - 6, 0, 10.6, 0, 8, 0.5, 0.5);
    grp.add(P.merged());
    return grp;
  }

  // ── Level scene ────────────────────────────────────────────────────────
  teardownLevel() {
    const lv = this.lv;
    if (!lv) return;
    this.scene.remove(lv.group);
    lv.group.traverse((o) => {
      if (o.geometry?.userData?.owned) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (!m.userData?.owned) continue;
        if (m.map?.userData?.owned) m.map.dispose();
        if (m.normalMap?.userData?.owned) m.normalMap.dispose();
        if (m.emissiveMap?.userData?.owned) m.emissiveMap.dispose();
        m.dispose();
      }
    });
    this.lv = null;
  }

  groundZAt() { return 0; }

  // Tree batch: instanced trunks and canopy blobs for any number of trees.
  buildTrees(list) {
    const g = this;
    if (!list.length) return null;
    const grp = new T.Group();
    const pines = list.filter((t) => t.pine);
    list = list.filter((t) => !t.pine);
    if (pines.length) {
      const pt = new T.InstancedMesh(g.cylZ8, g.trunk, pines.length);
      const pineMat = this.matCached("pine", () => new T.MeshStandardMaterial({ color: 0x24502f, roughness: 0.9, flatShading: true }));
      const cones = new T.InstancedMesh(g.cone, pineMat, pines.length * 2);
      const d = g.dummy;
      pines.forEach((t, i) => {
        const h = 30 + t.r * 1.6;
        d.rotation.set(0, 0, 0);
        d.position.set(t.x, -t.y, 6); d.scale.set(1.8, 1.8, 12); d.updateMatrix(); pt.setMatrixAt(i, d.matrix);
        d.position.set(t.x, -t.y, 10 + h * 0.3); d.scale.set(t.r, t.r, h * 0.6); d.updateMatrix(); cones.setMatrixAt(i * 2, d.matrix);
        d.position.set(t.x, -t.y, 10 + h * 0.62); d.scale.set(t.r * 0.7, t.r * 0.7, h * 0.5); d.updateMatrix(); cones.setMatrixAt(i * 2 + 1, d.matrix);
      });
      for (const m of [pt, cones]) { m.castShadow = true; m.instanceMatrix.needsUpdate = true; grp.add(m); }
    }
    if (!list.length) return grp;
    const trunks = new T.InstancedMesh(g.cylZ8, g.trunk, list.length);
    const blobs = list.length * 4;
    const perMat = g.leaf.map((m) => new T.InstancedMesh(g.ico, m, blobs));
    const counts = perMat.map(() => 0);
    const d = g.dummy;
    const rnd = lcg(list.length * 31 + 5);
    list.forEach((t, i) => {
      const h = t.h ?? (22 + t.r * 1.1);
      d.position.set(t.x, -t.y, h / 2);
      d.rotation.set(0, 0, 0);
      d.scale.set(Math.max(1.6, t.r * 0.12), Math.max(1.6, t.r * 0.12), h);
      d.updateMatrix();
      trunks.setMatrixAt(i, d.matrix);
      for (let k = 0; k < 4; k++) {
        const a = rnd() * Math.PI * 2, dd = k === 0 ? 0 : t.r * 0.45;
        const rr = t.r * (k === 0 ? 0.85 : 0.55 + rnd() * 0.2);
        d.position.set(t.x + Math.cos(a) * dd, -t.y + Math.sin(a) * dd, h + (k === 0 ? t.r * 0.35 : t.r * (0.05 + rnd() * 0.3)));
        d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        d.scale.set(rr, rr, rr * 0.85);
        d.updateMatrix();
        const mi = Math.floor(rnd() * perMat.length);
        perMat[mi].setMatrixAt(counts[mi]++, d.matrix);
      }
    });
    trunks.castShadow = true;
    trunks.instanceMatrix.needsUpdate = true;
    grp.add(trunks);
    perMat.forEach((im, i) => {
      im.count = counts[i];
      im.castShadow = true;
      im.receiveShadow = true;
      im.instanceMatrix.needsUpdate = true;
      grp.add(im);
    });
    return grp;
  }

  buildingMesh(x, y, w, d, h, seed, lit, base = "#8a8176", glass = false) {
    const rnd = lcg(seed);
    const tex = owned(canvasTex(128, 256, (c, cw, ch) => {
      c.fillStyle = base; c.fillRect(0, 0, cw, ch);
      if (glass) { c.fillStyle = "#34506a"; c.fillRect(4, 30, cw - 8, ch - 40); c.fillStyle = "rgba(255,255,255,0.15)"; for (let k = 0; k < 4; k++) c.fillRect(4 + k * 31, 30, 2, ch - 40); return; }
      for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) {
        const on = lit && rnd() < 0.45;
        c.fillStyle = on ? (rnd() < 0.5 ? "#ffd89a" : "#ffe9c4") : "#2a3440";
        c.fillRect(8 + k * 30, 10 + r * 30, 20, 18);
        c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(8 + k * 30, 10 + r * 30, 20, 4);
      }
    }, { repeat: true }));
    tex.repeat.set(Math.max(1, Math.round(w / 40)), Math.max(1, Math.round(h / 80)));
    const side = owned(new T.MeshStandardMaterial({ map: tex, roughness: 0.85, emissive: lit ? 0xffffff : 0x000000, emissiveMap: lit ? tex : null, emissiveIntensity: lit ? 0.55 : 0 }));
    const roof = this.darkConcrete;
    const m = new T.Mesh(this.box, [side, side, side, side, roof, roof]);
    m.position.set(x, -y, h / 2);
    m.scale.set(w, d, h);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  glassPanel() {
    return this.matCached("glassPanel", () => {
      const m = new T.MeshStandardMaterial({ color: 0xb8d4e4, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.3 });
      m.userData.noShadow = true;
      return m;
    });
  }
  trolleyMat() {
    return this.matCached("trolley", () => new T.MeshStandardMaterial({ color: 0xc9d1da, wireframe: true, metalness: 0.8, roughness: 0.3 }));
  }

  // ── Props ──────────────────────────────────────────────────────────────
  // Adds a static obstacle to the merged batch P (or returns a group for
  // the few that are built as their own models).
  buildStatic(P, def, lvl, trees, lamps) {
    const g = this;
    const k = def.kind, x = def.x, y = -def.y, rz = -(def.a ?? 0);
    const c = Math.cos(rz), s = Math.sin(rz);
    const L = (u, v) => [x + u * c - v * s, y + u * s + v * c];   // local → three xy
    const at = (geo, mat, u, v, z, sx, sy, sz, rot = 0) => { const [px, py] = L(u, v); P.add(geo, mat, px, py, z, rz + rot, sx, sy, sz); };
    if (k === "boundary") {
      const edge = lvl.edge ?? "fence";
      const long = Math.max(def.w, def.h), horiz = def.w > def.h;
      // Keep the visual on the site's edge line, not 7 px outside it.
      const ex = def.side === "w" ? 2 : def.side === "e" ? lvl.w - 2 : x;
      const ey = def.side === "n" ? -2 : def.side === "s" ? -(lvl.h - 2) : y;
      const run = (step, fn) => { for (let o = -long / 2 + 20; o <= long / 2 - 20; o += step) fn(horiz ? ex + o : ex, horiz ? ey : ey - o); };
      if (edge === "none") return null;
      if (edge === "fence") {
        run(24, (px, py) => P.add(g.box, g.wood, px, py, 6, 0, 2, 2, 12));
        for (const z of [5, 10]) P.add(g.box, g.wood, ex, ey, z, 0, horiz ? long : 1.4, horiz ? 1.4 : long, 1.4);
      } else if (edge === "rail") {
        run(40, (px, py) => P.add(g.box, g.darkMetal, px, py, 11, 0, 1.4, 1.4, 22));
        P.add(g.box, this.trolleyMat(), ex, ey, 11, 0, horiz ? long : 0.6, horiz ? 0.6 : long, 20);
      } else if (edge === "hedge") {
        P.add(g.box, g.hedge, ex, ey, 9, 0, horiz ? long : 10, horiz ? 10 : long, 18);
      } else if (edge === "stone") {
        P.add(g.box, this.wallMat("stone"), ex, ey, 6, 0, horiz ? long : 8, horiz ? 8 : long, 12);
      } else {
        P.add(g.box, g.concrete, ex, ey, 7, 0, horiz ? long : 8, horiz ? 8 : long, 14);
      }
      return null;
    }
    switch (k) {
      case "water": return null;
      case "pillar": {
        const h = def.h3 ?? 34;
        P.add(g.box, g.concrete, x, y, h / 2 + 6, rz, def.s, def.s, h - 12);
        P.add(g.box, def.style === "site" ? g.darkConcrete : g.hazardStripe, x, y, 3.5, rz, def.s + 0.4, def.s + 0.4, 7);
        return null;
      }
      case "bollard":
        P.add(g.cylZ, g.yellow, x, y, 5.5, 0, def.r, def.r, 11);
        P.add(g.sphere, g.darkMetal, x, y, 11, 0, def.r, def.r, def.r * 0.5);
        return null;
      case "post":
        P.add(g.cylZ, def.flag ? g.metal : g.wood, x, y, def.flag ? 18 : 6, 0, def.r ?? 2, def.r ?? 2, def.flag ? 36 : 12);
        if (def.flag) P.add(g.box, this.paintMat(def.flag), x + 5, y, 31, 0, 10, 0.4, 7);
        return null;
      case "lamp": {
        const H = 62;
        P.add(g.cylZ, g.darkMetal, x, y, H / 2, 0, 1.3, 1.3, H);
        P.add(g.cylZ, g.darkMetal, x, y, 2, 0, 3, 3, 4);
        P.add(g.box, g.darkMetal, x + 5, y, H, 0, 11, 1.4, 1.4);
        P.add(g.box, g.darkMetal, x + 10, y, H - 0.6, 0, 7, 4.4, 1.8);
        P.add(g.box, g.head, x + 10, y, H - 1.8, 0, 5.4, 3.2, 0.6);
        lamps.push({ x: def.x + 10, y: def.y });
        return null;
      }
      case "hydrant":
        P.add(g.cylZ, g.red, x, y, 4, 0, 2.4, 2.4, 8);
        P.add(g.sphere, g.red, x, y, 8, 0, 2.4, 2.4, 1.6);
        return null;
      case "bin":
        P.add(g.cylZ, this.paintMat(0x2f5a3a), x, y, 6, 0, 4.5, 4.5, 12);
        P.add(g.cylZ, g.darkMetal, x, y, 12.4, 0, 4.8, 4.8, 1);
        return null;
      case "barrel":
        P.add(g.cylZ, this.paintMat(0x2b5aa0), x, y, 5.5, 0, 4.2, 4.2, 11);
        return null;
      case "tree": trees.push({ x: def.x, y: def.y, r: def.r }); return null;
      case "pine": trees.push({ x: def.x, y: def.y, r: def.r, pine: true }); return null;
      case "bush": P.add(g.ico, g.leaf[(def.x | 0) % 4], x, y, def.r * 0.45, def.x, def.r, def.r, def.r * 0.7); return null;
      case "rock": P.add(g.ico, lvl.base === "snow" ? g.white : g.darkConcrete, x, y, def.r * 0.3, def.x, def.r, def.r * 0.9, def.r * 0.7); return null;
      case "hay":
        P.add(g.cylZ, this.matCached("hay", () => new T.MeshStandardMaterial({ color: 0xd9b95a, roughness: 0.95 })), x, y, def.r * 0.7, 0, def.r, def.r, def.r * 1.4);
        return null;
      case "snowbank":
        at(g.box, g.white, 0, 0, 5, def.w, def.h, 10);
        return null;
      case "firepit":
        for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; P.add(g.ico, g.darkConcrete, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 1.5, a, 2.4, 2, 2); }
        return null;
      case "table":
        P.add(g.box, g.wood, x, y, 7.5, rz, 12, 20, 1.2);
        for (const sd of [-1, 1]) at(g.box, g.wood, sd * 8, 0, 4.2, 3, 20, 1);
        return null;
      case "planter":
        P.add(g.box, g.concrete, x, y, 4.5, rz, def.w, def.h, 9);
        for (let i = 0; i < Math.max(def.w, def.h) / 10; i++) {
          const o = -Math.max(def.w, def.h) / 2 + 6 + i * 10;
          at(g.ico, g.leaf[i % 4], def.w > def.h ? o : 0, def.w > def.h ? 0 : o, 12, 5, 5, 4.5);
        }
        return null;
      case "shelter": case "canopy":
        return null;
      case "trolleys":
        for (let i = 0; i < 6; i++) at(g.box, this.trolleyMat(), 0, def.h / 2 - 4 - i * 7.3, 7, def.w - 4, 7, 7);
        return null;
      case "wall": {
        const h = def.height ?? 12;
        at(g.box, this.wallMat(def.style), 0, 0, h / 2, def.w, def.h, h);
        if (!def.style) at(g.box, g.yellow, 0, 0, h + 0.3, def.w, def.h + 0.4, 0.6);
        return null;
      }
      case "fence":
        for (const z of [4, 9]) at(g.box, g.wood, 0, 0, z, def.w, 1.2, 1.2);
        at(g.box, g.wood, -def.w / 2 + 1, 0, 5.5, 1.8, 1.8, 11);
        return null;
      case "hedge":
        at(g.box, g.hedge, 0, 0, 8, def.w + 1, def.h + 1, 16);
        return null;
      case "kerb":
        at(g.box, this.paintMat(0xc9c5bc), 0, 0, 1.5, def.w, def.h, 3);
        return null;
      case "barrier": {
        const horiz = def.w >= def.h;
        at(g.box, g.barrierStripe, 0, 0, 9, def.w, def.h * 0.35, 3.4);
        const long = horiz ? def.w : def.h;
        for (const o of [-long / 2 + 2, long / 2 - 2]) at(g.box, g.darkMetal, horiz ? o : 0, horiz ? 0 : o, 4.5, 1, 1, 9);
        return null;
      }
      case "quay":
        at(g.box, g.concrete, 0, 0, -1, def.w, def.h, 6);
        return null;
      case "crates": {
        const n = Math.max(1, Math.round(def.w / 12));
        for (let i = 0; i < n; i++) {
          const cw = def.w / n, hh = 10 + ((i * 7 + (def.x | 0)) % 3) * 5;
          at(g.box, g.wood, -def.w / 2 + cw * (i + 0.5), 0, hh / 2, cw - 0.8, def.h, hh);
        }
        return null;
      }
      case "kiosk":
        at(g.box, this.paintMat(0xe8e0d0), 0, 0, 12, def.w, def.h, 24);
        at(g.box, this.paintMat(0x8b4a3c), 0, 0, 25, def.w + 4, def.h + 4, 2.4);
        at(g.box, g.glass, 0, def.h / 2 + 0.3, 13, def.w * 0.7, 0.6, 10);
        return null;
      case "block": {
        const h = def.height ?? 30;
        at(g.box, def.stage ? g.darkMetal : this.paintMat(def.color ?? 0xcfc6b8), 0, 0, h / 2, def.w, def.h, h);
        if (def.stage) {
          at(g.box, this.matCached("stageLight", () => new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff5fd2, emissiveIntensity: 2.2 })), 0, def.h / 2 + 1, h * 0.55, def.w * 0.8, 1, h * 0.6);
          for (let i = 0; i < 6; i++) at(g.box, g.head, -def.w / 2 + 30 + i * (def.w - 60) / 5, def.h / 2 + 4, h + 4, 6, 6, 4);
        }
        return null;
      }
      case "cabin":
        at(g.box, this.paintMat(def.color ?? 0x3d6fb6), 0, 0, 13, def.w, def.h, 26);
        at(g.box, g.glass, 0, def.h / 2 + 0.3, 16, def.w * 0.7, 0.6, 8);
        return null;
      case "skip": {
        const [px, py] = L(0, 0);
        P.add(taperGeo(-def.w / 2, def.w / 2, def.h, -def.w / 2 - 5, def.w / 2 + 5, def.h, 14), this.paintMat(def.color ?? 0xe8c547), px, py, 0, rz);
        return null;
      }
      case "logs": {
        const rr = 5, rows = Math.max(1, Math.floor(def.h / (rr * 2)));
        for (let layer = 0; layer < 3; layer++) {
          for (let r = 0; r < rows - layer; r++) {
            const v = -def.h / 2 + rr + r * rr * 2 + layer * rr;
            at(g.cyl, this.matCached("log", () => new T.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 })), 0, v, rr + layer * rr * 1.7, rr, def.w, rr, Math.PI / 2);
          }
        }
        return null;
      }
      case "container": {
        const hh = 31;
        for (let st = 0; st < (def.stack ?? 1); st++) {
          const col = st === 0 ? def.color : [0xb03a2e, 0x2e86c1, 0x1e8449, 0xd68910, 0x7d3c98, 0x566573][((def.x | 0) + st * 3) % 6];
          at(g.box, this.containerMat(col), 0, 0, hh / 2 + st * hh, def.w, def.h, hh - 0.6);
        }
        return null;
      }
      case "pump":
        at(g.box, g.concrete, 0, 0, 1.5, def.w, def.h, 3);
        for (const o of [-0.3, 0.3]) at(g.box, this.paintMat(0xf2f2ee), (def.w > def.h ? o * def.w : 0), (def.w > def.h ? 0 : o * def.h), 10, 8, 6, 16);
        return null;
      case "stall": {
        for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) at(g.box, g.darkMetal, u * (def.w / 2 - 1), v * (def.h / 2 - 1), 11, 1.2, 1.2, 22);
        at(g.box, this.stripeMat(def.color ?? 0xd33a2c), 0, 0, 23, def.w + 4, def.h + 4, 2);
        at(g.box, g.wood, 0, def.h / 2 - 3, 7, def.w - 4, 5, 1.4);
        return null;
      }
      case "marquee":
        at(g.box, g.white, 0, 0, 11, def.w, def.h, 22);
        P.add(taperGeo(-def.w / 2 - 2, def.w / 2 + 2, def.h + 4, -def.w / 2, def.w / 2, 2, 14), g.white, ...L(0, 0), 22, rz);
        return null;
      case "tent": {
        const col = def.w > 28 ? 0xd9822b : 0x2f7fbf;
        const sh = new T.Shape([new T.Vector2(-def.h / 2, 0), new T.Vector2(def.h / 2, 0), new T.Vector2(0, 16)]);
        const geo = owned(new T.ExtrudeGeometry(sh, { depth: def.w, bevelEnabled: false }));
        geo.rotateX(Math.PI / 2);
        geo.rotateZ(Math.PI / 2);
        geo.translate(-def.w / 2, 0, 0);
        P.add(geo, this.paintMat(col), x, y, 0, rz);
        return null;
      }
      case "tractor": {
        const grp = new T.Group(), PP = this.parts(), col = this.paintMat(def.color ?? 0x2f7a3a);
        PP.add(g.box, col, 4, 0, 11, 0, 30, 14, 10);
        PP.add(g.box, g.glass, -6, 0, 24, 0, 14, 16, 16);
        PP.add(g.box, col, -6, 0, 32.5, 0, 16, 18, 1.2);
        for (const sd of [-1, 1]) { PP.add(g.cyl, g.tire, -10, sd * 10, 10, 0, 10, 6, 10); PP.add(g.cyl, g.tire, 14, sd * 8, 6, 0, 6, 4, 6); }
        grp.add(PP.merged());
        grp.position.set(x, y, 0); grp.rotation.z = rz;
        return grp;
      }
      case "digger": {
        const grp = new T.Group(), PP = this.parts(), col = this.paintMat(def.color ?? 0xe8a33a);
        for (const sd of [-1, 1]) PP.add(g.box, g.darkMetal, 0, sd * 11, 4, 0, 50, 8, 8);
        PP.add(g.box, col, -4, 0, 15, 0, 34, 26, 14);
        PP.add(g.box, g.glass, 6, 8, 26, 0, 12, 10, 12);
        PP.add(g.box, col, 26, -4, 26, 0, 34, 4, 4, 0, -0.5);
        PP.add(g.box, col, 44, -4, 18, 0, 22, 4, 4, 0, 0.9);
        PP.add(g.box, g.darkMetal, 52, -4, 7, 0, 8, 12, 8);
        grp.add(PP.merged());
        grp.position.set(x, y, 0); grp.rotation.z = rz;
        return grp;
      }
      case "plane": {
        const grp = new T.Group(), PP = this.parts(), col = this.paintMat(def.color ?? 0xf2f2ee), sc = def.s ?? 1;
        PP.add(g.cyl, col, 0, 0, 9, Math.PI / 2, 5, 70, 5.5);
        PP.add(g.box, col, 8, 0, 13, 0, 14, 96, 1.4);
        PP.add(g.box, col, -30, 0, 10, 0, 8, 30, 1);
        PP.add(g.box, col, -32, 0, 16, 0, 8, 1, 12);
        PP.add(g.box, g.glass, 14, 0, 13, 0, 8, 6, 4);
        PP.add(g.cylZ, g.darkMetal, 36, 0, 9, 0, 1.2, 1.2, 14, Math.PI / 2);
        PP.add(g.cyl, g.tire, 10, 8, 3, 0, 3, 2, 3); PP.add(g.cyl, g.tire, 10, -8, 3, 0, 3, 2, 3);
        grp.add(PP.merged());
        grp.scale.setScalar(sc);
        grp.position.set(x, y, 0); grp.rotation.z = rz;
        return grp;
      }
      case "parkedsemi": {
        const grp = new T.Group();
        const t = TRAILERS.semi, v = VEHICLES.truck;
        const trailer = this.buildSemiModel({ live: false, color: def.color, company: def.company });
        grp.add(trailer.body);
        const tractor = this.buildTruckModel(def.color ?? 0x3d6fb6, { live: false });
        tractor.body.position.x = (t.len / 2 + t.bar - v.hitchX) * M;
        grp.add(tractor.body);
        grp.position.set(x, y, 0); grp.rotation.z = rz;
        return grp;
      }
      case "vancaravan": {
        const m = this.buildTrailerModel("caravan");
        m.body.position.set(x, y, 0);
        m.body.rotation.z = rz;
        return m.body;
      }
      case "building": return this.buildBuilding(def, lvl);
      default: {
        if (def.w && def.h) at(g.box, this.paintMat(def.color ?? 0x8a8176), 0, 0, 10, def.w, def.h, 20);
        return null;
      }
    }
  }

  wallMat(style) {
    const cols = { stone: 0x9a9184, brick: 0xa0523d, barn: 0x9a3b2a, wood: 0x8a6238, white: 0xf2f2ee, hangar: 0x9aa3ab, hull: 0x2b3a4a, site: 0xa3a6aa };
    if (style === "wood") return this.wood;
    if (!style) return this.concrete;
    return this.matCached("wall-" + style, () => new T.MeshStandardMaterial({ color: cols[style] ?? 0x9a9da2, roughness: style === "hull" || style === "hangar" ? 0.5 : 0.92, metalness: style === "hull" || style === "hangar" ? 0.4 : 0 }));
  }

  containerMat(hex) {
    return this.matCached("cont" + hex, () => {
      const tex = canvasTex(64, 32, (c, w, h) => {
        c.fillStyle = "#" + hex.toString(16).padStart(6, "0"); c.fillRect(0, 0, w, h);
        c.fillStyle = "rgba(0,0,0,0.18)";
        for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 1.5, h);
      }, { repeat: true });
      tex.repeat.set(6, 1);
      return new T.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.3 });
    });
  }

  stripeMat(hex) {
    return this.matCached("stripe" + hex, () => new T.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(64, 16, (c, w, h) => {
      c.fillStyle = "#f4f4ef"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#" + hex.toString(16).padStart(6, "0");
      for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 8, h);
    }, { repeat: true }) }));
  }

  // A building with a window facade, a roof, and optional sign and doors.
  buildBuilding(def, lvl) {
    const lit = !!(def.lit || SUNS[lvl.sun]?.lamps);
    const h = def.height ?? 40;
    const css = "#" + (def.color ?? 0x8a8176).toString(16).padStart(6, "0");
    const grp = new T.Group();
    const m = this.buildingMesh(0, 0, def.w, def.h, h, (def.x * 7 + def.y * 3) | 0, lit, css, def.glass);
    m.position.set(0, 0, h / 2);
    grp.add(m);
    const roof = new T.Mesh(this.box, this.paintMat(def.roof ?? 0x5a5f66));
    roof.scale.set(def.w + 2, def.h + 2, 2);
    roof.position.z = h + 1;
    roof.castShadow = true;
    grp.add(roof);
    // Facade details face the site: south by default (three −y).
    const side = def.signSide ?? "s";
    const fy = side === "s" ? -def.h / 2 - 0.4 : side === "n" ? def.h / 2 + 0.4 : 0;
    const fx = side === "e" ? def.w / 2 + 0.4 : side === "w" ? -def.w / 2 - 0.4 : 0;
    const faceRot = side === "s" ? 0 : side === "n" ? Math.PI : side === "e" ? Math.PI / 2 : -Math.PI / 2;
    const faceW = side === "s" || side === "n" ? def.w : def.h;
    for (const dx of def.doors ?? []) {
      const d = new T.Mesh(this.box, this.darkMetal);
      d.scale.set(def.doorW ?? 34, 0.6, Math.min(h * 0.6, 34));
      d.position.set(dx - def.x, fy, Math.min(h * 0.6, 34) / 2);
      grp.add(d);
    }
    if (def.sign) {
      const tex = owned(canvasTex(512, 96, (c, w, hh) => {
        c.fillStyle = def.signBg ?? "rgba(255,255,255,0.92)"; c.fillRect(0, 0, w, hh);
        c.fillStyle = def.signColor ?? "#1f3a5a"; c.font = "900 60px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(def.sign, w / 2, hh / 2 + 4, w - 20);
      }));
      const sign = new T.Mesh(this.plane, owned(new T.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: lit ? 0.8 : 0.15, roughness: 0.6 })));
      const sw = Math.min(faceW * 0.7, 300);
      sign.scale.set(sw, sw * 96 / 512, 1);
      sign.rotation.set(Math.PI / 2, 0, faceRot, "ZXY");
      sign.position.set(fx, fy + (side === "s" ? -0.2 : side === "n" ? 0.2 : 0), h * 0.72);
      grp.add(sign);
    }
    grp.position.set(def.x, -def.y, 0);
    grp.rotation.z = -(def.a ?? 0);
    return grp;
  }

  // ── Scenery round the site ─────────────────────────────────────────────
  buildScenery(P, lvl, trees) {
    const g = this;
    const grp = new T.Group();
    const W = lvl.w, H = lvl.h;
    const bd = lvl.backdrop ?? "trees";
    const outside = { trees: 0x5a8a3a, forest: 0x4d7c30, fields: 0x6d8a45, town: 0x8f8a80, industrial: 0x7d7f80, dunes: 0xd9c48e, mountains: 0xe8eef4, none: 0x5a8a3a }[bd] ?? 0x5a8a3a;
    const outer = new T.Mesh(g.plane, owned(new T.MeshStandardMaterial({ color: outside, roughness: 0.95 })));
    outer.scale.set(W + 9000, H + 9000, 1);
    outer.position.set(W / 2, -H / 2, -0.6);
    outer.receiveShadow = true;
    grp.add(outer);
    const rnd = lcg(lvl.id.length * 131 + W);
    const lit = SUNS[lvl.sun]?.lamps;
    // A point just outside the site, `d` px out, on a random side.
    const around = (d0, d1) => {
      const side = Math.floor(rnd() * 4);
      const d = d0 + rnd() * (d1 - d0);
      const u = rnd();
      if (side === 0) return [u * (W + 400) - 200, -d];
      if (side === 1) return [u * (W + 400) - 200, H + d];
      if (side === 2) return [-d, u * (H + 400) - 200];
      return [W + d, u * (H + 400) - 200];
    };
    const water = (lvl.surfaces ?? []).filter((s) => s.k === "water" && s.x0 != null);
    const wet = (x, y) => water.some((s) => x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1);
    if (bd === "trees" || bd === "forest" || bd === "fields" || bd === "mountains") {
      const n = Math.round((W + H) * (bd === "forest" ? 0.16 : bd === "fields" ? 0.04 : 0.09));
      for (let i = 0; i < n; i++) {
        const [tx, ty] = around(30, bd === "fields" ? 900 : 420);
        if (wet(tx, ty)) continue;
        trees.push({ x: tx, y: ty, r: 16 + rnd() * 10, pine: bd === "mountains" || (bd === "forest" && rnd() < 0.6) });
      }
    }
    if (bd === "fields") {
      // Hedgerows and a few far barns.
      for (let i = 0; i < 6; i++) {
        const [hx, hy] = around(120, 900);
        if (wet(hx, hy)) continue;
        P.add(g.box, g.hedge, hx, -hy, 8, rnd() * 3, 300 + rnd() * 300, 10, 16);
      }
    }
    if (bd === "town" || bd === "industrial") {
      const place = (x0, y0, x1, y1, horiz) => {
        let p = horiz ? x0 : y0;
        const end = horiz ? x1 : y1;
        while (p < end) {
          const w = bd === "industrial" ? 160 + rnd() * 200 : 60 + rnd() * 80;
          const d = bd === "industrial" ? 120 + rnd() * 100 : 70 + rnd() * 40;
          const h = bd === "industrial" ? 50 + rnd() * 40 : 40 + rnd() * 90;
          const cx = horiz ? p + w / 2 : (x0 + x1) / 2, cy = horiz ? (y0 + y1) / 2 : p + w / 2;
          if (!wet(cx, cy)) grp.add(this.buildingMesh(cx, cy, horiz ? w - 3 : d, horiz ? d : w - 3, h, (p * 7) | 0, lit, ["#b8866a", "#c9b79c", "#8e9aa6", "#d6c8b0", "#a0705a", "#9aa3ab"][Math.floor(rnd() * 6)]));
          p += w;
        }
      };
      place(-300, -160, W + 300, -40, true);
      place(-300, H + 40, W + 300, H + 160, true);
      place(-160, -40, -40, H + 40, false);
      place(W + 40, -40, W + 160, H + 40, false);
    }
    if (bd === "mountains") {
      const peak = this.matCached("peak", () => new T.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.9, flatShading: true }));
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rnd() * 0.3, d = 1500 + rnd() * 900;
        const m = new T.Mesh(g.cone, peak);
        const r = 400 + rnd() * 500;
        m.scale.set(r, r, 500 + rnd() * 700);
        m.rotation.x = 0;
        m.position.set(W / 2 + Math.cos(a) * d, -H / 2 + Math.sin(a) * d, 0);
        grp.add(m);
      }
    }
    if (bd === "dunes") {
      for (let i = 0; i < 40; i++) {
        const [bx, by] = around(20, 500);
        if (wet(bx, by)) continue;
        P.add(g.ico, g.leaf[i % 4], bx, -by, 5, i, 12 + rnd() * 10, 12 + rnd() * 10, 8);
      }
    }
    return grp;
  }

  waterMat() {
    const n = owned(canvasTex(256, 256, (c, w, h) => {
      // A tileable normal map from a sum of sines.
      const img = c.createImageData(w, h);
      const Hf = (x, y) => Math.sin(x * 0.098) * 0.6 + Math.sin(y * 0.147 + x * 0.049) * 0.5 + Math.sin((x + y) * 0.245) * 0.25;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = Hf(x + 1, y) - Hf(x - 1, y), dy = Hf(x, y + 1) - Hf(x, y - 1);
        const i = (y * w + x) * 4;
        img.data[i] = 128 + dx * 70; img.data[i + 1] = 128 + dy * 70; img.data[i + 2] = 255; img.data[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    }, { repeat: true, linear: true }));
    const m = owned(new T.MeshStandardMaterial({ color: 0x2a6f8c, roughness: 0.12, metalness: 0.25, normalMap: n, transparent: true, opacity: 0.86 }));
    m.normalScale.set(0.6, 0.6);
    return m;
  }

  buildDecor(d, lv) {
    const g = this;
    const P = this.parts();
    if (d.kind === "pontoon") P.add(g.box, g.wood, d.x, -d.y, 1, 0, d.w, d.h, 2.4);
    else if (d.kind === "boat") {
      const b = this.buildBoatHull(d.len, d.len * 0.34, [0x8a1f24, 0x1f3a5a, 0x2f6b4a, 0x5b4a8a][lv.boats.length % 4]);
      b.position.set(d.x, -d.y, -4);
      b.rotation.z = -d.a;
      lv.boats.push({ grp: b, ph: lv.boats.length * 1.7 });
      return b;
    } else if (d.kind === "canopy") {
      P.add(g.box, g.white, d.x, -d.y, d.height, 0, d.w, d.h, 4);
      P.add(g.box, this.paintMat(0xd33a2c), d.x, -d.y, d.height + 3, 0, d.w + 2, d.h + 2, 2);
      P.add(g.box, g.head, d.x, -d.y, d.height - 2.2, 0, d.w * 0.8, d.h * 0.1, 0.4);
      for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add(g.box, g.white, d.x + u * (d.w / 2 - 20), -d.y + v * (d.h / 2 - 20), d.height / 2, 0, 5, 5, d.height);
    } else if (d.kind === "crane") {
      const H = 190, span = d.span;
      for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add(g.box, g.yellow, d.x + u * span / 2, -d.y + v * 30, H / 2, 0, 8, 8, H);
      for (const v of [-1, 1]) P.add(g.box, g.yellow, d.x, -d.y + v * 30, H, 0, span + 12, 8, 10);
      P.add(g.box, g.darkMetal, d.x, -d.y, H - 8, 0, 30, 64, 12);
    } else if (d.kind === "ferry") {
      const hull = this.paintMat(d.color ?? 0x2b3a4a);
      P.add(g.box, hull, d.x, -d.y, 6, 0, d.w, d.h, 22);
      P.add(g.box, g.white, d.x - d.w * 0.1, -d.y, 30, 0, d.w * 0.6, d.h * 0.8, 26);
      P.add(g.box, g.white, d.x - d.w * 0.15, -d.y, 52, 0, d.w * 0.35, d.h * 0.6, 18);
      P.add(g.box, this.paintMat(0xd33a2c), d.x - d.w * 0.2, -d.y, 72, 0, 24, 24, 24);
    } else if (d.kind === "ferryhull") {
      // Superstructure over the bow of the lorry deck.
      const y0 = d.y - d.h / 2;
      P.add(g.box, g.white, d.x, -(y0 - 20), 70, 0, d.w, 40, 60);
      P.add(g.box, g.glass, d.x, -(y0 + 1), 88, 0, d.w * 0.8, 1, 10);
      P.add(g.box, this.paintMat(0xd33a2c), d.x + d.w * 0.3, -(y0 - 20), 112, 0, 26, 26, 26);
    }
    return P.list.length ? P.merged() : null;
  }

  buildLevel(sim) {
    const g = this;
    this.teardownLevel();
    const lvl = sim.level;
    this.level = lvl;
    const sun = SUNS[lvl.sun];
    const lv = { gen: sim.gen, group: new T.Group(), parked: [], cones: [], waters: [], boats: [] };
    this.lv = lv;
    this.scene.add(lv.group);

    // Lighting and sky.
    g.sun.color.setHex(sun.color);
    g.sun.intensity = sun.i;
    this.sunDir = new T.Vector3(...sun.dir).normalize();
    g.hemi.color.setHex(sun.sky);
    g.hemi.groundColor.setHex(sun.gnd);
    g.hemi.intensity = sun.hemi;
    g.scene.environmentIntensity = sun.env;
    const sky = canvasTex(4, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, sun.top); gr.addColorStop(1, sun.bot);
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    if (g.skyTex) g.skyTex.dispose();
    g.skyTex = sky;
    g.scene.background = sky;
    g.scene.fog = new T.Fog(sun.fog, 2200, 7000);

    // Ground: the baked top-down canvas, as sharp as the texture size allows.
    const maxTex = Math.min(8192, g.renderer.capabilities.maxTextureSize || 4096);
    const want = this.quality === "high" ? 3 : 1.6;
    const S = Math.max(0.8, Math.min(want, maxTex / Math.max(lvl.w, lvl.h), Math.sqrt((this.quality === "high" ? 24e6 : 8e6) / (lvl.w * lvl.h))));
    const cv = makeCanvas(Math.round(lvl.w * S), Math.round(lvl.h * S));
    const cx = cv.getContext("2d");
    cx.scale(S, S);
    drawGround(cx, lvl, S);
    const gtex = owned(new T.CanvasTexture(cv));
    gtex.colorSpace = T.SRGBColorSpace;
    gtex.anisotropy = g.renderer.capabilities.getMaxAnisotropy?.() ?? 8;
    const gmat = owned(new T.MeshStandardMaterial({ map: gtex, roughness: 0.92, metalness: 0 }));
    const ground = new T.Mesh(owned(new T.PlaneGeometry(lvl.w, lvl.h)), gmat);
    ground.position.set(lvl.w / 2, -lvl.h / 2, 0);
    ground.receiveShadow = true;
    lv.group.add(ground);
    // Water sheets over the painted water.
    for (const s of lvl.surfaces) {
      if (s.k !== "water" || s.x0 == null) continue;
      const wm = this.waterMat();
      wm.normalMap.repeat.set((s.x1 - s.x0) / 100, (s.y1 - s.y0) / 100);
      const w = new T.Mesh(g.plane, wm);
      w.scale.set(s.x1 - s.x0, s.y1 - s.y0, 1);
      w.position.set((s.x0 + s.x1) / 2, -(s.y0 + s.y1) / 2, 0.4);
      w.receiveShadow = true;
      lv.group.add(w);
      lv.waters.push(w);
    }

    // Statics, trees, scenery.
    const P = this.parts();
    const trees = [];
    const lamps = [];
    for (const s of sim.statics) {
      const extra = this.buildStatic(P, s.def, lvl, trees, lamps);
      if (extra) lv.group.add(extra);
    }
    for (const d of lvl.decor ?? []) {
      const extra = this.buildDecor(d, lv);
      if (extra) lv.group.add(extra);
    }
    lv.group.add(this.buildScenery(P, lvl, trees));
    lv.group.add(P.merged());
    const tg = this.buildTrees(trees);
    if (tg) lv.group.add(tg);
    if (sun.lamps) {
      for (const l of lamps) {
        const pool = new T.Mesh(g.plane, g.poolMat);
        pool.scale.set(90, 90, 1);
        pool.position.set(l.x, -l.y, 0.5);
        pool.renderOrder = 2;
        lv.group.add(pool);
      }
    }

    // Parked cars (merged, with their own hazard-lamp material).
    for (const pk of sim.parked) {
      const hz = owned(new T.MeshStandardMaterial({ color: 0x7a4a10, emissive: 0xffa22a, emissiveIntensity: 0.05, roughness: 0.3 }));
      hz.userData.noShadow = true;
      const m = pk.spec.lorry ? this.buildLorryModel(pk.spec, pk.color, { hazardMat: hz }) : this.buildCarModel(pk.spec, pk.color, { hazardMat: hz });
      lv.group.add(m.body);
      lv.parked.push({ rec: pk, grp: m.body, hz });
    }
    // Cones.
    for (const c of sim.cones) {
      const yaw = new T.Group();
      const tilt = new T.Group();
      const base = new T.Mesh(g.box, g.trim); base.scale.set(7, 7, 1); base.position.z = 0.5;
      const body = new T.Mesh(g.cone, g.coneM); body.scale.set(3, 3, 9); body.position.z = 5.4;
      const band = new T.Mesh(g.cylZ, g.white); band.scale.set(1.9, 1.9, 1.6); band.position.z = 6;
      for (const o of [base, body, band]) { o.castShadow = true; tilt.add(o); }
      yaw.add(tilt);
      lv.group.add(yaw);
      lv.cones.push({ rec: c, yaw, tilt });
    }
    // Loose hay bales: one small model each, moved every frame.
    lv.movables = [];
    const hayMat = this.matCached("hay", () => new T.MeshStandardMaterial({ color: 0xd9b95a, roughness: 0.95 }));
    const hayEnd = this.matCached("hayEnd", () => new T.MeshStandardMaterial({ color: 0xc9a44a, roughness: 1 }));
    for (const m of sim.movables) {
      const r = m.def.r;
      const grp = new T.Group();
      const bale = new T.Mesh(g.cylZ, [hayMat, hayEnd, hayEnd]);
      bale.scale.set(r, r, r * 1.4);
      bale.position.z = r * 0.7;
      bale.castShadow = true; bale.receiveShadow = true;
      const band = new T.Mesh(g.cylZ, g.trim);
      band.scale.set(r + 0.15, r + 0.15, 0.5);
      band.position.z = r * 0.7;
      grp.add(bale, band);
      lv.group.add(grp);
      lv.movables.push({ rec: m, grp });
    }

    // Target bay: tinted decal, glowing curtain, progress strip.
    const bay = lvl.bay;
    const bayGrp = new T.Group();
    const decal = new T.Mesh(g.plane, owned(new T.MeshBasicMaterial({ map: owned(canvasTex(256, 128, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = "rgba(255,255,255,0.22)"; c.fillRect(0, 0, w, h);
      c.strokeStyle = "#ffffff"; c.lineWidth = 8;
      const k = 34;
      for (const [sx, sy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        c.beginPath(); c.moveTo(sx + (sx ? -k : k), sy + (sy ? -4 : 4)); c.lineTo(sx + (sx ? -4 : 4), sy + (sy ? -4 : 4)); c.lineTo(sx + (sx ? -4 : 4), sy + (sy ? -k : k)); c.stroke();
      }
      c.lineWidth = 7;
      for (let i = 0; i < 3; i++) { const x = w - 60 - i * 40; c.beginPath(); c.moveTo(x, h / 2 - 22); c.lineTo(x - 22, h / 2); c.lineTo(x, h / 2 + 22); c.stroke(); }
      c.font = "900 54px system-ui, sans-serif"; c.fillStyle = "rgba(255,255,255,0.8)"; c.textAlign = "center"; c.textBaseline = "middle";
      c.save(); c.translate(64, h / 2); c.rotate(Math.PI / 2); c.fillText("P", 0, 0); c.restore();
    })), transparent: true, depthWrite: false, color: 0xffd166 })));
    decal.scale.set(bay.l, bay.w, 1);
    decal.position.z = 0.6;
    decal.renderOrder = 3;
    bayGrp.add(decal);
    const curtainMat = owned(new T.MeshBasicMaterial({ map: g.fadeTex, color: 0xffd166, transparent: true, opacity: 0.45, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
    const CH = lvl.vehicle === "truck" ? 34 : 22;
    for (const [px, py, len, rot] of [[0, bay.w / 2, bay.l, 0], [0, -bay.w / 2, bay.l, 0], [bay.l / 2, 0, bay.w, Math.PI / 2], [-bay.l / 2, 0, bay.w, Math.PI / 2]]) {
      const c = new T.Mesh(g.plane, curtainMat);
      c.scale.set(len, CH, 1);
      c.rotateZ(rot);
      c.rotateX(Math.PI / 2);
      c.position.set(px, py, CH / 2);
      c.renderOrder = 4;
      bayGrp.add(c);
    }
    const prog = new T.Mesh(g.plane, owned(new T.MeshBasicMaterial({ color: 0x7ee787, transparent: true, opacity: 0.95, depthWrite: false })));
    prog.position.set(0, -bay.w / 2 - 3.5, 0.7);
    prog.renderOrder = 5;
    bayGrp.add(prog);
    bayGrp.position.set(bay.x, -bay.y, 0);
    bayGrp.rotation.set(0, 0, -bay.a);
    lv.group.add(bayGrp);
    lv.bay = { grp: bayGrp, decal, curtainMat, prog };

    // Guide dots + ghost trailer outline.
    const dots = new T.InstancedMesh(g.disc, owned(new T.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.85, depthWrite: false })), 26);
    dots.renderOrder = 6;
    dots.frustumCulled = false;
    lv.group.add(dots);
    const ghost = new T.LineLoop(owned(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()])), owned(new T.LineBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.6 })));
    ghost.frustumCulled = false;
    lv.group.add(ghost);
    lv.guide = { dots, ghost };

    // Skid marks: a ring buffer of dark strips laid behind sliding wheels.
    const skidMat = owned(new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    const marks = new T.InstancedMesh(g.plane, skidMat, 3000);
    marks.count = 0;
    marks.frustumCulled = false;
    marks.renderOrder = 1;
    marks.setColorAt(0, new T.Color(0x1a1a1a));
    lv.group.add(marks);
    lv.skid = { mesh: marks, next: 0, last: [], hard: new T.Color(0x1a1a1a), loose: new T.Color(0x3b2c1c) };

    // The rig.
    const truck = sim.veh.key === "truck";
    const tailC = owned(new T.MeshStandardMaterial({ color: 0x5a0a0a, emissive: 0xff1a1a, emissiveIntensity: 0.3, roughness: 0.3 }));
    const revC = owned(new T.MeshStandardMaterial({ color: 0xd8d8d8, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.3 }));
    const headC = owned(new T.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff2cc, emissiveIntensity: sun.lamps ? 2.4 : 0.5, roughness: 0.2 }));
    const car = truck
      ? this.buildTruckModel(PLAYER_COLOR, { live: true, tailMat: tailC, revMat: revC, headMat: headC })
      : this.buildCarModel(CAR_TYPES[sim.veh.spec.body ?? "wagon"], PLAYER_COLOR, {
        live: true, tailMat: tailC, revMat: revC, headMat: headC, rails: sim.veh.spec.body === "wagon" || sim.veh.spec.body === "suv",
        wheelbase: sim.veh.spec.wheelbase, wheelR: sim.veh.spec.wheelR, wheelW: sim.veh.spec.wheelW,
      });
    lv.group.add(car.body);
    const tailT = owned(new T.MeshStandardMaterial({ color: 0x5a0a0a, emissive: 0xff1a1a, emissiveIntensity: 0.3, roughness: 0.3 }));
    const trailer = sim.veh.trailer.key === "semi"
      ? this.buildSemiModel({ live: true, tailMat: tailT, company: "HITCH & PARK" })
      : this.buildTrailerModel(sim.veh.trailer.key, { tailMat: tailT });
    lv.group.add(trailer.body);
    // Night beams: headlights ahead, reversing light behind.
    const beamMat = owned(new T.MeshBasicMaterial({ map: g.beamTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: sun.lamps ? 0.6 : 0 }));
    const beam = new T.Mesh(g.plane, beamMat);
    beam.scale.set(truck ? 100 : 70, truck ? 50 : 34, 1);
    beam.rotation.z = -Math.PI / 2;
    beam.position.set(sim.veh.spec.len / 2 * M + (truck ? 52 : 36), 0, 0.8);
    beam.renderOrder = 2;
    car.body.add(beam);
    const revPoolMat = owned(new T.MeshBasicMaterial({ map: g.beamTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
    const revPool = new T.Mesh(g.plane, revPoolMat);
    revPool.scale.set(truck ? 70 : 44, truck ? 40 : 26, 1);
    revPool.rotation.z = Math.PI / 2;
    revPool.position.set(-(TRAILERS[sim.veh.trailer.key].len / 2) * M - (truck ? 34 : 22), 0, 0.8);
    revPool.renderOrder = 2;
    trailer.body.add(revPool);
    lv.car = car;
    lv.trailer = trailer;
    lv.mats = { tailC, revC, tailT, beamMat, revPoolMat, night: sun.lamps };
    this.camPos = null;
  }

  // ── Lorries ────────────────────────────────────────────────────────────
  // Tractor unit. Wheels in the same order as the car's: FL, FR, RL, RR.
  buildTruckModel(color, o = {}) {
    const g = this;
    const v = VEHICLES.truck;
    const L = v.len * M, W = v.wid * M;
    const paint = this.paintMat(color);
    const P = this.parts();
    const cabL = 26, cabX = L / 2 - cabL / 2;
    P.add(g.box, g.darkMetal, -6, 0, 9, 0, L - 12, W * 0.5, 4);
    P.add(g.box, paint, cabX, 0, 24, 0, cabL, W, 28);
    P.add(taperGeo(-cabL / 2, cabL / 2, W, -cabL / 2, cabL / 2 - 6, W - 2, 8), paint, cabX, 0, 38);
    P.add(g.box, g.glass, L / 2 + 0.1, 0, 30, 0, 0.6, W - 4, 11);
    for (const sd of [-1, 1]) P.add(g.box, g.glass, cabX + 4, sd * (W / 2 + 0.1), 30, 0, 10, 0.6, 9);
    P.add(g.box, g.trim, L / 2 + 0.3, 0, 17, 0, 0.6, W - 8, 9);
    P.add(g.box, g.chrome, L / 2 + 0.8, 0, 9, 0, 1.6, W, 3);
    for (const sd of [-1, 1]) P.add(g.box, o.headMat || g.head, L / 2 + 0.4, sd * (W / 2 - 4), 11, 0, 0.8, 5, 2.4);
    for (const sd of [-1, 1]) P.add(g.box, paint, L / 2 - 2, sd * (W / 2 + 2.2), 32, 0, 1.6, 3, 7);
    for (const sd of [-1, 1]) P.add(g.cylZ, g.chrome, 2, sd * (W / 2 - 4), 8, Math.PI / 2, 4, 4, 14, Math.PI / 2);
    P.add(g.cylZ, g.darkMetal, v.hitchX * M, 0, 13, 0, 8, 8, 1.6);
    for (const sd of [-1, 1]) P.add(g.box, o.tailMat || g.tail, -L / 2 + 0.3, sd * (W / 2 - 3), 10, 0, 0.8, 4, 2);
    if (o.revMat) for (const sd of [-1, 1]) P.add(g.box, o.revMat, -L / 2 + 0.3, sd * (W / 2 - 7), 10, 0, 0.8, 2.4, 1.6);
    const r = v.wheelR * M, ww = v.wheelW * M;
    const ax = v.wheelbase / 2 * M, wy = W / 2 - ww / 2 + 1.2;
    const wheels = [];
    const shell = P.merged();
    const body = new T.Group();
    body.add(shell);
    for (const [lx, ly, front] of [[ax, wy, true], [ax, -wy, true], [-ax, wy, false], [-ax, -wy, false]]) {
      const pivot = new T.Group();
      pivot.position.set(lx, ly, 0);
      const spin = new T.Group();
      spin.position.set(0, 0, r);
      const PP = this.parts();
      PP.add(g.cyl, g.tire, 0, 0, 0, 0, r, ww, r);
      if (!front) PP.add(g.cyl, g.tire, 0, -Math.sign(ly) * (ww + 0.6), 0, 0, r, ww, r);
      PP.add(g.disc, g.rimFlat, 0, Math.sign(ly) * (ww / 2 + 0.45), 0, 0, r * 0.6, r * 0.6, 1, ly > 0 ? -Math.PI / 2 : Math.PI / 2);
      for (const p of PP.list) {
        const mesh = new T.Mesh(p.geo, p.mat);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(p.m);
        mesh.castShadow = true;
        spin.add(mesh);
      }
      pivot.add(spin);
      body.add(pivot);
      wheels.push({ pivot, spin, lx, ly, front });
    }
    return { body, shell, wheels, L, W };
  }

  // Semi-trailer: curtain-sider box on a chassis, three axles at the back.
  buildSemiModel(o = {}) {
    const g = this;
    const t = TRAILERS.semi;
    const L = t.len * M, W = t.wid * M;
    const z0 = 14, H = 48;
    const P = this.parts();
    const col = o.color ?? 0xe8e8e4;
    const side = this.matCached("semiSide" + (o.company ?? "") + col, () => new T.MeshStandardMaterial({ roughness: 0.7, map: canvasTex(512, 64, (c, w, h) => {
      c.fillStyle = "#" + col.toString(16).padStart(6, "0"); c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(0,0,0,0.08)";
      for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 2, h);
      if (o.company) { c.fillStyle = { "NAPE-JS PHYSICS": "#e8762b", "THREE.JS": "#111111", "NEWKROK GAMES": "#2f5f9a" }[o.company] ?? "#d9342b"; c.font = "900 30px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(o.company, w / 2, h / 2 + 2); }
    }) }));
    const box = new T.Mesh(g.box, [this.paintMat(0xd6d9de), this.paintMat(0xd6d9de), side, side, this.paintMat(0xcfd3d8), g.darkMetal]);
    box.scale.set(L, W, H - z0);
    box.position.z = (H + z0) / 2;
    box.castShadow = true;
    box.receiveShadow = true;
    P.add(g.box, g.darkMetal, 0, 0, z0 - 2, 0, L, W * 0.6, 4);
    for (const sd of [-1, 1]) P.add(g.box, g.darkMetal, L / 2 - 30, sd * (W / 2 - 4), 7, 0, 2, 2, 12);
    for (const sd of [-1, 1]) P.add(g.box, o.tailMat || g.tail, -L / 2 - 0.3, sd * (W / 2 - 3), z0 + 1, 0, 0.8, 4, 2);
    P.add(g.box, g.darkMetal, -L / 2 + 1, 0, 6, 0, 2, W - 4, 2);
    const body = P.merged();
    body.add(box);
    const out = { body, wheels: [], L, W };
    const r = t.wheelR * M, ww = t.wheelW * M;
    const wo = (t.wid / 2 + t.wheelOut) * M;
    for (const dx of [-15.7, 0, 15.7]) {
      for (const sd of [-1, 1]) {
        const pivot = new T.Group();
        pivot.position.set(t.axle * M + dx, sd * (wo + ww / 2), r);
        const spin = new T.Group();
        const tire = new T.Mesh(g.cyl, g.tire);
        tire.scale.set(r, ww * 1.8, r);
        tire.castShadow = true;
        const rim = new T.Mesh(g.disc, g.rimFlat);
        rim.position.y = sd * (ww * 0.9 + 0.45);
        rim.rotation.x = sd > 0 ? -Math.PI / 2 : Math.PI / 2;
        rim.scale.set(r * 0.6, r * 0.6, 1);
        spin.add(tire, rim);
        pivot.add(spin);
        body.add(pivot);
        out.wheels.push({ pivot, spin, phys: sd < 0 ? 0 : 1 });
      }
    }
    return out;
  }

  // A parked rigid lorry.
  buildLorryModel(spec, color, o = {}) {
    const g = this;
    const L = spec.len * M, W = spec.wid * M, H = spec.h * M;
    const P = this.parts();
    const paint = this.paintMat(color);
    const cabL = L * 0.26;
    P.add(g.box, paint, L / 2 - cabL / 2, 0, 20, 0, cabL, W - 0.6, 28);
    P.add(g.box, g.glass, L / 2 + 0.1, 0, 27, 0, 0.6, W - 4, 10);
    P.add(g.box, g.white, -cabL / 2, 0, 8 + (H - 8) / 2, 0, L - cabL - 1, W - 0.6, H - 8);
    P.add(g.box, g.darkMetal, 0, 0, 6, 0, L - 4, W * 0.6, 4);
    for (const sd of [-1, 1]) P.add(g.box, g.head, L / 2 + 0.4, sd * (W / 2 - 4), 10, 0, 0.8, 5, 2.4);
    for (const sd of [-1, 1]) P.add(g.box, g.tail, -L / 2 + 0.3, sd * (W / 2 - 3), 8, 0, 0.8, 4, 2);
    if (o.hazardMat) for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) P.add(g.box, o.hazardMat, sx * (L / 2 - 2), sy * (W / 2 + 0.05), 10, 0, 3, 0.6, 1.6);
    const r = 6, ww = 4;
    for (const lx of [L / 2 - cabL * 0.55, -L / 2 + 16]) for (const sd of [-1, 1]) P.add(g.cyl, g.tire, lx, sd * (W / 2 - ww / 2 + 1.2), r, 0, r, ww, r);
    return { body: P.merged(), wheels: [], L, W, H };
  }

  // Place a rigid model at a body: yaw from the body, pitch from the ground
  // under its two ends (only the slipway is not flat).
  placeOnGround(obj, x, y, a, half) {
    const c = Math.cos(a), s = Math.sin(a);
    const zf = this.groundZAt(x + c * half, y + s * half), zr = this.groundZAt(x - c * half, y - s * half);
    obj.position.set(x, -y, (zf + zr) / 2);
    obj.rotation.set(0, -Math.atan2(zf - zr, half * 2), -a, "ZYX");
  }

  sync(sim, view) {
    const lv = this.lv;
    const v = sim.veh, c = v.chassis, tb = v.trailer.body;
    const playing = view.phase === "play";
    this.placeOnGround(lv.car.body, c.position.x, c.position.y, c.rotation, v.spec.len / 2 * M);
    // Body roll and pitch (looks only): the shell leans out of a turn by
    // the lateral acceleration, dips under braking, squats a little under
    // power. Smoothed like a damped suspension.
    if (lv.car.shell) {
      const dt = Math.max(1e-3, view.dt ?? 1 / 60);
      const truckK = v.key === "truck" ? 0.6 : 1;
      const aLat = v.speed * c.angularVel / M;                       // m/s²
      const aLong = lv.prevSpeed == null ? 0 : (v.speed - lv.prevSpeed) / dt / M;
      lv.prevSpeed = v.speed;
      lv.aLong = (lv.aLong ?? 0) + (aLong - (lv.aLong ?? 0)) * Math.min(1, dt * 8);
      const rollT = clamp(-aLat * 0.012 * truckK, -0.07, 0.07);
      const pitchT = clamp(-lv.aLong * 0.006 * truckK, -0.035, 0.035);
      const k = 1 - Math.exp(-dt * 7);
      lv.roll = (lv.roll ?? 0) + (rollT - (lv.roll ?? 0)) * k;
      lv.pitch = (lv.pitch ?? 0) + (pitchT - (lv.pitch ?? 0)) * k;
      lv.car.shell.rotation.set(lv.roll, lv.pitch, 0);
    }
    for (let i = 0; i < 4; i++) {
      const w3 = lv.car.wheels[i];
      // car.wheels order: FL(+y three), FR, RL, RR; physics: [0] y<0 front … three y = −ly.
      const phys = v.wheels[w3.front ? (w3.ly > 0 ? 0 : 1) : (w3.ly > 0 ? 2 : 3)];
      w3.pivot.rotation.z = -wrapPi(phys.body.rotation - c.rotation);
      w3.spin.rotation.y = phys.spin;
    }
    this.placeOnGround(lv.trailer.body, tb.position.x, tb.position.y, tb.rotation, v.trailer.spec.len / 2 * M);
    for (let i = 0; i < lv.trailer.wheels.length; i++) { const w = lv.trailer.wheels[i]; w.spin.rotation.y = v.trailer.wheels[w.phys ?? i].spin; }
    // Lamps.
    const braking = v.braking || (v.holding && playing);
    const rev = v.gear < 0 && playing;
    lv.mats.tailC.emissiveIntensity = braking ? 2.6 : lv.mats.night ? 0.9 : 0.3;
    lv.mats.tailT.emissiveIntensity = lv.mats.tailC.emissiveIntensity;
    lv.mats.revC.emissiveIntensity = rev ? 2.2 : 0;
    lv.mats.revPoolMat.opacity = rev ? (lv.mats.night ? 0.5 : 0.22) : 0;
    for (const p of lv.parked) {
      const b = p.rec.body;
      p.grp.position.set(b.position.x, -b.position.y, 0);
      p.grp.rotation.z = -b.rotation;
      const on = p.rec.hazard > 0 && Math.floor(p.rec.hazard * 3) % 2 === 0;
      p.hz.emissiveIntensity = on ? 3.2 : 0.05;
    }
    // Skid marks from every wheel of the rig that is really sliding.
    const sk = lv.skid, dm = this.dummy;
    let added = false;
    [...v.wheels, ...v.trailer.wheels].forEach((w, i) => {
      const p = w.body.position, last = sk.last[i];
      if (!(w.sliding > 0.15)) { sk.last[i] = null; return; }
      if (!last) { sk.last[i] = { x: p.x, y: p.y }; return; }
      const dx = p.x - last.x, dy = p.y - last.y, dist = Math.hypot(dx, dy);
      if (dist < 2.5) return;
      if (dist < 30) {
        dm.position.set((p.x + last.x) / 2, -(p.y + last.y) / 2, 0.52);
        dm.rotation.set(0, 0, -Math.atan2(dy, dx));
        dm.scale.set(dist + 0.6, w.w * 0.9, 1);
        dm.updateMatrix();
        sk.mesh.setMatrixAt(sk.next, dm.matrix);
        sk.mesh.setColorAt(sk.next, w.loose ? sk.loose : sk.hard);
        sk.next = (sk.next + 1) % sk.mesh.instanceMatrix.count;
        sk.mesh.count = Math.min(sk.mesh.count + 1, sk.mesh.instanceMatrix.count);
        added = true;
      }
      sk.last[i] = { x: p.x, y: p.y };
    });
    if (added) { sk.mesh.instanceMatrix.needsUpdate = true; sk.mesh.instanceColor.needsUpdate = true; }

    for (const mv of lv.movables) {
      const b = mv.rec.body;
      mv.grp.position.set(b.position.x, -b.position.y, 0);
      mv.grp.rotation.z = -b.rotation;
    }
    for (const cn of lv.cones) {
      const b = cn.rec.body;
      cn.yaw.position.set(b.position.x, -b.position.y, 0);
      if (cn.rec.down) {
        cn.yaw.rotation.z = -cn.rec.tipA;
        cn.tilt.rotation.y = cn.rec.tip * Math.PI / 2 * 0.92;
        cn.tilt.position.z = cn.rec.tip * 3;
      } else {
        cn.yaw.rotation.z = -b.rotation;
      }
    }
    // Bay.
    const ps = sim.park;
    const ok = ps && ps.inside && ps.aligned;
    const col = ok ? 0x7ee787 : 0xffd166;
    lv.bay.decal.material.color.setHex(col);
    lv.bay.curtainMat.color.setHex(col);
    lv.bay.curtainMat.opacity = (ok ? 0.55 : 0.28) + 0.15 * Math.sin(view.time * 4);
    const f = clamp(view.hold / PARK_HOLD, 0, 1);
    const bay = sim.level.bay;
    lv.bay.prog.visible = f > 0;
    lv.bay.prog.scale.set(Math.max(0.01, bay.l * f), 2.6, 1);
    lv.bay.prog.position.x = -bay.l / 2 + bay.l * f / 2;
    // Guide.
    const show = view.showGuide && playing && v.gear < 0;
    lv.guide.dots.visible = show;
    lv.guide.ghost.visible = show;
    if (show) {
      const path = sim.predictPath();
      const d = this.dummy;
      for (let i = 0; i < path.length; i++) {
        const q = path[i];
        const s = i % 3 === 0 ? 1.9 : 1.2;
        d.position.set(q.rx, -q.ry, 0.7);
        d.rotation.set(0, 0, 0);
        d.scale.set(s, s, 1);
        d.updateMatrix();
        lv.guide.dots.setMatrixAt(i, d.matrix);
      }
      lv.guide.dots.count = path.length;
      lv.guide.dots.instanceMatrix.needsUpdate = true;
      const last = path[path.length - 1];
      if (last) {
        const t = v.trailer.spec;
        const off = t.axle * M;
        const gx = last.x - Math.cos(last.a) * off, gy = last.y - Math.sin(last.a) * off;
        const pos = lv.guide.ghost.geometry.attributes.position;
        const pts = xform(gx, gy, last.a, rectPts(-t.len / 2 * M, -t.wid / 2 * M, t.len / 2 * M, t.wid / 2 * M));
        for (let i = 0; i < 4; i++) pos.setXYZ(i, pts[i * 2], -pts[i * 2 + 1], this.groundZAt(pts[i * 2], pts[i * 2 + 1]) + 0.9);
        pos.needsUpdate = true;
      }
    }
    for (const w of lv.waters) w.material.normalMap.offset.set(view.time * 0.012, view.time * 0.02);
    for (const b of lv.boats) {
      b.grp.position.z = -4 + Math.sin(view.time * 1.3 + b.ph) * 0.8;
      b.grp.rotation.x = Math.sin(view.time * 1.1 + b.ph) * 0.03;
    }
  }

  // Camera distance at which the whole site fits the screen.
  #fitDist(pitch) {
    const vf = this.camera.fov * Math.PI / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect);
    const lvl = this.level;
    const dW = (lvl.w / 2 + 30) / Math.tan(hf / 2);
    const dH = (lvl.h / 2 + 30) * (0.55 + 0.45 * Math.sin(pitch)) / Math.tan(vf / 2);
    return Math.max(dW, dH);
  }

  placeCamera(sim, view) {
    const v = sim.veh;
    const c = v.chassis.position;
    const bay = sim.level.bay;
    let ex, ey, ez, tx, ty, tz;
    const lvl = sim.level;
    const big = v.key === "truck" ? 1.55 : 1;
    const menu = view.phase === "menu";
    const overview = view.phase === "intro" || view.camMode === 2;
    if (menu) {
      // Slow orbit around the site behind the menus.
      const a = view.time * 0.07, sc = Math.max(1, Math.max(lvl.w / 900, lvl.h / 500) * 0.8);
      tx = lvl.w / 2; ty = -lvl.h / 2 + 20; tz = 0;
      ex = tx + Math.cos(a) * 620 * sc; ey = ty + Math.sin(a) * 420 * sc - 80; ez = 430 * sc;
    } else if (overview) {
      const pitch = 1.0;
      const D = this.#fitDist(pitch) * (view.camMode === 2 ? view.camDist : 1);
      tx = lvl.w / 2; ty = -lvl.h / 2 + 10; tz = 0;
      ex = tx; ey = ty - Math.cos(pitch) * D; ez = Math.sin(pitch) * D;
    } else if (view.camMode === 1) {
      const h = v.chassis.rotation;
      this.camYaw += wrapPi(h - this.camYaw) * clamp(view.dt * 3.5, 0, 1);
      const fx = Math.cos(this.camYaw), fy = Math.sin(this.camYaw);
      const back = 185 * view.camDist * big;
      tx = c.x + fx * 30; ty = -(c.y + fy * 30); tz = 6;
      ex = c.x - fx * back; ey = -(c.y - fy * back); ez = 118 * view.camDist * big;
    } else {
      // Lean towards the bay when it is close, not when it is far away.
      const dist = Math.hypot(bay.x - c.x, bay.y - c.y);
      const k = 0.3 * clamp(1 - (dist - 250 * big) / (300 * big), 0, 1);
      const fx = c.x + (bay.x - c.x) * k, fy = c.y + (bay.y - c.y) * k;
      // Portrait screens look more straight down so the ground fills them.
      const portrait = this.camera.aspect < 1;
      const D = (portrait ? 460 : 400) * view.camDist * big, pitch = portrait ? 1.22 : 0.95;
      tx = fx; ty = -fy; tz = 0;
      ex = tx; ey = ty - Math.cos(pitch) * D; ez = Math.sin(pitch) * D;
    }
    // Frame-rate independent smoothing.
    if (!this.camPos || view.snap) {
      this.camPos = new T.Vector3(ex, ey, ez);
      this.camTgt = new T.Vector3(tx, ty, tz);
      this.camYaw = v.chassis.rotation;
    } else {
      const k = 1 - Math.exp(-view.dt * (menu ? 4 : 3.2));
      this.camPos.lerp(this.v.set(ex, ey, ez), k);
      this.camTgt.lerp(this.v.set(tx, ty, tz), k);
    }
    const [sx, sy] = view.shake;
    this.camera.position.set(this.camPos.x + sx * 0.6, this.camPos.y - sy * 0.6, this.camPos.z);
    this.camera.lookAt(this.camTgt);
    this.camera.updateMatrixWorld();
    // The sun's shadow box follows what the camera looks at.
    const ext = overview || menu ? Math.max(lvl.w, lvl.h) * 0.62 + 100 : 650 * big;
    const sc = this.sun.shadow.camera;
    if (sc.right !== ext) {
      sc.left = -ext; sc.right = ext; sc.top = ext * 0.7; sc.bottom = -ext * 0.7;
      sc.far = 4200;
      sc.updateProjectionMatrix();
    }
    const d = this.sunDir ?? this.v.set(0, 0, 1);
    const cx0 = overview || menu ? lvl.w / 2 : this.camTgt.x, cy0 = overview || menu ? -lvl.h / 2 : this.camTgt.y;
    this.sun.target.position.set(cx0, cy0, 0);
    this.sun.position.set(cx0 + d.x * 1800, cy0 + d.y * 1800, d.z * 1800);
    this.sun.target.updateMatrixWorld();
  }

  pipRect() {
    const w = Math.round(clamp(this.W * 0.26, 150, 280));
    const h = Math.round(w * 9 / 16);
    const top = this.W < 700 ? 64 : 76;
    return { x: this.W - w - 12, y: top, w, h };
  }

  renderPip(sim, view) {
    const v = sim.veh;
    if (!view.rearCam || view.phase !== "play" || v.gear > 0) return null;
    const t = v.trailer, b = t.body;
    const a = b.rotation, c = Math.cos(a), s = Math.sin(a);
    const back = t.spec.len / 2 * M + (t.key === "boat" ? 7 : t.key === "semi" ? 2 : 1.5);
    const rx = b.position.x - c * back, ry = b.position.y - s * back;
    const cam = this.rearCam;
    const z0 = this.groundZAt(rx, ry);
    cam.position.set(rx, -ry, z0 + (t.key === "semi" ? 44 : t.key === "caravan" ? 22 : t.key === "boat" ? 20 : 15));
    const look = t.key === "semi" ? 110 : 60;
    cam.lookAt(rx - c * look, -(ry - s * look), z0);
    const r = this.pipRect();
    cam.aspect = r.w / r.h;
    cam.updateProjectionMatrix();
    const R = this.renderer;
    const vy = this.H - (r.y + r.h);
    R.setScissorTest(true);
    R.setScissor(r.x, vy, r.w, r.h);
    R.setViewport(r.x, vy, r.w, r.h);
    R.render(this.scene, cam);
    R.setScissorTest(false);
    R.setViewport(0, 0, this.W, this.H);
    return r;
  }

  // World → screen px (for floating texts), or null behind the camera.
  project(x, y, z = 0) {
    const pv = this.pv.set(x, -y, z).project(this.camera);
    if (pv.z > 1) return null;
    return { x: (pv.x + 1) / 2 * this.W, y: (1 - pv.y) / 2 * this.H };
  }

  render(sim, view) {
    if (!this.lv || this.lv.gen !== sim.gen) this.buildLevel(sim);
    this.sync(sim, view);
    this.placeCamera(sim, view);
    this.renderer.render(this.scene, this.camera);
    return this.renderPip(sim, view);
  }
}

class Parts {
  constructor(g) { this.g = g; this.list = []; }
  add(geo, mat, x = 0, y = 0, z = 0, rz = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0) {
    const m = new T.Matrix4().compose(
      new T.Vector3(x, y, z),
      new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz, "ZYX")),
      new T.Vector3(sx, sy, sz),
    );
    this.list.push({ geo, mat, m });
    return this;
  }
  merged(shadow = true) {
    const grp = new T.Group();
    const byMat = new Map();
    // Plain-coloured parts share one vertex-coloured material, so a whole
    // car or prop batch is a few draws.
    const vc = [];
    for (const p of this.list) {
      if (!Array.isArray(p.mat) && p.mat.userData.vc) { vc.push(p); continue; }
      if (Array.isArray(p.mat)) {
        const mesh = new T.Mesh(p.geo, p.mat);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(p.m);
        mesh.castShadow = shadow; mesh.receiveShadow = true;
        grp.add(mesh);
        continue;
      }
      if (!byMat.has(p.mat)) byMat.set(p.mat, []);
      byMat.get(p.mat).push(p);
    }
    if (vc.length) {
      const mesh = new T.Mesh(mergeGeos(vc, true), this.g.vcMat);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      grp.add(mesh);
    }
    for (const [mat, list] of byMat) {
      const mesh = new T.Mesh(mergeGeos(list), mat);
      mesh.castShadow = shadow && !mat.userData.noShadow;
      mesh.receiveShadow = true;
      grp.add(mesh);
    }
    return grp;
  }
}
