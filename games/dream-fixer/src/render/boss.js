import * as T from "three";
import { make } from "./modelkit.js";
import { vacuumBoss } from "./models/boss.js";
import { redPen } from "./models/school.js";
import { pressureCooker } from "./models/kitchen.js";
import { C } from "./palette.js";
import { lerp, damp } from "../config.js";

// ── The Vacuum Cleaner on screen ─────────────────────────────────────────
// Rises out of the lawn in a cloud, rolls about, aims its hose, puffs up
// before it sucks (with a stream of flecks into the nozzle), shakes and
// coughs when clogged, and lashes its cord round as an expanding ring.

const FLASH = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

class VacuumBossView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.o = null;
    this.ring = new T.Mesh(new T.TorusGeometry(1, 0.09, 6, 64).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: new T.Color(0x1a0a10) }));
    this.ringGlow = new T.Mesh(new T.TorusGeometry(1, 0.05, 4, 64).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: new T.Color(C.dreamPink).multiplyScalar(2), toneMapped: false }));
    this.ring.visible = this.ringGlow.visible = false;
    scene.add(this.ring, this.ringGlow);
    this.flashing = false;
    this.lean = 0; this.puffUp = 0; this.acc = 0;
  }

  clear() {
    if (this.o) { this.scene.remove(this.o); this.o = null; }
    this.ring.visible = this.ringGlow.visible = false;
  }

  onEvent(e, run) {
    const B = run.boss;
    if (e.type === "bossRise") {
      for (let i = 0; i < 3; i++) this.fx.puff(e.x + (Math.random() - 0.5) * 3, run.kit.floorAt(e.x, e.z) + 0.5, e.z + (Math.random() - 0.5) * 3, 1.8);
      this.fx.ring([e.x, run.kit.floorAt(e.x, e.z) + 0.1, e.z], [0, 1, 0], C.dreamPink, 6, 0.8);
    } else if (e.type === "bossClog" || e.type === "bossBurp") {
      this.fx.puff(e.x, e.y, e.z, 1.2);
      this.fx.burst([e.x, e.y, e.z], [0, 1, 0], C.dreamPink, 20, 4, 0.07);
    } else if (e.type === "bossPop" && B) {
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), v = 4 + Math.random() * 8;
        this.fx.spark(e.x, e.y, e.z, Math.cos(a) * s * v, u * v + 3, Math.sin(a) * s * v, 0.8 + Math.random() * 0.8, 0.1 + Math.random() * 0.1, [C.dream, C.dreamPink, C.dreamGold, 0xc0394f][i % 4], 6);
      }
      for (let i = 0; i < 5; i++) this.fx.puff(e.x + (Math.random() - 0.5) * 2, e.y + (Math.random() - 0.5) * 2, e.z + (Math.random() - 0.5) * 2, 2);
      this.fx.ring([e.x, e.y - 1.3, e.z], [0, 1, 0], C.dream, 16, 1.2);
      if (this.o) this.o.visible = false;
    }
  }

  update(run, alpha, dt, t) {
    const B = run.boss;
    if (!B) { if (this.o) this.clear(); return; }
    if (!this.o) {
      this.o = make(vacuumBoss);
      this.meshes = [];
      this.o.traverse((m) => { if (m.isMesh) { this.meshes.push(m); m.userData.mat = m.material; } });
      this.scene.add(this.o);
    }
    if (!B.alive) { this.o.visible = false; this.ring.visible = this.ringGlow.visible = false; return; }
    const o = this.o, N = o.userData.nodes, b = B.body;
    const st = B.state;
    const rise = st === "rise" ? easeOut(B.rise) : 1;
    o.position.set(lerp(B.lx, b.x, alpha), lerp(B.ly, b.y, alpha) - (1 - rise) * 3.2, lerp(B.lz, b.z, alpha));
    o.rotation.y = B.yaw;
    // Lean into its roll, puff up before it sucks, shake when clogged / going down.
    const sp = b.speed2D;
    this.lean = damp(this.lean, st === "roam" ? Math.min(0.12, sp * 0.04) : 0, 5, dt);
    const inhale = st === "suck" ? Math.min(1, B.t / 0.6) : 0;
    this.puffUp = damp(this.puffUp, st === "suck" ? 1 : 0, 6, dt);
    const shake = st === "clogged" || st === "down" ? (st === "down" ? 0.06 + B.t * 0.03 : 0.04) : st === "roar" ? 0.03 : 0;
    N.body.rotation.set(this.lean + Math.sin(t * 43) * shake, 0, Math.sin(t * 37) * shake);
    N.body.position.y = Math.abs(Math.sin(t * 9)) * 0.03 * Math.min(1, sp);
    const sq = 1 + this.puffUp * 0.06 + Math.sin(t * 20) * 0.01 * this.puffUp;
    N.body.scale.set(sq, 1 - this.puffUp * 0.03, sq);
    // Bag throbs; brighter when clogged (open to punishment).
    N.bag.scale.setScalar(1 + Math.sin(t * (st === "clogged" ? 10 : 3)) * (st === "clogged" ? 0.1 : 0.04) + inhale * 0.08);
    // Brows: cross; up in surprise when clogged.
    N.brows.position.y = 1.78 + (st === "clogged" ? 0.12 : 0);
    N.brows.rotation.z = st === "clogged" ? 0 : Math.sin(t * 2) * 0.03;
    N.mouth.scale.y = st === "suck" ? 1.4 : st === "roar" ? 1.8 : st === "clogged" ? 0.5 + Math.abs(Math.sin(t * 12)) : 1;
    N.eyes.scale.setScalar(st === "clogged" ? 1.2 : 1);
    // Hose points where the sim aims it: shoulder in yaw/pitch, a slight elbow.
    const rel = Math.atan2(Math.sin(B.aimYaw - B.yaw), Math.cos(B.aimYaw - B.yaw));
    N.hose1.rotation.set(B.aimPitch + 0.25, rel, 0, "YXZ");
    N.hose2.rotation.set(-0.35 + (st === "suck" ? Math.sin(t * 30) * 0.03 : Math.sin(t * 2) * 0.1), 0, 0);
    N.nozzle.rotation.set(0.1, 0, st === "clogged" ? Math.sin(t * 25) * 0.2 : 0);
    // Suction stream into the nozzle.
    if (st === "suck" && B.t > 0.4) {
      this.acc += dt * 50;
      const n = B.nozzle, d = B.nozzleDir;
      while (this.acc > 1) {
        this.acc -= 1;
        const L = 3 + Math.random() * 9, sx = (Math.random() - 0.5) * L * 0.8, sy = (Math.random() - 0.3) * L * 0.4;
        const px = n[0] + d[0] * L - d[2] * sx, py = n[1] + d[1] * L + sy, pz = n[2] + d[2] * L + d[0] * sx;
        const life = 0.45;
        this.fx.spark(px, py, pz, (n[0] - px) / life, (n[1] - py) / life, (n[2] - pz) / life, life, 0.035, Math.random() < 0.3 ? C.dreamPink : 0xffffff, 0);
      }
    }
    if (st === "clogged" && Math.random() < dt * 4) this.fx.puff(B.nozzle[0], B.nozzle[1], B.nozzle[2], 0.6);
    // The cord sweep ring.
    const R = B.ring;
    this.ring.visible = this.ringGlow.visible = !!R;
    if (R) {
      this.ring.position.set(b.x, R.y + 0.35, b.z); this.ring.scale.set(R.r, 1, R.r);
      this.ringGlow.position.set(b.x, R.y + 0.45, b.z); this.ringGlow.scale.set(R.r, 1, R.r);
    }
    // Hit flash.
    const flash = B.flash > 0.6;
    if (flash !== this.flashing) { for (const m of this.meshes) m.material = flash ? FLASH : m.userData.mat; this.flashing = flash; }
  }
}

