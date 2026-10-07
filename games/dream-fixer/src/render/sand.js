import * as T from "three";

// ── Dream sand on screen ─────────────────────────────────────────────────
// A pinch is a spray of glittering grains from the sack's mouth along the
// view; a sandy glitch sheds a few. A sand path is a low dune that runs
// out from your feet as it is poured, ripples on top, trickles sand off
// its edges, flickers for its last seconds and then sifts away.

const GOLD = 0xffe0a0, LILAC = 0xd8b8ff, SAND = 0xe8c890;
const GROW = 0.35;             // seconds a path takes to run out to its end
const LIFT = 0.09;             // drawn a touch above its solid top (no flicker against a floor)

export class SandView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx;
    this.group = new T.Group();
    scene.add(this.group);
    this.paths = new Map();    // path id → { o, mat, t }
  }

  clear() {
    for (const p of this.paths.values()) { p.o.geometry.dispose(); p.mat.dispose(); }
    this.group.clear();
    this.paths.clear();
  }

  // muzzle: where the sack's mouth is in the world now.
  onEvent(e, run, muzzle) {
    const fx = this.fx;
    if (e.type === "sandPinch") {
      const [dx, dy, dz] = run.aimDir(), v = 11;
      for (let i = 0; i < 12; i++) {
        const s = 0.32, jx = (Math.random() - 0.5) * s, jy = (Math.random() - 0.5) * s, jz = (Math.random() - 0.5) * s;
        fx.spark(muzzle[0], muzzle[1], muzzle[2], (dx + jx) * v, (dy + jy) * v + 1, (dz + jz) * v, 0.45 + Math.random() * 0.25, 0.025 + Math.random() * 0.02, Math.random() < 0.7 ? GOLD : LILAC, 4);
      }
    } else if (e.type === "foeSandy") {
      for (let i = 0; i < 3; i++) fx.spark(e.x + (Math.random() - 0.5) * 0.6, e.y + 0.3, e.z + (Math.random() - 0.5) * 0.6, 0, -0.6, 0, 0.6, 0.03, GOLD, 2);
    } else if (e.type === "sandPath") {
      const p = run.sand.paths.find((q) => q.id === e.id);
      if (p) this.add(p);
    } else if (e.type === "sandGone") {
      const v = this.paths.get(e.id);
      if (v) {
        const { p } = v;
        for (let i = 0; i < 40; i++) {
          const u = Math.random(), x = p.x - Math.sin(p.yaw) * (u - 0.5) * p.len, z = p.z - Math.cos(p.yaw) * (u - 0.5) * p.len;
          fx.spark(x + (Math.random() - 0.5) * p.w, p.ya + (p.yb - p.ya) * u, z + (Math.random() - 0.5) * p.w, (Math.random() - 0.5), Math.random(), (Math.random() - 0.5), 0.8 + Math.random() * 0.5, 0.05, Math.random() < 0.8 ? SAND : GOLD, 8);
        }
        fx.puff(e.x, e.y, e.z, 1.2);
        this.group.remove(v.o); v.o.geometry.dispose(); v.mat.dispose();
        this.paths.delete(e.id);
      }
    } else if (e.type === "sandFizzle") {
      for (let i = 0; i < 8; i++) fx.spark(e.x + (Math.random() - 0.5) * 0.5, e.y + 0.2, e.z + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2, 0.5, 0.03, GOLD, 6);
    }
  }

  // A dune from the back end of the path (its pivot) running out along −z.
  add(p) {
    const y0 = Math.min(p.ya, p.yb) - p.thick, L = p.len, segs = Math.max(4, Math.round(L * 2));
    const g = new T.BoxGeometry(p.w, 1, L, 3, 1, segs).toNonIndexed();
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i) - L / 2, u = -z / L;           // 0 at the back end, 1 at the front
      const x = pos.getX(i);
      if (pos.getY(i) > 0) {
        // The top: along the slope, rippled; the long edges slump a little.
        const edge = Math.abs(x) > p.w * 0.3 ? -0.08 : 0;
        pos.setY(i, p.ya - y0 + LIFT + (p.yb - p.ya) * u + Math.sin(u * L * 5.5) * 0.035 + edge);
      } else pos.setY(i, 0);
      // The sides bulge out a touch at the bottom.
      if (pos.getY(i) === 0) pos.setX(i, x * 1.12);
      pos.setZ(i, z);
    }
    g.computeVertexNormals();
    const mat = new T.MeshStandardMaterial({ color: SAND, roughness: 0.95, flatShading: true, emissive: 0x3a2410, transparent: true, opacity: 1 });
    const o = new T.Mesh(g, mat);
    o.castShadow = true; o.receiveShadow = true;
    // Its back end: half a metre behind where you stood.
    o.position.set(p.x + Math.sin(p.yaw) * L / 2, y0, p.z + Math.cos(p.yaw) * L / 2);
    o.rotation.y = p.yaw;
    o.scale.z = 0.01;
    this.group.add(o);
    this.paths.set(p.id, { o, mat, p, trickle: 0 });
  }

  update(run, dt, t) {
    for (const p of run.sand.paths) {
      const v = this.paths.get(p.id);
      if (!v) continue;
      // Running out as it is poured.
      v.o.scale.z = Math.min(1, p.t / GROW);
      // Its last seconds: it flickers and sinks a little.
      const left = p.life - p.t, warn = left < p.warn;
      v.mat.emissive.setHex(warn && Math.sin(t * (10 + (p.warn - left) * 6)) > 0 ? 0x7a5a20 : 0x3a2410);
      v.mat.opacity = warn ? 0.6 + 0.4 * left / p.warn : 1;
      // Sand trickling off its edges.
      v.trickle -= dt * (warn ? 30 : 8);
      while (v.trickle < 0) {
        v.trickle += 1;
        const u = Math.random() * Math.min(1, p.t / GROW), s = Math.random() < 0.5 ? -1 : 1;
        const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = -fz, rz = fx;
        const along = (u - 0.08) * p.len;
        const x = v.o.position.x + fx * along + rx * s * p.w * 0.55, z = v.o.position.z + fz * along + rz * s * p.w * 0.55;
        this.fx.spark(x, p.ya + (p.yb - p.ya) * u - 0.1, z, 0, -0.3, 0, 1, 0.03, Math.random() < 0.85 ? SAND : GOLD, 9);
      }
    }
  }
}
