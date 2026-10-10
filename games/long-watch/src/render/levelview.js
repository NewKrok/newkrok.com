import * as T from "three";
import { Builder, SHAPE as S, shade, MAT } from "./modelkit.js";
import { MODELS } from "./models/index.js";

// ── The static level: ground and everything built on it ──────────────────
// The heightfield becomes flat-shaded triangles in chunks (each triangle
// one colour from the level's ground function); blocks, ramps and props
// are baked into chunked meshes per material. Static: built once.

const CHUNK = 32;    // cells per ground chunk side

// A detail texture for the ground: dust grain, darker speckles and a few
// hairline cracks, tiled in world space (one tile every TILE metres). It
// multiplies the vertex colours, so the level's ground colours still rule.
const TILE = 9;
function groundTexture() {
  const N = 256, c = document.createElement("canvas");
  c.width = c.height = N;
  const ctx = c.getContext("2d"), img = ctx.createImageData(N, N);
  let s = 1234567;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  // Grain: two octaves of value noise.
  const g1 = new Float32Array(16 * 16), g2 = new Float32Array(64 * 64);
  for (let i = 0; i < g1.length; i++) g1[i] = rnd();
  for (let i = 0; i < g2.length; i++) g2[i] = rnd();
  const sample = (g, n, u, v) => {
    const x = u * n, y = v * n, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const at = (a, b) => g[((b % n) + n) % n * n + ((a % n) + n) % n];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (at(i, j) * (1 - sx) + at(i + 1, j) * sx) * (1 - sy) + (at(i, j + 1) * (1 - sx) + at(i + 1, j + 1) * sx) * sy;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    let k = 0.86 + 0.2 * sample(g1, 16, u, v) + 0.1 * (sample(g2, 64, u, v) - 0.5);
    if (rnd() < 0.015) k *= 0.78;                      // a dark fleck
    const o = (y * N + x) * 4, b = Math.max(0, Math.min(255, Math.round(k * 255)));
    img.data[o] = b; img.data[o + 1] = b; img.data[o + 2] = b; img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // Cracks.
  ctx.strokeStyle = "rgba(40, 20, 15, 0.35)"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    let x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 12; j++) { a += (rnd() - 0.5) * 1.2; x += Math.cos(a) * 9; y += Math.sin(a) * 9; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const tex = new T.CanvasTexture(c);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.colorSpace = T.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// The ground: shared corners, smooth normals, a colour per corner from the
// level's ground function (so the slopes blend rather than show every
// triangle), the detail texture over it, in chunks the camera can cull.
export function groundMeshes(kit) {
  const T0 = kit.terrain, n = T0.n, cell = T0.cell, out = [];
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, map: groundTexture() });
  const col = new T.Color();
  for (let cj = 0; cj < n; cj += CHUNK) for (let ci = 0; ci < n; ci += CHUNK) {
    const ni = Math.min(CHUNK, n - ci), nj = Math.min(CHUNK, n - cj);
    const W = ni + 1, H = nj + 1;
    const pos = new Float32Array(W * H * 3), cols = new Float32Array(W * H * 3), uv = new Float32Array(W * H * 2), nor = new Float32Array(W * H * 3);
    const nn = [0, 1, 0];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const gi = ci + i, gj = cj + j, x = T0.x0 + gi * cell, z = T0.z0 + gj * cell, o = (j * W + i);
      const h = T0.corner(gi, gj);
      pos[o * 3] = x; pos[o * 3 + 1] = h; pos[o * 3 + 2] = z;
      T0.normal(x, z, nn); nor[o * 3] = nn[0]; nor[o * 3 + 1] = nn[1]; nor[o * 3 + 2] = nn[2];   // the field's own normal: no seams between chunks
      col.setHex(kit.ground(x, z, h, T0.slope(x, z)));
      const f = 0.96 + ((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1 + 1) % 1 * 0.08;
      cols[o * 3] = col.r * f; cols[o * 3 + 1] = col.g * f; cols[o * 3 + 2] = col.b * f;
      uv[o * 2] = x / TILE; uv[o * 2 + 1] = z / TILE;
    }
    const idx = new Uint32Array(ni * nj * 6);
    let q = 0;
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
      const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
      // Split as the sim splits them (along the i + j diagonal).
      idx[q++] = a; idx[q++] = c; idx[q++] = b;
      idx[q++] = d; idx[q++] = b; idx[q++] = c;
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3));
    g.setAttribute("color", new T.BufferAttribute(cols, 3));
    g.setAttribute("uv", new T.BufferAttribute(uv, 2));
    g.setIndex(new T.BufferAttribute(idx, 1));
    g.setAttribute("normal", new T.BufferAttribute(nor, 3));
    g.computeBoundingSphere();
    const m = new T.Mesh(g, mat);
    m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    out.push(m);
  }
  return out;
}

// Props that move or change (doors, vents, the generator) are kept apart.
const DYNAMIC = new Set(["bunkerDoor", "vent", "generator", "relayTower", "reactor"]);

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
