import { SHAPE, rng, vary } from "../modelkit.js";
import { C } from "../palette.js";

// ── Ethan's school ───────────────────────────────────────────────────────
// The glitches of a schoolboy's dream (paper, pencils, a backpack, a
// sharpener, the Red Pen) and the school round them. Characters have
// their origin at the feet (fliers: the middle) and face −z; props sit on
// the floor at their origin.

const RX = Math.PI / 2;
const INK = 0x2a2440;

// Angry cartoon eyes on a flat face: whites, pupils, a glint and a brow.
function eyes(n, { x = 0.09, y = 0, z = 0, r = 0.06, brow = 0x2a1a10, tilt = 0.4 } = {}) {
  n.both((s) => {
    n.add(SHAPE.ball(r, 10, 7), { p: [s * x, y, z], s: [1, 1.1, 0.45], c: C.white, facet: 0.02 });
    n.add(SHAPE.ball(r * 0.5, 8, 6), { p: [s * (x - r * 0.15), y - r * 0.1, z - r * 0.35], s: [1, 1, 0.45], c: C.black, facet: 0 });
    n.add(SHAPE.ball(r * 0.15, 6, 4), { p: [s * (x - r * 0.3), y + r * 0.15, z - r * 0.5], c: 0xffffff, mat: "glow", glow: 1.2 });
    n.add(SHAPE.box(r * 1.9, r * 0.4, r * 0.4, r * 0.12), { p: [s * x, y + r * 1.25, z - r * 0.1], r: [0, 0, s * tilt], c: brow });
  });
}

// ── Glitches ──

// A paper plane folded from lined homework, a pink scribble on each wing
// and a scowl at the nose. Node "body" (the sim's pitch and roll).
export function plane(b) {
  const PAPER = [0xd8dce6, 0xfafbff];
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.both((s) => {
      // Wing: a triangle from the nose back to the wide tail, folded up a little.
      n.at([0, 0.04, 0], [0, 0, s * 0.28], 1, () => {
        n.add(SHAPE.extrude([[0, -0.42], [s * 0.42, 0.34], [0, 0.3]], 0.02, 0.004), { r: [RX, 0, 0], grad: PAPER, facet: 0.02 });
        // Ruled lines and a scribble on top.
        for (let i = 0; i < 3; i++) n.add(SHAPE.box(0.006, 0.004, 0.32 - i * 0.08), { p: [s * (0.08 + i * 0.07), 0.012, 0.05 + i * 0.04], r: [0, -s * 0.5, 0], c: 0x8ab0e0, facet: 0 });
        n.add(SHAPE.torus(0.05, 0.008, 3, 10), { p: [s * 0.2, 0.015, 0.15], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.5 });
      });
      // Keel folds hanging under the middle.
      n.add(SHAPE.extrude([[0, -0.4], [0, 0.3], [-0.09, 0.26]], 0.015, 0.003), { p: [s * 0.012, 0.03, 0], r: [RX, 0, RX], c: PAPER[0], facet: 0.02 });
    });
    eyes(n, { x: 0.05, y: 0.08, z: -0.2, r: 0.04, brow: INK, tilt: 0.5 });
  });
}

