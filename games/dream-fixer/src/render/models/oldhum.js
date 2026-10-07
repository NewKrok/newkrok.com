import { SHAPE, shade, rng } from "../modelkit.js";
import { C } from "../palette.js";

// ── Inside Old Hum ───────────────────────────────────────────────────────
// The great old dream machine from the inside: brass and copper works,
// gears as big as rooms, the locks between its parts that Cog knows how
// to open, the hatch you climbed in through.

const RX = Math.PI / 2;

// A gear lying flat (its axle up): a disc of radius r and thickness th,
// teeth round the rim, a hub and spoke holes. Node "spin" turns it.
export function gear(b, { r = 3, th = 0.5, teeth = 0, c = C.brass, seed = 1 } = {}) {
  const n = teeth || Math.max(8, Math.round(r * 5)), rnd = rng(seed);
  b.node("spin", [0, 0, 0], [0, 0, 0], (g) => {
    g.add(SHAPE.cyl(r, r, th, Math.max(16, n * 2), th * 0.15), { p: [0, th / 2, 0], grad: [shade(c, 0.6), c], mat: "metal", facet: 0.02 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, tw = (Math.PI * 2 * r) / n * 0.5;
      g.add(SHAPE.box(tw, th * 0.9, r * 0.14, th * 0.1), { p: [Math.sin(a) * (r + r * 0.06), th / 2, Math.cos(a) * (r + r * 0.06)], r: [0, a, 0], c: shade(c, 0.9 + rnd() * 0.15), mat: "metal" });
    }
    // Spoke holes (dark recesses) and the hub.
    const holes = r > 1.5 ? 6 : 0;
    for (let i = 0; i < holes; i++) {
      const a = (i / holes) * Math.PI * 2;
      g.add(SHAPE.cyl(r * 0.2, r * 0.2, th * 0.3, 10), { p: [Math.sin(a) * r * 0.55, th + 0.002, Math.cos(a) * r * 0.55], c: C.ironD });
    }
    g.add(SHAPE.cyl(r * 0.2, r * 0.22, th * 1.6, 12, 0.04), { p: [0, th * 0.8, 0], c: C.copper, mat: "metal" });
    g.add(SHAPE.cyl(r * 0.08, r * 0.08, th * 2, 8), { p: [0, th, 0], c: C.iron, mat: "metal" });
  });
}

// A gear stood on its edge (for the walls of the works, far off).
export function wallGear(b, o = {}) {
  b.at([0, 0, 0], [RX, 0, 0], 1, () => gear(b, o));
}

// Bits of machinery drifting in the dark: a small gear, or a bolt.
export function gearBit(b, { seed = 1, s = 1 } = {}) {
  const rnd = rng(seed);
  b.at([0, 0, 0], [rnd() * 3, rnd() * 3, 0], s, () => {
    if (rnd() < 0.7) gear(b, { r: 0.8 + rnd() * 1.4, th: 0.3, c: rnd() < 0.5 ? C.brass : C.copper, seed });
    else {
      b.add(SHAPE.cyl(0.35, 0.35, 0.3, 6), { c: C.steel, mat: "metal" });
      b.add(SHAPE.cyl(0.14, 0.14, 1.6, 8), { p: [0, -0.8, 0], c: C.steel, mat: "metal" });
    }
  });
}

// A lock between two parts of the works: two brass posts with a lintel,
// a pair of riveted shutters with a gear stamped across them, and a
// little panel on the right-hand post with a lamp (red shut, mint open).
// Nodes: "left", "right" (the shutters, slid apart by the renderer),
// "lamp". Facing −z (or +z: it reads the same from both sides).
export function lockGate(b, { w = 4, h = 4.2 } = {}) {
  const post = 0.4;
  b.both((s) => b.add(SHAPE.box(post, h + 0.4, 0.8, 0.06), { p: [s * (w / 2 + post / 2), (h + 0.4) / 2, 0], grad: [C.brassD, C.brass], mat: "metal" }));
  b.add(SHAPE.box(w + post * 2 + 0.2, 0.5, 0.9, 0.08), { p: [0, h + 0.45, 0], grad: [C.brassD, C.brass], mat: "metal" });
  for (let i = 0; i < 5; i++) b.add(SHAPE.ball(0.06, 6, 4), { p: [-w / 2 + (i + 0.5) * w / 5, h + 0.45, -0.46], c: C.brassL, mat: "metal" });
  // The panel Cog works.
  b.add(SHAPE.box(0.5, 0.7, 0.2, 0.04), { p: [w / 2 + post + 0.15, 1.7, -0.42], c: C.iron, mat: "metal" });
  b.add(SHAPE.box(0.5, 0.7, 0.2, 0.04), { p: [w / 2 + post + 0.15, 1.7, 0.42], c: C.iron, mat: "metal" });
  b.node("lamp", [w / 2 + post + 0.15, 1.9, 0], [0, 0, 0], (n) => {
    for (const z of [-0.53, 0.53]) n.add(SHAPE.ball(0.08, 8, 6), { p: [0, 0, z], c: 0xffffff, mat: "glow", glow: 1.6 });
  });
  // The shutters, each half the width, a half gear stamped on.
  b.both((s) => b.node(s < 0 ? "left" : "right", [s * w / 4, 0, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.box(w / 2 - 0.02, h, 0.3, 0.04), { p: [0, h / 2, 0], grad: [C.copperD, C.copper], mat: "metal", facet: 0.03 });
    for (let i = 0; i < 4; i++) n.add(SHAPE.box(w / 2 - 0.1, 0.08, 0.36, 0.02), { p: [0, 0.5 + i * (h - 1) / 3, 0], c: C.brassD, mat: "metal" });
    for (const z of [-0.17, 0.17]) n.add(SHAPE.torus(h * 0.22, 0.07, 5, 18, Math.PI), { p: [-s * w / 4, h / 2, z], r: [0, 0, s < 0 ? -RX : RX], c: C.brassL, mat: "metal" });
  }));
}

