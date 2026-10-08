import * as T from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { rng } from "../rng.js";

// ── Low-poly model kit ───────────────────────────────────────────────────
// Every model in the game is code: a builder function draws shapes into a
// Builder (shape, transform, colour, material), and the Builder bakes them
// into one vertex-coloured mesh per material. The look comes from here:
// chamfered edges, flat faces with a hint of per-face variation, and
// top-to-bottom colour gradients that stand in for baked light.
//
// Units are metres, +y is up, a model faces −z (the way the camera looks).

// ── Colours ──────────────────────────────────────────────────────────────
export function mix(a, b, t) {
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
export function vary(hex, rnd, k = 0.1) {
  const f = 1 + (rnd() - 0.5) * 2 * k;
  const ch = (s) => Math.min(255, Math.round(((hex >> s) & 255) * f));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
export const shade = (hex, f) => mix(hex, f < 1 ? 0x000000 : 0xffffff, f < 1 ? 1 - f : f - 1);

export { rng } from "../rng.js";

// ── Shapes ───────────────────────────────────────────────────────────────
// Geometries are cached by their parameters: the Builder only reads them.
const cache = new Map();
const cached = (key, make) => {
  let g = cache.get(key);
  if (!g) { g = make(); g.userData.shared = true; cache.set(key, g); }
  return g;
};
const r3 = (v) => Math.round(v * 1000) / 1000;

export const SHAPE = {
  // Box centred on the origin; `b` chamfers every edge.
  box(w, h, d, b = 0) {
    return cached(`box${r3(w)},${r3(h)},${r3(d)},${r3(b)}`, () => {
      if (b <= 0) return new T.BoxGeometry(w, h, d);
      b = Math.min(b, w / 2.01, h / 2.01, d / 2.01);
      const x = w / 2, y = h / 2, z = d / 2, pts = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        pts.push(new T.Vector3(sx * x, sy * (y - b), sz * (z - b)));
        pts.push(new T.Vector3(sx * (x - b), sy * y, sz * (z - b)));
        pts.push(new T.Vector3(sx * (x - b), sy * (y - b), sz * z));
      }
      return new ConvexGeometry(pts);
    });
  },
  // Cylinder along y, centred; different top and bottom radii make a taper.
  // `b` chamfers both rims.
  cyl(rTop, rBot, h, seg = 8, b = 0) {
    return cached(`cyl${r3(rTop)},${r3(rBot)},${r3(h)},${seg},${r3(b)}`, () => {
      if (b <= 0) return new T.CylinderGeometry(rTop, rBot, h, seg, 1);
      const y = h / 2;
      return lathe([[0, -y], [rBot - b, -y], [rBot, -y + b], [rTop, y - b], [rTop - b, y], [0, y]], seg);
    });
  },
  // Surface of revolution from [radius, y] pairs, bottom to top.
  lathe(profile, seg = 10) {
    return cached(`lathe${seg}:${profile.map((p) => p.map(r3).join(",")).join(";")}`, () => lathe(profile, seg));
  },
  sphere(r, detail = 1) {
    return cached(`sph${r3(r)},${detail}`, () => new T.IcosahedronGeometry(r, detail));
  },
  // UV sphere: rounder silhouette for eyes, heads and balls.
  ball(r, w = 10, h = 7) {
    return cached(`ball${r3(r)},${w},${h}`, () => new T.SphereGeometry(r, w, h));
  },
  // A lumpy rock / bush / cloud: an icosphere pushed in and out by a seeded noise.
  blob(r, seed = 1, rough = 0.18, detail = 1) {
    return cached(`blob${r3(r)},${seed},${r3(rough)},${detail}`, () => {
      const g = new T.IcosahedronGeometry(r, detail);
      const p = g.attributes.position;
      const rnd = rng(seed);
      const bumps = Array.from({ length: 5 }, () => [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1, 0.5 + rnd()]);
      const v = new T.Vector3();
      const seen = new Map();          // keep shared corners together, or the blob tears
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const key = `${r3(v.x)},${r3(v.y)},${r3(v.z)}`;
        let f = seen.get(key);
        if (f === undefined) {
          const n = v.clone().normalize();
          f = 1;
          for (const [bx, by, bz, a] of bumps) f += rough * a * Math.sin(3.1 * (n.x * bx + n.y * by + n.z * bz) + a * 5);
          seen.set(key, f);
        }
        p.setXYZ(i, v.x * f, v.y * f, v.z * f);
      }
      return g;
    });
  },
  cone(r, h, seg = 8) {
    return cached(`cone${r3(r)},${r3(h)},${seg}`, () => new T.ConeGeometry(r, h, seg, 1));
  },
  // Capsule along y; `len` is the straight middle part.
  capsule(r, len, radial = 8, cap = 2) {
    return cached(`cap${r3(r)},${r3(len)},${radial},${cap}`, () => new T.CapsuleGeometry(r, len, cap, radial));
  },
  torus(R, r, radial = 6, tubular = 14, arc = Math.PI * 2) {
    return cached(`tor${r3(R)},${r3(r)},${radial},${tubular},${r3(arc)}`, () => new T.TorusGeometry(R, r, radial, tubular, arc));
  },
  // A flat outline [[x, y], …] extruded along z (centred), with a bevel.
  extrude(outline, depth, bevel = 0, curveSeg = 1) {
    return cached(`ext${r3(depth)},${r3(bevel)},${curveSeg}:${outline.map((p) => p.map(r3).join(",")).join(";")}`, () => {
      const s = new T.Shape(outline.map(([x, y]) => new T.Vector2(x, y)));
      const g = new T.ExtrudeGeometry(s, {
        depth: Math.max(0.0001, depth - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel,
        bevelSize: bevel, bevelSegments: 1, curveSegments: curveSeg,
      });
      g.translate(0, 0, -depth / 2 + bevel);
      return g;
    });
  },
  // Ramp: w along x, rising from h0 at −x to h1 at +x, depth d along z;
  // base at y = 0, centred in x and z.
  wedge(w, d, h0, h1) {
    return cached(`wedge${r3(w)},${r3(d)},${r3(h0)},${r3(h1)}`, () => {
      const x = w / 2, z = d / 2;
      const raw = [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [-x, h0, -z], [x, h1, -z], [x, h1, z], [-x, h0, z]];
      const seen = new Set();
      const pts = raw.filter(([a, y, c]) => { const k = `${a},${Math.max(0, y)},${c}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .map(([a, y, c]) => new T.Vector3(a, Math.max(0, y), c));
      return new ConvexGeometry(pts);
    });
  },
};

function lathe(profile, seg) {
  const pts = profile.map(([r, y]) => new T.Vector2(Math.max(0, r), y));
  return new T.LatheGeometry(pts, seg);
}

// ── Materials ────────────────────────────────────────────────────────────
// Four shared materials; every mesh uses vertex colours.
export const MAT = {
  solid: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }),
  metal: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.8 }),
  glass: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.42, depthWrite: false }),
  glow: new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
};
const MAT_ORDER = ["solid", "metal", "glass", "glow"];

// ── Builder ──────────────────────────────────────────────────────────────
const _m = new T.Matrix4();
const _q = new T.Quaternion();
const _e = new T.Euler();
const _p = new T.Vector3();
const _s = new T.Vector3();
const _c = new T.Color();
const _c2 = new T.Color();

// [x, y, z] position, [rx, ry, rz] rotation (radians, YXZ order so yaw
// comes first), scale as a number or [sx, sy, sz].
export function compose(p, r, s, out = new T.Matrix4()) {
  _p.set(p?.[0] || 0, p?.[1] || 0, p?.[2] || 0);
  if (r?.isQuaternion) _q.copy(r);
  else _q.setFromEuler(_e.set(r?.[0] || 0, r?.[1] || 0, r?.[2] || 0, "YXZ"));
  if (typeof s === "number") _s.set(s, s, s);
  else _s.set(s?.[0] ?? 1, s?.[1] ?? 1, s?.[2] ?? 1);
  return out.compose(_p, _q, _s);
}

export class Builder {
  constructor() {
    this.parts = [];                 // { geo, m, c, grad, mat, facet, glow, smooth }
    this.children = [];              // animated sub-parts: { name, b, m }
    this.stack = [new T.Matrix4()];
  }
  get m() { return this.stack[this.stack.length - 1]; }

  // Draw in a moved/rotated/scaled frame: b.at([0, 1, 0], [0, a, 0], 1, () => …).
  at(p, r, s, fn) {
    this.stack.push(this.m.clone().multiply(compose(p, r, s, _m)));
    fn(this);
    this.stack.pop();
    return this;
  }

  // One shape. o: { p, r, s, c (colour), grad: [bottom, top] colours along
  // the shape's own y, mat: "solid" | "metal" | "glass" | "glow", facet
  // (per-face shade variation, default 0.05), glow (brightness for "glow"),
  // smooth (keep the shape's own normals) }.
  add(geo, o = {}) {
    const m = this.m.clone().multiply(compose(o.p, o.r, o.s, _m));
    this.parts.push({
      geo, m, c: o.c ?? 0xcccccc, grad: o.grad, mat: o.mat || "solid",
      facet: o.facet ?? 0.05, glow: o.glow ?? 1.6, smooth: !!o.smooth, seed: this.parts.length * 7 + 3,
    });
    return this;
  }

  // Mirror helper: draw fn(side) once for −1 and once for +1.
  both(fn) { fn(-1); fn(1); return this; }

  // A named sub-part that can move on its own (a wheel, a propeller, a
  // trigger). Its pivot is p / r in the current frame.
  node(name, p, r, fn) {
    const b = new Builder();
    this.children.push({ name, b, m: this.m.clone().multiply(compose(p, r, 1, _m)) });
    fn(b);
    return b;
  }

  // ── Output ─────────────────────────────────────────────────────────────
  // An Object3D: one mesh per material, children for the named nodes.
  // obj.userData.nodes[name] gives the node objects for animation.
  toObject3D({ shadows = true } = {}) {
    const root = new T.Group();
    root.userData.nodes = {};
    this._fill(root, root.userData.nodes, shadows);
    return root;
  }
  _fill(group, nodes, shadows) {
    for (const mat of MAT_ORDER) {
      const parts = this.parts.filter((p) => p.mat === mat);
      if (!parts.length) continue;
      const mesh = new T.Mesh(bake(parts, new T.Matrix4()), MAT[mat]);
      mesh.castShadow = shadows && (mat === "solid" || mat === "metal");
      mesh.receiveShadow = shadows && mat !== "glow";
      group.add(mesh);
    }
    for (const ch of this.children) {
      const g = new T.Group();
      ch.m.decompose(g.position, g.quaternion, g.scale);
      g.name = ch.name;
      nodes[ch.name] = g;
      ch.b._fill(g, nodes, shadows);
      group.add(g);
    }
  }

  // Everything (nodes included, at rest) folded into `into` under matrix m:
  // for static props that get merged into a level.
  flattenInto(into, m = new T.Matrix4()) {
    for (const p of this.parts) into.parts.push({ ...p, m: m.clone().multiply(p.m) });
    for (const ch of this.children) ch.b.flattenInto(into, m.clone().multiply(ch.m));
    return into;
  }

  // Static meshes split into square chunks of the ground (x, z), so the
  // camera can skip what it cannot see. One mesh per (chunk, material).
  buildChunks(size = 24, { shadows = true } = {}) {
    const cells = new Map();
    for (const p of this.parts) {
      const key = `${p.mat}:${Math.floor(p.m.elements[12] / size)},${Math.floor(p.m.elements[14] / size)}`;
      let arr = cells.get(key);
      if (!arr) cells.set(key, arr = []);
      arr.push(p);
    }
    const meshes = [];
    for (const [key, parts] of cells) {
      const mat = key.slice(0, key.indexOf(":"));
      const mesh = new T.Mesh(bake(parts, null), MAT[mat]);
      mesh.castShadow = shadows && (mat === "solid" || mat === "metal");
      mesh.receiveShadow = mat !== "glow";
      mesh.matrixAutoUpdate = false;
      meshes.push(mesh);
    }
    return meshes;
  }
}

// Parts → one non-indexed BufferGeometry with flat normals and colours.
const _v = new T.Vector3();
const _n = new T.Vector3();
const _nm = new T.Matrix3();
function bake(parts) {
  let count = 0;
  const srcs = parts.map((p) => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    count += g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  let o = 0;
  parts.forEach((p, i) => {
    const g = srcs[i];
    const P = g.attributes.position, N = g.attributes.normal;
    const n = P.count;
    // Gradient runs along the shape's own y.
    let y0 = 0, y1 = 1;
    if (p.grad) {
      if (!g.boundingBox) g.computeBoundingBox();
      y0 = g.boundingBox.min.y; y1 = g.boundingBox.max.y;
    }
    _nm.getNormalMatrix(p.m);
    const glow = p.mat === "glow" ? p.glow : 1;
    let seed = p.seed;
    for (let t = 0; t < n; t += 3) {
      // One shade offset per triangle: the faceted look.
      seed = (seed * 16807) % 2147483647;
      const jit = 1 + ((seed / 2147483647) - 0.5) * 2 * p.facet;
      for (let k = 0; k < 3; k++) {
        const j = t + k, q = (o + j) * 3;
        _v.fromBufferAttribute(P, j);
        if (p.grad) {
          const u = y1 > y0 ? (_v.y - y0) / (y1 - y0) : 0;
          _c.setHex(p.grad[0]).lerp(_c2.setHex(p.grad[1]), u);
        } else _c.setHex(p.c);
        const f = jit * glow;
        col[q] = _c.r * f; col[q + 1] = _c.g * f; col[q + 2] = _c.b * f;
        _v.applyMatrix4(p.m);
        pos[q] = _v.x; pos[q + 1] = _v.y; pos[q + 2] = _v.z;
        if (p.smooth && N) {
          _n.fromBufferAttribute(N, j).applyMatrix3(_nm).normalize();
          nor[q] = _n.x; nor[q + 1] = _n.y; nor[q + 2] = _n.z;
        }
      }
      if (!p.smooth || !N) {
        // Flat normal of the transformed triangle.
        const q = (o + t) * 3;
        const ax = pos[q + 3] - pos[q], ay = pos[q + 4] - pos[q + 1], az = pos[q + 5] - pos[q + 2];
        const bx = pos[q + 6] - pos[q], by = pos[q + 7] - pos[q + 1], bz = pos[q + 8] - pos[q + 2];
        _n.set(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx).normalize();
        for (let k = 0; k < 3; k++) { nor[q + k * 3] = _n.x; nor[q + k * 3 + 1] = _n.y; nor[q + k * 3 + 2] = _n.z; }
      }
    }
    o += n;
    if (g !== p.geo) g.dispose();
  });
  const out = new T.BufferGeometry();
  out.setAttribute("position", new T.BufferAttribute(pos, 3));
  out.setAttribute("normal", new T.BufferAttribute(nor, 3));
  out.setAttribute("color", new T.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// Let go of what an object took on the GPU once it is out of the scene:
// its own geometries (not the shared shape cache) and textures.
export function dispose(o) {
  o.traverse((m) => {
    if (m.geometry && !m.isSprite && !m.geometry.userData.shared) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) mat?.map?.dispose();
  });
}

// Build a model function into an Object3D: model(b, opts).
export function make(model, opts = {}, o3 = {}) {
  const b = new Builder();
  model(b, opts);
  return b.toObject3D(o3);
}
