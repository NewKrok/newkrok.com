import * as T from "three";
import { SHAPE, rng, vary, mix } from "../modelkit.js";
import { C } from "../palette.js";

// ── Biscuit's park ────────────────────────────────────────────────────────
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

// Biscuit's own doghouse. The door faces −z.
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

// ── The dog run and the pond garden ──

// An agility hurdle: two striped posts and a bar.
export function hurdle(b, { w = 2.4, h = 0.55 } = {}) {
  b.both((s) => {
    b.add(SHAPE.cyl(0.06, 0.07, h + 0.35, 8), { p: [s * w / 2, (h + 0.35) / 2, 0], c: 0xf7f7ea });
    for (let i = 0; i < 3; i++) b.add(SHAPE.cyl(0.065, 0.065, 0.08, 8), { p: [s * w / 2, 0.15 + i * 0.25, 0], c: C.red });
    b.add(SHAPE.box(0.3, 0.05, 0.3, 0.01), { p: [s * w / 2, 0.025, 0], c: 0xd8d6cc });
  });
  b.add(SHAPE.cyl(0.04, 0.04, w, 8), { p: [0, h, 0], r: [0, 0, Math.PI / 2], c: 0x3f7fd0 });
  for (let i = 0; i < 4; i++) b.add(SHAPE.cyl(0.042, 0.042, 0.12, 8), { p: [-w * 0.375 + i * w / 4, h, 0], r: [0, 0, Math.PI / 2], c: 0xffffff });
}

// A tyre hanging in a frame, to jump through.
export function tyre(b) {
  b.both((s) => b.add(SHAPE.box(0.12, 2.6, 0.12, 0.02), { p: [s * 1.1, 1.3, 0], c: C.woodL }));
  b.add(SHAPE.box(2.4, 0.12, 0.12, 0.02), { p: [0, 2.6, 0], c: C.woodL });
  b.add(SHAPE.torus(0.5, 0.16, 6, 16), { p: [0, 1.4, 0], c: 0x2a2a2e });
  b.both((s) => b.add(SHAPE.cyl(0.012, 0.012, 0.75, 4), { p: [s * 0.4, 2.2, 0], r: [0, 0, s * 0.3], c: C.iron, mat: "metal" }));
}

// A weave pole.
export function pole(b, { h = 1.2 } = {}) {
  b.add(SHAPE.cyl(0.035, 0.035, h, 6), { p: [0, h / 2, 0], c: 0xf7f7ea });
  b.add(SHAPE.cyl(0.037, 0.037, h * 0.3, 6), { p: [0, h * 0.7, 0], c: 0xffd23a });
  b.add(SHAPE.cyl(0.12, 0.14, 0.04, 8), { p: [0, 0.02, 0], c: C.iron });
}

// The agility tunnel: a striped fabric arch you can run through (along z).
export function tunnel(b, { len = 4, r = 1.1 } = {}) {
  const n = 8;
  for (let i = 0; i < n; i++) {
    const z = -len / 2 + (i + 0.5) * len / n;
    b.add(SHAPE.torus(r, 0.12, 5, 14, Math.PI), { p: [0, 0, z], c: i % 2 ? 0x3f7fd0 : 0xffd23a, facet: 0.06 });
  }
  b.add(SHAPE.torus(r + 0.05, 0.16, 5, 14, Math.PI), { p: [0, 0, -len / 2], c: C.red });
  b.add(SHAPE.torus(r + 0.05, 0.16, 5, 14, Math.PI), { p: [0, 0, len / 2], c: C.red });
}

// A sign on a post, with a bone painted on it.
export function sign(b, { color = 0xf3e6c8 } = {}) {
  b.add(SHAPE.box(0.1, 1.4, 0.1, 0.02), { p: [0, 0.7, 0], c: C.woodD });
  b.add(SHAPE.box(1.1, 0.6, 0.08, 0.03), { p: [0, 1.4, 0], c: color });
  b.at([0, 1.4, -0.05], [Math.PI / 2, 0, 0], 0.12, () => bone(b, { len: 2.6 }));
}

export function lilypad(b, { seed = 1, s = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.cyl(0.55 * s, 0.55 * s, 0.05, 12), { p: [0, 0, 0], c: vary(0x4a9a4a, rnd, 0.1), facet: 0.05 });
  if (rnd() < 0.5) {
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; b.add(SHAPE.cone(0.07, 0.18, 4), { p: [Math.cos(a) * 0.07 + 0.15, 0.1, Math.sin(a) * 0.07], r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], c: 0xffb8d8 }); }
    b.add(SHAPE.sphere(0.05, 0), { p: [0.15, 0.12, 0], c: 0xffe08a });
  }
}