const easeOut = (x) => 1 - (1 - x) ** 3;

// ── The Red Pen on screen ──
// Tilts from its nib as the sim says, bounces about, drags its nib on a
// strike. Ink on the floor is a row of red strips (blinking before it
// dries up), a strike about to run shows as a faint dashed track, and a
// correction closing is a red ring tightening.
const INK_MAX = 24;

class PenBossView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.o = null;
    const strip = new T.BoxGeometry(1, 0.02, 1);
    this.ink = new T.InstancedMesh(strip, new T.MeshBasicMaterial({ color: new T.Color(0xc0101a), toneMapped: false }), INK_MAX);
    this.ink.instanceColor = new T.InstancedBufferAttribute(new Float32Array(INK_MAX * 3), 3);
    this.dash = new T.InstancedMesh(strip, new T.MeshBasicMaterial({ color: new T.Color(0xff6070), transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }), 40);
    this.rings = new T.InstancedMesh(new T.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: new T.Color(0xff2a3a).multiplyScalar(1.6), side: T.DoubleSide, toneMapped: false, transparent: true, depthWrite: false }), 8);
    for (const m of [this.ink, this.dash, this.rings]) { m.frustumCulled = false; m.count = 0; scene.add(m); }
    this.flashing = false;
    this._m = new T.Matrix4(); this._q = new T.Quaternion(); this._p = new T.Vector3(); this._s = new T.Vector3(); this._c = new T.Color(); this._y = new T.Vector3(0, 1, 0);
  }

  clear() {
    if (this.o) { this.scene.remove(this.o); this.o = null; }
    this.ink.count = this.dash.count = this.rings.count = 0;
  }

  onEvent(e, run) {
    const fx = this.fx;
    if (e.type === "bossRise") {
      const y = run.kit.floorAt(e.x, e.z);
      for (let i = 0; i < 3; i++) fx.puff(e.x + (Math.random() - 0.5) * 3, y + 0.5, e.z + (Math.random() - 0.5) * 3, 1.8);
      fx.ring([e.x, y + 0.1, e.z], [0, 1, 0], 0xff3040, 6, 0.8);
    } else if (e.type === "penStrike" || e.type === "penLine") {
      fx.burst([e.x, run.kit.floorAt(e.x, e.z) + 0.1, e.z], [0, 1, 0], 0xff3040, 14, 3, 0.06);
    } else if (e.type === "penCircle") {
      fx.puff(e.x, e.y + 0.4, e.z, 0.9);
      fx.burst([e.x, e.y + 0.2, e.z], [0, 1, 0], 0xff3040, 16, 3.5, 0.06);
    } else if (e.type === "penBlot") {
      fx.puff(e.x, e.y, e.z, 1.4);
      fx.burst([e.x, e.y, e.z], [0, 1, 0], 0xffffff, 26, 4, 0.07);
    } else if (e.type === "bossPop" && run.boss) {
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), v = 4 + Math.random() * 8;
        fx.spark(e.x, e.y, e.z, Math.cos(a) * s * v, u * v + 3, Math.sin(a) * s * v, 0.8 + Math.random() * 0.8, 0.1 + Math.random() * 0.1, [C.dream, C.dreamPink, C.dreamGold, 0xe02a30][i % 4], 6);
      }
      for (let i = 0; i < 5; i++) fx.puff(e.x + (Math.random() - 0.5) * 2, e.y + (Math.random() - 0.5) * 2, e.z + (Math.random() - 0.5) * 2, 2);
      fx.ring([e.x, e.y - 1.3, e.z], [0, 1, 0], C.dream, 16, 1.2);
      if (this.o) this.o.visible = false;
    }
  }

  // A flat strip on the floor from (x0, z0) to (x1, z1).
  strip(mesh, i, x0, z0, x1, z1, y, w) {
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 0.01;
    this._p.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    this._q.setFromAxisAngle(this._y, Math.atan2(dx, dz));
    this._s.set(w, 1, l);
    mesh.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
  }

  update(run, alpha, dt, t) {
    const B = run.boss;
    if (!this.o) {
      this.o = make(redPen);
      this.meshes = [];
      this.o.traverse((m) => { if (m.isMesh) { this.meshes.push(m); m.userData.mat = m.material; } });
      this.scene.add(this.o);
    }
    if (!B.alive) { this.o.visible = false; this.ink.count = this.dash.count = this.rings.count = 0; return; }
    const o = this.o, N = o.userData.nodes, b = B.body;
    const rise = B.state === "rise" ? easeOut(B.rise) : 1;
    o.position.set(lerp(B.lx, b.x, alpha), lerp(B.ly, b.y, alpha) - (1 - rise) * 3.6 + (B.tilt > 1 ? 0.45 : 0), lerp(B.lz, b.z, alpha));
    o.rotation.y = B.yaw;
    // Bounces on its nib as it gets about; scribbling, it whirls.
    const hop = B.state === "roam" ? Math.abs(Math.sin(t * 7)) * 0.12 * Math.min(1, b.speed2D) : 0;
    N.pen.position.y = hop;
    N.pen.rotation.set(-B.tilt, 0, B.state === "blotted" ? Math.sin(t * 3) * 0.05 : 0);
    N.nib.scale.setScalar(1 + (B.state === "strike" ? 0.3 : 0) + B.ink * 0.5);
    N.cap.position.y = 2.9 + (B.state === "grade" ? Math.max(0, Math.sin(B.t * 20)) * 0.15 : 0);
    N.face.scale.set(1, B.state === "blotted" ? 0.5 : 1, 1);
    if (B.state === "strike" && Math.random() < 0.8) this.fx.spark(b.x, b.y + 0.1, b.z, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.4, 0.06, 0xff3040, 6);
    if (B.ink > 0.05 && Math.random() < dt * 8) this.fx.puff(B.nib[0], B.nib[1] + 0.3, B.nib[2], 0.3 + B.ink * 0.5);

    // Ink lines; the last second they blink.
    let i = 0;
    for (const L of B.lines) {
      if (i >= INK_MAX) break;
      const left = L.life - L.t, on = left > 1.2 || Math.sin(t * 22) > 0;
      this.strip(this.ink, i, L.x0, L.z0, L.x1, L.z1, L.y + 0.03, on ? 0.85 : 0.001);
      this.ink.setColorAt(i, this._c.set(0xd0101a).multiplyScalar(1.2 + Math.sin(t * 5 + i) * 0.15));
      i++;
    }
    this.ink.count = i;
    this.ink.instanceMatrix.needsUpdate = true; if (this.ink.instanceColor) this.ink.instanceColor.needsUpdate = true;
    // A strike lining up: a dashed track, marching.
    let d = 0;
    const G = B.guide;
    if (G) {
      const L = Math.hypot(G.x1 - G.x0, G.z1 - G.z0), n = Math.min(40, Math.floor(L / 1.2)), ux = (G.x1 - G.x0) / L, uz = (G.z1 - G.z0) / L, off = (t * 3) % 1.2;
      for (let k = 0; k < n; k++) {
        const a = 1 + k * 1.2 + off;
        if (a > L) break;
        this.strip(this.dash, d++, G.x0 + ux * a, G.z0 + uz * a, G.x0 + ux * (a + 0.6), G.z0 + uz * (a + 0.6), G.y + 0.04, 0.6);
      }
    }
    this.dash.count = d;
    this.dash.instanceMatrix.needsUpdate = true;
    // Corrections: red rings tightening on their spots.
    let r = 0;
    for (const c of B.circles) {
      if (r >= 8) break;
      const k = Math.min(1, c.t / c.T);
      this._p.set(c.x, c.y + 0.05, c.z); this._q.identity(); this._s.setScalar(1.3 * (1.8 - 0.8 * k));
      this.rings.setMatrixAt(r++, this._m.compose(this._p, this._q, this._s));
    }
    this.rings.count = r;
    this.rings.instanceMatrix.needsUpdate = true;
    // Hit flash.
    const flash = B.flash > 0.6;
    if (flash !== this.flashing) { for (const m of this.meshes) m.material = flash ? FLASH : m.userData.mat; this.flashing = flash; }
  }
}


