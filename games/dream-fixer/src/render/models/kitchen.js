import { SHAPE, shade, rng, vary } from "../modelkit.js";
import { C } from "../palette.js";

// ── Rosie's kitchen ──────────────────────────────────────────────────────
// Things that answer the Lullaby Bell (kit.ringable). Built at the size
// the sim gives them, standing on the origin.

// A jelly on a plate, set in a tiered mould, a cherry on top. Node "body"
// (pivot at its foot) wobbles.
export function jelly(b, { color = 0xff5a6e, r = 1.1, h = 1 } = {}) {
  b.add(SHAPE.cyl(r + 0.3, r + 0.2, 0.08, 20, 0.03), { p: [0, 0.02, 0], grad: [0xd8ccb8, C.paper] });
  b.add(SHAPE.torus(r + 0.24, 0.03, 4, 24), { p: [0, 0.06, 0], r: [Math.PI / 2, 0, 0], c: 0x7fb8d8 });
  b.node("body", [0, 0.06, 0], [0, 0, 0], (n) => {
    const H = h - 0.06, k = r;
    // Three tiers, each bulging out and tucked in at the groove above.
    const prof = [[0, 0], [1, 0], [1.04, 0.08], [1.02, 0.26], [0.9, 0.34], [0.92, 0.4], [0.9, 0.58], [0.76, 0.66], [0.77, 0.72], [0.72, 0.86], [0.5, 0.97], [0.2, 1], [0, 1]].map(([x, y]) => [x * k, y * H]);
    n.add(SHAPE.lathe(prof, 18), { grad: [shade(color, 0.62), shade(color, 1.2)], facet: 0.06 });
    // Shine down one side, and bubbles set in the jelly.
    for (const [y0, w] of [[0.17, 0.32], [0.49, 0.26], [0.79, 0.16]])
      n.add(SHAPE.box(0.07, H * w * 0.8, 0.03, 0.01), { p: [-k * 0.66 * (1 - y0 * 0.25), H * y0, -k * 0.66 * (1 - y0 * 0.25)], r: [0, Math.PI / 4, 0], c: 0xffffff, mat: "glow", glow: 0.8 });
    for (const [a, y, s] of [[0.5, 0.18, 0.06], [2.2, 0.48, 0.05], [4, 0.22, 0.05], [5.3, 0.75, 0.04]])
      n.add(SHAPE.ball(s, 6, 4), { p: [Math.cos(a) * k * 0.92 * (1 - y * 0.3), y * H, Math.sin(a) * k * 0.92 * (1 - y * 0.3)], c: shade(color, 1.45) });
    n.add(SHAPE.ball(0.15, 10, 7), { p: [0, H + 0.1, 0], c: C.red });
    n.add(SHAPE.ball(0.04, 6, 4), { p: [-0.05, H + 0.19, -0.06], c: 0xffd0d0 });
    n.add(SHAPE.cyl(0.012, 0.016, 0.24, 5), { p: [0.05, H + 0.3, 0], r: [0, 0, -0.35], c: 0x4a7a2a });
  });
}

// A soufflé risen high out of its dish. The dish stays; node "puff" (from
// the rim up) sinks flat when it falls.
export function souffle(b, { color = 0xf2c46a, r = 1.2, h = 2.6, low = 0.35 } = {}) {
  // The ramekin: white, fluted.
  b.add(SHAPE.cyl(r, r * 0.96, low, 24, 0.03), { p: [0, low / 2, 0], grad: [0xd8d2c4, C.white] });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    b.add(SHAPE.box(0.05, low * 0.9, 0.05, 0.015), { p: [Math.cos(a) * r, low / 2, Math.sin(a) * r], r: [0, -a, 0], c: 0xece6d8 });
  }
  b.node("puff", [0, low, 0], [0, 0, 0], (n) => {
    const H = h - low, k = r;
    const prof = [[0, 0], [0.98, 0], [1.08, 0.1], [1.1, 0.4], [1.04, 0.7], [0.86, 0.88], [0.5, 0.98], [0, 1]].map(([x, y]) => [x * k, y * H]);
    n.add(SHAPE.lathe(prof, 18), { grad: [shade(color, 1.15), shade(color, 0.5)], facet: 0.08 });
    // A crack across the browned top, and a dusting of sugar.
    n.add(SHAPE.box(r * 0.9, 0.06, 0.12, 0.02), { p: [0, H * 0.97, 0.05], r: [0, 0.4, 0], c: shade(color, 1.25) });
    for (const [a, d] of [[0.3, 0.2], [1.9, 0.45], [3.4, 0.3], [4.6, 0.5], [5.6, 0.15]])
      n.add(SHAPE.ball(0.06, 5, 3), { p: [Math.cos(a) * d * r, H * (0.99 - d * 0.12), Math.sin(a) * d * r], c: C.white });
  });
}