// A yellow pencil standing on its tip: hexagonal body, pink eraser in a
// brass ferrule on top, a face half way up. Nodes: "body" (squash, spin,
// tilt; its pivot is the tip), "tip".
export function pencil(b) {
  const YEL = [0xe0a020, 0xffd040];
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.node("tip", [0, 0, 0], [0, 0, 0], (t) => {
      t.add(SHAPE.cone(0.06, 0.12, 6), { p: [0, 0.06, 0], r: [Math.PI, 0, 0], c: 0x3a3a44 });
      t.add(SHAPE.cyl(0.17, 0.06, 0.24, 6), { p: [0, 0.24, 0], c: 0xe8c898, facet: 0.06 });
    });
    n.add(SHAPE.cyl(0.18, 0.18, 0.86, 6), { p: [0, 0.79, 0], grad: YEL, facet: 0.08 });
    for (const y of [0.42, 1.1]) n.add(SHAPE.cyl(0.185, 0.185, 0.02, 6), { p: [0, y, 0], c: 0x2a8a3a });
    n.add(SHAPE.cyl(0.19, 0.19, 0.12, 12), { p: [0, 1.28, 0], c: C.steel, mat: "metal" });
    for (const y of [1.25, 1.31]) n.add(SHAPE.torus(0.19, 0.01, 3, 12), { p: [0, y, 0], r: [RX, 0, 0], c: C.brassD, mat: "metal" });
    n.add(SHAPE.cyl(0.18, 0.18, 0.16, 12, 0.04), { p: [0, 1.42, 0], c: 0xf07890 });
    eyes(n, { x: 0.075, y: 0.92, z: -0.17, r: 0.06, brow: INK, tilt: 0.45 });
    n.add(SHAPE.box(0.1, 0.02, 0.02, 0.008), { p: [0, 0.74, -0.175], r: [0, 0, 0.12], c: INK });
    n.add(SHAPE.torus(0.06, 0.01, 3, 10), { p: [0.1, 0.6, -0.17], c: C.dreamPink, mat: "glow", glow: 1.4 });
  });
}

// A school backpack on stubby feet: a fat rounded bag with a front pocket
// for a face, the zip across the top its mouth (node "lid" opens), straps
// waving like arms. Nodes: "body", "lid", "strapL", "strapR".
export function backpack(b) {
  const RED = [0xa02a30, 0xd84a48], NAVY = 0x2a3a6a;
  b.both((s) => b.add(SHAPE.ball(0.16, 8, 6), { p: [s * 0.36, 0.08, -0.05], s: [1, 0.55, 1.4], c: 0x3a2a24 }));
  b.node("body", [0, 0.1, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.box(1.2, 1.05, 0.82, 0.3), { p: [0, 0.55, 0], grad: RED, facet: 0.05 });
    // Front pocket with the face, a pencil and a pink sticker.
    n.add(SHAPE.box(0.86, 0.5, 0.18, 0.12), { p: [0, 0.38, -0.44], grad: [0x23305a, NAVY], facet: 0.04 });
    n.add(SHAPE.torus(0.38, 0.012, 3, 18, Math.PI), { p: [0, 0.38, -0.54], s: [1, 0.55, 1], c: C.steel, mat: "metal" });
    eyes(n, { x: 0.18, y: 0.45, z: -0.54, r: 0.09, brow: 0x1a1a30, tilt: 0.45 });
    n.add(SHAPE.ball(0.06, 8, 6), { p: [0.32, 0.25, -0.53], s: [1, 1, 0.3], c: C.dreamPink });
    // Side pocket with a water bottle.
    n.add(SHAPE.cyl(0.12, 0.12, 0.36, 10), { p: [0.66, 0.5, 0.05], c: 0x6ac0f0, mat: "glass" });
    n.add(SHAPE.cyl(0.07, 0.07, 0.08, 8), { p: [0.66, 0.72, 0.05], c: 0x2a8a3a });
    n.add(SHAPE.box(0.08, 0.3, 0.4, 0.04), { p: [0.6, 0.42, 0.05], c: RED[0] });
    // Carry handle on top.
    n.add(SHAPE.torus(0.14, 0.03, 4, 10, Math.PI), { p: [0, 1.08, 0.18], c: 0x3a2a24 });
  });
  // The top flap with the zip: opens like a mouth.
  b.node("lid", [0, 1.1, 0.35], [0, 0, 0], (l) => {
    l.add(SHAPE.box(1.14, 0.12, 0.8, 0.06), { p: [0, 0, -0.38], c: RED[1] });
    l.add(SHAPE.box(1.0, 0.03, 0.04), { p: [0, -0.06, -0.78], c: C.steel, mat: "metal" });
    for (let i = -4; i <= 4; i++) l.add(SHAPE.box(0.04, 0.05, 0.03), { p: [i * 0.11, -0.09, -0.78], c: C.steel, mat: "metal" });
    l.add(SHAPE.box(0.05, 0.12, 0.02, 0.01), { p: [0.42, -0.14, -0.79], c: C.brass, mat: "metal" });
  });
  for (const [name, s] of [["strapL", -1], ["strapR", 1]]) {
    b.node(name, [s * 0.5, 1.05, 0.38], [0, 0, 0], (st) => st.add(SHAPE.box(0.12, 0.9, 0.05, 0.02), { p: [0, -0.42, 0.04], r: [0.2, 0, -s * 0.15], c: 0x3a2a24 }));
  }
}

