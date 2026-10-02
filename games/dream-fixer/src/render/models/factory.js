import * as T from "three";
import { SHAPE, rng, vary } from "../modelkit.js";
import { C } from "../palette.js";
import { stabilizer, fuzzVacuum } from "./tools.js";

// ── The Dream Factory ────────────────────────────────────────────────────
// The night-shift workshop: warm wood, brass, enamel teal, a lot of pipes
// and glass tanks where dreams slosh about. Origin on the floor, facing −z.

const RX = Math.PI / 2;
const up = new T.Vector3(0, 1, 0);
const dirQ = (x, y, z) => new T.Quaternion().setFromUnitVectors(up, new T.Vector3(x, y, z).normalize());

// Cork job board on legs, with pinned cards (one per dreamer).
export function jobBoard(b) {
  b.both((s) => b.add(SHAPE.box(0.08, 1.9, 0.08, 0.02), { p: [s * 0.95, 0.95, 0], c: C.woodD }));
  b.add(SHAPE.box(2.1, 1.3, 0.08, 0.03), { p: [0, 1.35, 0], c: C.wood });
  b.add(SHAPE.box(1.95, 1.15, 0.04), { p: [0, 1.35, -0.04], c: 0xc49a6c, facet: 0.12 });
  const rnd = rng(4);
  const cards = [[-0.62, 1.6, 0xfaf4e4], [0.02, 1.62, 0xfff0c8], [0.62, 1.58, 0xe8f4ff], [-0.4, 1.08, 0xffe4ec], [0.3, 1.1, 0xeaffea]];
  cards.forEach(([x, y, c], i) => {
    b.add(SHAPE.box(0.44, 0.34, 0.01), { p: [x, y, -0.065], r: [0, 0, (rnd() - 0.5) * 0.14], c, facet: 0 });
    b.add(SHAPE.box(0.3, 0.02, 0.005), { p: [x, y + 0.08, -0.072], c: 0x8a8a8a, facet: 0 });
    b.add(SHAPE.box(0.2, 0.02, 0.005), { p: [x - 0.04, y + 0.02, -0.072], c: 0xaaaaaa, facet: 0 });
    b.add(SHAPE.ball(0.025, 6, 4), { p: [x, y + 0.15, -0.08], c: [C.red, C.teal, C.brass, C.dreamPink, 0x4a7ad8][i], mat: i === 0 ? "glow" : "solid", glow: 1.2 });
  });
  // The first card is Biscuit's: a paw print on it.
  b.add(SHAPE.ball(0.05, 8, 6), { p: [-0.62, 1.55, -0.075], s: [1, 1, 0.2], c: 0x6a4a3a });
  for (let i = 0; i < 4; i++) b.add(SHAPE.ball(0.02, 6, 4), { p: [-0.68 + i * 0.04, 1.62 + Math.abs(i - 1.5) * -0.01, -0.075], s: [1, 1, 0.3], c: 0x6a4a3a });
  // Header sign.
  b.add(SHAPE.box(1.2, 0.26, 0.05, 0.02), { p: [0, 2.12, -0.02], c: C.teal });
  b.add(SHAPE.box(0.9, 0.05, 0.02), { p: [0, 2.12, -0.05], c: C.brassL, mat: "metal" });
}

