import * as T from "three";
import { Builder } from "./modelkit.js";
import { block } from "./levelview.js";

// ── Paving that falls away ───────────────────────────────────────────────
// The slabs a nightmare can drop (kit.tile), each its own mesh so it can
// move: while it is about to go it trembles and its edge glows warm; then
// it drops away (wind and leaves blowing up through the hole), and later
// floats back up into place.

export class TileView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.group = new T.Group();
    scene.add(this.group);
    this.views = new Map();
  }

  clear() {
    this.group.traverse((m) => { if (m.isMesh || m.isLineSegments) m.geometry.dispose(); });
    this.group.clear();
    this.views.clear();
  }

  load(run) {
    this.clear();
    for (const p of run.tiles) {
      const b = new Builder();
      block(b, { x: 0, z: 0, w: p.w, d: p.d, y0: p.y0, y1: p.y1, yaw: 0, look: p.look });
      const o = b.toObject3D();
      o.position.set(p.x, 0, p.z);
      const edge = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(p.w, 0.06, p.d)), new T.LineBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0, toneMapped: false }));
      edge.position.y = p.y1 + 0.04;
      o.add(edge);
      this.group.add(o);
      this.views.set(p.id, { o, edge });
    }
  }

  onEvent(e) {
    if (e.type === "tileDrop") {
      for (let i = 0; i < 6; i++) this.fx.puff(e.x + (Math.random() - 0.5) * 4, 0.2, e.z + (Math.random() - 0.5) * 4, 1.2);
    } else if (e.type === "tileBack") {
      this.fx.ring([e.x, 0.1, e.z], [0, 1, 0], 0xffd23a, 3, 0.4);
    }
  }

  update(run, dt, t) {
    for (const p of run.tiles) {
      const v = this.views.get(p.id);
      if (!v) continue;
      const warn = p.state === "warn";
      v.o.position.set(p.x + (warn ? Math.sin(t * 50 + p.x) * 0.04 : 0), p.dy + (warn ? Math.sin(t * 43 + p.z) * 0.03 : 0), p.z + (warn ? Math.cos(t * 47 + p.x) * 0.04 : 0));
      v.edge.material.opacity = warn ? 0.6 + Math.sin(t * 18) * 0.4 : 0;
      v.o.visible = p.dy > -13.5;
      if (p.state === "down" && Math.random() < dt * 14) this.fx.spark(p.x + (Math.random() - 0.5) * p.w, p.y1 - 1.5, p.z + (Math.random() - 0.5) * p.d, 0, 7, 0, 0.6, 0.05, Math.random() < 0.5 ? 0xa8f0c0 : 0xffffff, 0);
    }
  }
}
