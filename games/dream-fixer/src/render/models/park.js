import * as T from "three";
import { SHAPE, rng, vary, mix } from "../modelkit.js";
import { C } from "../palette.js";

// ── Morzsa's park ────────────────────────────────────────────────────────
// A dog's idea of a park: soft hills, fat trees, a bench to sniff and
// everything that matters (bones, balls, hydrants) far too big.
// Origin on the ground, at the prop's centre.

const RX = Math.PI / 2;
const up = new T.Vector3(0, 1, 0);
const dirQ = (x, y, z) => new T.Quaternion().setFromUnitVectors(up, new T.Vector3(x, y, z).normalize());

export const LEAF = [0x2f7a45, 0x5fb05a, 0x9bd86a];
const BARK = [0x5a3a24, 0x8a5c38];

export function tree(b, { seed = 1, h = 4.2 } = {}) {
  const rnd = rng(seed);
  // Trunk: three tapering segments, each leaning a little further.
  let p = [0, 0, 0], r = 0.34 * h / 4.2, dir = [0, 1, 0];
  const segs = 3, L = h * 0.62 / segs;
  for (let i = 0; i < segs; i++) {
    dir = [dir[0] + (rnd() - 0.5) * 0.35, 1, dir[2] + (rnd() - 0.5) * 0.35];
    const n = Math.hypot(...dir), d = dir.map((v) => v / n);
    const r2 = r * 0.74;
    b.add(SHAPE.cyl(r2, r, L * 1.08, 7), { p: [p[0] + d[0] * L / 2, p[1] + d[1] * L / 2, p[2] + d[2] * L / 2], r: dirQ(...d), grad: [mix(BARK[0], BARK[1], i / segs), mix(BARK[0], BARK[1], (i + 1) / segs)], facet: 0.1 });
    p = [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L];
    r = r2;
    if (i === 1) {                         // one side branch
      const a = rnd() * Math.PI * 2, bd = [Math.cos(a), 0.8, Math.sin(a)];
      const bl = L * 0.9;
      b.add(SHAPE.cyl(r * 0.35, r * 0.6, bl, 6), { p: [p[0] + bd[0] * bl * 0.35, p[1] + bd[1] * bl * 0.35, p[2] + bd[2] * bl * 0.35], r: dirQ(...bd), c: BARK[1] });
      b.add(SHAPE.blob(h * 0.16, seed * 7 + 1, 0.16), { p: [p[0] + bd[0] * bl * 0.8, p[1] + bd[1] * bl * 0.8 + 0.2, p[2] + bd[2] * bl * 0.8], grad: [LEAF[0], LEAF[1]], facet: 0.08 });
    }
  }
  // Roots flaring at the base.
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + rnd();
    const k = h / 4.2;
    b.add(SHAPE.cyl(0.03 * k, 0.13 * k, 0.55 * k, 5), { p: [Math.cos(a) * 0.3 * k, 0.1 * k, Math.sin(a) * 0.3 * k], r: dirQ(Math.cos(a), -0.45, Math.sin(a)), c: BARK[0] });
  }
  // Canopy: a cluster of lumpy balls, darker underneath.
  const top = p;
  const n = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, rr = i === 0 ? 0 : (0.35 + rnd() * 0.5) * h * 0.22;
    const s = (i === 0 ? 0.36 : 0.22 + rnd() * 0.1) * h;
    b.add(SHAPE.blob(s, seed * 13 + i, 0.14), {
      p: [top[0] + Math.cos(a) * rr, top[1] + (i === 0 ? 0.25 * h * 0.2 : (rnd() - 0.3) * h * 0.18), top[2] + Math.sin(a) * rr],
      r: [rnd() * 3, rnd() * 3, 0], s: [1, 0.82, 1],
      grad: [LEAF[0], i === 0 ? LEAF[2] : LEAF[1]], facet: 0.09,
    });
  }
}

