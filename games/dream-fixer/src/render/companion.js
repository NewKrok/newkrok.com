import * as T from "three";
import { make } from "./modelkit.js";
import { csavar } from "./models/characters.js";
import { memoryBubble } from "./models/dream.js";
import { C } from "./palette.js";
import { damp } from "../config.js";

// ── Csavar, and the memories ─────────────────────────────────────────────
// Csavar hovers just ahead and to your left, bobbing, turning his big eye
// towards whatever matters (a broken anchor, the nearest glitch), and
// blinking his antenna when he talks. Memories float in soap bubbles.

export class Companion {
  constructor(scene) {
    this.o = make(csavar);
    this.o.scale.setScalar(0.9);
    scene.add(this.o);
    this.pos = new T.Vector3(); this.vel = new T.Vector3();
    this.placed = false;
    this.look = 0;
    this.light = new T.PointLight(0x7ff5e0, 1.2, 4, 2);
    this.o.add(this.light);
  }

  update(run, dt, t, talking) {
    const b = run.body, N = this.o.userData.nodes;
    const sn = Math.sin(b.yaw), cs = Math.cos(b.yaw);
    // Ahead-left of you, at shoulder height.
    const tx = b.x - sn * 1.6 - cs * 1.1, tz = b.z - cs * 1.6 + sn * 1.1;
    const ty = b.y + 1.9 + Math.sin(t * 1.3) * 0.12;
    if (!this.placed) { this.pos.set(tx, ty, tz); this.placed = true; }
    this.pos.x = damp(this.pos.x, tx, 3, dt); this.pos.y = damp(this.pos.y, ty, 3, dt); this.pos.z = damp(this.pos.z, tz, 3, dt);
    this.o.position.copy(this.pos);
    // Look at what matters, else at you.
    let fx = b.x, fz = b.z;
    const foe = run.foes.find((f) => f.alive && Math.hypot(f.px - b.x, f.pz - b.z) < 12);
    const anchor = run.anchors.find((a) => a.state !== "fixed");
    if (foe) { fx = foe.px; fz = foe.pz; } else if (anchor) { fx = anchor.x; fz = anchor.z; }
    const want = Math.atan2(-(fx - this.pos.x), -(fz - this.pos.z));
    let d = want - this.o.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.o.rotation.y += d * Math.min(1, dt * 4);
    N.prop.rotation.y += dt * 22;
    N.body.rotation.z = Math.sin(t * 1.7) * 0.08 - d * 0.3;
    N.armL.rotation.z = 0.4 + Math.sin(t * 3) * 0.15 + (talking ? Math.sin(t * 14) * 0.3 : 0);
    N.armR.rotation.z = -0.4 - Math.sin(t * 3 + 1) * 0.15;
    N.eye.rotation.y = Math.sin(t * 0.9) * 0.15;
    this.light.intensity = talking ? 1.6 + Math.sin(t * 20) * 0.6 : 0.9;
  }
}

export class MemoryView {
  constructor(group, memories) {
    this.items = memories.map((m) => {
      const o = make(memoryBubble, { item: m.id });
      o.position.set(m.x, m.y, m.z);
      o.visible = !m.got;
      group.add(o);
      return { m, o, gone: m.got ? 1 : 0 };
    });
  }
  update(dt, t, fx) {
    for (const it of this.items) {
      const N = it.o.userData.nodes;
      if (it.m.got) {
        it.gone = Math.min(1, it.gone + dt * 3);
        it.o.scale.setScalar(1 + it.gone * 0.6);
        if (it.gone >= 1) it.o.visible = false;
        continue;
      }
      N.bubble.position.y = N.item.position.y = 1.2 + Math.sin(t * 1.5 + it.m.x) * 0.12;
      N.bubble.scale.set(1 + Math.sin(t * 3) * 0.03, 1 - Math.sin(t * 3) * 0.03, 1);
      N.item.rotation.y = t * 0.8;
      if (Math.random() < dt * 3) fx.spark(it.m.x + (Math.random() - 0.5) * 0.8, it.m.y + 1.2 + (Math.random() - 0.5) * 0.8, it.m.z + (Math.random() - 0.5) * 0.8, 0, 0.3, 0, 0.8, 0.04, C.dreamGold, -0.2);
    }
  }
}
