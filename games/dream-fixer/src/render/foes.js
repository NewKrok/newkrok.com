import * as T from "three";
import { make } from "./modelkit.js";
import { MODELS } from "./models/index.js";
import { C } from "./palette.js";
import { lerp } from "../config.js";

// ── Glitches on screen ───────────────────────────────────────────────────
// One model per glitch (pooled by kind), animated from its sim state:
// the fuzz hops and squashes, winds up and stretches into a lunge; the
// buzzer's wings blur and its mouth swells before it spits; the knot's
// heart throbs. Every hit flashes the model white for a moment. Orbs and
// dream dust are instanced.

// The looks a dream gives each kind (model ids), unless its level says
// otherwise. A skin keeps the nodes its kind's animation moves.
const SKINS = { fuzz: "koc", buzzer: "buzzer", knot: "knot", bunny: "bunny", tub: "tub", clock: "clock", pencil: "pencil", backpack: "backpack", sharpener: "sharpener" };
const FLASH = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const POP_COLORS = { bunny: [0xc4c0cc, 0x7a7684, C.dream, 0xffffff], tub: [0xffffff, 0x8fd0f0, C.dream, 0xffd23a], fuzz: [0xe8a060, 0xc8743a, C.dream, 0xffffff], buzzer: [0xf2c14e, 0x5a3620, C.dream, 0xffffff], knot: [0xe8a060, C.dreamPink, C.dream, 0xffffff], pillow: [0xffffff, 0xf4eaff, 0xd8c8ff, C.dreamPink],
  clock: [0xe8423a, 0xfaf6e8, C.brass, C.dream], pencil: [0xffd040, 0xe8c898, 0xf07890, C.dream], backpack: [0xd84a48, 0x2a3a6a, 0xffd23a, C.dream], sharpener: [0xb8c2cc, 0xe8c898, C.dreamPink, C.dream] };
// What school glitches throw: [size x, y, z, colour] for a tumbling chunk.
const CHUNKS = { hand: [0.06, 0.4, 0.04, 0x2a2440], book: [0.42, 0.1, 0.32, 0x3a7fae], shaving: [0.16, 0.03, 0.1, 0xe8c898], eraser: [0.26, 0.14, 0.16, 0xf07890], grade: [0.34, 0.42, 0.06, 0xe02a30] };
const BOOKS = [0xd84a48, 0x3a7fae, 0x2a8a3a, 0xe0a020, 0x7a4aa0];