// The workbench with a vise, tool wall and both tools laid out.
export function workbench(b) {
  b.add(SHAPE.box(2.4, 0.1, 1.0, 0.03), { p: [0, 0.92, 0], grad: [C.wood, C.woodL], facet: 0.08 });
  for (const [x, z] of [[-1.1, -0.42], [1.1, -0.42], [-1.1, 0.42], [1.1, 0.42]]) b.add(SHAPE.box(0.09, 0.88, 0.09, 0.02), { p: [x, 0.44, z], c: C.woodD });
  b.add(SHAPE.box(2.2, 0.06, 0.8, 0.02), { p: [0, 0.25, 0], c: C.woodD });
  // Pegboard behind with hanging tools.
  b.add(SHAPE.box(2.4, 1.3, 0.05, 0.02), { p: [0, 1.75, 0.48], c: 0xb88a58 });
  for (let i = 0; i < 6; i++) {
    const x = -0.95 + i * 0.38;
    b.add(SHAPE.cyl(0.012, 0.012, 0.08, 5), { p: [x, 2.05, 0.43], r: [RX, 0, 0], c: C.iron, mat: "metal" });
    if (i % 2) b.add(SHAPE.box(0.06, 0.4, 0.02, 0.01), { p: [x, 1.82, 0.44], c: C.steel, mat: "metal" });
    else b.add(SHAPE.torus(0.08, 0.018, 4, 10), { p: [x, 1.9, 0.44], c: C.copper, mat: "metal" });
  }
  // Vise on the left end.
  b.add(SHAPE.box(0.22, 0.14, 0.22, 0.02), { p: [-0.95, 1.04, -0.3], c: C.teal, mat: "metal" });
  b.add(SHAPE.cyl(0.02, 0.02, 0.3, 6), { p: [-0.95, 1.04, -0.5], r: [RX, 0, 0], c: C.steel, mat: "metal" });
  // Both tools resting on the bench.
  b.at([-0.2, 1.05, -0.05], [0, 1.3, RX], 1.4, () => stabilizer(b, { hand: false }));
  b.at([0.55, 1.07, -0.08], [0, -1.7, RX], 1.4, () => fuzzVacuum(b, { hand: false }));
  // A lamp clamped to the bench.
  b.add(SHAPE.cyl(0.015, 0.015, 0.6, 6), { p: [1.05, 1.25, 0.3], r: [0.3, 0, 0], c: C.iron, mat: "metal" });
  b.add(SHAPE.cone(0.12, 0.16, 8), { p: [1.05, 1.52, 0.2], r: [Math.PI - 0.5, 0, 0], c: C.teal, mat: "metal" });
  b.add(SHAPE.ball(0.05, 8, 6), { p: [1.05, 1.47, 0.16], c: C.dreamGold, mat: "glow", glow: 2 });
}