export function bush(b, { seed = 1, s = 1 } = {}) {
  const rnd = rng(seed);
  for (let i = 0; i < 4; i++) {
    const a = rnd() * 6.28, rr = i ? 0.35 * s : 0;
    b.add(SHAPE.blob((0.45 + rnd() * 0.2) * s, seed * 5 + i, 0.18), { p: [Math.cos(a) * rr, 0.35 * s, Math.sin(a) * rr], s: [1, 0.75, 1], grad: [LEAF[0], LEAF[1]], facet: 0.1 });
  }
  // A few flowers peeking out.
  for (let i = 0; i < 6; i++) {
    const a = rnd() * 6.28, y = (0.35 + rnd() * 0.35) * s, rr = 0.55 * s;
    b.add(SHAPE.sphere(0.07 * s, 0), { p: [Math.cos(a) * rr, y, Math.sin(a) * rr], c: [0xff8fb8, 0xfff0a0, 0xffffff][i % 3], facet: 0.05 });
  }
}

export function rock(b, { seed = 1, s = 1 } = {}) {
  b.add(SHAPE.blob(0.6 * s, seed, 0.22, 0), { p: [0, 0.22 * s, 0], s: [1.3, 0.62, 1], r: [0, seed, 0], grad: [0x6f7480, 0xb4b8bf], facet: 0.12 });
}

export function bench(b) {
  const IRON = 0x2e4a3a;
  // Slats.
  for (let i = 0; i < 3; i++) b.add(SHAPE.box(1.9, 0.05, 0.12, 0.015), { p: [0, 0.46, -0.16 + i * 0.14], c: vary(C.woodL, rng(i + 3), 0.08), facet: 0.08 });
  for (let i = 0; i < 2; i++) b.add(SHAPE.box(1.9, 0.12, 0.05, 0.015), { p: [0, 0.66 + i * 0.17, 0.2 + i * 0.03], r: [-0.18, 0, 0], c: vary(C.woodL, rng(i + 9), 0.08), facet: 0.08 });
  // Cast-iron sides: a leg, an arm rest and a curl.
  b.both((s) => {
    const x = s * 0.82;
    b.add(SHAPE.box(0.06, 0.46, 0.06, 0.012), { p: [x, 0.23, -0.2], c: IRON, mat: "metal" });
    b.add(SHAPE.box(0.06, 0.95, 0.06, 0.012), { p: [x, 0.47, 0.22], r: [-0.18, 0, 0], c: IRON, mat: "metal" });
    b.add(SHAPE.box(0.06, 0.05, 0.5, 0.012), { p: [x, 0.43, 0.01], c: IRON, mat: "metal" });
    b.add(SHAPE.box(0.08, 0.05, 0.52, 0.015), { p: [x + s * 0.02, 0.68, -0.02], c: IRON, mat: "metal" });
    b.add(SHAPE.torus(0.06, 0.018, 5, 10), { p: [x + s * 0.02, 0.62, -0.27], r: [0, RX, 0], c: IRON, mat: "metal" });
    b.add(SHAPE.cyl(0.05, 0.06, 0.03, 8), { p: [x, 0.015, -0.2], c: IRON, mat: "metal" });
  });
}

// A park lamp; the bulb glows (the dream is lit from inside).
export function lamp(b, { h = 3.2 } = {}) {
  const IRON = 0x2e4a3a;
  b.add(SHAPE.lathe([[0.2, 0], [0.2, 0.08], [0.13, 0.14], [0.11, 0.4], [0.07, 0.48]], 8), { c: IRON, mat: "metal" });
  b.add(SHAPE.cyl(0.05, 0.065, h - 0.5, 8), { p: [0, 0.48 + (h - 0.5) / 2, 0], c: IRON, mat: "metal" });
  b.add(SHAPE.torus(0.08, 0.02, 5, 10), { p: [0, h * 0.62, 0], r: [RX, 0, 0], c: C.brass, mat: "metal" });
  // Lantern head.
  const y = h;
  b.add(SHAPE.cyl(0.1, 0.16, 0.06, 6), { p: [0, y - 0.02, 0], c: IRON, mat: "metal" });
  b.add(SHAPE.cyl(0.15, 0.11, 0.36, 6), { p: [0, y + 0.19, 0], c: 0xfff4c0, mat: "glass" });
  b.add(SHAPE.ball(0.09, 8, 6), { p: [0, y + 0.17, 0], c: C.dreamGold, mat: "glow", glow: 2.4 });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + Math.PI / 6;
    b.add(SHAPE.box(0.018, 0.38, 0.018), { p: [Math.cos(a) * 0.135, y + 0.19, Math.sin(a) * 0.135], r: [0, -a, 0], c: IRON, mat: "metal" });
  }
  b.add(SHAPE.cone(0.22, 0.2, 6), { p: [0, y + 0.47, 0], c: IRON, mat: "metal" });
  b.add(SHAPE.ball(0.04, 6, 4), { p: [0, y + 0.6, 0], c: C.brass, mat: "metal" });
}

