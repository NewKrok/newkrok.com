import * as T from "three";
import { make } from "./modelkit.js";
import { MODELS } from "./models/index.js";

// ── Old Hum's works on screen ────────────────────────────────────────────
// The locks Cog opens (kit.gate): the panel lamp is red while shut and
// blinks while he works it, then the shutters slide apart and the lamp
// goes mint. And the parts of the works that keep turning (kit.spinner):
// gears as big as rooms, turning slowly the whole time.

const SLIDE = 1.1;             // seconds the shutters take to slide open
const RED = new T.Color(0xff5a4a), MINT = new T.Color(0x7ff5e0), AMBER = new T.Color(0xffc040);

export class WorksView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.group = new T.Group();
    scene.add(this.group);
    this.gates = new Map();
    this.spinners = [];
  }

  clear() {
    this.group.traverse((m) => { if (m.isMesh && !m.geometry.userData.shared) m.geometry.dispose(); });
    this.group.clear();
    this.gates.clear();
    this.spinners = [];
  }

  load(run) {
    this.clear();
    for (const g of run.gates) {
      const o = make(MODELS.lockGate.build, { w: g.w, h: g.h });
      o.position.set(g.x, g.y, g.z);
      o.rotation.y = g.yaw;
      // The lamp gets its own material, to change colour.
      const lamp = o.userData.nodes.lamp, mat = new T.MeshBasicMaterial({ color: RED.clone(), toneMapped: false });
      lamp.traverse((m) => { if (m.isMesh) m.material = mat; });
      this.group.add(o);
      this.gates.set(g.id, { o, mat, w: g.w, k: g.open ? 1 : 0 });
    }
    for (const s of run.kit.spinners ?? []) {
      const o = make(MODELS[s.model].build, s.opts);
      o.position.set(s.x, s.y, s.z);
      o.rotation.set(s.rx ?? 0, s.yaw ?? 0, 0);
      this.group.add(o);
      this.spinners.push({ node: o.userData.nodes.spin, speed: s.speed });
    }
  }

  onEvent(e) {
    if (e.type === "gateWork") this.fx.burst([e.x, e.y, e.z], [0, 1, 0], 0x7ff5e0, 10, 2.5, 0.04);
    else if (e.type === "gateOpen") {
      this.fx.puff(e.x, e.y + 0.5, e.z, 1.4);
      this.fx.burst([e.x, e.y + 2, e.z], [0, 1, 0], 0xffd27a, 24, 4, 0.05);
    }
  }

  update(run, dt, t) {
    for (const g of run.gates) {
      const v = this.gates.get(g.id);
      if (!v) continue;
      if (g.open) v.k = Math.min(1, v.k + dt / SLIDE);
      const e = v.k * v.k * (3 - 2 * v.k), N = v.o.userData.nodes, off = v.w / 4 + e * (v.w / 2 + 0.1);
      N.left.position.x = -off; N.right.position.x = off;
      // The shutters slip behind the posts (they are only drawn so far).
      N.left.visible = N.right.visible = e < 0.98;
      if (g.open) v.mat.color.copy(MINT);
      else if (g.called) v.mat.color.copy(Math.sin(t * 14) > 0 ? AMBER : RED);
      else v.mat.color.copy(RED);
    }
    for (const s of this.spinners) if (s.node) s.node.rotation.y += dt * s.speed;
  }
}