// A desk sharpener the size of a crate: a steel body, the pencil hole on
// the front (glowing pink inside), a crank on the side. Nodes: "crank",
// "core" (pulses when it pops a pencil out).
export function sharpener(b) {
  b.add(SHAPE.box(1.5, 0.9, 1.2, 0.12), { p: [0, 0.45, 0], grad: [0x6a7480, 0xb8c2cc], mat: "metal", facet: 0.03 });
  b.add(SHAPE.box(1.56, 0.12, 1.26, 0.05), { p: [0, 0.06, 0], c: 0x2a3440 });
  // The shavings drawer, half open and spilling.
  b.add(SHAPE.box(1.2, 0.3, 0.2, 0.05), { p: [0, 0.22, 0.66], c: 0x3a6ab0 });
  const rnd = rng(9);
  for (let i = 0; i < 9; i++) b.add(SHAPE.cone(0.07, 0.04, 6), { p: [(rnd() - 0.5) * 1, 0.04, 0.82 + rnd() * 0.3], r: [rnd(), rnd() * 6, 0], c: vary(0xe8c898, rnd, 0.1) });
  // The hole, a dark mouth ringed with brass.
  b.add(SHAPE.cyl(0.24, 0.24, 0.06, 14), { p: [0, 0.5, -0.61], r: [RX, 0, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.cyl(0.18, 0.18, 0.08, 14), { p: [0, 0.5, -0.62], r: [RX, 0, 0], c: 0x14101a });
  b.node("core", [0, 0.5, -0.56], [0, 0, 0], (c) => c.add(SHAPE.sphere(0.12, 1), { c: C.dreamPink, mat: "glow", glow: 1.6 }));
  eyes(b, { x: 0.36, y: 0.72, z: -0.61, r: 0.1, brow: 0x1a1a24, tilt: 0.35 });
  // Crank on the right.
  b.add(SHAPE.cyl(0.05, 0.05, 0.12, 8), { p: [0.8, 0.5, 0], r: [0, 0, RX], c: C.steel, mat: "metal" });
  b.node("crank", [0.88, 0.5, 0], [0, 0, 0], (k) => {
    k.add(SHAPE.box(0.05, 0.5, 0.08, 0.02), { p: [0, 0.2, 0], c: C.steel, mat: "metal" });
    k.add(SHAPE.cyl(0.06, 0.06, 0.2, 8), { p: [0.1, 0.42, 0], r: [0, 0, RX], c: C.red });
  });
}

// The Red Pen: a teacher's red ballpoint as tall as a door, standing on
// its nib. Node "pen" pivots at the nib (the sim tilts it); "nib" glows
// with ink, "cap" is the clicker end, "face".
export function redPen(b) {
  const RED = [0x9a1820, 0xe03a40];
  b.node("pen", [0, 0, 0], [0, 0, 0], (p) => {
    p.node("nib", [0, 0, 0], [0, 0, 0], (n) => {
      n.add(SHAPE.ball(0.07, 8, 6), { p: [0, 0.07, 0], c: 0xff4040, mat: "glow", glow: 2 });
      n.add(SHAPE.cone(0.2, 0.42, 12), { p: [0, 0.3, 0], r: [Math.PI, 0, 0], c: C.steel, mat: "metal" });
    });
    // Grip, barrel, the top end with its clip.
    p.add(SHAPE.cyl(0.36, 0.22, 0.4, 14), { p: [0, 0.7, 0], c: 0x3a3a44 });
    for (let i = 0; i < 4; i++) p.add(SHAPE.torus(0.34 - i * 0.025, 0.025, 4, 14), { p: [0, 0.58 + i * 0.08, 0], r: [RX, 0, 0], c: 0x24242c });
    p.add(SHAPE.cyl(0.4, 0.38, 2.0, 14, 0.04), { p: [0, 1.9, 0], grad: RED, facet: 0.04 });
    p.add(SHAPE.cyl(0.41, 0.41, 0.08, 14), { p: [0, 0.94, 0], c: C.brass, mat: "metal" });
    p.add(SHAPE.box(0.2, 0.04, 0.6, 0.01), { p: [0, 2.0, 0.42], c: 0xffffff, facet: 0 });
    p.node("cap", [0, 2.9, 0], [0, 0, 0], (c) => {
      c.add(SHAPE.cyl(0.4, 0.4, 0.3, 14, 0.06), { c: RED[0] });
      c.add(SHAPE.cyl(0.14, 0.16, 0.26, 10, 0.04), { p: [0, 0.26, 0], c: C.steel, mat: "metal" });
      c.add(SHAPE.box(0.12, 0.9, 0.08, 0.03), { p: [0, -0.3, 0.44], c: C.steel, mat: "metal" });
      c.add(SHAPE.ball(0.06, 8, 6), { p: [0, -0.76, 0.46], c: C.steel, mat: "metal" });
    });
    // The face, and a stern pair of half-moon glasses.
    p.node("face", [0, 2.2, -0.39], [0, 0, 0], (f) => {
      eyes(f, { x: 0.15, y: 0, z: 0, r: 0.11, brow: 0x3a0a10, tilt: 0.5 });
      f.both((s) => f.add(SHAPE.torus(0.13, 0.015, 3, 12, Math.PI), { p: [s * 0.15, -0.04, -0.06], r: [0, 0, Math.PI], c: C.brassD, mat: "metal" }));
      f.add(SHAPE.box(0.1, 0.015, 0.015), { p: [0, 0.0, -0.06], c: C.brassD, mat: "metal" });
      f.add(SHAPE.box(0.26, 0.04, 0.04, 0.015), { p: [0, -0.32, -0.02], r: [0, 0, 0.06], c: 0x3a0a10 });
    });
    // Ink scribbles round the barrel, glowing.
    p.add(SHAPE.torus(0.41, 0.012, 3, 20), { p: [0, 1.4, 0], r: [RX + 0.2, 0, 0.1], c: C.dreamPink, mat: "glow", glow: 1.5 });
  });
}

// ── The school ──

// A row of lockers along x (n of them), doors facing −z. A few hang open.
export function lockers(b, { n = 6, seed = 1, h = 2.0 } = {}) {
  const rnd = rng(seed), W = 0.6;
  const cols = [0x2f6f9a, 0x3a7fae];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * W;
    b.add(SHAPE.box(W - 0.02, h, 0.5, 0.02), { p: [x, h / 2, 0], grad: [cols[0], cols[1]], facet: 0.03 });
    // Vents, handle, a number plate.
    for (let k = 0; k < 4; k++) b.add(SHAPE.box(0.3, 0.015, 0.01), { p: [x, h - 0.2 - k * 0.05, -0.255], c: 0x1f4a6a });
    b.add(SHAPE.box(0.03, 0.14, 0.03, 0.01), { p: [x + 0.2, h * 0.5, -0.26], c: C.steel, mat: "metal" });
    b.add(SHAPE.box(0.12, 0.05, 0.01), { p: [x, h - 0.45, -0.255], c: C.paper });
    if (rnd() < 0.15) b.add(SHAPE.box(0.12, 0.12, 0.01), { p: [x - 0.1, h * 0.6, -0.256], r: [0, 0, rnd() - 0.5], c: [0xffd23a, 0xff8fb8, 0x7ae0a0][Math.floor(rnd() * 3)] });
  }
  b.add(SHAPE.box(n * W + 0.04, 0.06, 0.54), { p: [0, h + 0.03, 0], c: 0x24506e });
}

// A pupil's desk with its chair tucked behind (the chair is to the +z).
export function schoolDesk(b, { seed = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.box(1.0, 0.05, 0.6, 0.015), { p: [0, 0.74, 0], c: vary(0xd8b080, rnd, 0.05) });
  b.add(SHAPE.box(0.96, 0.12, 0.56, 0.02), { p: [0, 0.65, 0], c: 0x7a8890, mat: "metal" });
  b.both((s) => b.both((t) => b.add(SHAPE.cyl(0.02, 0.02, 0.6, 6), { p: [s * 0.44, 0.3, t * 0.24], c: C.steel, mat: "metal" })));
  // Chair.
  b.add(SHAPE.box(0.44, 0.04, 0.42, 0.015), { p: [0, 0.44, 0.62], c: 0x3a7fae });
  b.add(SHAPE.box(0.44, 0.38, 0.04, 0.015), { p: [0, 0.68, 0.84], r: [-0.1, 0, 0], c: 0x3a7fae });
  b.both((s) => b.both((t) => b.add(SHAPE.cyl(0.015, 0.015, 0.44, 5), { p: [s * 0.19, 0.22, 0.62 + t * 0.18], c: C.steel, mat: "metal" })));
  // A book or a paper, now and then.
  if (rnd() < 0.6) b.add(SHAPE.box(0.24, 0.03, 0.32), { p: [(rnd() - 0.5) * 0.4, 0.78, 0], r: [0, rnd() - 0.5, 0], c: [0xd84a48, 0x3a7fae, 0x2a8a3a][Math.floor(rnd() * 3)] });
  else b.add(SHAPE.box(0.22, 0.005, 0.3), { p: [0, 0.77, 0], r: [0, rnd() - 0.5, 0], c: C.paper });
}

// The teacher's big desk, an apple and a mug on it.
export function teacherDesk(b) {
  b.add(SHAPE.box(1.8, 0.08, 0.9, 0.03), { p: [0, 0.78, 0], grad: [C.woodD, C.woodL] });
  b.add(SHAPE.box(1.7, 0.74, 0.08, 0.02), { p: [0, 0.37, 0.4], c: C.wood });
  b.both((s) => b.add(SHAPE.box(0.5, 0.74, 0.8, 0.03), { p: [s * 0.6, 0.37, 0], grad: [C.woodD, C.wood] }));
  b.add(SHAPE.ball(0.09, 10, 7), { p: [-0.5, 0.9, -0.1], c: 0xd02a2a });
  b.add(SHAPE.cyl(0.008, 0.008, 0.06, 4), { p: [-0.5, 1.0, -0.1], c: C.woodD });
  b.add(SHAPE.cyl(0.06, 0.05, 0.12, 10), { p: [0.4, 0.88, 0.1], c: C.cream });
  b.add(SHAPE.box(0.4, 0.06, 0.3), { p: [0.05, 0.85, 0.05], r: [0, 0.2, 0], c: 0x3a7fae });
}

// A green chalkboard on the wall (it faces −z), sums on it and a tray.
export function chalkboard(b, { w = 4 } = {}) {
  b.add(SHAPE.box(w + 0.16, 1.5, 0.08, 0.02), { p: [0, 1.75, 0], c: C.woodD });
  b.add(SHAPE.box(w, 1.36, 0.04), { p: [0, 1.75, -0.03], c: 0x2a4a3a, facet: 0.02 });
  const rnd = rng(4);
  // Chalk: rows of scribbled sums, a big "TEST" circled.
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) b.add(SHAPE.box(0.18 + rnd() * 0.2, 0.025, 0.01), { p: [-w / 2 + 0.4 + i * (w - 0.8) / 6, 2.2 - r * 0.25, -0.055], r: [0, 0, (rnd() - 0.5) * 0.2], c: 0xe8f0e8, facet: 0 });
  b.add(SHAPE.torus(0.32, 0.02, 3, 16), { p: [w / 2 - 0.6, 1.4, -0.055], s: [1.4, 1, 1], c: 0xffe08a, facet: 0 });
  b.add(SHAPE.box(w, 0.05, 0.12), { p: [0, 1.03, -0.06], c: C.wood });
}