// A giant dog bone (the dream's favourite thing). Lies along x.
export function bone(b, { len = 3 } = {}) {
  const BONE = [0xd9c9a4, 0xfbf1dc];
  b.add(SHAPE.cyl(0.26, 0.26, len - 0.5, 10, 0.03), { p: [0, 0.3, 0], r: [0, 0, RX], grad: BONE, facet: 0.04 });
  b.both((s) => b.both((k) => b.add(SHAPE.ball(0.34, 12, 8), { p: [s * (len / 2 - 0.2), 0.32, k * 0.22], grad: BONE, facet: 0.04 })));
}

export function tennisBall(b, { r = 1 } = {}) {
  b.add(SHAPE.ball(r, 16, 12), { p: [0, r, 0], grad: [0xa9c62a, 0xe4f25a], facet: 0.03 });
  b.both((s) => b.add(SHAPE.torus(r * 0.99, r * 0.035, 4, 30, Math.PI), { p: [0, r, 0], r: [s * 0.9, s > 0 ? 0 : Math.PI, RX], c: 0xf7f7ea, facet: 0 }));
}

export function hydrant(b, { s = 1 } = {}) {
  const RED = [0xa42a1f, 0xe2493a];
  b.at([0, 0, 0], [0, 0, 0], s, () => {
    b.add(SHAPE.cyl(0.36, 0.4, 0.12, 10, 0.02), { p: [0, 0.06, 0], c: RED[0] });
    b.add(SHAPE.cyl(0.26, 0.28, 0.9, 10, 0.02), { p: [0, 0.57, 0], grad: RED, facet: 0.04 });
    b.add(SHAPE.cyl(0.32, 0.32, 0.08, 10, 0.02), { p: [0, 1.04, 0], c: RED[1] });
    b.add(SHAPE.lathe([[0.27, 0], [0.26, 0.1], [0.18, 0.22], [0.06, 0.28], [0, 0.3]], 10), { p: [0, 1.07, 0], grad: RED });
    b.add(SHAPE.cyl(0.06, 0.08, 0.1, 5), { p: [0, 1.4, 0], c: C.brass, mat: "metal" });
    b.both((sx) => {
      b.add(SHAPE.cyl(0.11, 0.11, 0.16, 8, 0.02), { p: [sx * 0.32, 0.7, 0], r: [0, 0, RX], c: RED[1] });
      b.add(SHAPE.cyl(0.07, 0.07, 0.05, 5), { p: [sx * 0.42, 0.7, 0], r: [0, 0, RX], c: C.brass, mat: "metal" });
    });
    b.add(SHAPE.cyl(0.14, 0.14, 0.18, 8, 0.02), { p: [0, 0.6, -0.3], r: [RX, 0, 0], c: RED[1] });
    b.add(SHAPE.cyl(0.1, 0.1, 0.05, 5), { p: [0, 0.6, -0.41], r: [RX, 0, 0], c: C.brass, mat: "metal" });
  });
}

