import * as T from "three";

// ── Effects ──────────────────────────────────────────────────────────────
// Pooled, instanced and unlit (so bloom catches them): sparks, bolts that
// fly from the muzzle to what they hit, and flat rings that flash where a
// bolt lands. One draw call per kind.

const MAX_SPARKS = 500, MAX_BOLTS = 32, MAX_RINGS = 24;
const _m = new T.Matrix4(), _q = new T.Quaternion(), _p = new T.Vector3(), _s = new T.Vector3(), _c = new T.Color();
const _z = new T.Vector3(0, 0, 1), _d = new T.Vector3();

function pool(geo, max) {
  const mat = new T.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
  const mesh = new T.InstancedMesh(geo, mat, max);
  mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

export class Fx {
  constructor(scene) {
    this.sparkMesh = pool(new T.OctahedronGeometry(1, 0), MAX_SPARKS);
    this.boltMesh = pool(new T.CylinderGeometry(1, 1, 1, 6, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.5), MAX_BOLTS);
    this.ringMesh = pool(new T.RingGeometry(0.6, 1, 20), MAX_RINGS);
    scene.add(this.sparkMesh, this.boltMesh, this.ringMesh);
    this.sparks = []; this.bolts = []; this.rings = [];
  }

  spark(x, y, z, vx, vy, vz, life, size, color, grav = 6) {
    if (this.sparks.length >= MAX_SPARKS) this.sparks.shift();
    this.sparks.push({ x, y, z, vx, vy, vz, life, max: life, size, color, grav, spin: Math.random() * 6 });
  }

  // A burst of sparks off a surface with normal n.
  burst(p, n, color, count = 10, speed = 4, size = 0.05) {
    for (let i = 0; i < count; i++) {
      const rx = Math.random() * 2 - 1, ry = Math.random() * 2 - 1, rz = Math.random() * 2 - 1;
      const k = speed * (0.4 + Math.random() * 0.8);
      this.spark(p[0] + n[0] * 0.03, p[1] + n[1] * 0.03, p[2] + n[2] * 0.03,
        (n[0] + rx * 0.8) * k, (n[1] + ry * 0.8) * k + 1, (n[2] + rz * 0.8) * k,
        0.25 + Math.random() * 0.35, size * (0.6 + Math.random() * 0.8), color);
    }
  }

  // from/to: [x, y, z]; the bolt races along the line in `time` seconds.
  bolt(from, to, color, width = 0.025, speed = 140) {
    if (this.bolts.length >= MAX_BOLTS) this.bolts.shift();
    const len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    this.bolts.push({ from, to, len, t: 0, dur: Math.max(0.03, len / speed), fade: 0.09, color, width });
  }

  ring(p, n, color, size = 0.5, life = 0.25) {
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    this.rings.push({ p, n, color, size, life, max: life });
  }

  update(dt) {
    // Sparks.
    let i = 0;
    const S = this.sparkMesh;
    for (const s of this.sparks) {
      s.life -= dt;
      if (s.life <= 0) continue;
      s.vy -= s.grav * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      s.vx *= 1 - 2 * dt; s.vz *= 1 - 2 * dt;
      s.spin += dt * 8;
      const k = s.life / s.max;
      _p.set(s.x, s.y, s.z);
      _q.setFromAxisAngle(_z, s.spin);
      _s.setScalar(s.size * (0.3 + 0.7 * k));
      S.setMatrixAt(i, _m.compose(_p, _q, _s));
      S.setColorAt(i, _c.set(s.color).multiplyScalar(1.5 * k + 0.3));
      i++;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    S.count = i;
    S.instanceMatrix.needsUpdate = true;
    if (S.instanceColor) S.instanceColor.needsUpdate = true;

    // Bolts: a bright head racing to the target, the trail behind it fading.
    i = 0;
    const B = this.boltMesh;
    for (const b of this.bolts) {
      b.t += dt;
      const u = Math.min(1, b.t / b.dur);
      const fade = b.t > b.dur ? 1 - (b.t - b.dur) / b.fade : 1;
      if (fade <= 0) continue;
      const head = u, tail = Math.max(0, u - 12 / Math.max(b.len, 1)) * (b.t > b.dur ? 1 : 1);
      const f = b.from, t = b.to;
      const hx = f[0] + (t[0] - f[0]) * head, hy = f[1] + (t[1] - f[1]) * head, hz = f[2] + (t[2] - f[2]) * head;
      const tx = f[0] + (t[0] - f[0]) * tail, ty = f[1] + (t[1] - f[1]) * tail, tz = f[2] + (t[2] - f[2]) * tail;
      _d.set(tx - hx, ty - hy, tz - hz);
      const len = _d.length();
      if (len < 1e-4) continue;
      _q.setFromUnitVectors(_z, _d.multiplyScalar(-1 / len));
      _p.set(tx, ty, tz);
      _s.set(b.width * fade, b.width * fade, len);
      B.setMatrixAt(i, _m.compose(_p, _q, _s));
      B.setColorAt(i, _c.set(b.color).multiplyScalar(2.2 * fade));
      i++;
    }
    this.bolts = this.bolts.filter((b) => b.t < b.dur + b.fade);
    B.count = i;
    B.instanceMatrix.needsUpdate = true;
    if (B.instanceColor) B.instanceColor.needsUpdate = true;

    // Rings: grow and fade, facing out of the surface.
    i = 0;
    const R = this.ringMesh;
    for (const r of this.rings) {
      r.life -= dt;
      if (r.life <= 0) continue;
      const k = r.life / r.max;
      _p.set(r.p[0] + r.n[0] * 0.02, r.p[1] + r.n[1] * 0.02, r.p[2] + r.n[2] * 0.02);
      _q.setFromUnitVectors(_z, _d.set(r.n[0], r.n[1], r.n[2]));
      _s.setScalar(r.size * (1.4 - k));
      R.setMatrixAt(i, _m.compose(_p, _q, _s));
      R.setColorAt(i, _c.set(r.color).multiplyScalar(1.8 * k));
      i++;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    R.count = i;
    R.instanceMatrix.needsUpdate = true;
    if (R.instanceColor) R.instanceColor.needsUpdate = true;
  }
}