// A tall bookshelf, books of every colour (it is long along x).
export function bookshelf(b, { w = 4, h = 3, seed = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.box(w, h, 0.8, 0.03), { p: [0, h / 2, 0], grad: [C.woodD, C.wood], facet: 0.03 });
  const shelves = 5, gap = (h - 0.2) / shelves;
  for (const side of [-1, 1]) for (let s = 0; s < shelves; s++) {
    let x = -w / 2 + 0.12;
    const y = 0.1 + s * gap + 0.02;
    while (x < w / 2 - 0.2) {
      const bw = 0.06 + rnd() * 0.08, bh = gap * (0.6 + rnd() * 0.3);
      b.add(SHAPE.box(bw, bh, 0.3), { p: [x + bw / 2, y + bh / 2, side * 0.25], r: [0, 0, rnd() < 0.08 ? 0.25 : 0], c: vary([0xd84a48, 0x3a7fae, 0x2a8a3a, 0xe0a020, 0x7a4aa0, 0xf3e6c8][Math.floor(rnd() * 6)], rnd, 0.1), facet: 0.04 });
      x += bw + 0.01;
    }
  }
}

// A reading table with two stools.
export function readingTable(b) {
  b.add(SHAPE.box(2.4, 0.08, 1.2, 0.03), { p: [0, 0.76, 0], grad: [C.wood, C.woodL] });
  b.both((s) => b.both((t) => b.add(SHAPE.box(0.08, 0.72, 0.08), { p: [s * 1.1, 0.36, t * 0.5], c: C.woodD })));
  b.add(SHAPE.box(0.3, 0.05, 0.4), { p: [0.4, 0.82, 0], r: [0, 0.3, 0], c: 0x7a4aa0 });
  b.add(SHAPE.box(0.3, 0.07, 0.4), { p: [-0.5, 0.83, 0.1], r: [0, -0.2, 0], c: 0xe0a020 });
}