// Margo's desk: the radio, a lamp, papers and a growing stack of mugs.
export function desk(b, { mugs = 3 } = {}) {
  b.add(SHAPE.box(1.8, 0.08, 0.9, 0.03), { p: [0, 0.78, 0], grad: [C.woodD, C.wood] });
  b.both((s) => b.add(SHAPE.box(0.5, 0.74, 0.8, 0.03), { p: [s * 0.62, 0.37, 0], c: C.woodD }));
  for (let i = 0; i < 3; i++) b.add(SHAPE.box(0.04, 0.03, 0.03), { p: [0.62, 0.62 - i * 0.22, -0.41], c: C.brass, mat: "metal" });
  // The radio: a wooden cabinet with a glowing dial.
  b.add(SHAPE.box(0.7, 0.42, 0.34, 0.05), { p: [-0.35, 1.03, 0.1], grad: [0x7a3a1a, 0xa0582e] });
  b.add(SHAPE.cyl(0.13, 0.13, 0.02, 16), { p: [-0.5, 1.05, -0.075], r: [RX, 0, 0], c: 0x3a2a1a });
  b.add(SHAPE.box(0.24, 0.1, 0.02), { p: [-0.18, 1.1, -0.075], c: C.dreamGold, mat: "glow", glow: 1.4 });
  for (const x of [-0.24, -0.12]) b.add(SHAPE.cyl(0.03, 0.03, 0.03, 8), { p: [x, 0.94, -0.08], r: [RX, 0, 0], c: C.cream });
  b.add(SHAPE.cyl(0.006, 0.006, 0.5, 4), { p: [-0.6, 1.45, 0.2], r: [0, 0, 0.3], c: C.steel, mat: "metal" });
  // Microphone on a stand.
  b.add(SHAPE.cyl(0.07, 0.08, 0.02, 10), { p: [0.2, 0.83, -0.1], c: C.iron, mat: "metal" });
  b.add(SHAPE.cyl(0.01, 0.01, 0.25, 5), { p: [0.2, 0.96, -0.1], c: C.steel, mat: "metal" });
  b.add(SHAPE.capsule(0.04, 0.06, 8, 2), { p: [0.2, 1.12, -0.12], r: [0.4, 0, 0], c: C.steel, mat: "metal" });
  // Papers and coffee mugs.
  const rnd = rng(9);
  for (let i = 0; i < 4; i++) b.add(SHAPE.box(0.3, 0.004, 0.4), { p: [0.45 + (rnd() - 0.5) * 0.2, 0.825 + i * 0.005, 0.1 + (rnd() - 0.5) * 0.2], r: [0, rnd() - 0.5, 0], c: C.paper, facet: 0 });
  for (let i = 0; i < mugs; i++) {
    const x = 0.7 - (i % 3) * 0.14, z = -0.25 + Math.floor(i / 3) * 0.14;
    b.add(SHAPE.cyl(0.045, 0.04, 0.1, 10), { p: [x, 0.87, z], c: [C.cream, C.teal, C.red][i % 3] });
    b.add(SHAPE.torus(0.03, 0.009, 4, 8, Math.PI), { p: [x + 0.045, 0.87, z], r: [0, 0, -RX], c: [C.cream, C.teal, C.red][i % 3] });
  }
  // Chair.
  b.add(SHAPE.box(0.5, 0.06, 0.5, 0.02), { p: [0, 0.48, 0.75], c: C.teal });
  b.add(SHAPE.box(0.5, 0.55, 0.06, 0.02), { p: [0, 0.78, 1.0], c: C.teal });
  b.add(SHAPE.cyl(0.03, 0.03, 0.45, 6), { p: [0, 0.23, 0.75], c: C.iron, mat: "metal" });
}