export class FoeView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.live = new Map();        // foe id → { o, kind, meshes }
    this.skins = SKINS;
    this.pool = {};
    this.group = new T.Group();
    scene.add(this.group);

    const orbGeo = new T.IcosahedronGeometry(0.2, 1);
    this.orbs = new T.InstancedMesh(orbGeo, new T.MeshBasicMaterial({ toneMapped: false }), 64);
    this.orbs.instanceColor = new T.InstancedBufferAttribute(new Float32Array(64 * 3), 3);
    this.orbs.frustumCulled = false; this.orbs.count = 0;
    this.motes = new T.InstancedMesh(new T.OctahedronGeometry(0.13, 0), new T.MeshBasicMaterial({ toneMapped: false }), 256);
    // A soft glow round each fleck (points with a radial fade), so it reads
    // from afar.
    const hg = new T.BufferGeometry();
    hg.setAttribute("position", new T.BufferAttribute(new Float32Array(256 * 3), 3));
    hg.setAttribute("color", new T.BufferAttribute(new Float32Array(256 * 3), 3));
    this.halos = new T.Points(hg, new T.PointsMaterial({ map: glowTexture(), size: 0.5, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    this.halos.frustumCulled = false;
    scene.add(this.halos);
    this.motes.instanceColor = new T.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    this.motes.frustumCulled = false; this.motes.count = 0;
    // What the vacuum shoots: a caught glitch rolled into a tight ball.
    this.yarn = new T.InstancedMesh(new T.IcosahedronGeometry(0.28, 1), new T.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), 16);
    this.yarn.instanceColor = new T.InstancedBufferAttribute(new Float32Array(16 * 3), 3);
    this.yarn.frustumCulled = false; this.yarn.count = 0; this.yarn.castShadow = true;
    this.marks = new T.InstancedMesh(new T.RingGeometry(0.8, 1, 32), new T.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, side: T.DoubleSide }), 28);
    this.marks.instanceColor = new T.InstancedBufferAttribute(new Float32Array(16 * 3), 3);
    this.marks.frustumCulled = false; this.marks.count = 0;
    // Nuts the squirrels throw: a brown kernel under a darker cap, spinning.
    const NUTS = 24;
    const nutMat = new T.MeshStandardMaterial({ roughness: 0.55, flatShading: true });
    this.nuts = new T.InstancedMesh(new T.IcosahedronGeometry(0.16, 1).scale(1, 1.25, 1).translate(0, -0.04, 0), nutMat, NUTS);
    this.caps = new T.InstancedMesh(new T.SphereGeometry(0.165, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.7, 1.05).translate(0, 0.05, 0), nutMat, NUTS);
    for (const m of [this.nuts, this.caps]) {
      m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(NUTS * 3), 3);
      for (let i = 0; i < NUTS; i++) m.setColorAt(i, new T.Color(m === this.nuts ? 0xc9883e : 0x5e3a1e));
      m.frustumCulled = false; m.count = 0; m.castShadow = true;
    }
    // Dream drops (a heal): a glowing pink heart, spinning.
    const heart = new T.Shape();
    heart.moveTo(0, -0.16);
    heart.bezierCurveTo(-0.05, -0.1, -0.2, -0.02, -0.2, 0.07);
    heart.bezierCurveTo(-0.2, 0.17, -0.07, 0.2, 0, 0.11);
    heart.bezierCurveTo(0.07, 0.2, 0.2, 0.17, 0.2, 0.07);
    heart.bezierCurveTo(0.2, -0.02, 0.05, -0.1, 0, -0.16);
    const heartGeo = new T.ExtrudeGeometry(heart, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.03, bevelSegments: 4, curveSegments: 10 }).translate(0, 0, -0.03);
    this.hearts = new T.InstancedMesh(heartGeo, new T.MeshBasicMaterial({ toneMapped: false }), 24);
    this.hearts.instanceColor = new T.InstancedBufferAttribute(new Float32Array(24 * 3), 3);
    this.hearts.frustumCulled = false; this.hearts.count = 0;
    scene.add(this.hearts);
    // The "!" over a glitch that has just spotted you.
    this.bangTex = bangTexture();
    this.bangs = [];
    this._x = new T.Vector3(1, 0, 0);
    // Books, shavings, bits of eraser and red grades in flight.
    this.chunks = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), 48);
    this.chunks.instanceColor = new T.InstancedBufferAttribute(new Float32Array(48 * 3), 3);
    this.chunks.frustumCulled = false; this.chunks.count = 0; this.chunks.castShadow = true;
    // An alarm clock's ring: a violet shell spreading out, fading as it goes.
    this.pulses = new T.InstancedMesh(new T.IcosahedronGeometry(1, 3), new T.MeshBasicMaterial({ transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide }), 6);
    this.pulses.instanceColor = new T.InstancedBufferAttribute(new Float32Array(6 * 3), 3);
    this.pulses.frustumCulled = false; this.pulses.count = 0;
    scene.add(this.orbs, this.motes, this.yarn, this.marks, this.nuts, this.caps, this.chunks, this.pulses);
    this._m = new T.Matrix4(); this._q = new T.Quaternion(); this._p = new T.Vector3(); this._s = new T.Vector3(); this._c = new T.Color(); this._e = new T.Euler();
  }

  clear() {
    for (const [, v] of this.live) this.release(v);
    this.live.clear();
  }

  // A new dream: its own skins (the pooled models of the last one go).
  setSkins(skins = {}) {
    const next = { ...SKINS, ...skins };
    if (JSON.stringify(next) === JSON.stringify(this.skins)) return;
    this.clear();
    for (const list of Object.values(this.pool)) for (const v of list) { this.group.remove(v.o); v.o.traverse((m) => m.isMesh && m.geometry.dispose()); }
    this.pool = {};
    this.skins = next;
  }

  obtain(kind) {
    const v = (this.pool[kind] ??= []).pop();
    if (v) { v.o.visible = true; return v; }
    const o = make(MODELS[this.skins[kind]].build);
    const meshes = [];
    o.traverse((m) => { if (m.isMesh) { meshes.push(m); m.userData.mat = m.material; } });
    this.group.add(o);
    return { o, kind, meshes, flashing: false };
  }

  release(v) { v.o.visible = false; (this.pool[v.kind] ??= []).push(v); }

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
      if (e.splash) {
        this.fx.burst([e.x, e.y, e.z], [0, 1, 0], 0xffffff, 24, 4, 0.07);
        this.fx.ring([e.x, e.y + 0.05, e.z], [0, 1, 0], 0x9fe0ff, e.splash, 0.4);
        this.fx.puff(e.x, e.y, e.z, 0.7);
      } else if (e.kind === "nut") {
        if (e.onYou) return;
        for (let i = 0; i < 8; i++) this.fx.spark(e.x, e.y, e.z, (Math.random() - 0.5) * 4, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 4, 0.5, 0.05, i % 2 ? 0x8a5a2a : 0xd8a060, 12);
      } else this.fx.burst([e.x, e.y, e.z], [0, 1, 0], C.dreamPink, 12, 3, 0.05);
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
      // Far off in the haze they are specks: not worth their draw calls.
      const far = (f.px - run.body.x) ** 2 + (f.pz - run.body.z) ** 2 > 48 * 48;
      o.visible = !far;
      if (far) continue;
      o.position.set(lerp(f.lx ?? f.px, f.px, alpha), lerp(f.ly ?? f.py, f.py, alpha), lerp(f.lz ?? f.pz, f.pz, alpha));
      // Turn smoothly towards where the sim faces.
      let d = f.yaw - o.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      o.rotation.y += d * Math.min(1, dt * 12);
      // Pop in when spawned.
      const grow = f.state === "spawn" ? easeOutBack(Math.min(1, f.t / 0.5)) : 1;
      if (f.kind === "fuzz") animFuzz(f, N, t, grow);
      else if (f.kind === "buzzer") animBuzzer(f, N, t, grow);
      else if (f.kind === "bunny") animBunny(f, N, t, grow);
      else if (f.kind === "tub") animTub(f, N, t, grow);
      else if (f.kind === "clock") animClock(f, N, t, grow);
      else if (f.kind === "pencil") animPencil(f, N, t, grow, o);
      else if (f.kind === "backpack") animBackpack(f, N, t, grow);
      else if (f.kind === "sharpener") animSharpener(f, N, t, grow);
      else animKnot(f, N, t, grow);
      // Hit flash.
      const flash = f.flash > 0.55;
      if (flash !== v.flashing) {
        for (const m of v.meshes) m.material = flash ? FLASH : m.userData.mat;
        v.flashing = flash;
      }
    }
    for (const [id, v] of this.live) if (!seen.has(id)) { this.release(v); this.live.delete(id); }

    // "!": pops up with a bounce, wobbles, bobs, fades at the end.
    let nb = 0;
    for (const f of run.foes) {
      if (!f.alive || !(f.alertT > 0) || !this.live.get(f.id)?.o.visible) continue;
      let sp = this.bangs[nb];
      if (!sp) {
        sp = new T.Sprite(new T.SpriteMaterial({ map: this.bangTex, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
        sp.renderOrder = 10;
        this.group.add(sp); this.bangs.push(sp);
      }
      const age = 1.1 - f.alertT, pop = easeOutBack(Math.min(1, age / 0.22)), fade = Math.min(1, f.alertT / 0.25);
      const top = f.def.fly ? 0.7 : (f.def.h ?? 0.8) + 0.55;
      sp.visible = true;
      sp.position.set(lerp(f.lx ?? f.px, f.px, alpha), lerp(f.ly ?? f.py, f.py, alpha) + top + Math.sin(age * 9) * 0.05 + (1 - Math.min(1, age / 0.22)) * -0.2, lerp(f.lz ?? f.pz, f.pz, alpha));
      const s = 0.85 * pop;
      sp.scale.set(s * 0.75, s, 1);
      sp.material.rotation = Math.sin(age * 14) * 0.18 * (1 - Math.min(1, age / 0.7));
      sp.material.opacity = fade;
      nb++;
    }
    for (let k = nb; k < this.bangs.length; k++) this.bangs[k].visible = false;

    // Orbs: pink, wobbling, trailing sparks.
    const { _m, _q, _p, _s, _c } = this;
    let i = 0;
    let r = 0;
    let n = 0;
    const nut = (x, y, z, spin) => {
      if (n >= 24) return;
      _p.set(x, y, z); _q.setFromEuler(this._e.set(spin, spin * 0.7, 0)); _s.setScalar(1);
      _m.compose(_p, _q, _s);
      this.nuts.setMatrixAt(n, _m); this.caps.setMatrixAt(n, _m);
      n++;
    };
    // A squirrel winding up holds its nut over its head.
    for (const f of run.foes) {
      if (!f.alive || f.state !== "throw" || !this.live.get(f.id)?.o.visible) continue;
      const k = Math.min(1, f.t / 0.6), fwd = 0.12 - k * 0.22;
      nut(f.px - Math.sin(f.yaw) * fwd, f.py + f.def.h + 0.3 + k * 0.2, f.pz - Math.cos(f.yaw) * fwd, Math.sin(t * 3) * 0.3);
    }
    let nc = 0;
    for (const s of run.spits) {
      const ch = CHUNKS[s.kind];
      if (ch) {
        if (nc < 48) {
          _p.set(s.x, s.y, s.z); _q.setFromEuler(this._e.set(t * 9 + s.id, t * 6 + s.id, s.kind === "grade" ? 0 : t * 4)); _s.set(ch[0], ch[1], ch[2]);
          this.chunks.setMatrixAt(nc, _m.compose(_p, _q, _s));
          this.chunks.setColorAt(nc, _c.set(s.kind === "book" ? BOOKS[s.id % BOOKS.length] : ch[3]).multiplyScalar(s.kind === "grade" ? 1.6 : 1));
          nc++;
        }
        if (s.kind === "grade" && Math.random() < 0.5) this.fx.spark(s.x, s.y, s.z, 0, 0.2, 0, 0.3, 0.05, 0xff4040, 0);
        if (s.splash && r < 16) {
          const k = Math.max(0, Math.min(1, s.y - s.ty) / 6);
          _p.set(s.tx, s.ty + 0.05, s.tz); _q.setFromAxisAngle(this._x, -Math.PI / 2); _s.setScalar(s.splash * (0.8 + k * 0.6));
          this.marks.setMatrixAt(r, _m.compose(_p, _q, _s));
          this.marks.setColorAt(r, _c.set(0xffd23a).multiplyScalar(0.9 + Math.sin(t * 14) * 0.3));
          r++;
        }
        continue;
      }
      if (s.kind === "nut") {
        nut(s.x, s.y, s.z, t * 14 + s.id);
        if (Math.random() < 0.6) this.fx.spark(s.x, s.y, s.z, 0, 0.2, 0, 0.25, 0.04, 0xffe0a8, 0);
        continue;
      }
      const bubble = s.kind === "bubble";
      const w = (1 + Math.sin(t * (bubble ? 9 : 30) + s.id) * (bubble ? 0.08 : 0.15)) * (bubble ? 2.2 : 1);
      _p.set(s.x, s.y, s.z); _q.identity(); _s.setScalar(w);
      this.orbs.setMatrixAt(i, _m.compose(_p, _q, _s));
      this.orbs.setColorAt(i, _c.set(bubble ? 0x9fe0ff : s.kind === "yarn" ? 0xf0a050 : C.dreamPink).multiplyScalar(bubble ? 1.3 : s.kind === "yarn" ? 1.4 : 2.2));
      if (Math.random() < 0.5) this.fx.spark(s.x, s.y, s.z, (Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5), 0.3, 0.05, bubble ? 0xffffff : C.dreamPink, 0);
      // Where a bubble will land: a ring on the ground, tightening.
      if (bubble && r < 16) {
        const k = Math.max(0, Math.min(1, s.y - s.ty) / 6);
        _p.set(s.tx, s.ty + 0.05, s.tz); _q.setFromAxisAngle(this._x, -Math.PI / 2); _s.setScalar(s.splash * (0.8 + k * 0.6));
        this.marks.setMatrixAt(r, _m.compose(_p, _q, _s));
        this.marks.setColorAt(r, _c.set(0x9fe0ff).multiplyScalar(0.9 + Math.sin(t * 14) * 0.3));
        r++;
      }
      i++;
    }
    let np = 0;
    for (const P of run.pulses) {
      if (np >= 6) break;
      _p.set(P.x, P.y, P.z); _q.identity(); _s.setScalar(Math.max(0.1, P.r));
      this.pulses.setMatrixAt(np, _m.compose(_p, _q, _s));
      this.pulses.setColorAt(np, _c.set(0xa070ff).multiplyScalar(0.16 * (1 - P.r / P.max) + 0.03));
      np++;
    }
    this.pulses.count = np;
    this.pulses.instanceMatrix.needsUpdate = true; if (this.pulses.instanceColor) this.pulses.instanceColor.needsUpdate = true;
    this.chunks.count = nc;
    this.chunks.instanceMatrix.needsUpdate = true; if (this.chunks.instanceColor) this.chunks.instanceColor.needsUpdate = true;
    // Where a pencil is about to come down: a ring that tightens.
    for (const f of run.foes) {
      if (!f.alive || !f.mark || r >= 28) continue;
      const k = f.state === "crouch" ? Math.min(1, f.t / 0.5) : 1;
      _p.set(f.mark[0], f.mark[1] + 0.06, f.mark[2]); _q.setFromAxisAngle(this._x, -Math.PI / 2); _s.setScalar(f.mark[3] * (1.6 - k * 0.6));
      this.marks.setMatrixAt(r, _m.compose(_p, _q, _s));
      this.marks.setColorAt(r, _c.set(0xffd040).multiplyScalar(1 + Math.sin(t * 16) * 0.4));
      r++;
    }
    this.nuts.count = this.caps.count = n;
    for (const m of [this.nuts, this.caps]) m.instanceMatrix.needsUpdate = true;
    // A knot's slam: a pink ring racing out along the ground.
    for (const s of run.shocks) {
      if (r >= 28) break;
      _p.set(s.x, s.y + 0.08, s.z); _q.setFromAxisAngle(this._x, -Math.PI / 2); _s.setScalar(Math.max(0.1, s.r));
      this.marks.setMatrixAt(r, _m.compose(_p, _q, _s));
      this.marks.setColorAt(r, _c.set(s.color ?? C.dreamPink).multiplyScalar(2.2 * (1 - s.r / s.max) + 0.3));
      r++;
    }
    this.marks.count = r;
    this.marks.instanceMatrix.needsUpdate = true; if (this.marks.instanceColor) this.marks.instanceColor.needsUpdate = true;
    this.orbs.count = i;
    this.orbs.instanceMatrix.needsUpdate = true; this.orbs.instanceColor.needsUpdate = true;
    i = 0;
    for (const g of run.balls) {
      _p.set(g.x, g.y, g.z);
      _q.setFromEuler(this._e.set(t * 12 + g.id, t * 7, 0));
      // A pillow bomb: a fat, squashed white one, tumbling.
      if (g.kind === "pillow") _s.set(1.5, 0.75, 1.15); else _s.setScalar(1);
      this.yarn.setMatrixAt(i, _m.compose(_p, _q, _s));
      this.yarn.setColorAt(i, _c.set(g.kind === "pillow" ? 0xf6f0ff : g.kind === "buzzer" ? 0xf2c14e : 0xd88a48));
      if (Math.random() < 0.6) this.fx.spark(g.x, g.y, g.z, 0, 0.3, 0, 0.3, 0.04, C.dreamGold, 0);
      i++;
    }
    this.yarn.count = i;
    this.yarn.instanceMatrix.needsUpdate = true; this.yarn.instanceColor.needsUpdate = true;
    // Dream dust: gold flecks spinning.
    i = 0;
    // Drawn to you, they swell, flare and leave a glittering trail; right
    // in front of the eye they shrink away (never a huge fleck on the lens).
    const B = run.body, ex = B.x, ey = B.eyeY, ez = B.z;
    const eyeDist = (x, y, z) => Math.hypot(x - ex, y - ey, z - ez);
    const nearEye = (x, y, z) => Math.max(0, Math.min(1, (eyeDist(x, y, z) - 0.8) / 2.2));
    for (const m of run.dustMotes) {
      if (i >= 256) break;
      m.glow = Math.min(1, (m.glow || 0) + (m.pull ? dt * 5 : -dt * 3));
      const k = nearEye(m.x, m.y, m.z);
      _p.set(m.x, m.y + Math.sin(t * 3 + m.id) * 0.08, m.z);
      _q.setFromEuler(this._e.set(t * (2 + m.glow * 4) + m.id, t * (3 + m.glow * 3) + m.id, 0));
      _s.setScalar(Math.max(0.001, (1 + m.glow * 0.15) * k));
      this.motes.setMatrixAt(i, _m.compose(_p, _q, _s));
      this.motes.setColorAt(i, _c.set(m.id % 3 ? C.dreamGold : C.dream).multiplyScalar(2.4 + m.glow * 0.5 + Math.sin(t * 8 + m.id) * 0.4));
      this.halos.geometry.attributes.position.setXYZ(i, _p.x, _p.y, _p.z);
      // The halo is for spotting them from afar: gone up close and in flight.
      const far = Math.max(0, Math.min(1, (eyeDist(m.x, m.y, m.z) - 2.5) / 3)) * (1 - m.glow);
      _c.set(m.id % 3 ? C.dreamGold : C.dream).multiplyScalar((0.5 + Math.sin(t * 4 + m.id) * 0.15) * far);
      this.halos.geometry.attributes.color.setXYZ(i, _c.r, _c.g, _c.b);
      // Now and then a twinkle.
      if (!m.pull && k > 0.6 && Math.random() < 0.04) this.fx.spark(m.x + (Math.random() - 0.5) * 0.2, m.y + 0.1, m.z + (Math.random() - 0.5) * 0.2, 0, 0.8, 0, 0.4, 0.05, 0xffffff, 0);
      if (m.pull && k > 0.6 && Math.random() < 0.8) this.fx.spark(m.x, m.y, m.z, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 0.3, 0.035 + Math.random() * 0.03, Math.random() < 0.5 ? C.dreamGold : 0xffffff, 0);
      i++;
    }
    this.motes.count = i;
    this.halos.geometry.setDrawRange(0, i);
    this.halos.geometry.attributes.position.needsUpdate = true; this.halos.geometry.attributes.color.needsUpdate = true;
    // Hearts: bob, pulse and face you with a little rock (a flat heart
    // turning edge-on looks like a stick); blink out at the end.
    let nh = 0;
    for (const h of run.heals) {
      if (nh >= 24) break;
      const blink = h.t > 25 && Math.sin(h.t * 18) < 0;
      _p.set(h.x, h.y + Math.sin(t * 2.5 + h.id) * 0.08, h.z);
      _q.setFromEuler(this._e.set(0, Math.atan2(ex - h.x, ez - h.z) + Math.sin(t * 2.2 + h.id) * 0.45, Math.sin(t * 1.7 + h.id) * 0.15));
      _s.setScalar(blink ? 0.001 : Math.max(0.001, 0.7 * (1.1 + Math.sin(t * 6 + h.id) * 0.08) * Math.min(1, h.t * 4) * nearEye(h.x, h.y, h.z)));
      this.hearts.setMatrixAt(nh, _m.compose(_p, _q, _s));
      this.hearts.setColorAt(nh, _c.set(0xff5c8a).multiplyScalar(1.5 + (h.pull ? 0.8 : 0)));
      if (nearEye(h.x, h.y, h.z) > 0.6 && Math.random() < (h.pull ? 0.7 : 0.12)) this.fx.spark(h.x + (Math.random() - 0.5) * 0.3, h.y + (Math.random() - 0.5) * 0.3, h.z + (Math.random() - 0.5) * 0.3, 0, 0.6, 0, 0.45, 0.04, 0xffb0c8, 0);
      nh++;
    }
    this.hearts.count = nh;
    this.hearts.instanceMatrix.needsUpdate = true; if (this.hearts.instanceColor) this.hearts.instanceColor.needsUpdate = true;
    this.motes.instanceMatrix.needsUpdate = true; this.motes.instanceColor.needsUpdate = true;
  }
}

// A round glow fading out to nothing (for the dust's halo).
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.25, "rgba(255,255,255,0.45)"); grad.addColorStop(0.6, "rgba(255,255,255,0.08)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

// A fat yellow "!" with a dark outline, drawn once.
function bangTexture() {
  const c = document.createElement("canvas");
  c.width = 96; c.height = 128;
  const g = c.getContext("2d");
  // Drawn as shapes, not a font: a fat tapering bar and a round dot.
  const bang = () => {
    g.beginPath();
    g.moveTo(26, 10); g.lineTo(70, 10); g.lineTo(58, 82); g.lineTo(38, 82); g.closePath();
    g.moveTo(62, 106); g.arc(48, 106, 14, 0, Math.PI * 2);
  };
  g.lineJoin = "round"; g.lineWidth = 14; g.strokeStyle = "#3a1830";
  bang(); g.stroke();
  g.fillStyle = "#ffcc1a"; bang(); g.fill();
  g.fillStyle = "rgba(255, 250, 210, 0.85)";
  g.beginPath(); g.moveTo(32, 16); g.lineTo(46, 16); g.lineTo(42, 52); g.lineTo(36, 52); g.closePath(); g.fill();
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

function easeOutBack(x) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; }

function animFuzz(f, N, t, grow) {
  const b = f.body, sp = b.speed2D;
  let sy, sxz = 1, hop = 0, lean = 0;
  if (f.state === "windup" || f.state === "hop") { const k = Math.min(1, f.t / 0.5); sy = 1 - 0.3 * k; sxz = 1 + 0.2 * k; lean = -0.25 * k; }
  else if (f.state === "flying") { sy = 1.2; sxz = 0.88; lean = 0.3; }
  else if (f.state === "throw") { const k = Math.min(1, f.t / 0.6); sy = 1 + 0.12 * k; sxz = 1 - 0.06 * k; lean = -0.45 * k + (k > 0.85 ? (k - 0.85) * 5 : 0); }
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

function animBunny(f, N, t, grow) {
  const b = f.body, sp = b.speed2D;
  const ph = (f.age * 11 + f.phase) % Math.PI;
  const hop = b.grounded && sp > 0.5 ? Math.sin(ph) * 0.12 : 0;
  let sy = 1, sxz = 1;
  if (f.state === "windup" || f.state === "crouch" || f.state === "hop") { sy = 0.7; sxz = 1.2; }
  else if (f.state === "lunge" || f.state === "flying") { sy = f.leap || f.state === "flying" ? 1.35 : 1.2; sxz = f.leap || f.state === "flying" ? 0.78 : 0.85; }
  N.body.position.y = 0.22 + hop;
  N.body.scale.set(sxz * grow, sy * grow, sxz * grow);
  N.ears.rotation.x = -hop * 3 + Math.sin(t * 5 + f.phase) * 0.1 + (f.state === "lunge" ? 0.6 : 0);
}

function animTub(f, N, t, grow) {
  const b = f.body, sp = b.speed2D;
  // Waddle: rock side to side, legs taking turns.
  const w = Math.sin(f.age * 6 + f.phase) * Math.min(1, sp);
  N.body.rotation.z = w * 0.08;
  N.body.position.y = 0.3 + Math.abs(w) * 0.04;
  for (const [n, s] of [["legFL", 1], ["legBR", 1], ["legFR", -1], ["legBL", -1]]) N[n].rotation.x = w * s * 0.4;
  const wind = f.state === "windup" ? Math.min(1, f.t / 0.8) : 0;
  N.shower.rotation.x = -wind * 0.7 + Math.sin(t * 2 + f.phase) * 0.05;
  N.shower.scale.setScalar(1 + wind * 0.15);
  N.mouth.scale.set(1, 1 + wind * 0.8, 1);
  N.body.scale.set(grow * (1 + wind * 0.04), grow * (1 - wind * 0.05), grow);
}

// ── Ethan's school ──

function animClock(f, N, t, grow) {
  // Ticks along; winding, its hands race; ringing, the bells rattle and it
  // shakes; skipping, it shrinks away to nothing and pops back.
  const wind = f.state === "wind" ? Math.min(1, f.t / 0.6) : 0, ring = f.state === "ring" ? Math.min(1, f.t / 1) : 0;
  f.handA = (f.handA || 0) + (0.02 + wind * 0.6 + ring * 0.3);
  N.minute.rotation.z = -f.handA; N.hour.rotation.z = -f.handA / 12;
  N.bells.rotation.z = ring ? Math.sin(t * 60) * 0.25 * ring : Math.sin(t * 6 + f.phase) * 0.03;
  const tick = Math.floor(t * 2 + f.phase) % 2 ? 0.02 : 0;
  const skip = f.state === "skip" ? Math.max(0.05, 1 - f.t / 0.3) : 1;
  N.body.rotation.set(Math.sin(t * 1.3 + f.phase) * 0.08, 0, tick + (ring ? Math.sin(t * 45) * 0.1 * ring : 0));
  N.body.scale.setScalar(grow * skip * (1 + ring * 0.12));
}

function animPencil(f, N, t, grow, o) {
  const b = f.body;
  // Pogo hops squash it on landing; a crouch squashes it more.
  let sy = 1, lean = 0;
  if (f.state === "crouch") sy = 1 - 0.25 * Math.min(1, f.t / 0.5);
  else if (f.state === "rock") lean = -0.5 * Math.min(1, f.t / 0.35);
  else if (f.state === "jab") lean = 1.35;
  else if (!b.grounded) sy = 1.08;
  else if (f.state === "recover") sy = 0.85 + Math.min(0.15, f.t * 0.4);
  const spin = f.spin || 0;
  f.spinA = (f.spinA || 0) + spin * spin * 0.6;
  const wob = f.state === "dizzy" ? Math.sin(t * 9) * 0.35 : spin ? Math.sin(t * 25) * 0.06 : 0;
  N.body.rotation.set(lean, f.spinA, wob, "XYZ");
  N.body.scale.set(grow * (2 - sy) ** 0.5, grow * sy, grow * (2 - sy) ** 0.5);
  void o;
}

function animBackpack(f, N, t, grow) {
  const b = f.body, sp = b.speed2D;
  const w = Math.sin(f.age * (f.state === "charge" ? 16 : 7) + f.phase) * Math.min(1, sp / 2);
  N.body.rotation.set(f.state === "charge" ? 0.25 : f.state === "paw" ? -0.15 : 0, 0, w * 0.06);
  N.body.position.y = 0.1 + Math.abs(w) * 0.05 + (f.state === "dazed" ? Math.sin(t * 20) * 0.02 : 0);
  N.body.scale.setScalar(grow);
  const open = f.state === "toss" ? 0.9 : f.state === "chomp" ? (f.t < 0.4 ? Math.min(1, f.t / 0.3) : 0) : f.state === "dazed" ? 0.3 : 0;
  N.lid.rotation.x = -open;
  N.lid.scale.setScalar(grow);
  for (const [n, s] of [["strapL", -1], ["strapR", 1]]) N[n].rotation.set(Math.sin(f.age * 5 + s) * 0.2 + (f.state === "paw" ? -0.6 : 0), 0, s * (0.1 + Math.abs(w) * 0.3));
}

function animSharpener(f, N, t, grow) {
  N.crank.rotation.x = f.crank || 0;
  N.core.scale.setScalar((1 + (f.pulse || 0) * 0.7 + Math.sin(t * 4 + f.phase) * 0.08) * grow);
}
