import * as T from "three";
import { Builder, SHAPE as S, shade, MAT } from "./modelkit.js";
import { MODELS } from "./models/index.js";

// ── The static level: ground and everything built on it ──────────────────
// The heightfield becomes flat-shaded triangles in chunks (each triangle
// one colour from the level's ground function); blocks, ramps and props
// are baked into chunked meshes per material. Static: built once.

const CHUNK = 32;    // cells per ground chunk side

export function groundMeshes(kit) {
  const T0 = kit.terrain, n = T0.n, cell = T0.cell, out = [];
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const col = new T.Color();
  for (let cj = 0; cj < n; cj += CHUNK) for (let ci = 0; ci < n; ci += CHUNK) {
    const ni = Math.min(CHUNK, n - ci), nj = Math.min(CHUNK, n - cj);
    const pos = new Float32Array(ni * nj * 18), cols = new Float32Array(ni * nj * 18);
    let o = 0;
    const put = (i, j, c) => {
      const x = T0.x0 + i * cell, z = T0.z0 + j * cell;
      pos[o] = x; pos[o + 1] = T0.corner(i, j); pos[o + 2] = z;
      cols[o] = c.r; cols[o + 1] = c.g; cols[o + 2] = c.b;
      o += 3;
    };
    for (let j = cj; j < cj + nj; j++) for (let i = ci; i < ci + ni; i++) {
      // Two triangles, split as the sim splits them.
      for (const tri of [[[i, j], [i, j + 1], [i + 1, j]], [[i + 1, j + 1], [i + 1, j], [i, j + 1]]]) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cz = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const wx = T0.x0 + cx * cell, wz = T0.z0 + cz * cell;
        const h = T0.height(wx, wz), sl = T0.slope(wx, wz);
        col.setHex(kit.ground(wx, wz, h, sl));
        const f = 0.94 + ((Math.sin(wx * 12.9898 + wz * 78.233) * 43758.5453) % 1 + 1) % 1 * 0.1;
        col.multiplyScalar(f);
        for (const [a, b] of tri) put(a, b, col);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3));
    g.setAttribute("color", new T.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = new T.Mesh(g, mat);
    m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    out.push(m);
  }
  return out;
}

// Props that move or change (doors, vents, the generator) are kept apart.
const DYNAMIC = new Set(["bunkerDoor", "vent", "generator", "relayTower"]);

// Blocks, wedges and props: one Builder, cut into chunks. Returns
// { meshes, dynamic: [{ model, obj, d }] }.
export function staticMeshes(kit) {
  const b = new Builder(), dynamic = [];
  for (const d of kit.draw) {
    if (d.kind === "model" && DYNAMIC.has(d.model)) {
      const mb = new Builder();
      MODELS[d.model](mb, d.opts);
      const obj = mb.toObject3D();
      obj.position.set(d.x, d.y, d.z); obj.rotation.y = d.yaw; obj.scale.setScalar(d.s);
      dynamic.push({ model: d.model, obj, d });
      continue;
    }
    if (d.kind === "block") {
      const L = d.look, h = d.y1 - d.y0, side = L.side ?? 0x888888;
      b.at([d.x, d.y0 + h / 2, d.z], [0, d.yaw, 0], 1, (q) => {
        q.add(S.box(d.w, h, d.d, Math.min(L.bevel ?? 0.05, h / 3)), { c: side, grad: [L.bottom ?? shade(side, 0.75), side] });
        q.add(S.box(d.w - 0.02, 0.04, d.d - 0.02, 0), { p: [0, h / 2 - 0.01, 0], c: L.top ?? shade(side, 1.1) });
        if (L.stripe && h > 2) q.add(S.box(d.w + 0.02, 0.18, d.d + 0.02, 0), { p: [0, -h / 2 + Math.min(1.2, h * 0.3), 0], c: L.stripe });
      });
    } else if (d.kind === "wedge") {
      const L = d.look;
      b.at([d.x, d.y0, d.z], [0, d.yaw, 0], 1, (q) => q.add(S.wedge(d.w, d.d, d.ya - d.y0, d.yb - d.y0), { c: L.side ?? 0x888888, grad: [L.bottom ?? 0x555555, L.top ?? 0x999999] }));
    } else if (d.kind === "model") {
      const fn = MODELS[d.model];
      if (!fn) continue;
      const mb = new Builder();
      fn(mb, { ...d.opts, seed: Math.round(d.x * 7 + d.z * 13) & 63 });
      const m = new T.Matrix4().compose(new T.Vector3(d.x, d.y, d.z), new T.Quaternion().setFromEuler(new T.Euler(0, d.yaw, 0)), new T.Vector3(d.s, d.s, d.s));
      mb.flattenInto(b, m);
    }
  }
  return { meshes: b.buildChunks(40), dynamic };
}

export { MAT };
