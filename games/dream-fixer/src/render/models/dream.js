import { SHAPE } from "../modelkit.js";
import { C } from "../palette.js";

// ── Dream machinery ──────────────────────────────────────────────────────
// Things the Factory builds into every dream, whatever the dreamer.

const RX = Math.PI / 2;

// A dream anchor: a brass pedestal with a floating crystal inside two
// gyroscope rings. Nodes: "crystal", "ring1", "ring2" (the game spins and
// tints them: dim and wobbly while broken, calm and bright once fixed).
export function anchor(b) {
  // Stepped pedestal.
  b.add(SHAPE.cyl(0.95, 1.05, 0.2, 10, 0.04), { p: [0, 0.1, 0], grad: [0x6a5a48, 0x9a8a70], facet: 0.06 });
  b.add(SHAPE.cyl(0.72, 0.8, 0.2, 10, 0.04), { p: [0, 0.3, 0], grad: [C.brassD, C.brass], mat: "metal" });
  b.add(SHAPE.lathe([[0.55, 0], [0.5, 0.12], [0.3, 0.3], [0.26, 0.62], [0.36, 0.72], [0.42, 0.78], [0.3, 0.8]], 10), { p: [0, 0.4, 0], grad: [C.brassD, C.brassL], mat: "metal" });
  // Teal enamel band with glowing gauge windows.
  b.add(SHAPE.cyl(0.74, 0.74, 0.07, 10), { p: [0, 0.3, 0], c: C.teal });
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    b.add(SHAPE.box(0.12, 0.05, 0.03, 0.01), { p: [Math.sin(a) * 0.76, 0.3, Math.cos(a) * 0.76], r: [0, a, 0], c: C.dream, mat: "glow", glow: 1.8 });
  }
  // Three curved claws holding the rings.
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    b.at([0, 0, 0], [0, a, 0], 1, () => {
      b.add(SHAPE.box(0.08, 0.7, 0.1, 0.02), { p: [0, 1.4, 0.52], r: [-0.28, 0, 0], c: C.copper, mat: "metal" });
      b.add(SHAPE.ball(0.07, 8, 6), { p: [0, 1.75, 0.42], c: C.brassL, mat: "metal" });
    });
  }
  // Gyroscope rings (outer and inner) and the crystal.
  b.node("ring1", [0, 1.75, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.torus(0.62, 0.035, 5, 28), { c: C.brass, mat: "metal" });
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      n.add(SHAPE.box(0.05, 0.05, 0.1, 0.01), { p: [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0], r: [0, 0, a], c: C.copperD, mat: "metal" });
    }
  });
  b.node("ring2", [0, 1.75, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.torus(0.46, 0.028, 5, 24), { r: [0, RX, 0], c: C.copper, mat: "metal" });
  });
  b.node("crystal", [0, 1.75, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.sphere(0.24, 0), { s: [0.7, 1.25, 0.7], c: C.dream, mat: "glow", glow: 1.6, facet: 0.12 });
    n.add(SHAPE.sphere(0.3, 0), { s: [0.72, 1.28, 0.72], c: 0xcffff6, mat: "glass" });
  });
}

// A memory: a floating soap bubble with a keepsake inside. Nodes:
// "bubble" (wobbles), "item" (turns slowly).
export function memoryBubble(b, { item = "hedgehog" } = {}) {
  b.node("bubble", [0, 1.2, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.ball(0.42, 14, 10), { c: 0xe8f4ff, mat: "glass", smooth: true });
    n.add(SHAPE.torus(0.43, 0.012, 4, 24), { r: [RX, 0, 0], c: C.dreamGold, mat: "glow", glow: 1.4 });
  });
  b.node("item", [0, 1.2, 0], [0, 0, 0], (n) => {
    if (item === "hedgehog") {
      n.add(SHAPE.ball(0.14, 10, 7), { s: [1.2, 0.9, 1], c: 0x9a6a4a });
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; n.add(SHAPE.cone(0.03, 0.09, 4), { p: [Math.cos(a) * 0.1, 0.08 + Math.sin(i) * 0.02, Math.sin(a) * 0.1], r: [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8], c: 0x6a4a3a }); }
      n.add(SHAPE.ball(0.02, 6, 4), { p: [0, 0, -0.17], c: C.black });
    } else if (item === "leash") {
      n.add(SHAPE.torus(0.14, 0.02, 5, 16), { c: C.red });
      n.add(SHAPE.torus(0.05, 0.015, 4, 10), { p: [0, -0.15, 0], r: [0, RX, 0], c: C.steel, mat: "metal" });
    } else if (item === "photo") {
      n.add(SHAPE.box(0.28, 0.22, 0.02, 0.005), { c: C.wood });
      n.add(SHAPE.box(0.24, 0.18, 0.005), { p: [0, 0, -0.012], c: 0x8fc8f0, facet: 0 });
      n.add(SHAPE.box(0.24, 0.07, 0.006), { p: [0, -0.055, -0.013], c: 0x6ab058, facet: 0 });
      n.add(SHAPE.ball(0.025, 6, 4), { p: [-0.04, -0.02, -0.016], c: 0xc8743a });
      n.add(SHAPE.ball(0.02, 6, 4), { p: [0.04, 0.0, -0.016], c: 0xf0c8a0 });
    } else if (item === "slipper") {
      n.add(SHAPE.ball(0.14, 10, 7), { s: [0.7, 0.35, 1.3], c: 0xff8fb8 });
      n.add(SHAPE.ball(0.06, 8, 6), { p: [0, 0.05, -0.08], c: 0xffffff });
    } else {
      n.add(SHAPE.box(0.12, 0.08, 0.14, 0.02), { c: C.cream });
      n.both((s) => n.add(SHAPE.box(0.02, 0.02, 0.08), { p: [s * 0.03, 0, -0.1], c: C.brass, mat: "metal" }));
      n.add(SHAPE.torus(0.1, 0.015, 4, 12, Math.PI * 1.4), { p: [0, 0, 0.14], r: [RX, 0, 0], c: C.black });
    }
  });
}