// The dream lift: a brass cage with a folding gate and a dial above.
export function lift(b) {
  b.add(SHAPE.box(2.4, 0.12, 2.4, 0.03), { p: [0, 0.06, 0], c: C.brassD, mat: "metal" });
  b.add(SHAPE.box(2.4, 0.16, 2.4, 0.04), { p: [0, 3.2, 0], c: C.brassD, mat: "metal" });
  for (const [x, z] of [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]]) b.add(SHAPE.box(0.1, 3.1, 0.1, 0.02), { p: [x, 1.6, z], c: C.brass, mat: "metal" });
  // Bars on three sides; the front is the gate.
  for (let i = 0; i < 9; i++) {
    const u = -1 + i * 0.25;
    b.add(SHAPE.cyl(0.018, 0.018, 3.05, 5), { p: [-1.15, 1.6, u], c: C.brass, mat: "metal" });
    b.add(SHAPE.cyl(0.018, 0.018, 3.05, 5), { p: [1.15, 1.6, u], c: C.brass, mat: "metal" });
    b.add(SHAPE.cyl(0.018, 0.018, 3.05, 5), { p: [u, 1.6, 1.15], c: C.brass, mat: "metal" });
  }
  b.node("gate", [0, 0, -1.15], [0, 0, 0], (g) => {
    for (let i = 0; i < 8; i++) {
      const x = -0.95 + i * 0.27;
      g.add(SHAPE.box(0.03, 2.6, 0.02), { p: [x, 1.45, 0], c: C.brassL, mat: "metal" });
    }
    for (const y of [0.3, 1.45, 2.6]) g.add(SHAPE.box(2.1, 0.04, 0.03), { p: [0, y, 0], c: C.brass, mat: "metal" });
  });
  // Floor dial and the "DOWN TO DREAMS" lamp.
  b.add(SHAPE.cyl(0.4, 0.4, 0.06, 16), { p: [0, 3.55, -1.16], r: [RX, 0, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.cyl(0.33, 0.33, 0.02, 16), { p: [0, 3.55, -1.2], r: [RX, 0, 0], c: C.cream });
  b.add(SHAPE.box(0.03, 0.25, 0.01), { p: [0.05, 3.58, -1.22], r: [0, 0, -0.5], c: C.red });
  b.add(SHAPE.ball(0.1, 10, 7), { p: [0, 3.1, -1.1], c: C.dream, mat: "glow", glow: 2 });
  b.add(SHAPE.box(0.9, 0.9, 0.06), { p: [0.9, 1.3, 1.08], c: C.tealD });
  b.add(SHAPE.cyl(0.07, 0.07, 0.04, 10), { p: [0.9, 1.5, 1.04], r: [RX, 0, 0], c: C.red, mat: "glow", glow: 1.4 });
}

// A tall glass tank of dream liquid, bubbling, on a brass base.
export function dreamTank(b, { h = 3, color = C.dream, seed = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.cyl(0.7, 0.8, 0.4, 12, 0.05), { p: [0, 0.2, 0], grad: [C.brassD, C.brass], mat: "metal" });
  b.add(SHAPE.cyl(0.62, 0.62, h, 14), { p: [0, 0.4 + h / 2, 0], c: 0xdffcff, mat: "glass" });
  b.add(SHAPE.cyl(0.55, 0.55, h * 0.8, 12), { p: [0, 0.4 + h * 0.4, 0], c: color, mat: "glow", glow: 0.9, facet: 0.1 });
  for (let i = 0; i < 7; i++) b.add(SHAPE.sphere(0.05 + rnd() * 0.06, 0), { p: [(rnd() - 0.5) * 0.7, 0.6 + rnd() * h * 0.75, (rnd() - 0.5) * 0.7], c: 0xffffff, mat: "glow", glow: 1.2 });
  b.add(SHAPE.cyl(0.7, 0.66, 0.3, 12, 0.05), { p: [0, 0.55 + h, 0], c: C.brass, mat: "metal" });
  for (const y of [0.4 + h * 0.33, 0.4 + h * 0.66]) b.add(SHAPE.torus(0.64, 0.03, 4, 20), { p: [0, y, 0], r: [RX, 0, 0], c: C.copper, mat: "metal" });
  b.add(SHAPE.cyl(0.12, 0.12, 1.2, 8), { p: [0, 1.3 + h, 0], c: C.copper, mat: "metal" });
}

// A run of pipe from a to b ([x, y, z]), with flanges at the ends.
export function pipe(b, { a = [0, 0, 0], d = [0, 3, 0], r = 0.12, c = C.copper } = {}) {
  const L = Math.hypot(...d);
  b.add(SHAPE.cyl(r, r, L, 8), { p: [a[0] + d[0] / 2, a[1] + d[1] / 2, a[2] + d[2] / 2], r: dirQ(...d), c, mat: "metal" });
  for (const t of [0, 1]) b.add(SHAPE.cyl(r * 1.35, r * 1.35, 0.08, 8), { p: [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t], r: dirQ(...d), c: C.brassD, mat: "metal" });
}

// Álmos: the great old dream machine, seen through the big window. A huge
// brass sphere with a sleepy lens, far bigger than the room.
export function almos(b) {
  b.add(SHAPE.ball(6, 22, 16), { p: [0, 7, 0], grad: [C.brassD, C.brass], mat: "metal", facet: 0.03 });
  for (let i = 0; i < 3; i++) b.add(SHAPE.torus(6.05, 0.18, 5, 40), { p: [0, 7, 0], r: [RX + i * 0.4 - 0.4, 0, 0], c: C.copper, mat: "metal" });
  // The big sleepy lens, half-lidded.
  b.add(SHAPE.cyl(2.4, 2.6, 0.6, 24, 0.1), { p: [0, 7.5, -5.7], r: [RX, 0, 0], c: C.iron, mat: "metal" });
  b.add(SHAPE.cyl(2.0, 2.0, 0.2, 24), { p: [0, 7.5, -6.0], r: [RX, 0, 0], c: C.dreamGold, mat: "glow", glow: 0.9 });
  b.add(SHAPE.cyl(0.9, 0.9, 0.22, 20), { p: [0, 7.3, -6.05], r: [RX, 0, 0], c: C.black });
  b.add(SHAPE.torus(2.5, 0.35, 5, 24, Math.PI), { p: [0, 7.7, -5.95], c: C.brassD, mat: "metal" });
  b.add(SHAPE.box(5.2, 1.4, 0.5, 0.2), { p: [0, 9.1, -5.85], c: C.brassD, mat: "metal" });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    b.add(SHAPE.cyl(0.3, 0.3, 4, 8), { p: [Math.cos(a) * 6.6, 7 + Math.sin(a) * 2, Math.sin(a) * 6.6], r: [0, -a, RX], c: C.copper, mat: "metal" });
  }
}