// ── The Pressure Cooker on screen ──
// Shuffles and jiggles, the gauge needle climbing with the pressure; in
// the red it shakes and whistles. Its steam jets are long white beams
// near the floor, a hop's landing spot a ring tightening; rung, the lid
// rattles, and rattled off it flies up and away (the glow inside shows)
// until it drops back on.
class CookerBossView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.o = null;
    const beam = new T.CylinderGeometry(0.35, 0.7, 1, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.5);
    this.jets = [0, 1].map(() => {
      const m = new T.Mesh(beam, new T.MeshBasicMaterial({ color: new T.Color(0xffffff).multiplyScalar(0.55), transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
      m.visible = false; scene.add(m); return m;
    });
    this.ring = new T.Mesh(new T.RingGeometry(0.88, 1, 40).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: new T.Color(0xff9a60), side: T.DoubleSide, toneMapped: false, transparent: true, opacity: 0.8, depthWrite: false }));
    this.ring.visible = false; scene.add(this.ring);
    this.flashing = false;
    this.lid = { t: 9, off: false };
  }

  clear() {
    if (this.o) { this.scene.remove(this.o); this.o = null; }
    for (const j of this.jets) j.visible = false;
    this.ring.visible = false;
    this.lid = { t: 9, off: false };
  }

  onEvent(e, run) {
    const fx = this.fx;
    if (e.type === "bossRise") {
      const y = run.kit.floorAt(e.x, e.z);
      for (let i = 0; i < 4; i++) fx.puff(e.x + (Math.random() - 0.5) * 4, y + 0.5, e.z + (Math.random() - 0.5) * 4, 2);
      fx.ring([e.x, y + 0.1, e.z], [0, 1, 0], 0xffd0a0, 7, 0.8);
    } else if (e.type === "cookerRattle") {
      fx.burst([e.x, e.y, e.z], [0, 1, 0], 0xffffff, 8 + e.k * 10, 3, 0.05);
      this.rattleKick = 1;
    } else if (e.type === "cookerLid") {
      this.lid = { t: 0, off: e.off };
      fx.puff(e.x, e.y + 0.5, e.z, 2.4);
      fx.burst([e.x, e.y, e.z], [0, 1, 0], e.off ? C.dreamPink : 0xffffff, 30, 6, 0.08);
      if (e.off) fx.ring([e.x, e.y, e.z], [0, 1, 0], C.dreamPink, 4, 0.5);
    } else if (e.type === "cookerLand" || e.type === "cookerBlow") {
      const y = run.kit.floorAt(e.x, e.z);
      for (let i = 0; i < (e.type === "cookerBlow" ? 8 : 4); i++) { const a = Math.random() * Math.PI * 2; fx.puff(e.x + Math.cos(a) * 2, y + 0.6, e.z + Math.sin(a) * 2, 1.6); }
    } else if (e.type === "bossPop" && run.boss) {
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), v = 4 + Math.random() * 8;
        fx.spark(e.x, e.y, e.z, Math.cos(a) * s * v, u * v + 3, Math.sin(a) * s * v, 0.8 + Math.random() * 0.8, 0.1 + Math.random() * 0.1, [C.dream, C.dreamPink, C.dreamGold, 0xd8302a][i % 4], 6);
      }
      for (let i = 0; i < 6; i++) fx.puff(e.x + (Math.random() - 0.5) * 2.5, e.y + (Math.random() - 0.5) * 2, e.z + (Math.random() - 0.5) * 2.5, 2.2);
      fx.ring([e.x, e.y - 1.3, e.z], [0, 1, 0], C.dream, 16, 1.2);
      if (this.o) this.o.visible = false;
    }
  }

  update(run, alpha, dt, t) {
    const B = run.boss;
    if (!this.o) {
      this.o = make(pressureCooker);
      this.meshes = [];
      this.o.traverse((m) => { if (m.isMesh) { this.meshes.push(m); m.userData.mat = m.material; } });
      this.scene.add(this.o);
    }
    if (!B.alive) { this.o.visible = false; for (const j of this.jets) j.visible = false; this.ring.visible = false; return; }
    const o = this.o, N = o.userData.nodes, b = B.body, st = B.state;
    const rise = st === "rise" ? easeOut(B.rise) : 1;
    const x = lerp(B.lx, b.x, alpha), y = lerp(B.ly, b.y + B.hopY, alpha) - (1 - rise) * 3.4, z = lerp(B.lz, b.z, alpha);
    o.position.set(x, y, z);
    o.rotation.y = B.yaw;
    // Jiggles as it shuffles, squats before a hop, shakes in the red.
    const hot = st === "whistle" ? 0.05 + B.t * 0.02 : st === "down" ? 0.06 : B.pressure > 0.75 ? 0.015 : 0;
    const crouch = st === "hop" && B.t < 0.55 ? Math.min(1, B.t / 0.4) : 0;
    N.body.rotation.set(Math.sin(t * 47) * hot, 0, Math.sin(t * 41) * hot + Math.sin(t * 8) * 0.02 * Math.min(1, b.speed2D));
    N.body.scale.set(1 + crouch * 0.1, 1 - crouch * 0.15 + (B.hopY > 0.5 ? 0.06 : 0), 1 + crouch * 0.1);
    N.needle.rotation.z = 2 - B.pressure * 4 + (st === "whistle" ? Math.sin(t * 50) * 0.1 : 0);
    N.valve.rotation.y += dt * (st === "whistle" ? 40 : 2 + B.pressure * 8);
    // The lid: lifted a little, rattling, flying off and dropping back on.
    this.rattleKick = Math.max(0, (this.rattleKick || 0) - dt * 4);
    const L = this.lid; L.t += dt;
    const jig = (B.rattle * 0.06 + this.rattleKick * 0.08) * Math.sin(t * 60);
    if (B.lidOff) {
      const k = Math.min(1, L.t / 0.9);
      N.lid.position.set(2.5 * k, 2.25 + 6 * k * (1.6 - k), 0);
      N.lid.rotation.set(k * 3, 0, k * 2);
      N.lid.visible = k < 1;
    } else {
      const k = L.off === false && L.t < 0.4 ? 1 - L.t / 0.4 : 0;
      N.lid.visible = true;
      N.lid.position.set(0, 2.25 + B.lidUp * 0.4 + k * 3 + Math.abs(jig), 0);
      N.lid.rotation.set(jig, 0, jig * 0.7);
    }
    N.core.visible = B.lidOff;
    if (B.lidOff && Math.random() < dt * 30) this.fx.spark(x + (Math.random() - 0.5) * 2, y + 2.4, z + (Math.random() - 0.5) * 2, 0, 3 + Math.random() * 2, 0, 0.8, 0.12, Math.random() < 0.5 ? 0xffffff : C.dreamPink, -1);
    if ((st === "whistle" || B.pressure > 0.8) && !B.lidOff && Math.random() < dt * 25) this.fx.spark(x, y + 3.3, z + 0.5, (Math.random() - 0.5), 4, (Math.random() - 0.5), 0.5, 0.1, 0xffffff, -1);
    // Steam jets.
    for (let i = 0; i < 2; i++) {
      const j = this.jets[i], a = B.jets[i];
      j.visible = a !== undefined;
      if (!j.visible) continue;
      const len = 11;
      j.position.set(x - Math.sin(a) * 1.5, y + 0.55, z - Math.cos(a) * 1.5);
      j.rotation.set(0, a, 0);
      j.scale.set(1 + Math.sin(t * 30 + i) * 0.1, 1, len);
      if (Math.random() < 0.8) { const u = Math.random() * len; this.fx.spark(j.position.x - Math.sin(a) * u, y + 0.55 + (Math.random() - 0.5) * 0.4, j.position.z - Math.cos(a) * u, -Math.sin(a) * 6, 0.8, -Math.cos(a) * 6, 0.35, 0.12, 0xffffff, 0); }
    }
    // Steam about to come: puffs at the vents.
    if (st === "steam" && !B.jets.length && Math.random() < 0.6) { const a = Math.random() * Math.PI * 2; this.fx.puff(x + Math.cos(a) * 1.6, y + 0.5, z + Math.sin(a) * 1.6, 0.5); }
    // A hop's landing spot.
    this.ring.visible = !!B.mark;
    if (B.mark) {
      const k = Math.min(1, B.t / 1.4);
      this.ring.position.set(B.mark[0], B.mark[1] + 0.06, B.mark[2]);
      this.ring.scale.setScalar(B.mark[3] * (1.6 - 0.6 * k));
    }
    const flash = B.flash > 0.6;
    if (flash !== this.flashing) { for (const m of this.meshes) m.material = flash ? FLASH : m.userData.mat; this.flashing = flash; }
  }
}