// A yellow school bus (long along x, nose to −x).
export function schoolBus(b) {
  const Y = [0xd89a10, 0xffc828];
  b.add(SHAPE.box(9, 2.2, 2.5, 0.25), { p: [0.4, 1.6, 0], grad: Y, facet: 0.03 });
  b.add(SHAPE.box(1.6, 1.4, 2.4, 0.2), { p: [-4.6, 1.2, 0], grad: Y, facet: 0.03 });
  b.add(SHAPE.box(9.1, 0.12, 2.56), { p: [0.4, 1.3, 0], c: INK });
  // Windows along both sides and the windscreen.
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) b.add(SHAPE.box(0.8, 0.6, 0.04), { p: [-3.2 + i * 1.05, 2.1, s * 1.26], c: 0x9ac8e8, mat: "glass" });
  b.add(SHAPE.box(0.04, 0.7, 2.1), { p: [-3.82, 2.1, 0], c: 0x9ac8e8, mat: "glass" });
  b.add(SHAPE.box(0.1, 0.4, 2.2), { p: [-5.42, 0.8, 0], c: INK });
  for (const [x, s] of [[-3.8, -1], [-3.8, 1], [3, -1], [3, 1]]) {
    b.add(SHAPE.cyl(0.5, 0.5, 0.3, 12), { p: [x, 0.5, s * 1.15], r: [RX, 0, 0], c: 0x1a1a20 });
    b.add(SHAPE.cyl(0.25, 0.25, 0.32, 8), { p: [x, 0.5, s * 1.15], r: [RX, 0, 0], c: C.steel, mat: "metal" });
  }
  b.add(SHAPE.box(0.6, 0.3, 0.05), { p: [0, 2.85, -1.26], c: INK });
  b.add(SHAPE.box(0.1, 0.5, 0.5), { p: [-5.4, 1.4, -1.1], c: C.red });
}

