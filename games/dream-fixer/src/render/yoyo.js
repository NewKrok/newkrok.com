import * as T from "three";
import { make } from "./modelkit.js";
import { MODELS } from "./models/index.js";

// ── The yo-yo on screen ──────────────────────────────────────────────────
// The yo-yo out on its string (spinning as it flies, round you while it
// circles), the string from your hand to it, a gold trail; star handles
// that turn slowly and light up when the view points at one in reach;
// stars circling a yanked glitch while it is dizzy.

const GOLD = 0xffe27a, STRING = 0xfff6e0;

export class YoyoView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.group = new T.Group();
    scene.add(this.group);
    this.hooks = new Map();      // hook id → { o, lit }
    this.ball = make(MODELS.yoyoBall.build, {}, { shadows: false });
    this.ball.visible = false;
    scene.add(this.ball);
    this.string = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 5, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.5),
      new T.MeshBasicMaterial({ color: STRING, toneMapped: false, fog: true }));
    this.string.visible = false;
    scene.add(this.string);
  }

  clear() {
    this.group.traverse((m) => { if (m.isMesh && !m.geometry.userData.shared) m.geometry.dispose(); });
    this.group.clear();
    this.hooks.clear();
  }

  load(run) {
    this.clear();
    for (const h of run.yoyo.hooks) {
      const o = make(MODELS.starHook.build);
      o.position.set(h.x, h.y, h.z);
      this.group.add(o);
      this.hooks.set(h.id, { o, lit: 0, a: Math.random() * 6 });
    }
  }

  onEvent(e) {
    const fx = this.fx;
    if (e.type === "yoyoHit" || e.type === "yoyoSpinHit") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], GOLD, e.type === "yoyoHit" ? 12 : 6, 4, 0.05);
      fx.ring([e.x, e.y, e.z], [0, 1, 0], GOLD, 0.4, 0.2);
    } else if (e.type === "yoyoClack") {
      fx.burst([e.x, e.y, e.z], e.n, 0xffffff, 6, 3, 0.035);
    } else if (e.type === "yoyoHook") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], GOLD, 16, 5, 0.06);
      fx.ring([e.x, e.y, e.z], [0, 0, 1], GOLD, 0.9, 0.3);
    } else if (e.type === "foeYank") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], GOLD, 8, 3, 0.045);
    }
  }

  // tip: where the string leaves your hand (the view model's muzzle).
  update(run, dt, t, tip) {
    const Y = run.yoyo, fx = this.fx;
    for (const h of Y.hooks) {
      const v = this.hooks.get(h.id);
      if (!v) continue;
      const on = Y.aimHook === h || Y.reeling?.hook === h;
      v.lit += ((on ? 1 : 0) - v.lit) * Math.min(1, dt * 12);
      // Turned to face you (rocking a little; a twirl when lit), so it
      // never shows its thin edge.
      v.a += dt * (1 + v.lit * 8);
      const N = v.o.userData.nodes, b = run.body;
      N.star.rotation.y = Math.atan2(b.x - h.x, b.z - h.z) + Math.sin(v.a) * 0.35;
      N.star.position.y = Math.sin(t * 1.3 + v.a * 0.1) * 0.08;
      v.o.scale.setScalar(1 + v.lit * 0.25 + (on ? Math.sin(t * 10) * 0.04 : 0));
      if (on && Math.random() < dt * 20) {
        const a = Math.random() * Math.PI * 2;
        fx.spark(h.x + Math.cos(a) * 0.55, h.y + Math.sin(a) * 0.55, h.z, Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0, 0.4, 0.035, GOLD, 0);
      }
    }
    // Where the yo-yo is: out on its string, or round you.
    const B = Y.ball, S = Y.spin;
    const at = B ? [B.x, B.y, B.z] : S ? [S.x, S.y, S.z] : null;
    this.ball.visible = this.string.visible = !!at;
    if (at) {
      this.ball.position.set(...at);
      this.ball.lookAt(tip[0], at[1], tip[2]);
      this.ball.userData.nodes.spin.rotation.x += dt * (B?.state === "hooked" ? 4 : 30);
      const ex = at[0] - tip[0], ey = at[1] - tip[1], ez = at[2] - tip[2], l = Math.hypot(ex, ey, ez);
      this.string.position.set(...tip);
      this.string.lookAt(at[0], at[1], at[2]);
      this.string.rotateY(Math.PI);
      this.string.scale.set(0.006, 0.006, l);
      if (Math.random() < dt * (S ? 50 : 30)) fx.spark(at[0], at[1], at[2], 0, 0.3, 0, 0.3, 0.035, GOLD, 0);
    }
    // Stars round a dizzy one.
    for (const f of run.foes) {
      if (!f.alive || !(f.yankT > 0) || f.yanking || Math.random() > dt * 14) continue;
      const a = t * 6 + Math.random() * 0.5, r = f.def.hitR + 0.15, y = f.cy + f.def.hitR + 0.25;
      fx.spark(f.px + Math.cos(a) * r, y, f.pz + Math.sin(a) * r, -Math.sin(a) * 1.5, 0, Math.cos(a) * 1.5, 0.35, 0.04, GOLD, 0);
    }
  }
}
