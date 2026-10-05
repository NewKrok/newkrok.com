import { SHAPE } from "../modelkit.js";
import { C } from "../palette.js";

// ── Sophie's space station ───────────────────────────────────────────────
// What the yo-yo plays with: a star handle hanging in the air, a glowing
// gold star in a brass ring with two little fins. Node "star" (turned by
// the renderer; it brightens when you can reach it).

const RX = Math.PI / 2;
const starOutline = (r, inner = 0.45) => Array.from({ length: 10 }, (_, i) => {
  const a = Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * inner : r;
  return [Math.cos(a) * k, Math.sin(a) * k];
});

export function starHook(b) {
  b.node("star", [0, 0, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.torus(0.46, 0.05, 6, 28), { c: C.brass, mat: "metal" });
    n.add(SHAPE.torus(0.46, 0.02, 4, 28), { p: [0, 0, 0.04], c: C.brassL, mat: "metal" });
    n.add(SHAPE.extrude(starOutline(0.36), 0.1, 0.02), { c: 0xffe27a, mat: "glow", glow: 2 });
    for (const s of [-1, 1]) n.add(SHAPE.box(0.05, 0.16, 0.12, 0.015), { p: [s * 0.52, 0, 0], c: C.teal });
    n.add(SHAPE.cyl(0.03, 0.05, 0.14, 8), { p: [0, -0.54, 0], c: C.brassD, mat: "metal" });
    n.add(SHAPE.ball(0.035, 8, 6), { p: [0, -0.63, 0], r: [RX, 0, 0], c: 0x9fe0ff, mat: "glow", glow: 1.6 });
  });
}
