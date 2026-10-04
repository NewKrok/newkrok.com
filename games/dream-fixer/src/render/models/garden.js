import { SHAPE, shade } from "../modelkit.js";
import { C } from "../palette.js";

// ── Grandpa Joe's floating gardens ───────────────────────────────────────
// What the umbrella plays with: the round stone well an updraft rises
// out of, and the garden pinwheel a gust sets spinning.

// A pinwheel on a wooden post, its hub `h` up; four curled paper vanes
// in node "wheel" (turns about its own z axis, facing +z).
export function pinwheel(b, { h = 2.2 } = {}) {
  b.add(SHAPE.cyl(0.06, 0.075, h, 8, 0.015), { p: [0, h / 2, 0], grad: [C.woodD, C.woodL], facet: 0.06 });
  b.add(SHAPE.cyl(0.16, 0.2, 0.08, 10, 0.02), { p: [0, 0.04, 0], c: 0x8a8070 });
  b.add(SHAPE.cyl(0.035, 0.035, 0.22, 8), { p: [0, h, 0.08], r: [Math.PI / 2, 0, 0], c: C.brassD, mat: "metal" });
  b.node("wheel", [0, h, 0.2], [0, 0, 0], (n) => {
    const cols = [0xe0503c, 0xf2c444, 0x4a8fd8, 0x5ab45a];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      // A vane: a long paper triangle from the hub out, two-tone.
      n.at([0, 0, 0], [0, 0, a], 1, () => {
        n.add(SHAPE.extrude([[0, 0], [0.75, 0], [0.12, 0.62]], 0.012), { p: [0, 0, 0], c: cols[i], facet: 0.03 });
        n.add(SHAPE.extrude([[0, 0], [0.75, 0], [0.12, 0.62]], 0.012), { p: [0, 0, -0.014], c: shade(cols[i], 0.75), facet: 0.03 });
      });
    }
    n.add(SHAPE.ball(0.07, 10, 7), { p: [0, 0, 0.03], c: C.cream });
    n.add(SHAPE.ball(0.035, 8, 6), { p: [0, 0, 0.09], c: C.red });
  });
}

// The round stone well an updraft rises from: a mossy rim, a dark grate
// with a mint glow under it, a few leaves caught on the bars.
export function windWell(b, { r = 1.6 } = {}) {
  const prof = [[r - 0.05, 0], [r + 0.22, 0], [r + 0.28, 0.12], [r + 0.26, 0.38], [r + 0.12, 0.46], [r - 0.04, 0.42], [r - 0.08, 0.1]];
  b.add(SHAPE.lathe(prof, 22), { grad: [0x7d7465, 0xb8ad98], facet: 0.08 });
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.3;
    b.add(SHAPE.blob(0.16 + (i % 3) * 0.05, i + 3, 0.3), { p: [Math.cos(a) * (r + 0.12), 0.44, Math.sin(a) * (r + 0.12)], s: [1.4, 0.45, 1], c: i % 2 ? 0x5a8a3a : 0x6fa048 });
  }
  b.add(SHAPE.cyl(r - 0.04, r - 0.04, 0.04, 22), { p: [0, 0.26, 0], c: 0xa8f0c0, mat: "glow", glow: 0.7 });
  for (let i = -3; i <= 3; i++) {
    const L = 2 * Math.sqrt(Math.max(0, (r - 0.06) ** 2 - (i * r / 3.6) ** 2));
    if (L > 0.1) b.add(SHAPE.box(0.05, 0.05, L, 0.01), { p: [i * r / 3.6, 0.37, 0], c: C.iron, mat: "metal" });
  }
  b.add(SHAPE.box(2 * (r - 0.06), 0.05, 0.05, 0.01), { p: [0, 0.39, 0], c: C.iron, mat: "metal" });
  for (const [x, z, a, c] of [[0.4, 0.3, 0.5, 0xd8a040], [-0.6, -0.2, 2, 0xc0583a], [0.1, -0.7, 4, 0x8ab04a]])
    b.add(SHAPE.box(0.18, 0.012, 0.1, 0.004), { p: [x * r / 1.6, 0.41, z * r / 1.6], r: [0, a, 0.1], c });
}