export function reeds(b, { seed = 1, n = 8 } = {}) {
  const rnd = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * 1.2, z = (rnd() - 0.5) * 1.2, h = 0.9 + rnd() * 0.8;
    b.add(SHAPE.cyl(0.015, 0.025, h, 4), { p: [x, h / 2, z], r: [(rnd() - 0.5) * 0.2, 0, (rnd() - 0.5) * 0.2], c: 0x5a8a3a });
    if (rnd() < 0.5) b.add(SHAPE.capsule(0.04, 0.14, 5, 1), { p: [x, h, z], c: 0x6a3a1a });
  }
}

// A little wooden gazebo with a teal roof.
export function gazebo(b) {
  const n = 6, R = 2.2;
  b.add(SHAPE.cyl(R + 0.3, R + 0.4, 0.3, n, 0.04), { p: [0, 0.15, 0], c: C.woodL });
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * Math.PI * 2;
    b.add(SHAPE.box(0.14, 2.4, 0.14, 0.02), { p: [Math.cos(a) * R, 1.5, Math.sin(a) * R], c: 0xf3e6c8 });
    if (i !== 1) b.add(SHAPE.box(2 * R * Math.sin(Math.PI / n), 0.08, 0.06), { p: [Math.cos(a + Math.PI / n) * R * 0.87, 0.9, Math.sin(a + Math.PI / n) * R * 0.87], r: [0, -(a + Math.PI / n) - Math.PI / 2, 0], c: 0xf3e6c8 });
  }
  b.add(SHAPE.cone(R + 0.7, 1.6, n), { p: [0, 3.5, 0], r: [0, Math.PI / n, 0], grad: [0x1d5157, 0x2f9f96], facet: 0.05 });
  b.add(SHAPE.ball(0.14, 8, 6), { p: [0, 4.35, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.ball(0.12, 8, 6), { p: [0, 2.55, 0], c: C.dreamGold, mat: "glow", glow: 2 });
}

// A short wooden jetty.
export function dock(b, { len = 4 } = {}) {
  for (let i = 0; i < Math.round(len / 0.4); i++) b.add(SHAPE.box(1.6, 0.08, 0.36, 0.01), { p: [0, 0.2, -i * 0.4], c: vary(C.woodL, rng(i + 5), 0.08) });
  b.both((s) => { for (let i = 0; i < 3; i++) b.add(SHAPE.cyl(0.08, 0.08, 1, 6), { p: [s * 0.7, -0.2, -i * len / 2.4], c: C.woodD }); });
}

// One of the nightmare's power cords, snaking over the ground. pts are
// [x, z] relative to the prop; it ends in a plug with a pink spark.
export function cable(b, { pts = [[0, 0], [2, 1]], plug = true } = {}) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    b.add(SHAPE.cyl(0.07, 0.07, L + 0.06, 6), { p: [(ax + bx) / 2, 0.07, (az + bz) / 2], r: [0, Math.atan2(dx, dz), Math.PI / 2], c: 0x1a1a1e, facet: 0.03 });
    b.add(SHAPE.ball(0.075, 6, 4), { p: [bx, 0.07, bz], c: 0x1a1a1e });
  }
  if (plug) {
    const [x, z] = pts[pts.length - 1], [px, pz] = pts[pts.length - 2];
    const a = Math.atan2(x - px, z - pz);
    b.at([x, 0.12, z], [0, a, 0], 1, () => {
      b.add(SHAPE.box(0.3, 0.2, 0.35, 0.05), { c: 0xf3e6c8 });
      b.both((s) => b.add(SHAPE.box(0.04, 0.04, 0.2), { p: [s * 0.07, 0, 0.25], c: C.brass, mat: "metal" }));
      b.add(SHAPE.sphere(0.06, 0), { p: [0, 0, 0.38], c: C.dreamPink, mat: "glow", glow: 2 });
    });
  }
}

// A drifting low-poly cloud: a flat-bottomed heap of lumps.
export function cloud(b, { seed = 1, s = 1 } = {}) {
  const rnd = rng(seed);
  const n = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * 8 * s, z = (rnd() - 0.5) * 3.5 * s, r = (1.4 + rnd() * 1.6) * s * (1 - Math.abs(x) / (9 * s));
    b.add(SHAPE.blob(r, seed * 11 + i, 0.12, 1), { p: [x, r * 0.35, z], s: [1.2, 0.75, 1], grad: [0xd8d0ec, 0xffffff], facet: 0.05 });
  }
}
