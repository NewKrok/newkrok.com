import * as T from "three";
import { make } from "./modelkit.js";
import { kocPark, buzzerPark, knotPark } from "./models/characters.js";
import { C } from "./palette.js";
import { lerp } from "../config.js";

// ── Glitches on screen ───────────────────────────────────────────────────
// One model per glitch (pooled by kind), animated from its sim state:
// the fuzz hops and squashes, winds up and stretches into a lunge; the
// buzzer's wings blur and its mouth swells before it spits; the knot's
// heart throbs. Every hit flashes the model white for a moment. Orbs and
// dream dust are instanced.

const SKINS = { fuzz: kocPark, buzzer: buzzerPark, knot: knotPark };
const FLASH = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const POP_COLORS = { fuzz: [0xe8a060, 0xc8743a, C.dream, 0xffffff], buzzer: [0xf2c14e, 0x5a3620, C.dream, 0xffffff], knot: [0xe8a060, C.dreamPink, C.dream, 0xffffff] };

export class FoeView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.live = new Map();        // foe id → { o, kind, meshes }
    this.pool = { fuzz: [], buzzer: [], knot: [] };
    this.group = new T.Group();
    scene.add(this.group);

    const orbGeo = new T.IcosahedronGeometry(0.2, 1);
    this.orbs = new T.InstancedMesh(orbGeo, new T.MeshBasicMaterial({ toneMapped: false }), 64);
    this.orbs.instanceColor = new T.InstancedBufferAttribute(new Float32Array(64 * 3), 3);
    this.orbs.frustumCulled = false; this.orbs.count = 0;
    this.motes = new T.InstancedMesh(new T.OctahedronGeometry(0.09, 0), new T.MeshBasicMaterial({ toneMapped: false }), 256);
    this.motes.instanceColor = new T.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    this.motes.frustumCulled = false; this.motes.count = 0;
    // What the vacuum shoots: a caught glitch rolled into a tight ball.
    this.yarn = new T.InstancedMesh(new T.IcosahedronGeometry(0.28, 1), new T.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), 16);
    this.yarn.instanceColor = new T.InstancedBufferAttribute(new Float32Array(16 * 3), 3);
    this.yarn.frustumCulled = false; this.yarn.count = 0; this.yarn.castShadow = true;
    scene.add(this.orbs, this.motes, this.yarn);
    this._m = new T.Matrix4(); this._q = new T.Quaternion(); this._p = new T.Vector3(); this._s = new T.Vector3(); this._c = new T.Color(); this._e = new T.Euler();
  }

  clear() {
    for (const [, v] of this.live) this.release(v);
    this.live.clear();
  }

  obtain(kind) {
    const v = this.pool[kind].pop();
    if (v) { v.o.visible = true; return v; }
    const o = make(SKINS[kind]);
    const meshes = [];
    o.traverse((m) => { if (m.isMesh) { meshes.push(m); m.userData.mat = m.material; } });
    this.group.add(o);
    return { o, kind, meshes, flashing: false };
  }

  release(v) { v.o.visible = false; this.pool[v.kind].push(v); }

  onEvent(e) {
    if (e.type === "pop") {
      const cols = POP_COLORS[e.kind];
      const n = e.big ? 40 : 18;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), v = (e.big ? 7 : 5) * (0.4 + Math.random());
        this.fx.spark(e.x, e.y, e.z, Math.cos(a) * s * v, u * v + 2, Math.sin(a) * s * v, 0.5 + Math.random() * 0.5, 0.06 + Math.random() * 0.07, cols[i % cols.length], 7);
      }
      this.fx.ring([e.x, e.y, e.z], [0, 1, 0], C.dream, e.big ? 2.2 : 1.1, 0.35);
      this.fx.puff(e.x, e.y, e.z, e.big ? 1.3 : 0.65);
    } else if (e.type === "spitPop") {
      this.fx.burst([e.x, e.y, e.z], [0, 1, 0], C.dreamPink, 12, 3, 0.05);
    }
  }

  // Sync with the sim; alpha interpolates between the last two steps.
  update(run, alpha, dt, t) {
    const seen = new Set();
    for (const f of run.foes) {
      if (!f.alive) continue;
      seen.add(f.id);
      let v = this.live.get(f.id);
      if (!v) { v = this.obtain(f.kind); this.live.set(f.id, v); }
      const o = v.o, N = o.userData.nodes;
      o.position.set(lerp(f.lx ?? f.px, f.px, alpha), lerp(f.ly ?? f.py, f.py, alpha), lerp(f.lz ?? f.pz, f.pz, alpha));
      // Turn smoothly towards where the sim faces.
      let d = f.yaw - o.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      o.rotation.y += d * Math.min(1, dt * 12);
      // Pop in when spawned.
      const grow = f.state === "spawn" ? easeOutBack(Math.min(1, f.t / 0.5)) : 1;
      if (f.kind === "fuzz") animFuzz(f, N, t, grow);
      else if (f.kind === "buzzer") animBuzzer(f, N, t, grow);
      else animKnot(f, N, t, grow);
      // Hit flash.
      const flash = f.flash > 0.55;
      if (flash !== v.flashing) {
        for (const m of v.meshes) m.material = flash ? FLASH : m.userData.mat;
        v.flashing = flash;
      }
    }
    for (const [id, v] of this.live) if (!seen.has(id)) { this.release(v); this.live.delete(id); }

    // Orbs: pink, wobbling, trailing sparks.
    const { _m, _q, _p, _s, _c } = this;
    let i = 0;
    for (const s of run.spits) {
      const w = 1 + Math.sin(t * 30 + s.id) * 0.15;
      _p.set(s.x, s.y, s.z); _q.identity(); _s.setScalar(w);
      this.orbs.setMatrixAt(i, _m.compose(_p, _q, _s));
      this.orbs.setColorAt(i, _c.set(C.dreamPink).multiplyScalar(2.2));
      if (Math.random() < 0.5) this.fx.spark(s.x, s.y, s.z, (Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5), 0.3, 0.05, C.dreamPink, 0);
      i++;
    }
    this.orbs.count = i;
    this.orbs.instanceMatrix.needsUpdate = true; this.orbs.instanceColor.needsUpdate = true;
    i = 0;
    for (const g of run.balls) {
      _p.set(g.x, g.y, g.z);
      _q.setFromEuler(this._e.set(t * 12 + g.id, t * 7, 0));
      _s.setScalar(1);
      this.yarn.setMatrixAt(i, _m.compose(_p, _q, _s));
      this.yarn.setColorAt(i, _c.set(g.kind === "buzzer" ? 0xf2c14e : 0xd88a48));
      if (Math.random() < 0.6) this.fx.spark(g.x, g.y, g.z, 0, 0.3, 0, 0.3, 0.04, C.dreamGold, 0);
      i++;
    }
    this.yarn.count = i;
    this.yarn.instanceMatrix.needsUpdate = true; this.yarn.instanceColor.needsUpdate = true;
    // Dream dust: gold flecks spinning.
    i = 0;
    for (const m of run.dustMotes) {
      if (i >= 256) break;
      _p.set(m.x, m.y + Math.sin(t * 3 + m.id) * 0.04, m.z);
      _q.setFromEuler(this._e.set(t * 2 + m.id, t * 3 + m.id, 0));
      _s.setScalar(1);
      this.motes.setMatrixAt(i, _m.compose(_p, _q, _s));
      this.motes.setColorAt(i, _c.set(m.id % 3 ? C.dreamGold : C.dream).multiplyScalar(1.8 + Math.sin(t * 8 + m.id) * 0.4));
      i++;
    }
    this.motes.count = i;
    this.motes.instanceMatrix.needsUpdate = true; this.motes.instanceColor.needsUpdate = true;
  }
}

