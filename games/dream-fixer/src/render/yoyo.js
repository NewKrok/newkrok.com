import * as T from "three";
import { make } from "./modelkit.js";
import { MODELS } from "./models/index.js";

// ── The yo-yo on screen ──────────────────────────────────────────────────
// The yo-yo out on its string (spinning as it flies), the string from
// your hand to it, a gold trail; star handles that turn to face you and
// light up when the view points at one in reach; stars circling a
// yanked glitch while it is dizzy. The lasso's string and trail are pale
// blue; a glitch it tied up wears loops of it.

const GOLD = 0xffe27a, STRING = 0xfff6e0, LASSO = 0x9fe0ff;
const LOOPS = 24;

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
    // Loops of string round the glitches the lasso tied up (three each).
    this.loops = new T.InstancedMesh(new T.TorusGeometry(1, 0.06, 4, 16), new T.MeshBasicMaterial({ color: LASSO, toneMapped: false, fog: true }), LOOPS);
    this.loops.count = 0;
    this.loops.frustumCulled = false;
    scene.add(this.loops);
    this._m = new T.Matrix4(); this._q = new T.Quaternion(); this._e = new T.Euler(); this._p = new T.Vector3(); this._s = new T.Vector3();
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
    if (e.type === "yoyoHit") {
      const c = e.lasso ? LASSO : GOLD;
      fx.burst([e.x, e.y, e.z], [0, 1, 0], c, 12, 4, 0.05);
      fx.ring([e.x, e.y, e.z], [0, 1, 0], c, 0.4, 0.2);
    } else if (e.type === "foeTied" || e.type === "foeFree") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], LASSO, e.type === "foeTied" ? 14 : 8, 3, 0.04);
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
    // Where the yo-yo is, out on its string.
    const B = Y.ball;
    const at = B ? [B.x, B.y, B.z] : null;
    this.ball.visible = this.string.visible = !!at;
    if (at) {
      this.ball.position.set(...at);
      this.ball.lookAt(tip[0], at[1], tip[2]);
      this.ball.userData.nodes.spin.rotation.x += dt * (B.state === "hooked" ? 4 : 30);
      const ex = at[0] - tip[0], ey = at[1] - tip[1], ez = at[2] - tip[2], l = Math.hypot(ex, ey, ez);
      this.string.position.set(...tip);
      this.string.lookAt(at[0], at[1], at[2]);
      this.string.rotateY(Math.PI);
      this.string.scale.set(B.lasso ? 0.009 : 0.006, B.lasso ? 0.009 : 0.006, l);
      this.string.material.color.setHex(B.lasso ? LASSO : STRING);
      if (Math.random() < dt * 30) fx.spark(at[0], at[1], at[2], 0, 0.3, 0, 0.3, 0.035, B.lasso ? LASSO : GOLD, 0);
    }
    // Loops round the tied-up ones, slipping loose as time runs out.
    let n = 0;
    for (const f of run.foes) {
      if (!f.alive || !(f.tieT > 0)) continue;
      const R = f.def.hitR * 1.05, h = f.def.fly ? R : Math.max(R, (f.def.h ?? 1) * 0.5);
      const loose = f.tieT < 0.6 ? 1 + (0.6 - f.tieT) * 0.8 : 1;
      for (let i = 0; i < 3 && n < LOOPS; i++) {
        this._p.set(f.px, f.cy + (i - 1) * h * 0.45, f.pz);
        this._q.setFromEuler(this._e.set(Math.PI / 2 + Math.sin(t * 3 + i * 2 + f.id) * 0.15, 0, (i - 1) * 0.25));
        this._s.setScalar(R * loose * (1 - Math.abs(i - 1) * 0.12));
        this.loops.setMatrixAt(n++, this._m.compose(this._p, this._q, this._s));
      }
    }
    this.loops.count = n;
    this.loops.instanceMatrix.needsUpdate = true;
    // Stars round a dizzy one.
    for (const f of run.foes) {
      if (!f.alive || !(f.yankT > 0) || f.yanking || Math.random() > dt * 14) continue;
      const a = t * 6 + Math.random() * 0.5, r = f.def.hitR + 0.15, y = f.cy + f.def.hitR + 0.25;
      fx.spark(f.px + Math.cos(a) * r, y, f.pz + Math.sin(a) * r, -Math.sin(a) * 1.5, 0, Math.cos(a) * 1.5, 0.35, 0.04, GOLD, 0);
    }
  }
}
