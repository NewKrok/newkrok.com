import * as T from "three";
import { SHAPE } from "../modelkit.js";
import { C } from "../palette.js";

// ── The Vacuum Cleaner ───────────────────────────────────────────────────
// Every dog's nightmare: a plum-red canister vacuum with a face, a long
// ribbed hose it points like a trunk, and a dust bag bulging on its back
// (the weak spot, glowing pink). Origin on the ground, facing −z.
// Nodes: "body" (shakes, leans), "eyes", "brows", "mouth", "bag", "hose1"
// (shoulder, aims), "hose2" (elbow), "nozzle", "cord".

const RX = Math.PI / 2;
const up = new T.Vector3(0, 1, 0);
const dirQ = (x, y, z) => new T.Quaternion().setFromUnitVectors(up, new T.Vector3(x, y, z).normalize());

export const PLUM = [0x7a1f36, 0xc0394f];

export function vacuumBoss(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    // Wheels and the chassis plate.
    n.add(SHAPE.cyl(1.25, 1.3, 0.22, 16, 0.05), { p: [0, 0.32, 0], c: C.ironD, mat: "metal" });
    for (const [x, z] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]])
      n.add(SHAPE.cyl(0.24, 0.24, 0.16, 12, 0.04), { p: [x, 0.24, z], r: [0, 0, RX], c: C.black });
    // The drum, with a cream band and chrome trims.
    n.add(SHAPE.lathe([[1.2, 0], [1.28, 0.1], [1.3, 0.6], [1.22, 1.25], [1.05, 1.4], [0.9, 1.45]], 18), { p: [0, 0.42, 0], grad: PLUM, facet: 0.04 });
    n.add(SHAPE.cyl(1.31, 1.31, 0.22, 18), { p: [0, 0.78, 0], c: C.cream, facet: 0.03 });
    for (const y of [0.66, 0.9]) n.add(SHAPE.torus(1.315, 0.025, 4, 36), { p: [0, y, 0], r: [RX, 0, 0], c: C.steel, mat: "metal" });
    // Lid and carrying handle.
    n.add(SHAPE.lathe([[0.95, 0], [0.9, 0.18], [0.7, 0.34], [0.35, 0.44], [0, 0.46]], 18), { p: [0, 1.85, 0], grad: [0x5a1628, 0x9a2c40], facet: 0.05 });
    n.add(SHAPE.torus(0.42, 0.07, 6, 16, Math.PI), { p: [0, 2.25, 0.05], c: C.ironD, mat: "metal" });
    for (const s of [-1, 1]) n.add(SHAPE.cyl(0.09, 0.11, 0.1, 8), { p: [s * 0.42, 2.26, 0.05], c: C.iron, mat: "metal" });
    // Face on the front of the drum: eyes, heavy brows, a grille mouth.
    n.node("eyes", [0.08, 1.45, -1.12], [0, 0, 0], (e) => {
      e.both((s) => {
        e.add(SHAPE.ball(0.33, 12, 9), { p: [s * 0.4, 0, 0], s: [1, 1.05, 0.55], c: C.white, facet: 0.02 });
        e.add(SHAPE.ball(0.16, 10, 7), { p: [s * 0.35, -0.05, -0.14], s: [1, 1, 0.5], c: C.black, facet: 0 });
        e.add(SHAPE.ball(0.045, 6, 4), { p: [s * 0.3, 0.03, -0.22], c: 0xffffff, mat: "glow", glow: 1.3 });
      });
    });
    n.node("brows", [0, 1.78, -1.1], [0, 0, 0], (e) => {
      e.both((s) => e.add(SHAPE.box(0.56, 0.13, 0.14, 0.04), { p: [s * 0.4 + 0.08, 0.02, -0.04], r: [0.1, 0, s * 0.35], c: 0x2a0c14 }));
    });
    n.node("mouth", [0.08, 0.98, -1.2], [0, 0, 0], (m) => {
      m.add(SHAPE.box(1.0, 0.34, 0.12, 0.05), { c: 0x1a0a10 });
      for (let i = 0; i < 7; i++) m.add(SHAPE.box(0.035, 0.3, 0.05), { p: [-0.42 + i * 0.14, 0, -0.06], c: C.steel, mat: "metal" });
      m.add(SHAPE.box(0.9, 0.2, 0.05), { p: [0, 0, 0.03], c: C.dreamPink, mat: "glow", glow: 1.2 });
    });
    // The dust bag on its back, stuffed and glowing.
    n.node("bag", [0, 1.35, 1.25], [0, 0, 0], (g) => {
      g.add(SHAPE.blob(0.62, 41, 0.08, 1), { s: [1.1, 1.0, 0.8], c: 0xf1e6d6, mat: "glass" });
      g.add(SHAPE.blob(0.5, 43, 0.12, 1), { s: [1.05, 0.95, 0.7], c: C.dreamPink, mat: "glow", glow: 1.4 });
      g.add(SHAPE.torus(0.34, 0.06, 5, 14), { p: [0, 0, -0.4], c: C.steel, mat: "metal" });
    });
    // Power cord trailing behind, with a plug.
    n.node("cord", [0.7, 0.45, 1.05], [0, 0, 0], (c) => {
      let p = [0, 0, 0];
      const pts = [[0.2, -0.25, 0.5], [0.5, -0.1, 0.5], [0.6, -0.05, 0.4], [0.4, -0.02, 0.5]];
      for (const d of pts) {
        const L = Math.hypot(...d);
        c.add(SHAPE.cyl(0.05, 0.05, L, 6), { p: [p[0] + d[0] / 2, p[1] + d[1] / 2, p[2] + d[2] / 2], r: dirQ(...d), c: C.black });
        p = [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
      }
      c.add(SHAPE.box(0.2, 0.14, 0.24, 0.04), { p: [p[0], p[1], p[2] + 0.1], c: C.cream });
      c.both((s) => c.add(SHAPE.box(0.03, 0.03, 0.14), { p: [p[0] + s * 0.05, p[1], p[2] + 0.28], c: C.brass, mat: "metal" }));
    });
  });
  // The hose: shoulder socket on the front-left of the drum, an elbow, and
  // the wide brush nozzle.
  b.node("hose1", [-1.0, 1.05, -0.72], [0, 0, 0], (h) => {
    h.add(SHAPE.cyl(0.26, 0.26, 0.2, 12, 0.05), { r: [RX, 0, 0], c: C.steel, mat: "metal" });
    ribbed(h, 1.2);
    h.node("hose2", [0, 0, -1.2], [0, 0, 0], (e) => {
      e.add(SHAPE.ball(0.22, 10, 7), { c: C.steel, mat: "metal" });
      ribbed(e, 1.0);
      e.node("nozzle", [0, 0, -1.05], [0, 0, 0], (z) => {
        z.add(SHAPE.cyl(0.2, 0.17, 0.3, 12, 0.03), { r: [RX, 0, 0], c: C.steel, mat: "metal" });
        // Flat, wide brush head facing forward.
        z.add(SHAPE.box(1.2, 0.26, 0.5, 0.08), { p: [0, -0.05, -0.35], grad: [0x3a1018, 0x6a1c2c] });
        z.add(SHAPE.box(1.1, 0.16, 0.06, 0.02), { p: [0, -0.05, -0.62], c: 0x120408 });
        z.add(SHAPE.box(1.0, 0.1, 0.03), { p: [0, -0.05, -0.64], c: C.dreamPink, mat: "glow", glow: 1.2 });
        for (let i = 0; i < 9; i++) z.add(SHAPE.box(0.05, 0.08, 0.05), { p: [-0.48 + i * 0.12, -0.2, -0.55], c: C.cream });
      });
    });
  });
}

// A length of ribbed plum hose along −z from the node's origin.
function ribbed(n, L) {
  n.add(SHAPE.cyl(0.17, 0.17, L, 10), { p: [0, 0, -L / 2], r: [RX, 0, 0], c: PLUM[0] });
  const k = Math.round(L / 0.12);
  for (let i = 0; i < k; i++) n.add(SHAPE.torus(0.18, 0.03, 4, 12), { p: [0, 0, -0.06 - i * (L / k)], c: PLUM[1] });
}