export function crate(b, { seed = 1, s = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.box(0.8 * s, 0.8 * s, 0.8 * s, 0.03), { p: [0, 0.4 * s, 0], c: vary(C.woodL, rnd, 0.1), facet: 0.08 });
  for (const y of [0.15, 0.65]) b.add(SHAPE.box(0.84 * s, 0.08 * s, 0.84 * s, 0.01), { p: [0, y * s, 0], c: C.wood });
  b.add(SHAPE.box(0.3 * s, 0.2 * s, 0.01), { p: [0, 0.42 * s, -0.405 * s], c: C.paper, facet: 0 });
}

export function shelf(b, { seed = 1 } = {}) {
  const rnd = rng(seed);
  b.both((s) => b.add(SHAPE.box(0.06, 2.2, 0.5, 0.01), { p: [s * 0.9, 1.1, 0], c: C.woodD }));
  for (let i = 0; i < 4; i++) {
    const y = 0.25 + i * 0.6;
    b.add(SHAPE.box(1.86, 0.05, 0.5, 0.01), { p: [0, y, 0], c: C.wood });
    // Jars of bottled dreams and boxes.
    for (let k = 0; k < 4; k++) {
      const x = -0.65 + k * 0.43 + (rnd() - 0.5) * 0.1;
      if (rnd() < 0.55) {
        const col = [C.dream, C.dreamPink, C.dreamGold, 0x9fb8ff][Math.floor(rnd() * 4)];
        b.add(SHAPE.cyl(0.1, 0.1, 0.24, 10), { p: [x, y + 0.15, 0], c: 0xe8fbff, mat: "glass" });
        b.add(SHAPE.cyl(0.08, 0.08, 0.16, 8), { p: [x, y + 0.12, 0], c: col, mat: "glow", glow: 0.8 });
        b.add(SHAPE.cyl(0.08, 0.08, 0.03, 10), { p: [x, y + 0.28, 0], c: C.brass, mat: "metal" });
      } else b.add(SHAPE.box(0.3, 0.2 + rnd() * 0.15, 0.3, 0.02), { p: [x, y + 0.14, 0], c: vary(0xc8a878, rnd, 0.15) });
    }
  }
}

// A round braided rug.
export function rug(b, { r = 2 } = {}) {
  const cols = [0xc0394f, 0xe3b35c, 0x2f7f86, 0xf3e6c8];
  for (let i = 0; i < 4; i++) b.add(SHAPE.cyl(r * (1 - i * 0.22), r * (1 - i * 0.22), 0.02, 24), { p: [0, 0.012 + i * 0.002, 0], c: cols[i], facet: 0.02 });
}