const RX = Math.PI / 2;

// Angry cartoon eyes on a face looking down −z.
function eyes(n, { x = 0.09, y = 0, z = 0, r = 0.06, brow = 0x2a1a10, tilt = 0.4 } = {}) {
  n.both((s) => {
    n.add(SHAPE.ball(r, 10, 7), { p: [s * x, y, z], s: [1, 1.1, 0.45], c: C.white, facet: 0.02 });
    n.add(SHAPE.ball(r * 0.5, 8, 6), { p: [s * (x - r * 0.15), y - r * 0.1, z - r * 0.35], s: [1, 1, 0.45], c: C.black, facet: 0 });
    n.add(SHAPE.ball(r * 0.15, 6, 4), { p: [s * (x - r * 0.3), y + r * 0.15, z - r * 0.5], c: 0xffffff, mat: "glow", glow: 1.2 });
    n.add(SHAPE.box(r * 1.9, r * 0.4, r * 0.4, r * 0.12), { p: [s * x, y + r * 1.25, z - r * 0.1], r: [0, 0, s * tilt], c: brow });
  });
}

// ── Glitches ──

// A meatball: a lumpy brown ball with a sprig of parsley, a scowl and a
// smear of tomato sauce. Node "body" (pivot at its middle) squashes and rolls.
export function meatball(b) {
  // (The pivot is its middle, so it can roll over without sinking.)
  b.node("body", [0, 0.36, 0], [0, 0, 0], (m) => m.at([0, -0.36, 0], [0, 0, 0], 1, (n) => {
    n.add(SHAPE.blob(0.36, 7, 0.08, 2), { p: [0, 0.36, 0], grad: [0x5a2e1a, 0x9a5a34], facet: 0.12 });
    for (const [x, y, z, r] of [[0.15, 0.6, 0.1, 0.07], [-0.2, 0.5, 0.15, 0.06], [0.22, 0.3, 0.2, 0.05], [-0.1, 0.18, -0.25, 0.05]])
      n.add(SHAPE.sphere(r, 0), { p: [x, y, z], c: 0x6a3a22 });
    n.add(SHAPE.blob(0.2, 3, 0.2, 1), { p: [0.04, 0.66, 0.02], s: [1.3, 0.35, 1.2], c: 0xc8302a });
    for (let i = 0; i < 3; i++) n.add(SHAPE.sphere(0.06, 0), { p: [0.06 + (i - 1) * 0.06, 0.76, 0.02 + (i % 2) * 0.05], c: 0x3a8a2a });
    eyes(n, { x: 0.11, y: 0.42, z: -0.31, r: 0.075, brow: 0x2a1408, tilt: 0.45 });
    n.add(SHAPE.torus(0.05, 0.012, 3, 8, Math.PI), { p: [0, 0.27, -0.33], r: [0, 0, Math.PI], c: 0x2a1408 });
    n.add(SHAPE.torus(0.37, 0.012, 3, 20), { p: [0, 0.36, 0], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
  }));
}

// A pepper shaker, flying: a glass body full of pepper under a steel cap
// with holes, a face on the glass. Node "body" (its pivot the middle) tips
// to shake.
export function pepperShaker(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.cyl(0.26, 0.3, 0.6, 12, 0.04), { p: [0, -0.1, 0], c: 0xe8f0f4, mat: "glass" });
    n.add(SHAPE.cyl(0.24, 0.27, 0.42, 12), { p: [0, -0.18, 0], grad: [0x2a2420, 0x4a4038], facet: 0.12 });
    n.add(SHAPE.cyl(0.27, 0.3, 0.06, 12), { p: [0, -0.42, 0], c: 0xd8e0e4, mat: "glass" });
    n.add(SHAPE.lathe([[0.28, 0], [0.28, 0.08], [0.24, 0.16], [0.14, 0.22], [0, 0.24]], 14), { p: [0, 0.2, 0], grad: [C.steel, 0xd8e0e8], mat: "metal" });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; n.add(SHAPE.ball(0.02, 5, 4), { p: [Math.cos(a) * 0.1, 0.43, Math.sin(a) * 0.1], c: C.black }); }
    n.add(SHAPE.ball(0.02, 5, 4), { p: [0, 0.445, 0], c: C.black });
    eyes(n, { x: 0.1, y: 0.02, z: -0.27, r: 0.07, brow: 0x1a1a1a, tilt: 0.5 });
    n.add(SHAPE.box(0.1, 0.02, 0.02, 0.008), { p: [0, -0.1, -0.28], r: [0, 0, -0.15], c: 0x1a1a1a });
    n.both((s) => n.add(SHAPE.capsule(0.04, 0.12, 6, 2), { p: [s * 0.32, -0.05, 0], r: [0, 0, s * 0.6], c: C.steel, mat: "metal" }));
    n.add(SHAPE.torus(0.29, 0.012, 3, 20), { p: [0, 0.2, 0], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
  });
}

