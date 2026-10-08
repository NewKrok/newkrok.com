import * as T from "three";
import { rng } from "../rng.js";
import { lerp } from "../config.js";

// ── Foam on screen ───────────────────────────────────────────────────────
// All of it is one kind of puff, instanced: the globs in flight (leaving
// the nozzle, they ease over from where it really is), the steps a blob
// set into (a cluster of puffs that pops up, breathes, and blinks blue
// before it melts), and the foam on a soaked glitch (more of it the
// wetter it is, the whole coat when it is stuck).

const MAX = 420;
const WHITE = new T.Color(0xdde8f2), BLUE = new T.Color(0x8fd4f5);
const LEAD = 0.14;             // seconds a new glob takes to drift from the nozzle onto its path
const COAT = 7;                // puffs on a soaked glitch

export class FoamView {
  constructor(scene, fx) {
    this.fx = fx;
    const mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, flatShading: true, emissive: 0x0c141c });
    this.mesh = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), mat, MAX);
    this.mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.steps = new Map();      // step id → its puffs [[dx, dy, dz, s], …]
    this.leads = new Map();      // glob id → { off: [x, y, z], t }
    this._m = new T.Matrix4(); this._q = new T.Quaternion(); this._p = new T.Vector3(); this._s = new T.Vector3(); this._c = new T.Color(); this._e = new T.Euler();
  }

  clear() { this.steps.clear(); this.leads.clear(); this.mesh.count = 0; }

  onEvent(e) {
    const fx = this.fx;
    if (e.type === "foamSplat") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], 0xffffff, e.big ? 22 : 6, e.big ? 4 : 2.5, e.big ? 0.07 : 0.04);
      if (e.big) fx.puff(e.x, e.y, e.z, 0.9);
    } else if (e.type === "foamSet") {
      fx.puff(e.x, e.y - 0.3, e.z, 1.2);
      fx.ring([e.x, e.y + 0.02, e.z], [0, 1, 0], 0xbfe8ff, e.r * 1.3, 0.35);
    } else if (e.type === "foamGone") {
      for (let i = 0; i < 4; i++) fx.puff(e.x + (Math.random() - 0.5) * e.r, e.y - 0.4, e.z + (Math.random() - 0.5) * e.r, 0.8);
      fx.burst([e.x, e.y - 0.3, e.z], [0, 1, 0], 0xffffff, 16, 3, 0.05);
      this.steps.delete(e.id);
    } else if (e.type === "foamStuck") {
      fx.puff(e.x, e.y, e.z, 0.7);
    } else if (e.type === "foamFree") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], 0xffffff, 10, 3, 0.05);
    }
  }

  // muzzle: where the nozzle is in the world now (new globs start there).
  update(run, alpha, dt, t, muzzle) {
    const F = run.foam;
    let i = 0;
    const put = (x, y, z, s, sy, color) => {
      if (i >= MAX) return;
      this._p.set(x, y, z);
      this._q.setFromEuler(this._e.set(0, (x * 3.1 + z * 1.7) % 6.28, 0));
      this._s.set(s, s * sy, s);
      this.mesh.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
      this.mesh.setColorAt(i, color);
      i++;
    };

    // Globs in flight.
    const seen = new Set();
    for (const g of F.globs) {
      seen.add(g.id);
      let L = this.leads.get(g.id);
      if (!L) { L = { off: [muzzle[0] - g.x, muzzle[1] - g.y, muzzle[2] - g.z], t: 0 }; this.leads.set(g.id, L); }
      L.t += dt;
      const k = Math.max(0, 1 - L.t / LEAD);
      const x = lerp(g.lx ?? g.x, g.x, alpha) + L.off[0] * k, y = lerp(g.ly ?? g.y, g.y, alpha) + L.off[1] * k, z = lerp(g.lz ?? g.z, g.z, alpha) + L.off[2] * k;
      const grow = Math.min(1, 0.4 + L.t * 6);
      const wob = 1 + Math.sin(t * 20 + g.id) * 0.08;
      put(x, y, z, g.r * grow * wob, 1 / wob, WHITE);
      if (g.big && Math.random() < dt * 20) this.fx.spark(x, y, z, 0, -0.5, 0, 0.4, 0.06, 0xffffff, 3);
    }
    for (const id of this.leads.keys()) if (!seen.has(id)) this.leads.delete(id);

    // Steps: pop up, breathe, blink before they go.
    for (const p of F.steps) {
      let puffs = this.steps.get(p.id);
      if (!puffs) { puffs = layout(p); this.steps.set(p.id, puffs); }
      const grow = backOut(Math.min(1, p.t / 0.3));
      const left = p.life - p.t;
      const blink = left < p.warn ? (Math.sin(t * (8 + (p.warn - left) * 6)) > 0 ? 1 : 0) : 0;
      const sag = left < 1 ? left : 1;
      const col = this._c.copy(WHITE).lerp(BLUE, blink * 0.7);
      for (const [dx, dy, dz, s, ph] of puffs) {
        const breathe = 1 + Math.sin(t * 2.2 + ph) * 0.03;
        put(p.x + dx, p.y1 + dy * (0.6 + 0.4 * sag), p.z + dz, s * grow * breathe * (0.75 + 0.25 * sag), 1, col);
      }
    }

    // Soaked glitches.
    for (const f of run.foes) {
      if (!f.alive || !(f.foam > 0.02 || f.stuckT > 0)) continue;
      const wet = f.stuckT > 0 ? 1 : Math.min(1, f.foam), R = f.def.hitR;
      const x = lerp(f.lx ?? f.px, f.px, alpha), y = lerp(f.ly ?? f.py, f.py, alpha) + f.def.hitY, z = lerp(f.lz ?? f.pz, f.pz, alpha);
      const n = Math.ceil(COAT * wet);
      for (let k = 0; k < n; k++) {
        const a = k * 2.4 + f.id, u = ((k * 0.37 + f.id * 0.13) % 1) * 1.6 - 0.8;
        const c = Math.sqrt(1 - u * u);
        const s = R * (0.32 + 0.28 * wet) * (1 + Math.sin(t * 3 + k) * 0.06);
        put(x + Math.cos(a) * c * R * 0.85, y + u * R * 0.85, z + Math.sin(a) * c * R * 0.85, s, 1, WHITE);
      }
    }

    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// A step's puffs, filling its round shape with the top at y1: a ring round
// the edge, a fat one in the middle, a few small ones on top.
function layout(p) {
  const rnd = rng(p.id * 7 + 3);
  const H = p.wall ? p.y1 - p.y0 : p.y1 - p.y0 - 0.3;
  const r = p.r, out = [];
  const s = Math.min(r * 0.5, H * 0.58);
  const ring = 7;
  for (let k = 0; k < ring; k++) {
    const a = (k / ring) * Math.PI * 2 + rnd() * 0.4, d = r - s * 0.8;
    out.push([Math.cos(a) * d, -H / 2 + s * 0.05, Math.sin(a) * d, s * (0.9 + rnd() * 0.2), rnd() * 6]);
  }
  out.push([0, -H / 2 + 0.05, 0, Math.min(r * 0.65, H * 0.62), 0]);
  for (let k = 0; k < 3; k++) {
    const a = rnd() * Math.PI * 2, d = rnd() * r * 0.5;
    out.push([Math.cos(a) * d, -s * 0.35, Math.sin(a) * d, s * 0.55, rnd() * 6]);
  }
  return out;
}

const backOut = (x) => { const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