// ── Whichever nightmare the dream has ──
// One view per boss kind, made when that boss first shows up.
const VIEWS = { vacuum: VacuumBossView, pen: PenBossView, cooker: CookerBossView };

export class BossView {
  constructor(scene, fx) { this.scene = scene; this.fx = fx; this.views = {}; this.curtain = null; }
  view(kind) { return (this.views[kind] ??= new VIEWS[kind](this.scene, this.fx)); }
  clear() { for (const v of Object.values(this.views)) v.clear(); this.dropCurtain(); }
  onEvent(e, run) {
    if (e.type === "bossReset") { this.clear(); return; }
    if (run.boss) this.view(run.boss.kind).onEvent(e, run);
  }
  update(run, alpha, dt, t) {
    if (run.boss) this.view(run.boss.kind).update(run, alpha, dt, t);
    // The arena's dream curtain: up while the fight lasts.
    if (run.sealed && !this.curtain) this.raiseCurtain(run);
    if (!run.sealed && this.curtain) this.dropCurtain();
    if (this.curtain) this.curtain.material.uniforms.time.value = t;
  }

  // Four shimmering pink sheets round the arena, fading upwards.
  raiseCurtain(run) {
    const S = run.sealed, y = run.boss ? run.boss.y : 0, H = 7;
    const geo = new T.BufferGeometry(), pos = [], uv = [];
    const corners = [[S.minX, S.minZ], [S.maxX, S.minZ], [S.maxX, S.maxZ], [S.minX, S.maxZ]];
    let u = 0;
    for (let i = 0; i < 4; i++) {
      const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4], L = Math.hypot(x1 - x0, z1 - z0);
      pos.push(x0, y - 0.5, z0, x1, y - 0.5, z1, x1, y + H, z1, x0, y - 0.5, z0, x1, y + H, z1, x0, y + H, z0);
      uv.push(u, 0, u + L, 0, u + L, 1, u, 0, u + L, 1, u, 1);
      u += L;
    }
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
      uniforms: { time: { value: 0 } },
      vertexShader: "varying vec2 vU; void main() { vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float time; varying vec2 vU;
        void main() {
          float fade = pow(1.0 - vU.y, 1.6);
          float bands = pow(0.5 + 0.5 * sin(vU.x * 2.2 + time * 1.5 + sin(vU.y * 6.0 - time) * 1.2), 3.0);
          float rise = 0.6 + 0.4 * sin(vU.y * 18.0 - time * 4.0);
          gl_FragColor = vec4(vec3(1.0, 0.4, 0.8) * fade * (0.08 + bands * rise * 0.3), 1.0);
        }`,
    });
    this.curtain = new T.Mesh(geo, mat);
    this.curtain.renderOrder = 5;
    this.scene.add(this.curtain);
  }
  dropCurtain() {
    if (!this.curtain) return;
    this.scene.remove(this.curtain);
    this.curtain.geometry.dispose(); this.curtain.material.dispose();
    this.curtain = null;
  }
}