// Hanging factory lamp (enamel shade, glowing bulb).
export function hangLamp(b, { cord = 1.2 } = {}) {
  b.add(SHAPE.cyl(0.01, 0.01, cord, 4), { p: [0, -cord / 2, 0], c: C.black });
  b.add(SHAPE.lathe([[0.05, 0], [0.12, -0.05], [0.32, -0.25], [0.34, -0.28]], 12), { p: [0, -cord, 0], c: C.teal, mat: "metal" });
  b.add(SHAPE.ball(0.09, 10, 7), { p: [0, -cord - 0.22, 0], c: C.dreamGold, mat: "glow", glow: 2.4 });
}

// Cog's charging dock: a little brass cup on a post.
export function dock(b) {
  b.add(SHAPE.cyl(0.3, 0.35, 0.1, 12, 0.02), { p: [0, 0.05, 0], c: C.iron, mat: "metal" });
  b.add(SHAPE.cyl(0.05, 0.05, 1.1, 8), { p: [0, 0.6, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.lathe([[0.05, 0], [0.25, 0.06], [0.3, 0.18], [0.27, 0.18]], 12), { p: [0, 1.15, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.torus(0.26, 0.015, 4, 16), { p: [0, 1.34, 0], r: [RX, 0, 0], c: C.dream, mat: "glow", glow: 1.6 });
}

// The journal: a fat logbook lying open on a lectern, a glowing bookmark
// hanging out of it. Facing −z (you read it from the front).
export function lectern(b) {
  b.add(SHAPE.cyl(0.32, 0.36, 0.06, 10, 0.02), { p: [0, 0.03, 0], c: C.woodD });
  b.add(SHAPE.box(0.12, 1.0, 0.12, 0.02), { p: [0, 0.55, 0], c: C.wood });
  b.add(SHAPE.box(0.08, 0.06, 0.4, 0.02), { p: [0, 0.07, 0], c: C.woodD });
  b.at([0, 1.08, 0], [-0.35, 0, 0], 1, () => {
    b.add(SHAPE.box(0.72, 0.05, 0.5, 0.02), { c: C.wood });
    b.add(SHAPE.box(0.7, 0.03, 0.05, 0.01), { p: [0, 0.04, -0.24], c: C.brass, mat: "metal" });
    // Cover and two thick blocks of pages, a little bowed.
    b.add(SHAPE.box(0.66, 0.025, 0.46, 0.01), { p: [0, 0.04, 0], c: 0x6a2a1a });
    b.both((s) => b.add(SHAPE.box(0.3, 0.05, 0.42, 0.015), { p: [s * 0.16, 0.075, 0], r: [0, 0, -s * 0.06], c: C.paper }));
    for (let i = 0; i < 4; i++) b.add(SHAPE.box(0.22, 0.004, 0.012), { p: [-0.16, 0.103, -0.12 + i * 0.07], c: 0x9a8a70 });
    for (let i = 0; i < 4; i++) b.add(SHAPE.box(0.22, 0.004, 0.012), { p: [0.16, 0.103, -0.12 + i * 0.07], c: 0x9a8a70 });
    // The bookmark ribbon, glowing gold, hanging over the front edge.
    b.add(SHAPE.box(0.035, 0.006, 0.3), { p: [0.02, 0.11, -0.08], c: C.dreamGold, mat: "glow", glow: 1 });
    b.add(SHAPE.box(0.035, 0.18, 0.006), { p: [0.02, 0.02, -0.24], c: C.dreamGold, mat: "glow", glow: 1 });
  });
  // A brass corner lamp on the lectern, so you notice it.
  b.add(SHAPE.ball(0.05, 8, 6), { p: [0.32, 1.32, 0.12], c: C.dreamGold, mat: "glow", glow: 1.2 });
  b.add(SHAPE.cyl(0.008, 0.008, 0.22, 4), { p: [0.32, 1.2, 0.12], c: C.brass, mat: "metal" });
}