// A flagpole with a pennant (school colours).
export function flagpole(b) {
  b.add(SHAPE.cyl(0.25, 0.3, 0.3, 8), { p: [0, 0.15, 0], c: C.steel, mat: "metal" });
  b.add(SHAPE.cyl(0.05, 0.06, 7, 8), { p: [0, 3.6, 0], c: C.steel, mat: "metal" });
  b.add(SHAPE.ball(0.1, 8, 6), { p: [0, 7.1, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.extrude([[0, 0], [1.6, -0.5], [0, -1]], 0.03, 0.005), { p: [0.05, 6.8, 0], c: 0x3a7fae });
  b.add(SHAPE.ball(0.12, 8, 6), { p: [0.5, 6.4, 0], s: [1, 1, 0.3], c: 0xffd23a });
}

// A basketball hoop on a wall bracket (the ring sticks out towards −z).
export function hoop(b) {
  b.add(SHAPE.box(1.8, 1.1, 0.08, 0.02), { p: [0, 3.4, 0], c: 0xf7f7f2 });
  b.add(SHAPE.box(0.6, 0.45, 0.09), { p: [0, 3.2, -0.005], c: 0xd84a2a });
  b.add(SHAPE.box(0.52, 0.37, 0.1), { p: [0, 3.2, -0.01], c: 0xf7f7f2 });
  b.add(SHAPE.torus(0.24, 0.025, 4, 16), { p: [0, 3.05, -0.32], r: [RX, 0, 0], c: 0xe04a1a, mat: "metal" });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(SHAPE.cyl(0.006, 0.006, 0.4, 3), { p: [Math.cos(a) * 0.18, 2.86, -0.32 + Math.sin(a) * 0.18], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3], c: 0xffffff, facet: 0 });
  }
}