// The service hatch: a round riveted door in a thick brass ring, a wheel
// on it, a warm light leaking round its rim. Stands on its edge, facing −z.
export function hatch(b, { r = 1.4 } = {}) {
  b.add(SHAPE.torus(r + 0.15, 0.25, 8, 28), { p: [0, r + 0.2, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.cyl(r, r, 0.25, 24, 0.05), { p: [0, r + 0.2, 0.05], r: [RX, 0, 0], grad: [C.copperD, C.copper], mat: "metal" });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.add(SHAPE.ball(0.06, 6, 4), { p: [Math.cos(a) * (r + 0.15), r + 0.2 + Math.sin(a) * (r + 0.15), -0.25], c: C.brassL, mat: "metal" });
  }
  b.add(SHAPE.torus(r * 0.45, 0.06, 5, 16), { p: [0, r + 0.2, -0.2], c: C.iron, mat: "metal" });
  for (let i = 0; i < 3; i++) b.add(SHAPE.box(r * 0.9, 0.06, 0.06), { p: [0, r + 0.2, -0.2], r: [0, 0, (i / 3) * Math.PI], c: C.iron, mat: "metal" });
  b.add(SHAPE.torus(r + 0.02, 0.04, 4, 28), { p: [0, r + 0.2, -0.12], c: C.dreamGold, mat: "glow", glow: 1.2 });
}

// A dream tank's cousin inside the works: a tall glass column of bottled
// dream, glowing, in brass bands (opts.color).
export function dreamColumn(b, { h = 5, color = C.dream, seed = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.cyl(0.9, 1, 0.4, 12, 0.05), { p: [0, 0.2, 0], c: C.brassD, mat: "metal" });
  b.add(SHAPE.cyl(0.7, 0.7, h, 12), { p: [0, h / 2 + 0.4, 0], c: 0xe8fbff, mat: "glass" });
  b.add(SHAPE.cyl(0.55, 0.55, h * (0.5 + rnd() * 0.4), 10), { p: [0, h * 0.35 + 0.4, 0], c: color, mat: "glow", glow: 0.9 });
  for (let i = 0; i < 3; i++) b.add(SHAPE.cyl(0.74, 0.74, 0.12, 12), { p: [0, 0.4 + (i + 0.5) * h / 3, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.cyl(0.9, 0.8, 0.4, 12, 0.05), { p: [0, h + 0.6, 0], c: C.brassD, mat: "metal" });
}

// ── Memories ──
export function humMemory(n, item) {
  if (item === "blueprint") {
    // The first blueprint: a rolled sheet, half open, white lines on blue.
    n.add(SHAPE.box(0.3, 0.22, 0.01), { c: 0x2a5aa8, facet: 0 });
    for (let i = 0; i < 3; i++) n.add(SHAPE.torus(0.03 + i * 0.025, 0.004, 3, 14), { p: [-0.04, 0.01, -0.008], c: C.white, facet: 0 });
    n.add(SHAPE.box(0.12, 0.006, 0.006), { p: [0.08, 0.06, -0.008], c: C.white, facet: 0 });
    n.add(SHAPE.cyl(0.035, 0.035, 0.24, 10), { p: [0.15, 0, 0], c: 0x2a5aa8 });
    return true;
  }
  if (item === "firstdream") {
    // The first dream he ever made, in a little stoppered bottle.
    n.add(SHAPE.ball(0.11, 12, 8), { p: [0, -0.04, 0], c: 0xe8fbff, mat: "glass" });
    n.add(SHAPE.ball(0.07, 10, 7), { p: [0, -0.05, 0], c: C.dreamPink, mat: "glow", glow: 1.6 });
    n.add(SHAPE.cyl(0.035, 0.04, 0.1, 10), { p: [0, 0.1, 0], c: 0xe8fbff, mat: "glass" });
    n.add(SHAPE.cyl(0.04, 0.035, 0.05, 8), { p: [0, 0.16, 0], c: 0xa87a4a });
    return true;
  }
  if (item === "chippedmug") {
    // Margo's very first mug, chipped at the rim.
    n.add(SHAPE.cyl(0.09, 0.08, 0.18, 14), { c: 0x2f7f86 });
    n.add(SHAPE.cyl(0.075, 0.075, 0.005, 12), { p: [0, 0.085, 0], c: 0x4a2a1a });
    n.add(SHAPE.torus(0.05, 0.015, 4, 10), { p: [0.1, 0, 0], r: [0, RX, 0], c: 0x2f7f86 });
    n.add(SHAPE.box(0.04, 0.03, 0.03), { p: [-0.06, 0.08, -0.05], c: C.cream });
    return true;
  }
  if (item === "socket") {
    // An empty socket in a brass plate: a cog the size of a little robot was here.
    n.add(SHAPE.cyl(0.16, 0.16, 0.03, 18), { r: [RX, 0, 0], c: C.brass, mat: "metal" });
    n.add(SHAPE.cyl(0.09, 0.09, 0.035, 12), { r: [RX, 0, 0], c: C.ironD });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      n.add(SHAPE.box(0.03, 0.03, 0.036), { p: [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0], r: [0, 0, a], c: C.ironD });
    }
    n.add(SHAPE.ball(0.015, 6, 4), { p: [0, 0.13, -0.02], c: C.dream, mat: "glow", glow: 1.6 });
    return true;
  }
  if (item === "musicroll") {
    // A music box roll, pins on a brass drum: the lullaby the Factory was built to.
    n.at([0, 0, 0], [0, 0, RX], 1, () => {
      n.add(SHAPE.cyl(0.07, 0.07, 0.24, 14), { c: C.brass, mat: "metal" });
      for (let i = 0; i < 14; i++) n.add(SHAPE.ball(0.008, 4, 3), { p: [Math.cos(i * 2.2) * 0.072, -0.1 + i * 0.015, Math.sin(i * 2.2) * 0.072], c: C.steel, mat: "metal" });
      for (const y of [-0.13, 0.13]) n.add(SHAPE.cyl(0.08, 0.08, 0.02, 14), { p: [0, y, 0], c: C.brassD, mat: "metal" });
    });
    return true;
  }
  return false;
}
