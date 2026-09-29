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
