import { SHAPE, shade } from "../modelkit.js";
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
