import * as T from "three";

// ── Static batching ──────────────────────────────────────────────────────
// Every static prop of an arena (stones, trees, pillars, fences …) is
// collected here as (geometry, transform, colour) and merged into one mesh
// per material, so a whole graveyard is a handful of draw calls.

const _q = new T.Quaternion();
const _e = new T.Euler();
const _p = new T.Vector3();
const _s = new T.Vector3();
const _c = new T.Color();

export class Batch {
  constructor() { this.parts = []; }

  // pos [x, y, z] in three space, rot [rx, ry, rz] or a quaternion, scale [sx, sy, sz].
  add(geo, pos, rot, scale, color) {
    _p.set(pos[0], pos[1], pos[2]);
    if (rot?.isQuaternion) _q.copy(rot);
    else _q.setFromEuler(_e.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0, "ZXY"));
    _s.set(scale?.[0] ?? 1, scale?.[1] ?? 1, scale?.[2] ?? 1);
    this.parts.push({ geo, m: new T.Matrix4().compose(_p, _q, _s), color });
    return this;
  }
  // Same, with a ready matrix (for grouped props built in local space).
  addMatrix(geo, matrix, color) { this.parts.push({ geo, m: matrix.clone(), color }); return this; }

  build(material) {
    if (!this.parts.length) return null;
    let n = 0;
    const gs = this.parts.map(({ geo, m }) => {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      g.applyMatrix4(m);
      n += g.attributes.position.count;
      return g;
    });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    gs.forEach((g, i) => {
      const cnt = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      _c.set(this.parts[i].color);
      for (let k = 0; k < cnt; k++) { col[(o + k) * 3] = _c.r; col[(o + k) * 3 + 1] = _c.g; col[(o + k) * 3 + 2] = _c.b; }
      o += cnt;
      g.dispose();
    });
    const out = new T.BufferGeometry();
    out.setAttribute("position", new T.BufferAttribute(pos, 3));
    out.setAttribute("normal", new T.BufferAttribute(nor, 3));
    out.setAttribute("color", new T.BufferAttribute(col, 3));
    out.setAttribute("uv", new T.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    const mesh = new T.Mesh(out, material);
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
}

// ── Shared unit geometries ───────────────────────────────────────────────
export const GEO = {
  box: new T.BoxGeometry(1, 1, 1),
  boxUp: new T.BoxGeometry(1, 1, 1).translate(0, 0, 0.5),        // base on the ground
  hang: new T.BoxGeometry(1, 1, 1).translate(0, 0, -0.5),        // pivot at the top (limbs)
  wing: new T.BoxGeometry(1, 1, 1).translate(0.5, 0, 0),
  sph: new T.SphereGeometry(1, 10, 8),
  sphLo: new T.SphereGeometry(1, 7, 5),
  ico: new T.IcosahedronGeometry(1, 0),
  dodeca: new T.DodecahedronGeometry(1, 0),
  cone: new T.ConeGeometry(1, 1, 8).rotateX(Math.PI / 2),         // tip up (+z)
  coneDown: new T.ConeGeometry(1, 1, 8).rotateX(-Math.PI / 2),
  coneFwd: new T.ConeGeometry(1, 1, 6),                          // tip along +y
  cyl: new T.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2), // axis z, centred
  cylUp: new T.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2).translate(0, 0, 0.5),
  cyl6: new T.CylinderGeometry(1, 1, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5),
  taper: new T.CylinderGeometry(0.55, 1, 1, 8).rotateX(Math.PI / 2).translate(0, 0, 0.5),
  disc: new T.CircleGeometry(1, 24),
  ring: new T.RingGeometry(0.86, 1, 48),
  thinRing: new T.RingGeometry(0.95, 1, 64),
  sector: new T.RingGeometry(0.15, 1, 24, 1, 0, 1),
  gem: new T.OctahedronGeometry(1, 0),
  torus: new T.TorusGeometry(1, 0.18, 6, 16),
  plane: new T.PlaneGeometry(1, 1),
};

export const tiltTo = (() => {
  const up = new T.Vector3(0, 0, 1);
  const v = new T.Vector3();
  return (dx, dy, dz) => new T.Quaternion().setFromUnitVectors(up, v.set(dx, dy, dz).normalize());
})();
