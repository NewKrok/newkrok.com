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

// Cork job board on legs, with pinned cards (one per dreamer): each open
// job has its client's sign on it (a paw, a pencil, a chef's hat, an alarm
// clock, a rocket), a job still to come only the blank card, and a fixed
// one a green stamp. open / done: client ids.
export function jobBoard(b, { open = ["park"], done = [] } = {}) {
  b.both((s) => b.add(SHAPE.box(0.08, 1.9, 0.08, 0.02), { p: [s * 0.95, 0.95, 0], c: C.woodD }));
  b.add(SHAPE.box(2.1, 1.3, 0.08, 0.03), { p: [0, 1.35, 0], c: C.wood });
  b.add(SHAPE.box(1.95, 1.15, 0.04), { p: [0, 1.35, -0.04], c: 0xc49a6c, facet: 0.12 });
  const rnd = rng(4);
  const cards = [["park", 0.62, 1.6, 0xe8dcc4], ["school", -0.02, 1.62, 0xeadcb0], ["kitchen", -0.62, 1.58, 0xd4dce4], ["garden", 0.4, 1.08, 0xe8cfd4], ["space", -0.3, 1.1, 0xd4e4d0]];
  const z = -0.075;
  cards.forEach(([id, x, y, c], i) => {
    const on = open.includes(id);
    b.add(SHAPE.box(0.44, 0.34, 0.01), { p: [x, y, -0.065], r: [0, 0, (rnd() - 0.5) * 0.14], c: on ? c : 0xd8d0c0, facet: 0 });
    b.add(SHAPE.box(0.3, 0.02, 0.005), { p: [x, y + 0.1, -0.072], c: 0x8a8a8a, facet: 0 });
    b.add(SHAPE.ball(0.025, 6, 4), { p: [x, y + 0.15, -0.08], c: [C.red, C.teal, C.brass, C.dreamPink, 0x4a7ad8][i], mat: on && !done.includes(id) ? "glow" : "solid", glow: 1.2 });
    if (!on) return;
    // The sign, drawn at card size and scaled up onto it.
    b.at([x, y - 0.04, z], [0, 0, 0], 1.7, () => {
      if (id === "park") {
        b.add(SHAPE.ball(0.05, 8, 6), { p: [0, -0.03, 0], s: [1, 1, 0.2], c: 0x6a4a3a });
        for (let k = 0; k < 4; k++) b.add(SHAPE.ball(0.02, 6, 4), { p: [-0.06 + k * 0.04, 0.04 - Math.abs(k - 1.5) * 0.012, 0], s: [1, 1, 0.3], c: 0x6a4a3a });
      } else if (id === "school") {
        b.at([0, 0, 0], [0, 0, -0.75], 1, () => {
          b.add(SHAPE.box(0.035, 0.16, 0.012), { c: 0xe0a020 });
          b.add(SHAPE.box(0.035, 0.03, 0.012), { p: [0, 0.095, 0], c: 0xf07890 });
          b.add(SHAPE.cone(0.018, 0.05, 6), { p: [0, -0.105, 0], r: [Math.PI, 0, 0], s: [1, 1, 0.35], c: 0xc89868 });
        });
      } else if (id === "kitchen") {
        b.add(SHAPE.box(0.1, 0.035, 0.012), { p: [0, -0.05, 0], c: 0xd8302a });
        for (const [dx, dy, r] of [[-0.035, 0, 0.035], [0.035, 0, 0.035], [0, 0.02, 0.042]]) b.add(SHAPE.ball(r, 8, 6), { p: [dx, dy, 0], s: [1, 1, 0.3], c: C.white });
      } else if (id === "garden") {
        b.add(SHAPE.cyl(0.055, 0.055, 0.015, 14), { p: [0, -0.01, 0], r: [Math.PI / 2, 0, 0], c: 0xd8a040 });
        b.add(SHAPE.cyl(0.042, 0.042, 0.01, 14), { p: [0, -0.01, -0.006], r: [Math.PI / 2, 0, 0], c: C.cream });
        b.both((k) => b.add(SHAPE.ball(0.02, 6, 4), { p: [k * 0.04, 0.05, 0], s: [1, 1, 0.4], c: 0x8a6424 }));
        b.add(SHAPE.box(0.006, 0.03, 0.004), { p: [0, 0.003, -0.012], c: C.black });
      } else if (id === "space") {
        b.at([0, 0, 0], [0, 0, -0.6], 1, () => {
          b.add(SHAPE.capsule(0.025, 0.08, 8, 2), { s: [1, 1, 0.4], c: 0xe8483a });
          b.add(SHAPE.ball(0.012, 6, 4), { p: [0, 0.02, -0.01], c: 0x4a9ad8 });
          b.both((k) => b.add(SHAPE.box(0.025, 0.03, 0.008), { p: [k * 0.03, -0.045, 0], c: 0x3a6ab8 }));
        });
      }
    });
    // Fixed: a green stamp in the corner.
    if (done.includes(id)) b.add(SHAPE.torus(0.035, 0.008, 4, 14), { p: [x - 0.15, y - 0.1, z], c: 0x3aa04a });
  });
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

// Old Hum: the great old dream machine, seen through the big window. A huge
// brass sphere with a sleepy lens, far bigger than the room.
export function oldHum(b, { awake = false } = {}) {
  b.add(SHAPE.ball(6, 22, 16), { p: [0, 7, 0], grad: [C.brassD, C.brass], mat: "metal", facet: 0.03 });
  // The night he cannot sleep at all: a red glow in his seams, his back
  // (the side to the Factory) lit up round the hatch.
  if (awake) for (let i = 0; i < 3; i++) b.add(SHAPE.torus(6.12, 0.06, 4, 40), { p: [0, 7, 0], r: [RX + i * 0.4 - 0.4, 0.15, 0], c: 0xff6a40, mat: "glow", glow: 1.4 });
  for (let i = 0; i < 3; i++) b.add(SHAPE.torus(6.05, 0.18, 5, 40), { p: [0, 7, 0], r: [RX + i * 0.4 - 0.4, 0, 0], c: C.copper, mat: "metal" });
  // The big sleepy lens, half-lidded.
  b.add(SHAPE.cyl(2.4, 2.6, 0.6, 24, 0.1), { p: [0, 7.5, -5.7], r: [RX, 0, 0], c: C.iron, mat: "metal" });
  b.add(SHAPE.cyl(2.0, 2.0, 0.2, 24), { p: [0, 7.5, -6.0], r: [RX, 0, 0], c: awake ? 0xff7050 : C.dreamGold, mat: "glow", glow: awake ? 1.6 : 0.9 });
  b.add(SHAPE.cyl(0.9, 0.9, 0.22, 20), { p: [0, 7.3, -6.05], r: [RX, 0, 0], c: C.black });
  b.add(SHAPE.torus(2.5, 0.35, 5, 24, Math.PI), { p: [0, 7.7, -5.95], c: C.brassD, mat: "metal" });
  b.add(SHAPE.box(5.2, 1.4, 0.5, 0.2), { p: [0, 9.1, -5.85], c: C.brassD, mat: "metal" });
  for (const [x, y, z, a] of OLD_HUM_RODS) b.add(SHAPE.cyl(0.3, 0.3, 4, 8), { p: [x, 7 + y, z], r: [0, -a, RX], c: C.copper, mat: "metal" });
}
// The copper rods sticking out of his sides: [x, y, z, angle] from his
// centre (7 m up the model), shared with the Factory, which makes them
// solid. (None straight over the hatch on his back.)
export const OLD_HUM_RODS = Array.from({ length: 8 }, (_, i) => {
  const a = (i + 0.5) / 8 * Math.PI * 2;
  return [Math.cos(a) * 6.6, Math.sin(a) * 2, Math.sin(a) * 6.6, a];
});

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

// ── On the walls ─────────────────────────────────────────────────────────
// What the Factory hangs up as the week goes on. All of these hang flat
// on a wall: their back at z = 0, facing −z.

const starAt = (r, inner = 0.45) => Array.from({ length: 10 }, (_, i) => {
  const a = Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * inner : r;
  return [Math.cos(a) * k, Math.sin(a) * k];
});

// A framed picture of a fixed dream, one per client (`kind`): a paw for
// Biscuit, a gold star for Ethan, a cooking pot for Rosie, a rose and
// May's umbrella for Joe, a moon and stars for Sophie. Not fixed yet
// (`on` false): an empty frame waiting, a brass plate and nothing in it.
export function dreamFrame(b, { kind = "park", on = true } = {}) {
  const BG = { park: 0x8fc46a, school: 0x2e4a7a, kitchen: 0xf2d27a, garden: 0xf4b8c8, space: 0x141a44 };
  b.add(SHAPE.box(0.92, 0.74, 0.06, 0.02), { p: [0, 0, -0.03], c: on ? C.brass : C.woodD, mat: on ? "metal" : "solid" });
  b.add(SHAPE.box(0.8, 0.62, 0.02), { p: [0, 0, -0.06], c: on ? BG[kind] : 0x3a3448, facet: 0 });
  b.add(SHAPE.box(0.26, 0.05, 0.015), { p: [0, -0.42, -0.04], c: C.brassL, mat: "metal" });
  if (!on) return;
  const z = -0.075;
  if (kind === "park") {
    b.add(SHAPE.ball(0.13, 10, 7), { p: [0, -0.08, z], s: [1.15, 1, 0.2], c: 0x6a4a3a });
    for (const [x, y] of [[-0.17, 0.06], [-0.07, 0.15], [0.07, 0.15], [0.17, 0.06]]) b.add(SHAPE.ball(0.055, 8, 6), { p: [x, y, z], s: [1, 1.15, 0.2], c: 0x6a4a3a });
  } else if (kind === "school") {
    b.add(SHAPE.extrude(starAt(0.22), 0.03, 0.008), { p: [0, 0, z], c: C.dreamGold, mat: "glow", glow: 1.1 });
    b.add(SHAPE.box(0.6, 0.02, 0.01), { p: [0, -0.24, z], c: 0xf2f2e8, facet: 0 });
  } else if (kind === "kitchen") {
    b.add(SHAPE.cyl(0.16, 0.14, 0.18, 12), { p: [0, -0.1, z], r: [RX, 0, 0], s: [1, 1, 0.25], c: 0x9aa4ad, mat: "metal" });
    b.add(SHAPE.box(0.44, 0.04, 0.02), { p: [0, 0.0, z], c: 0x6a6f78 });
    for (const x of [-0.08, 0, 0.08]) b.add(SHAPE.capsule(0.022, 0.1, 6, 2), { p: [x, 0.15 + Math.abs(x) * -0.4, z], c: C.white });
  } else if (kind === "garden") {
    b.add(SHAPE.box(0.02, 0.32, 0.01), { p: [-0.12, -0.12, z], c: 0x3a7a3a });
    b.add(SHAPE.ball(0.08, 9, 7), { p: [-0.12, 0.06, z], s: [1, 1, 0.3], c: 0xd8304a });
    b.add(SHAPE.ball(0.04, 6, 5), { p: [-0.18, -0.08, z], s: [1.4, 0.7, 0.3], c: 0x4a9a4a });
    b.add(SHAPE.cone(0.18, 0.12, 8), { p: [0.13, 0.12, z], s: [1, 1, 0.25], c: 0x2a3a8a });
    b.add(SHAPE.box(0.015, 0.3, 0.01), { p: [0.13, -0.04, z], c: C.woodD });
  } else if (kind === "space") {
    b.add(SHAPE.ball(0.15, 12, 8), { p: [-0.1, 0.03, z], s: [1, 1, 0.2], c: 0xf4ecc8, mat: "glow", glow: 0.8 });
    b.add(SHAPE.ball(0.12, 12, 8), { p: [-0.04, 0.07, z - 0.005], s: [1, 1, 0.2], c: BG.space });
    for (const [x, y, r] of [[0.18, 0.16, 0.05], [0.12, -0.12, 0.035], [0.25, -0.02, 0.03]]) b.add(SHAPE.extrude(starAt(r), 0.02), { p: [x, y, z], c: C.dreamGold, mat: "glow", glow: 1.2 });
  }
}

// A glass-fronted cabinet of trophies, one shelf after another: `n` cups
// (achievements earned) on its three shelves, the rest of the room empty.
export function trophyCase(b, { n = 0 } = {}) {
  // A hollow box: back, sides, top and bottom.
  b.add(SHAPE.box(1.6, 1.5, 0.04, 0.01), { p: [0, 0, -0.02], c: 0x5a3a24 });
  b.both((k) => b.add(SHAPE.box(0.06, 1.5, 0.36, 0.015), { p: [k * 0.77, 0, -0.18], c: C.woodD }));
  b.both((k) => b.add(SHAPE.box(1.6, 0.06, 0.36, 0.015), { p: [0, k * 0.72, -0.18], c: C.woodD }));
  for (const y of [-0.42, 0.02, 0.46]) b.add(SHAPE.box(1.48, 0.03, 0.3), { p: [0, y, -0.18], c: C.wood });
  // An open front: just a brass rim where the glass would sit.
  for (const s of [-1, 1]) { b.add(SHAPE.box(1.56, 0.03, 0.03), { p: [0, s * 0.7, -0.36], c: C.brass, mat: "metal" }); b.add(SHAPE.box(0.03, 1.42, 0.03), { p: [s * 0.77, 0, -0.36], c: C.brass, mat: "metal" }); }
  b.add(SHAPE.box(1.7, 0.1, 0.4, 0.02), { p: [0, 0.79, -0.18], c: C.wood });
  b.add(SHAPE.box(0.5, 0.08, 0.02), { p: [0, 0.79, -0.385], c: C.brassL, mat: "metal" });
  const per = 9;
  for (let i = 0; i < Math.min(n, per * 3); i++) {
    const row = Math.floor(i / per), x = 0.62 - (i % per) * 0.155, y = 0.46 - row * 0.44 + 0.015;
    const gold = i % 3 !== 2;
    b.add(SHAPE.cyl(0.035, 0.045, 0.03, 8), { p: [x, y + 0.015, -0.18], c: C.woodD });
    b.add(SHAPE.cyl(0.012, 0.012, 0.07, 6), { p: [x, y + 0.065, -0.18], c: gold ? C.brass : C.steel, mat: "metal" });
    b.add(SHAPE.lathe([[0, 0], [0.025, 0.005], [0.05, 0.06], [0.055, 0.11], [0.05, 0.12]], 10), { p: [x, y + 0.1, -0.18], c: gold ? C.brass : C.steel, mat: "metal" });
  }
  // A strip of light along the top, so the glass glints.
  b.add(SHAPE.box(1.4, 0.02, 0.02), { p: [0, 0.66, -0.3], c: C.dreamGold, mat: "glow", glow: 0.8 });
}

// A cork board with notes, a photo or two and a length of red string.
export function corkboard(b, { seed = 2 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.box(1.3, 0.9, 0.05, 0.02), { p: [0, 0, -0.025], c: C.wood });
  b.add(SHAPE.box(1.2, 0.8, 0.02), { p: [0, 0, -0.05], c: 0xc49a6c, facet: 0.15 });
  const notes = [[-0.4, 0.2, 0xfff3a0], [-0.05, 0.22, 0xffd0e0], [0.35, 0.18, 0xd8f0ff], [-0.3, -0.18, C.paper], [0.1, -0.15, 0xfff3a0], [0.42, -0.2, 0xd0ffd8]];
  notes.forEach(([x, y, c], i) => {
    b.add(SHAPE.box(0.24, 0.22, 0.005), { p: [x, y, -0.062], r: [0, 0, (rnd() - 0.5) * 0.3], c, facet: 0 });
    for (let k = 0; k < 3; k++) b.add(SHAPE.box(0.15 - k * 0.03, 0.012, 0.003), { p: [x - 0.02, y + 0.04 - k * 0.04, -0.066], c: 0x8a8a96, facet: 0 });
    b.add(SHAPE.ball(0.018, 6, 4), { p: [x, y + 0.09, -0.07], c: [C.red, C.teal, C.dreamPink][i % 3] });
  });
  // The red string from note to note.
  for (const [[ax, ay], [bx, by]] of [[[-0.4, 0.29], [0.1, -0.06]], [[0.1, -0.06], [0.35, 0.27]]]) {
    const l = Math.hypot(bx - ax, by - ay);
    b.add(SHAPE.box(l, 0.008, 0.004), { p: [(ax + bx) / 2, (ay + by) / 2, -0.074], r: [0, 0, Math.atan2(by - ay, bx - ax)], c: C.red, facet: 0 });
  }
}

// A tear-off calendar: seven nights, `night` of them crossed off.
export function calendar(b, { night = 0 } = {}) {
  b.add(SHAPE.box(0.5, 0.62, 0.02), { p: [0, 0, -0.01], c: C.paper, facet: 0 });
  b.add(SHAPE.box(0.5, 0.14, 0.025), { p: [0, 0.24, -0.015], c: C.red });
  b.add(SHAPE.cyl(0.015, 0.015, 0.04, 6), { p: [0, 0.32, -0.02], r: [RX, 0, 0], c: C.iron, mat: "metal" });
  for (let i = 0; i < 7; i++) {
    const x = -0.16 + (i % 4) * 0.105, y = 0.08 - Math.floor(i / 4) * 0.16;
    b.add(SHAPE.box(0.08, 0.1, 0.004), { p: [x, y, -0.024], c: 0xe8e0cc, facet: 0 });
    if (i < night) for (const s of [-1, 1]) b.add(SHAPE.box(0.11, 0.014, 0.004), { p: [x, y, -0.028], r: [0, 0, s * 0.8], c: C.red, facet: 0 });
  }
}

// "Employee of the month": Cog's portrait in a frame, a gold rosette on it.
export function cogPoster(b) {
  b.add(SHAPE.box(0.7, 0.92, 0.04, 0.015), { p: [0, 0, -0.02], c: C.teal });
  b.add(SHAPE.box(0.6, 0.66, 0.01), { p: [0, 0.05, -0.045], c: 0xf3e6c8, facet: 0 });
  b.add(SHAPE.box(0.5, 0.07, 0.01), { p: [0, -0.37, -0.045], c: C.brassL, mat: "metal" });
  // Cog: a round brass body, the big teal eye, the propeller.
  b.add(SHAPE.ball(0.17, 12, 8), { p: [0, 0.02, -0.06], s: [1, 1, 0.3], c: C.brass, mat: "metal" });
  b.add(SHAPE.ball(0.08, 12, 8), { p: [0, 0.04, -0.11], s: [1, 1, 0.3], c: C.dream, mat: "glow", glow: 1 });
  b.add(SHAPE.ball(0.035, 8, 6), { p: [0.01, 0.05, -0.125], s: [1, 1, 0.3], c: C.black });
  b.add(SHAPE.box(0.04, 0.1, 0.01), { p: [0, 0.24, -0.06], c: C.iron });
  b.add(SHAPE.box(0.26, 0.025, 0.01), { p: [0, 0.29, -0.065], c: C.steel, mat: "metal" });
  // The rosette in the corner.
  b.add(SHAPE.cyl(0.07, 0.07, 0.015, 12), { p: [0.2, 0.28, -0.06], r: [RX, 0, 0], c: C.dreamGold });
  b.both((s) => b.add(SHAPE.box(0.035, 0.12, 0.008), { p: [0.2 + s * 0.03, 0.19, -0.055], r: [0, 0, s * 0.2], c: C.red }));
}

// A brass panel of gauges on the wall, and a row of lamps.
export function gauges(b) {
  b.add(SHAPE.box(1.3, 0.6, 0.08, 0.02), { p: [0, 0, -0.04], c: C.tealD });
  b.add(SHAPE.box(1.36, 0.06, 0.1, 0.02), { p: [0, 0.31, -0.05], c: C.brassD, mat: "metal" });
  [-0.4, 0, 0.4].forEach((x, i) => {
    b.add(SHAPE.cyl(0.15, 0.15, 0.05, 18, 0.01), { p: [x, 0.04, -0.1], r: [RX, 0, 0], c: C.brass, mat: "metal" });
    b.add(SHAPE.cyl(0.125, 0.125, 0.01, 18), { p: [x, 0.04, -0.125], r: [RX, 0, 0], c: C.cream });
    const a = [-0.9, 0.3, 1.1][i];
    b.add(SHAPE.box(0.012, 0.1, 0.006), { p: [x - Math.sin(a) * 0.045, 0.04 + Math.cos(a) * 0.045, -0.135], r: [0, 0, a], c: C.red });
  });
  for (let i = 0; i < 5; i++) b.add(SHAPE.ball(0.025, 8, 6), { p: [-0.3 + i * 0.15, -0.2, -0.09], c: [C.dream, C.dream, C.dreamGold, C.dream, C.dreamPink][i], mat: "glow", glow: 1.2 });
}