function easeOutBack(x) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; }

function animFuzz(f, N, t, grow) {
  const b = f.body, sp = b.speed2D;
  let sy, sxz = 1, hop = 0, lean = 0;
  if (f.state === "windup") { const k = Math.min(1, f.t / 0.5); sy = 1 - 0.3 * k; sxz = 1 + 0.2 * k; lean = -0.25 * k; }
  else if (f.state === "lunge") { sy = 1.2; sxz = 0.88; lean = 0.5; }
  else if (f.state === "stun") { sy = 0.85 + Math.sin(f.t * 40) * 0.08; sxz = 1.1; }
  else if (b.grounded && sp > 0.5) {
    // Hop along: the body bounces, squashing on each landing.
    const ph = (f.age * 7 + f.phase) % Math.PI;
    hop = Math.sin(ph) * 0.18;
    const land = 1 - Math.min(1, Math.sin(ph) * 3);
    sy = 1 - land * 0.12; sxz = 1 + land * 0.08;
  } else {
    sy = 1 + Math.sin(t * 2 + f.phase) * 0.03;
  }
  N.body.position.y = 0.36 + hop;
  N.body.scale.set(sxz * grow, sy * grow, sxz * grow);
  N.body.rotation.x = lean;
  N.tail.position.y = 0.3 + hop * 0.8;
  N.tail.rotation.x = Math.sin(f.age * 7 + f.phase) * 0.25 - lean * 0.5;
  N.tail.scale.setScalar(grow);
}

function animBuzzer(f, N, t, grow) {
  const flap = Math.sin(t * 70 + f.phase) * 0.6;
  N.wingL.rotation.z = flap; N.wingR.rotation.z = -flap;
  N.body.position.y = Math.sin(t * 3 + f.phase) * 0.05;
  N.body.rotation.x = f.state === "windup" ? -0.2 : Math.sin(t * 1.3 + f.phase) * 0.08;
  const m = f.state === "windup" ? 1 + Math.min(1, f.t / 0.6) * 1.2 : 1;
  N.mouth.scale.setScalar(m);
  N.body.scale.setScalar(grow);
  N.wingL.scale.setScalar(grow); N.wingR.scale.setScalar(grow);
}

function animKnot(f, N, t, grow) {
  const p = f.pulse;
  const s = 1 + Math.sin(t * 3 + f.phase) * 0.07 + p * 0.5;
  N.core.scale.setScalar(s * grow);
  N.heap.scale.set(grow * (1 + p * 0.08), grow * (1 - p * 0.06), grow * (1 + p * 0.08));
}
