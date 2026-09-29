import * as T from "three";
import { make } from "./modelkit.js";
import { vacuumBoss } from "./models/boss.js";
import { C } from "./palette.js";
import { lerp, damp } from "../config.js";

// ── The Vacuum Cleaner on screen ─────────────────────────────────────────
// Rises out of the lawn in a cloud, rolls about, aims its hose, puffs up
// before it sucks (with a stream of flecks into the nozzle), shakes and
// coughs when clogged, and lashes its cord round as an expanding ring.

const FLASH = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

export class BossView {
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
      for (let i = 0; i < 6; i++) this.fx.puff(e.x + (Math.random() - 0.5) * 3, run.kit.floorAt(e.x, e.z) + 0.5, e.z + (Math.random() - 0.5) * 3, 2.2);
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