// Morzsa's own doghouse. The door faces −z.
export function doghouse(b) {
  const WALL = [0xc98a4c, 0xe2ae6e], ROOF = [0x9c2f24, 0xd24a36];
  // Plank walls.
  for (let i = 0; i < 6; i++) b.add(SHAPE.box(1.82, 0.22, 1.62, 0.02), { p: [0, 0.11 + i * 0.22, 0], c: vary(WALL[i % 2], rng(i), 0.05), facet: 0.06 });
  // Gable ends.
  b.both((s) => b.add(SHAPE.extrude([[-0.91, 0], [0.91, 0], [0, 0.72]], 0.08, 0.01), { p: [0, 1.32, s * 0.77], c: WALL[1] }));
  // Roof boards, overhanging.
  b.both((s) => b.add(SHAPE.box(1.22, 0.1, 1.95, 0.025), { p: [s * 0.5, 1.72, 0], r: [0, 0, -s * 0.66], grad: ROOF, facet: 0.05 }));
  b.add(SHAPE.box(0.12, 0.12, 2.0, 0.03), { p: [0, 2.07, 0], c: ROOF[0] });
  // Arched door.
  const arch = [[-0.4, 0]];
  for (let i = 0; i <= 8; i++) { const a = Math.PI - i / 8 * Math.PI; arch.push([Math.cos(a) * 0.4, 0.7 + Math.sin(a) * 0.4]); }
  arch.push([0.4, 0]);
  b.add(SHAPE.extrude(arch, 0.04), { p: [0, 0, -0.8], c: 0x2a1a12, facet: 0 });
  b.add(SHAPE.extrude(arch.map(([x, y]) => [x * 1.18, y * 1.08]), 0.03), { p: [0, 0, -0.815], c: C.cream });
  // Name plate: a little bone above the door.
  b.at([0, 1.34, -0.83], [RX, 0, 0], 0.13, () => bone(b, { len: 2.4 }));
  // Food bowl.
  b.add(SHAPE.lathe([[0.2, 0], [0.3, 0.12], [0.26, 0.13], [0.16, 0.03], [0, 0.03]], 12), { p: [0.75, 0, -1.2], c: 0x3f7fd0, mat: "metal" });
}

export function fence(b, { len = 4, seed = 1 } = {}) {
  const WHITE = [0xd8d6cc, 0xfbfaf4];
  const rnd = rng(seed);
  const n = Math.max(2, Math.round(len / 0.32));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * len / n, h = 1 + (rnd() - 0.5) * 0.08;
    b.add(SHAPE.extrude([[-0.06, 0], [0.06, 0], [0.06, h], [0, h + 0.1], [-0.06, h]], 0.04, 0.008), { p: [x, 0, 0], r: [0, 0, (rnd() - 0.5) * 0.05], grad: WHITE, facet: 0.05 });
  }
  for (const y of [0.3, 0.75]) b.add(SHAPE.box(len, 0.08, 0.03, 0.01), { p: [0, y, 0.035], c: WHITE[0] });
}

export function flowers(b, { seed = 1, n = 7, r = 0.6 } = {}) {
  const rnd = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, d = Math.sqrt(rnd()) * r, h = 0.25 + rnd() * 0.25;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    b.add(SHAPE.cyl(0.012, 0.015, h, 4), { p: [x, h / 2, z], c: 0x3f8a3c });
    const col = [0xff7fa8, 0xfff07a, 0xffffff, 0xb58cff][Math.floor(rnd() * 4)];
    for (let k = 0; k < 5; k++) {
      const pa = k / 5 * 6.28;
      b.add(SHAPE.sphere(0.045, 0), { p: [x + Math.cos(pa) * 0.05, h, z + Math.sin(pa) * 0.05], s: [1, 0.4, 1], c: col });
    }
    b.add(SHAPE.sphere(0.03, 0), { p: [x, h + 0.01, z], c: 0xffc23a });
  }
}

// Grass tufts to break up the ground.
export function grass(b, { seed = 1, n = 6, r = 0.4 } = {}) {
  const rnd = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, d = rnd() * r, h = 0.18 + rnd() * 0.16;
    b.add(SHAPE.cone(0.05, h, 3), { p: [Math.cos(a) * d, h / 2, Math.sin(a) * d], r: [(rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5], grad: [0x3f8f45, 0x8fd06a], facet: 0.1 });
  }
}