// A rolling pin, lying across its way (along x): a fat wooden roller with
// handles, a face in the middle. Node "body" (pivot at its middle, 0.3 up)
// rolls about x; node "roller" turns.
export function rollingPin(b) {
  b.node("body", [0, 0.3, 0], [0, 0, 0], (n) => {
    n.node("roller", [0, 0, 0], [0, 0, 0], (r) => {
      r.add(SHAPE.cyl(0.3, 0.3, 1.9, 14, 0.06), { r: [0, 0, RX], grad: [0xb07a48, 0xe0b078], facet: 0.04 });
      for (const x of [-0.7, 0.7]) r.add(SHAPE.torus(0.3, 0.012, 3, 16), { p: [x, 0, 0], r: [0, RX, 0], c: 0x8a5a30 });
      r.add(SHAPE.box(0.4, 0.06, 0.04, 0.02), { p: [0.4, 0.29, 0], c: 0xf4f0e8 });
    });
    n.both((s) => {
      n.add(SHAPE.cyl(0.07, 0.07, 0.24, 8), { p: [s * 1.07, 0, 0], r: [0, 0, RX], c: 0x8a5a30 });
      n.add(SHAPE.capsule(0.11, 0.22, 8, 3), { p: [s * 1.33, 0, 0], r: [0, 0, RX], grad: [0xa06a3a, 0xc8925a] });
    });
    eyes(n, { x: 0.13, y: 0.04, z: -0.28, r: 0.085, brow: 0x3a2010, tilt: 0.4 });
    n.add(SHAPE.torus(0.07, 0.014, 3, 10, Math.PI), { p: [0, -0.13, -0.29], r: [0, 0, Math.PI], c: 0x3a2010 });
    n.add(SHAPE.torus(0.31, 0.012, 3, 20), { p: [-0.35, 0, 0], r: [0, RX, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
  });
}

// A hand-cranked meat grinder clamped to a block: a cast-iron body, a
// hopper on top, a spout on the front with a glowing die, a crank on the
// side. Nodes: "crank", "core" (pulses when it squeezes a meatball out).
export function meatGrinder(b) {
  b.add(SHAPE.box(1.6, 0.5, 1.4, 0.1), { p: [0, 0.25, 0], grad: [0x7a4e2a, 0xb07a48] });
  b.add(SHAPE.box(0.5, 0.5, 0.6, 0.06), { p: [0, 0.72, 0.1], c: 0x3a3e46, mat: "metal" });
  b.add(SHAPE.cyl(0.42, 0.42, 1.0, 14, 0.06), { p: [0, 1.15, -0.05], r: [RX, 0, 0], grad: [0x2a2e36, 0x5a606a], mat: "metal" });
  b.add(SHAPE.lathe([[0.18, 0], [0.24, 0.2], [0.5, 0.5], [0.52, 0.56], [0.46, 0.56]], 12), { p: [0, 1.45, 0.05], grad: [0x3a3e46, 0x6a707a], mat: "metal" });
  b.add(SHAPE.cyl(0.47, 0.47, 0.04, 12), { p: [0, 1.98, 0.05], c: 0x7a2a22 });
  // The spout and its die.
  b.add(SHAPE.cyl(0.34, 0.3, 0.2, 14), { p: [0, 1.15, -0.62], r: [RX, 0, 0], c: 0x6a707a, mat: "metal" });
  b.add(SHAPE.torus(0.27, 0.04, 4, 14), { p: [0, 1.15, -0.73], c: C.steel, mat: "metal" });
  b.node("core", [0, 1.15, -0.72], [0, 0, 0], (c) => {
    c.add(SHAPE.cyl(0.22, 0.22, 0.02, 14), { r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.5 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.add(SHAPE.ball(0.04, 5, 4), { p: [Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.012], c: 0x14101a }); }
  });
  eyes(b, { x: 0.18, y: 1.32, z: -0.42, r: 0.085, brow: 0x14141a, tilt: 0.4 });
  b.node("crank", [0.48, 1.15, 0.3], [0, 0, 0], (n) => {
    n.add(SHAPE.cyl(0.05, 0.05, 0.14, 8), { p: [0.06, 0, 0], r: [0, 0, RX], c: C.steel, mat: "metal" });
    n.add(SHAPE.box(0.08, 0.7, 0.1, 0.03), { p: [0.14, 0.3, 0], c: 0x3a3e46, mat: "metal" });
    n.add(SHAPE.capsule(0.07, 0.2, 8, 2), { p: [0.24, 0.62, 0], r: [0, 0, RX], c: 0xc8302a });
  });
}

// ── The Pressure Cooker ──
// A steel pot as big as a car on stubby feet: two black handles, a gauge
// on the front (its needle a node), a clamped lid with a whistle on top
// (node "lid"; the whistle "valve" spins), a cross face, the vents low
// down where its steam comes out. Nodes: "body", "lid", "valve", "needle",
// "core" (the glow inside, seen with the lid off).
export function pressureCooker(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.lathe([[1.2, 0], [1.42, 0.08], [1.5, 0.3], [1.52, 1.4], [1.5, 2.0], [1.46, 2.1], [1.4, 2.1]], 24), { p: [0, 0.15, 0], grad: [0x7a848e, 0xd8e0e8], mat: "metal", facet: 0.02 });
    for (const y of [0.55, 1.9]) n.add(SHAPE.torus(1.52, 0.04, 4, 32), { p: [0, y, 0], r: [RX, 0, 0], c: 0x5a646e, mat: "metal" });
    n.both((s) => {
      n.add(SHAPE.box(0.9, 0.22, 0.34, 0.1), { p: [s * 1.85, 1.65, 0], c: 0x1e1e24 });
      n.add(SHAPE.box(0.2, 0.3, 0.3, 0.05), { p: [s * 1.5, 1.65, 0], c: 0x3a3e46, mat: "metal" });
    });
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; n.add(SHAPE.ball(0.28, 8, 6), { p: [Math.cos(a) * 1.1, 0.12, Math.sin(a) * 1.1], s: [1, 0.6, 1], c: 0x2a2a30 }); }
    // The vents at its foot.
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; n.add(SHAPE.box(0.16, 0.08, 0.05), { p: [Math.cos(a) * 1.5, 0.42, Math.sin(a) * 1.5], r: [0, -a + RX, 0], c: 0x2a2a30 }); }
    // The gauge on the front.
    n.add(SHAPE.cyl(0.42, 0.42, 0.12, 20, 0.03), { p: [0, 1.15, -1.5], r: [RX, 0, 0], c: C.brass, mat: "metal" });
    n.add(SHAPE.cyl(0.36, 0.36, 0.02, 20), { p: [0, 1.15, -1.57], r: [RX, 0, 0], c: 0xf4f0e0, facet: 0 });
    for (let i = 0; i < 9; i++) { const a = -2 + i * 0.5; n.add(SHAPE.box(0.025, 0.07, 0.01), { p: [Math.sin(a) * 0.28, 1.15 + Math.cos(a) * 0.28, -1.585], r: [0, 0, -a], c: i > 6 ? C.red : C.black }); }
    n.add(SHAPE.box(0.5, 0.08, 0.01), { p: [0.2, 1.42, -1.585], r: [0, 0, -0.5], c: 0xe85a40, facet: 0 });
    n.node("needle", [0, 1.15, -1.6], [0, 0, 0], (q) => q.add(SHAPE.box(0.035, 0.3, 0.015), { p: [0, 0.13, 0], c: C.red }));
    eyes(n, { x: 0.5, y: 1.62, z: -1.42, r: 0.17, brow: 0x1a1a22, tilt: 0.55 });
    n.add(SHAPE.torus(0.25, 0.04, 4, 12, Math.PI), { p: [0, 0.72, -1.48], r: [0, 0, 0], c: 0x1a1a22 });
    n.node("core", [0, 2.1, 0], [0, 0, 0], (c) => {
      c.add(SHAPE.cyl(1.36, 1.36, 0.08, 24), { c: 0xffd0a0, mat: "glow", glow: 1.2 });
      c.add(SHAPE.sphere(0.55, 1), { p: [0, 0.1, 0], s: [1, 0.5, 1], c: C.dreamPink, mat: "glow", glow: 1.8 });
    });
    n.node("lid", [0, 2.25, 0], [0, 0, 0], (l) => {
      l.add(SHAPE.lathe([[1.56, 0], [1.58, 0.08], [1.4, 0.22], [0.8, 0.38], [0.3, 0.42], [0, 0.42]], 24), { grad: [0x9aa4ae, 0xe8eef4], mat: "metal", facet: 0.02 });
      l.add(SHAPE.box(2.6, 0.18, 0.32, 0.06), { p: [0, 0.48, 0], c: 0x1e1e24 });
      l.both((s) => l.add(SHAPE.box(0.3, 0.3, 0.4, 0.06), { p: [s * 1.45, 0.1, 0], c: 0x3a3e46, mat: "metal" }));
      l.add(SHAPE.cyl(0.14, 0.18, 0.2, 10), { p: [0, 0.66, 0.5], c: 0x3a3e46, mat: "metal" });
      l.node("valve", [0, 0.8, 0.5], [0, 0, 0], (v) => {
        v.add(SHAPE.cyl(0.16, 0.12, 0.14, 8), { c: C.red });
        v.add(SHAPE.box(0.36, 0.06, 0.08, 0.02), { p: [0, 0.08, 0], c: 0x8e2119 });
      });
      l.add(SHAPE.torus(1.5, 0.025, 3, 32), { p: [0, 0.06, 0], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
    });
  });
}

// ── The kitchen round them (giant: you are the size of a teaspoon) ──

// The window over the counter: a white frame, four panes glowing with the
// evening sky, a little curtain each side.
export function kitchenWindow(b, { w = 12, h = 7 } = {}) {
  b.add(SHAPE.box(w + 0.8, h + 0.8, 0.3, 0.1), { c: 0xf4f0e8 });
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(SHAPE.box(w / 2 - 0.4, h / 2 - 0.4, 0.05), { p: [x * w / 4, y * h / 4, 0.16], c: y > 0 ? 0xffc8a0 : 0xf0a8b8, mat: "glow", glow: 0.9 });
  b.add(SHAPE.box(0.3, h, 0.1), { p: [0, 0, 0.2], c: 0xf4f0e8 });
  b.add(SHAPE.box(w, 0.3, 0.1), { p: [0, 0, 0.2], c: 0xf4f0e8 });
  b.both((s) => b.add(SHAPE.box(2.2, h + 1.6, 0.15, 0.06), { p: [s * (w / 2 + 0.6), 0.4, 0.3], grad: [0xc84a4a, 0xe86a5a] }));
  b.add(SHAPE.box(w + 2, 0.4, 1.2, 0.1), { p: [0, -h / 2 - 0.5, 0.5], c: 0xf4f0e8 });
  b.add(SHAPE.cyl(0.5, 0.4, 0.8, 10), { p: [3, -h / 2 + 0.1, 0.6], c: 0xd87a4a });
  b.add(SHAPE.blob(0.8, 9, 0.3, 1), { p: [3, -h / 2 + 1, 0.6], c: 0x4a9a3a });
}

// A rail on the wall with pans and a ladle hanging from it.
export function panRail(b) {
  b.add(SHAPE.cyl(0.08, 0.08, 14, 8), { r: [0, 0, RX], c: C.steel, mat: "metal" });
  for (const [x, r, c] of [[-5, 1.4, 0x3a3a44], [-1.5, 1.1, C.copper], [2.2, 0.9, C.copper], [5.2, 1.6, 0x3a3a44]]) {
    b.add(SHAPE.box(0.12, 1.2, 0.12), { p: [x, -0.6, 0.2], c: 0x2a2a30 });
    b.add(SHAPE.cyl(r, r * 0.9, 0.3, 18), { p: [x, -1.2 - r, 0.4], r: [RX, 0, 0], c, mat: "metal" });
  }
}

export function knob(b) {
  b.add(SHAPE.cyl(0.14, 0.18, 0.2, 10), { r: [RX, 0, 0], p: [0, 0, 0.1], c: C.brass, mat: "metal" });
}

// The tap over the sink: a tall goose neck and two handles.
export function faucet(b) {
  b.add(SHAPE.cyl(0.4, 0.5, 0.3, 12), { p: [0, 0.15, 0], c: C.steel, mat: "metal" });
  b.add(SHAPE.cyl(0.22, 0.22, 3.6, 10), { p: [0, 2, 0], c: 0xd8e0e8, mat: "metal" });
  b.add(SHAPE.torus(1.2, 0.22, 8, 14, Math.PI), { p: [0, 3.8, -1.2], r: [0, RX, 0], c: 0xd8e0e8, mat: "metal" });
  b.add(SHAPE.cyl(0.26, 0.2, 0.5, 10), { p: [0, 3.5, -2.4], c: 0xb8c2cc, mat: "metal" });
  b.both((s) => {
    b.add(SHAPE.cyl(0.15, 0.15, 0.6, 8), { p: [s * 0.8, 0.5, 0], c: 0xd8e0e8, mat: "metal" });
    b.add(SHAPE.box(0.7, 0.14, 0.2, 0.05), { p: [s * 0.8, 0.85, 0], c: s < 0 ? 0xd84a48 : 0x4a8ad8 });
  });
}

// A burner on the glass top: rings that glow a dull red.
export function burner(b) {
  b.add(SHAPE.cyl(2.1, 2.1, 0.02, 28), { c: 0x2e2e36 });
  for (const r of [0.8, 1.4, 1.9]) b.add(SHAPE.torus(r, 0.06, 3, 32), { r: [RX, 0, 0], p: [0, 0.03, 0], c: 0xc0402a, mat: "glow", glow: 0.7 });
}

// A big enamel kettle with a black handle.
export function kettle(b) {
  b.add(SHAPE.lathe([[1.1, 0], [1.3, 0.2], [1.35, 0.8], [1.2, 1.5], [0.7, 1.9], [0.3, 2.0], [0, 2.0]], 20), { grad: [0xc84a3a, 0xf06a50], facet: 0.03 });
  b.add(SHAPE.ball(0.22, 8, 6), { p: [0, 2.1, 0], c: 0x1e1e24 });
  b.add(SHAPE.torus(0.9, 0.1, 6, 16, Math.PI), { p: [0, 2.0, 0], r: [0, RX, 0], c: 0x1e1e24 });
  b.add(SHAPE.cyl(0.14, 0.3, 1.4, 10), { p: [1.4, 1.1, 0], r: [0, 0, -0.9], c: 0xd85a44 });
}

// A glass jar with a coloured lid and something in it.
export function jar(b, { color = 0xf0a040, seed = 1, h = 2.4, r = 0.9 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.cyl(r, r, h, 14, 0.12), { p: [0, h / 2, 0], c: 0xe8f4f8, mat: "glass" });
  b.add(SHAPE.cyl(r * 0.9, r * 0.9, h * 0.62, 14), { p: [0, h * 0.33, 0], grad: [shade(color, 0.6), color], facet: 0.1 });
  b.add(SHAPE.cyl(r * 1.04, r * 1.04, h * 0.12, 14, 0.04), { p: [0, h + h * 0.05, 0], c: vary(0xd84a48, rnd, 0.3) });
  b.add(SHAPE.box(r * 0.9, h * 0.25, 0.02), { p: [0, h * 0.55, -r - 0.01], c: C.paper });
}

export function cuttingBoard(b) {
  b.add(SHAPE.box(6, 0.2, 4, 0.08), { p: [0, 0.1, 0], grad: [0x9a6a3a, 0xc8925a] });
  b.add(SHAPE.cyl(0.2, 0.2, 0.22, 10), { p: [2.6, 0.12, 0], c: 0x7a4e2a });
  for (const [x, z, c] of [[-1.6, 1.1, 0xe8a03a], [-1.2, 1.3, 0xe8a03a], [1.5, 1.2, 0x5aa040]]) b.add(SHAPE.cyl(0.35, 0.35, 0.12, 12), { p: [x, 0.26, z], c });
}

export function breadLoaf(b) {
  b.add(SHAPE.capsule(0.6, 1.2, 10, 4), { p: [0, 0.55, 0], r: [0, 0, RX], s: [1, 0.9, 1], grad: [0xb06a2a, 0xe0a050] });
  for (let i = -1; i <= 1; i++) b.add(SHAPE.box(0.08, 0.06, 0.8), { p: [i * 0.5, 1.08, 0], r: [0, 0.4, 0], c: 0xf0d090 });
}

// The fridge: a tall cream box, two doors, chrome handles, magnets and a
// child's drawing stuck on.
export function fridge(b, { w = 12.6, d = 8.6, h = 16 } = {}) {
  b.add(SHAPE.box(w, h, d, 0.5), { p: [0, h / 2, 0], grad: [0xd8d0c0, 0xf8f4ec], facet: 0.02 });
  b.add(SHAPE.box(w - 0.4, 0.1, 0.1), { p: [0, h * 0.62, d / 2 + 0.02], c: 0xb8b0a0 });
  for (const y of [h * 0.3, h * 0.8]) b.add(SHAPE.box(0.4, 2.6, 0.4, 0.15), { p: [w / 2 - 1.2, y, d / 2 + 0.3], c: 0xd8e0e8, mat: "metal" });
  for (const [x, y, c] of [[-3, 11, 0xd84a48], [-1, 12, 0x4a8ad8], [1.5, 7, 0xf0c040]]) b.add(SHAPE.cyl(0.35, 0.35, 0.2, 10), { p: [x, y, d / 2 + 0.1], r: [RX, 0, 0], c });
  b.add(SHAPE.box(3, 3.6, 0.04), { p: [-2.2, 6.2, d / 2 + 0.03], r: [0, 0, 0.08], c: C.paper });
  b.add(SHAPE.ball(0.8, 10, 7), { p: [-2.2, 6.6, d / 2 + 0.06], s: [1, 1, 0.05], c: 0xf0c040 });
  b.add(SHAPE.box(2, 0.2, 0.05), { p: [-2.2, 5, d / 2 + 0.06], c: 0x5aa040 });
  b.add(SHAPE.box(w - 1, 0.6, d - 1), { p: [0, 0.3, 0], c: 0x3a3a3a });
}

// A flour sack, slumped, tied at the neck.
export function flourSack(b, { seed = 1 } = {}) {
  b.add(SHAPE.blob(1.1, seed, 0.12, 2), { p: [0, 0.95, 0], s: [1, 0.9, 0.85], grad: [0xd8ccb0, 0xf4ecd8], facet: 0.06 });
  b.add(SHAPE.cyl(0.25, 0.4, 0.5, 10), { p: [0, 1.95, 0], c: 0xe8dcc0 });
  b.add(SHAPE.torus(0.28, 0.06, 4, 10), { p: [0, 1.95, 0], r: [RX, 0, 0], c: 0x8a5a3a });
  b.add(SHAPE.box(1, 0.6, 0.02), { p: [0, 1, -0.95], c: 0x4a6ab0 });
}

// A red and white checked cloth on the table, hanging down the sides.
export function tableCloth(b, { w = 18, d = 12 } = {}) {
  const n = 9, cw = (w + 1) / n, m = Math.round(n * d / w), cd = (d + 1) / m;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) b.add(SHAPE.box(cw, 0.04, cd), { p: [-(w + 1) / 2 + cw * (i + 0.5), 0.02, -(d + 1) / 2 + cd * (j + 0.5)], c: (i + j) % 2 ? 0xd84a48 : 0xf8f0e8, facet: 0 });
  b.both((s) => {
    b.add(SHAPE.box(w + 1, 1.6, 0.06), { p: [0, -0.78, s * (d + 1) / 2], c: 0xd84a48 });
    b.add(SHAPE.box(0.06, 1.6, d + 1), { p: [s * (w + 1) / 2, -0.78, 0], c: 0xd84a48 });
  });
}

