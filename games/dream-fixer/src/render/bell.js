import * as T from "three";
import { make } from "./modelkit.js";
import { MODELS } from "./models/index.js";

// ── The Lullaby Bell on screen ───────────────────────────────────────────
// A ring is a lilac shell (a slice of a sphere) racing out ahead of you
// and fading; a lullaby a soft round one spreading out, with little notes
// drifting off it. Sleeping glitches lie over with a "Z" or two rising
// from them; drowsy ones yawn out a slow mote now and then. And the
// things that answer the bell: jellies wobble (harder on a bounce),
// soufflés sink flat.

const RING = 0xc8b0ff, LULL = 0x9fc8ff;
const MAX_WAVES = 8, MAX_Z = 24;

export class BellView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.group = new T.Group();
    scene.add(this.group);
    this.shells = [];
    for (let i = 0; i < MAX_WAVES; i++) {
      const m = new T.Mesh(undefined, new T.MeshBasicMaterial({ color: RING, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
      m.visible = false; m.frustumCulled = false;
      this.group.add(m); this.shells.push(m);
    }
    this.sphere = new T.IcosahedronGeometry(1, 3);
    this.caps = new Map();       // cone → its slice of a sphere
    this.zTex = zTexture();
    this.zs = [];
    this.things = new Map();     // ringable id → { o, g, kick }
    this._up = new T.Vector3(0, 1, 0); this._d = new T.Vector3();
  }

  clear() {
    for (const v of this.things.values()) { this.group.remove(v.o); v.o.traverse((m) => m.isMesh && !m.geometry.userData.shared && m.geometry.dispose()); }
    this.things.clear();
  }

  // The dream's ringables, built where the sim has them.
  load(run) {
    this.clear();
    for (const g of run.ringables) {
      const o = make(MODELS[g.kind].build, { color: g.color, r: g.r, h: g.h, low: g.low });
      o.position.set(g.x, g.y, g.z);
      o.rotation.y = (g.x * 1.7 + g.z) % 6.28;
      this.group.add(o);
      this.things.set(g.id, { o, kick: 0 });
    }
  }

  cap(cone) {
    const k = Math.round(cone * 100) / 100;
    let g = this.caps.get(k);
    if (!g) { g = new T.SphereGeometry(1, 28, 6, 0, Math.PI * 2, 0, k); this.caps.set(k, g); }
    return g;
  }

  onEvent(e, run) {
    const fx = this.fx;
    if (e.type === "foeSleep") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], LULL, 10, 1.5, 0.05);
    } else if (e.type === "foeWake") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], 0xffffff, 8, 3, 0.04);
    } else if (e.type === "bellBat") {
      fx.ring([e.x, e.y, e.z], dirTo(run, e), RING, 0.6, 0.2);
      fx.burst([e.x, e.y, e.z], [0, 1, 0], RING, 8, 3, 0.04);
    } else if (e.type === "jellySquish") {
      const v = this.things.get(e.id);
      if (v) v.kick = Math.max(v.kick, 0.5);
    } else if (e.type === "jellyWobble" || e.type === "boing") {
      const v = this.things.get(e.id);
      if (v) v.kick = e.type === "boing" ? 1.6 : 1;
      fx.ring([e.x, e.y + 0.05, e.z], [0, 1, 0], e.type === "boing" ? 0xffffff : RING, 1.8, 0.35);
      if (e.type === "boing") fx.burst([e.x, e.y, e.z], [0, 1, 0], 0xffb0c0, 14, 4, 0.06);
    } else if (e.type === "souffleFall") {
      for (let i = 0; i < 6; i++) fx.puff(e.x + (Math.random() - 0.5) * 1.6, e.y + 0.6 + Math.random() * 1.4, e.z + (Math.random() - 0.5) * 1.6, 1.4);
    }
  }

  update(run, dt, t) {
    // Waves.
    let n = 0;
    for (const w of run.bell.waves) {
      if (n >= MAX_WAVES) break;
      const m = this.shells[n++], k = w.r / w.max;
      m.visible = true;
      m.position.set(w.x, w.y, w.z);
      m.scale.setScalar(Math.max(0.2, w.r));
      if (w.lull) {
        m.geometry = this.sphere;
        m.quaternion.identity();
        m.material.color.set(LULL).multiplyScalar(0.22 * (1 - k) + 0.03);
        // Notes drifting off the front.
        if (Math.random() < dt * 40) {
          const a = Math.random() * Math.PI * 2, u = Math.random() * 0.8 - 0.1, c = Math.sqrt(1 - u * u);
          this.fx.spark(w.x + Math.cos(a) * c * w.r, w.y + u * w.r, w.z + Math.sin(a) * c * w.r, 0, 1.2, 0, 0.8, 0.07, Math.random() < 0.5 ? LULL : 0xffffff, -0.5);
        }
      } else {
        m.geometry = this.cap(w.cone);
        m.quaternion.setFromUnitVectors(this._up, this._d.set(w.dx, w.dy, w.dz));
        m.material.color.set(RING).multiplyScalar(0.5 * (1 - k) ** 1.5 + 0.02);
      }
    }
    for (let i = n; i < MAX_WAVES; i++) this.shells[i].visible = false;

    // Sleepers: a Z or two rising off each; drowsy ones now and then a mote.
    let nz = 0;
    for (const f of run.foes) {
      if (!f.alive) continue;
      if (f.drowsyT > 0 && Math.random() < dt * 3) this.fx.spark(f.px, f.cy + f.def.hitR, f.pz, 0, 0.6, 0, 1, 0.06, LULL, -0.3);
      if (!(f.sleepT > 0)) continue;
      for (let j = 0; j < 2 && nz < MAX_Z; j++) {
        let s = this.zs[nz];
        if (!s) {
          s = new T.Sprite(new T.SpriteMaterial({ map: this.zTex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
          s.renderOrder = 10;
          this.group.add(s); this.zs.push(s);
        }
        const u = ((t * 0.55 + j * 0.5 + f.id * 0.37) % 1);
        const top = f.def.fly ? 0.3 : (f.def.h ?? 0.8);
        s.visible = true;
        s.position.set(f.px + Math.sin(u * 5 + f.id) * 0.18 + u * 0.3, f.py + top + 0.2 + u * 0.9, f.pz);
        const sz = 0.22 + u * 0.22;
        s.scale.set(sz, sz, 1);
        s.material.opacity = Math.min(1, u * 5) * (1 - u);
        s.material.rotation = -0.3 + Math.sin(u * 6) * 0.15;
        nz++;
      }
    }
    for (let i = nz; i < this.zs.length; i++) this.zs[i].visible = false;

    // Ringables.
    for (const g of run.ringables) {
      const v = this.things.get(g.id);
      if (!v) continue;
      const N = v.o.userData.nodes;
      if (g.kind === "jelly") {
        v.kick = Math.max(0, v.kick - dt * 1.2);
        const amp = Math.max(g.wobbleT > 0 ? 0.07 + 0.05 * (g.wobbleT / g.wobble) : 0.012, v.kick * 0.18);
        const s = Math.sin(t * (g.wobbleT > 0 ? 15 : 3) + g.x) * amp;
        N.body.scale.set(1 - s * 0.6, 1 + s, 1 - s * 0.6);
        N.body.rotation.z = Math.sin(t * 11 + g.z) * amp * 0.5;
      } else if (g.kind === "souffle") {
        const k = g.flat ? Math.min(1, g.t / 0.8) : 0, e = k * k * (3 - 2 * k);
        N.puff.scale.set(1 + e * 0.06, Math.max(0.02, 1 - e * 0.98) * (g.flat ? 1 : 1 + Math.sin(t * 1.3 + g.x) * 0.01), 1 + e * 0.06);
      }
    }
  }
}

// The way back from where an orb was batted, for its ring to face.
function dirTo(run, e) {
  const b = run.body, dx = e.x - b.x, dy = e.y - b.eyeY, dz = e.z - b.z, l = Math.hypot(dx, dy, dz) || 1;
  return [-dx / l, -dy / l, -dz / l];
}

// A fat lilac "Z" with a dark outline, drawn once.
function zTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const z = () => { g.beginPath(); g.moveTo(14, 14); g.lineTo(50, 14); g.lineTo(18, 50); g.lineTo(52, 50); };
  g.lineJoin = "round"; g.lineCap = "round";
  g.lineWidth = 16; g.strokeStyle = "#2a2050"; z(); g.stroke();
  g.lineWidth = 8; g.strokeStyle = "#d8ccff"; z(); g.stroke();
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