// A round wall clock (faces −z) whose hands do not agree.
export function wallClock(b) {
  b.add(SHAPE.cyl(0.42, 0.42, 0.08, 20, 0.02), { p: [0, 0, 0], r: [RX, 0, 0], c: 0x2a2a30 });
  b.add(SHAPE.cyl(0.36, 0.36, 0.02, 20), { p: [0, 0, -0.045], r: [RX, 0, 0], c: C.white });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; b.add(SHAPE.box(0.025, 0.06, 0.01), { p: [Math.sin(a) * 0.3, Math.cos(a) * 0.3, -0.06], r: [0, 0, -a], c: INK }); }
  b.add(SHAPE.box(0.025, 0.22, 0.01), { p: [0.05, 0.08, -0.065], r: [0, 0, -0.6], c: INK });
  b.add(SHAPE.box(0.02, 0.3, 0.01), { p: [-0.1, -0.08, -0.07], r: [0, 0, 2.3], c: C.red });
}

// The school bell in its little roof tower.
export function bellTower(b) {
  b.add(SHAPE.box(2.4, 0.3, 2.4, 0.05), { p: [0, 0.15, 0], c: 0xb8a890 });
  b.both((s) => b.both((t) => b.add(SHAPE.box(0.25, 2.6, 0.25, 0.04), { p: [s * 1, 1.6, t * 1], c: 0xd8c8b0 })));
  b.add(SHAPE.cone(1.9, 1.2, 4), { p: [0, 3.5, 0], r: [0, Math.PI / 4, 0], c: 0x8a3a2a });
  b.add(SHAPE.lathe([[0, 0], [0.55, 0], [0.5, 0.15], [0.35, 0.6], [0.3, 0.9], [0, 0.95]], 14), { p: [0, 1.9, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.ball(0.12, 8, 6), { p: [0, 1.85, 0], c: C.brassD, mat: "metal" });
}

// A rooftop air conditioning box with a fan on top.
export function acUnit(b, { seed = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.box(1.6, 1.0, 1.2, 0.05), { p: [0, 0.5, 0], c: vary(0xb8bec4, rnd, 0.05), mat: "metal" });
  for (let i = 0; i < 6; i++) b.add(SHAPE.box(1.4, 0.03, 0.01), { p: [0, 0.2 + i * 0.12, -0.605], c: 0x7a8088 });
  b.add(SHAPE.cyl(0.45, 0.45, 0.06, 14), { p: [0, 1.03, 0], c: 0x3a3f47, mat: "metal" });
  for (let i = 0; i < 3; i++) b.add(SHAPE.box(0.8, 0.02, 0.12), { p: [0, 1.07, 0], r: [0, i * 1.05, 0.2], c: C.steel, mat: "metal" });
}

// A water fountain on the wall (faces −z).
export function fountain(b) {
  b.add(SHAPE.box(0.6, 0.3, 0.45, 0.05), { p: [0, 0.9, -0.2], c: C.steel, mat: "metal" });
  b.add(SHAPE.box(0.2, 0.75, 0.2, 0.03), { p: [0, 0.38, -0.05], c: 0x9aa4ad, mat: "metal" });
  b.add(SHAPE.cyl(0.03, 0.03, 0.08, 6), { p: [0.1, 1.08, -0.25], c: C.steel, mat: "metal" });
}