export function mug(b) {
  b.add(SHAPE.cyl(1, 0.9, 2.2, 16, 0.08), { p: [0, 1.1, 0], grad: [0x3a7fae, 0x5a9fce] });
  b.add(SHAPE.torus(0.6, 0.18, 6, 12, Math.PI), { p: [1.05, 1.2, 0], r: [0, 0, -RX], c: 0x3a7fae });
  b.add(SHAPE.cyl(0.88, 0.88, 0.05, 16), { p: [0, 2.05, 0], c: 0x6a3a1a });
}

export function tomato(b) {
  b.add(SHAPE.ball(1.6, 16, 12), { p: [0, 1.4, 0], s: [1, 0.85, 1], grad: [0xa81a14, 0xe8402a], facet: 0.03 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; b.add(SHAPE.box(0.25, 0.06, 0.8, 0.02), { p: [Math.cos(a) * 0.35, 2.75, Math.sin(a) * 0.35], r: [0, -a + RX, 0.2], c: 0x3a8a2a }); }
  b.add(SHAPE.cyl(0.08, 0.1, 0.4, 6), { p: [0, 2.9, 0], c: 0x3a8a2a });
}

export function bucket(b) {
  b.add(SHAPE.cyl(1.3, 1.0, 2.2, 16, 0.06), { p: [0, 1.1, 0], grad: [0x3a6ab0, 0x5a8ad0] });
  b.add(SHAPE.torus(1.3, 0.06, 4, 20), { p: [0, 2.2, 0], r: [RX, 0, 0], c: 0x2a4a80 });
  b.add(SHAPE.torus(1.25, 0.05, 4, 16, Math.PI), { p: [0, 2.2, 0], c: C.steel, mat: "metal" });
  b.add(SHAPE.cyl(1.2, 1.2, 0.05, 16), { p: [0, 1.8, 0], c: 0xb8d8e8, mat: "glass" });
}

// A wooden spoon lying on the floor (long along z).
export function spoon(b) {
  b.add(SHAPE.cyl(0.25, 0.3, 6.2, 8), { p: [0, 0.3, 1], r: [RX, 0, 0], grad: [0xb07a48, 0xd8a870] });
  b.add(SHAPE.ball(0.9, 12, 8), { p: [0, 0.3, -2.9], s: [0.8, 0.3, 1.2], grad: [0xb07a48, 0xd8a870] });
}

export function pea(b) {
  b.add(SHAPE.ball(0.4, 10, 7), { p: [0, 0.4, 0], c: 0x6ab03a });
}

// ── Memories (inside the bubble, about 0.3 across) ──
export function memoryItem(n, item) {
  if (item === "recipe") {
    n.add(SHAPE.box(0.28, 0.2, 0.01), { r: [0, 0, -0.1], c: C.paper, facet: 0 });
    for (let i = 0; i < 4; i++) n.add(SHAPE.box(0.2 - (i % 2) * 0.05, 0.01, 0.012), { p: [-0.01, 0.06 - i * 0.035, -0.006], r: [0, 0, -0.1], c: 0x3a5aa0, facet: 0 });
    n.add(SHAPE.box(0.05, 0.05, 0.012), { p: [0.1, 0.08, -0.008], c: 0xd84a48, facet: 0 });
    return true;
  }
  if (item === "firstpan") {
    n.add(SHAPE.cyl(0.13, 0.11, 0.04, 14), { r: [0.3, 0, 0], c: 0x3a3a44, mat: "metal" });
    n.add(SHAPE.box(0.04, 0.02, 0.18), { p: [0, 0.03, 0.2], r: [0.3, 0, 0], c: 0x7a4e2a });
    n.add(SHAPE.ball(0.03, 6, 4), { p: [0.06, 0.04, -0.02], s: [1, 0.4, 1], c: 0x5a5a64 });
    return true;
  }
  if (item === "sign") {
    n.add(SHAPE.box(0.32, 0.12, 0.02, 0.005), { c: 0xf4e4b8 });
    for (let i = 0; i < 6; i++) n.add(SHAPE.box(0.03, 0.06, 0.006), { p: [-0.11 + i * 0.045, 0, -0.012], c: 0xc8302a, facet: 0 });
    n.both((s) => n.add(SHAPE.box(0.005, 0.12, 0.005), { p: [s * 0.1, 0.12, 0], c: 0x3a3a44 }));
    return true;
  }
  if (item === "letter") {
    n.add(SHAPE.box(0.26, 0.17, 0.01), { c: 0xf8f4ec, facet: 0 });
    n.add(SHAPE.box(0.26, 0.01, 0.012), { p: [0, 0.02, -0.004], r: [0, 0, 0.5], c: 0xd8d0c0, facet: 0 });
    n.add(SHAPE.cyl(0.03, 0.03, 0.012, 10), { p: [0, -0.01, -0.01], r: [RX, 0, 0], c: 0xc8302a });
    return true;
  }
  if (item === "apron") {
    n.add(SHAPE.box(0.2, 0.26, 0.02, 0.01), { c: 0x8ac0e8 });
    n.add(SHAPE.box(0.12, 0.06, 0.022), { p: [0, -0.05, -0.002], c: 0x6aa0c8 });
    n.both((s) => n.add(SHAPE.box(0.12, 0.012, 0.012), { p: [s * 0.15, 0.02, 0], r: [0, 0, s * 0.3], c: 0x8ac0e8 }));
    n.add(SHAPE.ball(0.02, 5, 4), { p: [0.05, 0.06, -0.012], c: 0xffd27a });
    return true;
  }
  return false;
}
