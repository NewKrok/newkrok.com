import * as T from "three";

// ── Water ────────────────────────────────────────────────────────────────
// Each pond is a low-poly sheet whose vertices roll in slow swells (the
// facets catch the light as they tilt), with glints drifting over it, a
// foam line along the bank, and rings spreading wherever something
// touches it: your feet, a wading glitch, a drip, a shot, a burst bubble.
// Splashes throw droplets. All of it is draw only; the sim tells us about
// your steps and splashes through events.

const MAX_RINGS = 72;
const _m = new T.Matrix4(), _q = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2), _p = new T.Vector3(), _s = new T.Vector3(), _c = new T.Color();

// Soft wavy highlight streaks, tiled over the surface.
function glintTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.lineCap = "round";
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 256, y = rnd() * 256, len = 14 + rnd() * 30;
    g.lineWidth = 1.5 + rnd() * 2.5;
    g.globalAlpha = 0.35 + rnd() * 0.5;
    // Drawn once per neighbouring tile too, so the texture wraps seamlessly.
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      g.beginPath();
      for (let k = 0; k <= 8; k++) {
        const u = k / 8, px = x + (u - 0.5) * len + ox, py = y + Math.sin(u * 6 + i) * 2.5 + oy;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke();
    }
  }
  const tex = new T.CanvasTexture(c);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export class WaterView {
  constructor(group, kit, fx) {
    this.fx = fx;
    this.kit = kit;
    this.ponds = [];
    this.rings = [];
    this.dripT = 0;
    this.wade = new Map();      // foe id → time to its next ripple
    if (!kit.waters.length) return;
    const tex = glintTexture();
    for (const w of kit.waters) {
      const nx = Math.max(4, Math.round(w.w / 0.75)), nz = Math.max(4, Math.round(w.d / 0.75));
      const geo = new T.PlaneGeometry(w.w, w.d, nx, nz).rotateX(-Math.PI / 2);
      // Jitter the inner vertices a little so the facets are uneven.
      const pos = geo.attributes.position;
      const base = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i), z = pos.getZ(i);
        if (Math.abs(x) < w.w / 2 - 0.01 && Math.abs(z) < w.d / 2 - 0.01) {
          x += Math.sin(i * 12.9898) * 0.18; z += Math.sin(i * 78.233) * 0.18;
          pos.setX(i, x); pos.setZ(i, z);
        }
        base[i * 2] = x; base[i * 2 + 1] = z;
      }
      const mat = new T.MeshStandardMaterial({ color: 0x2f8fc4, roughness: 0.32, metalness: 0, transparent: true, opacity: 0.82, flatShading: true, envMapIntensity: 1.1 });
      const sheet = new T.Mesh(geo, mat);
      sheet.position.set(w.x, w.y, w.z);
      sheet.receiveShadow = true;
      group.add(sheet);
      // Glints drifting over the top, added on.
      const gt = tex.clone();
      gt.repeat.set(w.w / 5, w.d / 5);
      gt.needsUpdate = true;
      const glint = new T.Mesh(new T.PlaneGeometry(w.w, w.d).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.32, depthWrite: false, blending: T.AdditiveBlending, color: 0xd8f4ff }));
      glint.position.set(w.x, w.y + 0.035, w.z);
      group.add(glint);
      const gt2 = tex.clone();
      gt2.repeat.set(w.w / 3.2, w.d / 3.2);
      gt2.rotation = 1.1;
      gt2.needsUpdate = true;
      const glint2 = new T.Mesh(glint.geometry, new T.MeshBasicMaterial({ map: gt2, transparent: true, opacity: 0.2, depthWrite: false, blending: T.AdditiveBlending, color: 0xffffff }));
      glint2.position.set(w.x, w.y + 0.04, w.z);
      group.add(glint2);
      // Foam along the bank: a thin bright frame that breathes.
      const foamMat = new T.MeshBasicMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0.55, depthWrite: false });
      const foam = new T.Group();
      for (const [px, pz, sx, sz] of [[0, -w.d / 2 + 0.12, w.w, 0.28], [0, w.d / 2 - 0.12, w.w, 0.28], [-w.w / 2 + 0.12, 0, 0.28, w.d - 0.5], [w.w / 2 - 0.12, 0, 0.28, w.d - 0.5]]) {
        const m = new T.Mesh(new T.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2), foamMat);
        m.position.set(px, 0.045, pz);
        foam.add(m);
      }
      foam.position.set(w.x, w.y, w.z);
      group.add(foam);
      this.ponds.push({ w, sheet, base, glint: gt, glint2: gt2, foamMat });
    }
    const ringMat = new T.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    this.ringMesh = new T.InstancedMesh(new T.RingGeometry(0.86, 1, 36), ringMat, MAX_RINGS);
    this.ringMesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(MAX_RINGS * 3), 3);
    this.ringMesh.count = 0;
    this.ringMesh.frustumCulled = false;
    group.add(this.ringMesh);
  }

  // A ring spreading from (x, z) on the surface y: size is how far it goes.
  ripple(x, y, z, size = 1, life = 1.1, bright = 0.55) {
    if (!this.ringMesh) return;
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    this.rings.push({ x, y, z, size, life, max: life, bright });
  }

  // Droplets and a couple of rings: something hit the water.
  splash(x, y, z, k = 1) {
    this.ripple(x, y, z, 1.1 * k, 1.0, 0.7);
    this.ripple(x, y, z, 2.0 * k, 1.5, 0.45);
    const n = Math.round(10 + 14 * k);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.25 * k, v = (1 + Math.random() * 2) * Math.sqrt(k);
      this.fx.spark(x + Math.cos(a) * r, y + 0.05, z + Math.sin(a) * r, Math.cos(a) * v, 2.5 + Math.random() * 3.5 * Math.sqrt(k), Math.sin(a) * v,
        0.45 + Math.random() * 0.35, 0.035 + Math.random() * 0.04 * k, Math.random() < 0.5 ? 0xbfe8ff : 0x7fc8f0, 11);
    }
  }

  // Where a line from o along d crosses the surface, if over water and in reach.
  crossing(o, d, t) {
    if (d[1] >= -1e-3) return null;
    for (const p of this.kit.waters) {
      const tt = (p.y - o[1]) / d[1];
      if (tt < 0 || tt > t + 0.05) continue;
      const x = o[0] + d[0] * tt, z = o[2] + d[2] * tt;
      if (Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2) return [x, p.y, z];
    }
    return null;
  }

  onEvent(e) {
    if (!this.ponds.length) return;
    if (e.type === "wade") {
      if (e.big) this.splash(e.x, e.y, e.z, Math.min(1.6, 0.6 + e.big * 0.08));
      else {
        this.ripple(e.x, e.y, e.z, 0.9 + Math.random() * 0.3, 0.9, 0.6);
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          this.fx.spark(e.x + Math.cos(a) * 0.2, e.y + 0.04, e.z + Math.sin(a) * 0.2, Math.cos(a) * 1.2 + e.vx * 0.3, 1.6 + Math.random() * 1.6, Math.sin(a) * 1.2 + e.vz * 0.3, 0.35, 0.03, 0xbfe8ff, 11);
        }
      }
    } else if (e.type === "shot") {
      const p = this.crossing(e.o, e.d, e.t);
      if (p) this.splash(p[0], p[1], p[2], e.big ? 0.9 : 0.4);
    } else if (e.type === "spitPop" || e.type === "ballPop" || e.type === "pop") {
      const wy = this.kit.waterAt(e.x, e.z);
      if (wy !== null && e.y < wy + (e.splash ? 1.2 : 0.6)) this.splash(e.x, wy, e.z, e.splash ? 1.4 : e.type === "ballPop" ? 1.1 : 0.6);
    }
  }

  update(run, dt, t) {
    if (!this.ponds.length) return;
    // Swells: a few sines across the sheet; normals follow (flat shaded).
    for (const P of this.ponds) {
      const pos = P.sheet.geometry.attributes.position, base = P.base;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 2], z = base[i * 2 + 1];
        pos.setY(i, Math.sin(x * 1.1 + t * 1.3) * 0.022 + Math.sin(z * 0.9 - t * 1.1 + x * 0.4) * 0.022 + Math.sin((x + z) * 2.3 + t * 2.1) * 0.01);
      }
      pos.needsUpdate = true;
      P.sheet.geometry.computeVertexNormals();
      P.glint.offset.set(t * 0.018, t * 0.011);
      P.glint2.offset.set(-t * 0.012, t * 0.02);
      P.foamMat.opacity = 0.42 + Math.sin(t * 1.6) * 0.12;
    }
    // Drips here and there, and something fishy now and then.
    this.dripT -= dt;
    if (this.dripT <= 0) {
      this.dripT = 0.25 + Math.random() * 0.5;
      const p = this.kit.waters[Math.floor(Math.random() * this.kit.waters.length)];
      const x = p.x + (Math.random() - 0.5) * p.w * 0.9, z = p.z + (Math.random() - 0.5) * p.d * 0.9;
      if (Math.random() < 0.12) this.splash(x, p.y, z, 0.35);
      else this.ripple(x, p.y, z, 0.5 + Math.random() * 0.9, 1.4, 0.35);
    }
    // Glitches wading through.
    for (const f of run.foes) {
      if (!f.alive || !f.body) continue;
      const wy = this.kit.waterAt(f.px, f.pz);
      if (wy === null || f.py > wy) continue;
      let w = (this.wade.get(f.id) ?? 0) - dt * (0.4 + f.body.speed2D);
      if (w <= 0) { w = 1.3; this.ripple(f.px, wy, f.pz, f.def.r * 2.2 + 0.4, 1, 0.5); }
      this.wade.set(f.id, w);
    }
    // Rings.
    let i = 0;
    const R = this.ringMesh;
    for (const r of this.rings) {
      r.life -= dt;
      if (r.life <= 0) continue;
      const u = 1 - r.life / r.max;
      _p.set(r.x, r.y + 0.05, r.z);
      _s.setScalar(r.size * (0.15 + 0.85 * Math.sqrt(u)));
      R.setMatrixAt(i, _m.compose(_p, _q, _s));
      R.setColorAt(i, _c.setRGB(0.75, 0.92, 1).multiplyScalar(r.bright * (1 - u) * (1 - u)));
      i++;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    R.count = i;
    R.instanceMatrix.needsUpdate = true;
    if (R.instanceColor) R.instanceColor.needsUpdate = true;
  }
}
