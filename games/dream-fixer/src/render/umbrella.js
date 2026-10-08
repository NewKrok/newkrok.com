import * as T from "three";
import { make } from "./modelkit.js";
import { MODELS } from "./models/index.js";

// ── The umbrella's wind on screen ────────────────────────────────────────
// A gust is a fan of pale streaks racing out from the tip, a short way;
// an orb that the open umbrella stops pats into flecks.
// Updrafts are a faint mint column over their stone well with leaves and
// petals riding up it (thin and few while a pinwheel's draft is still);
// pinwheels turn as fast as the sim says.

const WIND = 0xe8fff0, MINT = 0xa8f0c0;
const LEAVES = [0xffd0e0, 0xffffff, 0x9ad06a, 0xf2c444, 0xe0805a];

export class UmbrellaView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.group = new T.Group();
    scene.add(this.group);
    this.wheels = new Map();     // pinwheel id → its object
    this.columns = [];           // { d, mesh }
  }

  clear() {
    this.group.traverse((m) => { if (m.isMesh && !m.geometry.userData.shared) m.geometry.dispose(); });
    this.group.clear();
    this.wheels.clear();
    this.columns.length = 0;
  }

  load(run) {
    this.clear();
    const U = run.umbrella;
    for (const w of U.wheels) {
      const o = make(MODELS.pinwheel.build, { h: w.h });
      o.position.set(w.x, w.y, w.z);
      o.rotation.y = w.yaw;
      this.group.add(o);
      this.wheels.set(w.id, o);
    }
    for (const d of U.drafts) {
      const well = make(MODELS.windWell.build, { r: d.r });
      well.position.set(d.x, d.y, d.z);
      this.group.add(well);
      // The column: an open tube, bright at its foot, gone at the top.
      const h = d.top - d.y + 1, g = new T.CylinderGeometry(d.r * 0.9, d.r * 0.75, h, 20, 6, true);
      const col = [], p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = (1 - (p.getY(i) + h / 2) / h) ** 2; col.push(k, k, k); }
      g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
      const mesh = new T.Mesh(g, new T.MeshBasicMaterial({ color: MINT, vertexColors: true, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide, fog: true }));
      mesh.position.set(d.x, d.y + h / 2, d.z);
      this.group.add(mesh);
      this.columns.push({ d, mesh });
    }
  }

  // The tip of the umbrella in the world (where a gust leaves from).
  onEvent(e, run, tip) {
    const fx = this.fx;
    if (e.type === "gust") {
      const [ax, ay, az] = e.dir, D = run.activeTool.def;
      for (let i = 0; i < 34; i++) {
        // A random direction inside the cone.
        const a = Math.random() * Math.PI * 2, c = Math.random() * D.cone;
        const [ux, uy, uz] = side(ax, ay, az);
        const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
        const sa = Math.sin(c), ca = Math.cos(c), s1 = Math.cos(a) * sa, s2 = Math.sin(a) * sa;
        const dx = ax * ca + ux * s1 + vx * s2, dy = ay * ca + uy * s1 + vy * s2, dz = az * ca + uz * s1 + vz * s2;
        const v = 12 + Math.random() * 10, life = D.range / v;
        fx.spark(tip[0], tip[1], tip[2], dx * v, dy * v, dz * v, life, 0.03 + Math.random() * 0.03, i % 3 ? WIND : MINT, 0);
      }
    } else if (e.type === "gustHop") {
      fx.puff(e.x, e.y + 0.1, e.z, 1);
      fx.ring([e.x, e.y + 0.05, e.z], [0, 1, 0], WIND, 1.6, 0.3);
    } else if (e.type === "umbrellaBlock") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], MINT, 10, 3, 0.045);
    } else if (e.type === "pinwheel") {
      fx.burst([e.x, e.y, e.z], [0, 0, 1], LEAVES[1], 10, 3, 0.05);
    }
  }

  update(run, dt, t) {
    const U = run.umbrella, b = run.body, fx = this.fx;
    for (const w of U.wheels) {
      const o = this.wheels.get(w.id);
      if (o) o.userData.nodes.wheel.rotation.z -= dt * (0.25 + w.speed * 16);
    }
    for (const { d, mesh } of this.columns) {
      mesh.material.opacity = 0.02 + 0.08 * d.k;
      mesh.rotation.y += dt * (0.2 + d.k);
      if ((d.x - b.x) ** 2 + (d.z - b.z) ** 2 > 45 * 45) continue;
      // Leaves riding up (a few lazy ones even while it is still).
      const rate = (d.k > 0.05 ? 26 * d.k : 1.5) * d.r;
      if (Math.random() < rate * dt) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * d.r * 0.85, v = 2 + 5 * d.k + Math.random() * 1.5;
        const life = Math.min(4, (d.top - d.y + 1) / v);
        fx.spark(d.x + Math.cos(a) * r, d.y + 0.3, d.z + Math.sin(a) * r, Math.sin(t + a) * 0.6, v, Math.cos(t + a) * 0.6, life, 0.05 + Math.random() * 0.05, LEAVES[(Math.random() * LEAVES.length) | 0], 0);
      }
    }
    // Riding one: streaks rushing past you.
    if (U.inDraft && Math.random() < dt * 30) {
      const a = Math.random() * Math.PI * 2;
      fx.spark(b.x + Math.cos(a) * 0.9, b.y - 0.5, b.z + Math.sin(a) * 0.9, 0, 9, 0, 0.35, 0.025, WIND, 0);
    }
  }
}

// Any unit vector square to (x, y, z).
function side(x, y, z) {
  const ux = Math.abs(y) < 0.9 ? -z : 0, uy = Math.abs(y) < 0.9 ? 0 : z, uz = Math.abs(y) < 0.9 ? x : -y;
  const l = Math.hypot(ux, uy, uz) || 1;
  return [ux / l, uy / l, uz / l];
}
