import * as T from "three";
import { SHAPE, shade, rng } from "../modelkit.js";
import { C } from "../palette.js";

// ── Sophie's space station ───────────────────────────────────────────────
// Her childhood room grown into a station: plush and tin toys gone wrong,
// the Moon Lamp, the furniture, the station's own fittings, and what the
// yo-yo plays with (the star handle).

const RX = Math.PI / 2;
const starOutline = (r, inner = 0.45) => Array.from({ length: 10 }, (_, i) => {
  const a = Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r * inner : r;
  return [Math.cos(a) * k, Math.sin(a) * k];
});
const GOLD = 0xffe27a, MOONC = 0xf4ecc8;

function eyes(n, { x = 0.09, y = 0, z = 0, r = 0.06, brow = 0x2a1a10, tilt = 0.4 } = {}) {
  n.both((s) => {
    n.add(SHAPE.ball(r, 10, 7), { p: [s * x, y, z], s: [1, 1.1, 0.45], c: C.white, facet: 0.02 });
    n.add(SHAPE.ball(r * 0.5, 8, 6), { p: [s * (x - r * 0.15), y - r * 0.1, z - r * 0.35], s: [1, 1, 0.45], c: C.black, facet: 0 });
    n.add(SHAPE.ball(r * 0.15, 6, 4), { p: [s * (x - r * 0.3), y + r * 0.15, z - r * 0.5], c: 0xffffff, mat: "glow", glow: 1.2 });
    n.add(SHAPE.box(r * 1.9, r * 0.4, r * 0.4, r * 0.12), { p: [s * x, y + r * 1.25, z - r * 0.1], r: [0, 0, s * tilt], c: brow });
  });
}

// ── What the yo-yo plays with ──

// A star handle: a glowing gold star in a brass ring with two little
// fins. Node "star" (turned by the renderer; it brightens when you can
// reach it).
export function starHook(b) {
  b.node("star", [0, 0, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.torus(0.46, 0.05, 6, 28), { c: C.brass, mat: "metal" });
    n.add(SHAPE.torus(0.46, 0.02, 4, 28), { p: [0, 0, 0.04], c: C.brassL, mat: "metal" });
    n.add(SHAPE.extrude(starOutline(0.36), 0.1, 0.02), { c: GOLD, mat: "glow", glow: 2 });
    for (const s of [-1, 1]) n.add(SHAPE.box(0.05, 0.16, 0.12, 0.015), { p: [s * 0.52, 0, 0], c: C.teal });
    n.add(SHAPE.cyl(0.03, 0.05, 0.14, 8), { p: [0, -0.54, 0], c: C.brassD, mat: "metal" });
    n.add(SHAPE.ball(0.035, 8, 6), { p: [0, -0.63, 0], r: [RX, 0, 0], c: 0x9fe0ff, mat: "glow", glow: 1.6 });
  });
}

// ── Glitches ──

// A plush toy rocket, nose forward (−z): red and cream felt with stitched
// seams, a cross face on its nose, a round window, three fins and a
// felt flame.
// Nodes: "body" (wobbles, tilts), "flame" (flares on a dash).
export function plushRocket(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.capsule(0.24, 0.42, 12, 4), { r: [RX, 0, 0], grad: [0xb8302a, 0xe8483a], facet: 0.04 });
    n.add(SHAPE.cone(0.235, 0.34, 12), { p: [0, 0, -0.5], r: [-RX, 0, 0], c: 0xf3e6c8, facet: 0.05 });
    n.add(SHAPE.ball(0.06, 8, 6), { p: [0, 0, -0.66], c: 0xf3e6c8 });
    for (const z of [-0.2, 0.2]) n.add(SHAPE.torus(0.242, 0.012, 3, 18), { p: [0, 0, z], c: 0xf3e6c8 });
    // The window, a face looking out of it.
    n.add(SHAPE.torus(0.12, 0.025, 5, 16), { p: [0, 0.2, -0.08], r: [RX - 0.3, 0, 0], c: C.brass, mat: "metal" });
    n.add(SHAPE.cyl(0.11, 0.11, 0.02, 14), { p: [0, 0.2, -0.08], r: [-0.3, 0, 0], c: 0x9fe0ff, mat: "glow", glow: 0.7 });
    eyes(n, { x: 0.085, y: 0.06, z: -0.5, r: 0.06, brow: 0x5a1a14, tilt: 0.5 });
    // Three fins round the back.
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3 - RX;
      n.add(SHAPE.box(0.04, 0.22, 0.26, 0.015), { p: [Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0.32], r: [0, 0, a + RX], c: 0x3a6ab8 });
    }
    n.add(SHAPE.cyl(0.16, 0.2, 0.08, 12), { p: [0, 0, 0.47], r: [RX, 0, 0], c: 0x3a3e46 });
    n.add(SHAPE.torus(0.3, 0.012, 3, 20), { p: [0, 0, 0.05], c: C.dreamPink, mat: "glow", glow: 1.4 });
    n.node("flame", [0, 0, 0.52], [0, 0, 0], (f) => {
      f.add(SHAPE.cone(0.14, 0.34, 8), { p: [0, 0, 0.17], r: [RX, 0, 0], c: 0xffb040, mat: "glow", glow: 1.6 });
      f.add(SHAPE.cone(0.08, 0.22, 8), { p: [0, 0, 0.12], r: [RX, 0, 0], c: 0xfff0a0, mat: "glow", glow: 2 });
    });
  });
}

// A tin wind-up robot: a boxy body on stubby legs, a head with an antenna
// (its bead sparks), big round eyes, clapping arms and the winding key in
// its back. Nodes: "body", "armL", "armR", "key", "antenna".
export function windupRobot(b) {
  const TIN = 0x9aa8c0, TIND = 0x5a6680;
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.both((s) => {
      n.add(SHAPE.box(0.1, 0.2, 0.12, 0.02), { p: [s * 0.1, 0.1, 0], grad: [TIND, TIN], mat: "metal" });
      n.add(SHAPE.box(0.13, 0.05, 0.18, 0.02), { p: [s * 0.1, 0.025, -0.02], c: 0x3a3e46 });
    });
    n.add(SHAPE.box(0.42, 0.36, 0.32, 0.04), { p: [0, 0.38, 0], grad: [TIND, TIN], mat: "metal", facet: 0.03 });
    n.add(SHAPE.box(0.26, 0.16, 0.02, 0.01), { p: [0, 0.4, -0.165], c: 0x2a3a6a });
    for (let i = 0; i < 3; i++) n.add(SHAPE.ball(0.022, 6, 4), { p: [-0.07 + i * 0.07, 0.42, -0.18], c: [0xe8423a, 0xffd23a, 0x5ab06a][i], mat: "glow", glow: 1.4 });
    n.add(SHAPE.box(0.3, 0.24, 0.26, 0.04), { p: [0, 0.7, 0], grad: [TIN, 0xc8d0e0], mat: "metal", facet: 0.03 });
    n.both((s) => {
      n.add(SHAPE.cyl(0.055, 0.055, 0.03, 12), { p: [s * 0.07, 0.72, -0.13], r: [RX, 0, 0], c: C.white });
      n.add(SHAPE.cyl(0.03, 0.03, 0.02, 10), { p: [s * 0.07, 0.72, -0.15], r: [RX, 0, 0], c: 0x9fe0ff, mat: "glow", glow: 1.5 });
      n.add(SHAPE.cyl(0.04, 0.04, 0.05, 8), { p: [s * 0.17, 0.7, 0], r: [0, 0, RX], c: TIND, mat: "metal" });
    });
    n.add(SHAPE.box(0.14, 0.03, 0.02), { p: [0, 0.63, -0.135], c: 0x2a2a30 });
    n.node("antenna", [0, 0.82, 0], [0, 0, 0], (a) => {
      a.add(SHAPE.cyl(0.01, 0.01, 0.16, 4), { p: [0, 0.08, 0], c: C.steel, mat: "metal" });
      a.add(SHAPE.ball(0.035, 8, 6), { p: [0, 0.17, 0], c: 0xff6a6a, mat: "glow", glow: 1.8 });
    });
    for (const s of [-1, 1]) n.node(s < 0 ? "armR" : "armL", [s * 0.24, 0.5, 0], [0, 0, 0], (a) => {
      a.add(SHAPE.box(0.07, 0.24, 0.08, 0.02), { p: [0, -0.1, 0], c: TIN, mat: "metal" });
      a.add(SHAPE.box(0.1, 0.06, 0.1, 0.02), { p: [0, -0.24, -0.02], c: 0xe8423a });
    });
    n.node("key", [0, 0.42, 0.17], [0, 0, 0], (k) => {
      k.add(SHAPE.cyl(0.015, 0.015, 0.1, 6), { p: [0, 0, 0.05], r: [RX, 0, 0], c: C.brassD, mat: "metal" });
      k.both((s) => k.add(SHAPE.torus(0.05, 0.016, 4, 10), { p: [s * 0.05, 0, 0.11], r: [0, RX, 0], c: C.brass, mat: "metal" }));
    });
    n.add(SHAPE.torus(0.3, 0.012, 3, 20), { p: [0, 0.38, 0], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
  });
}

// A big spinning top, striped red, cream and blue, its point on the
// floor, a knob on top and a scowl on its band. Nodes: "body" (wobbles),
// "spin" (turns about y).
export function spinTop(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.node("spin", [0, 0, 0], [0, 0, 0], (s) => {
      const bands = [[0x2a4aa0, [[0, 0], [0.18, 0.12], [0.45, 0.32]]], [0xf3e6c8, [[0.45, 0.32], [0.68, 0.48]]], [0xd8343a, [[0.68, 0.48], [0.78, 0.6], [0.76, 0.7]]], [0xf3e6c8, [[0.76, 0.7], [0.6, 0.86]]], [0x2a4aa0, [[0.6, 0.86], [0.3, 0.98], [0.12, 1.0]]]];
      for (const [c, prof] of bands) s.add(SHAPE.lathe(prof, 16), { c, facet: 0.05 });
      s.add(SHAPE.cyl(0.07, 0.09, 0.22, 8), { p: [0, 1.08, 0], c: C.wood });
      s.add(SHAPE.ball(0.09, 8, 6), { p: [0, 1.2, 0], c: 0xd8343a });
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; s.add(SHAPE.ball(0.05, 6, 4), { p: [Math.cos(a) * 0.72, 0.62, Math.sin(a) * 0.72], c: GOLD, mat: "glow", glow: 1.3 }); }
    });
    eyes(n, { x: 0.16, y: 0.72, z: -0.7, r: 0.08, brow: 0x5a1a14, tilt: 0.45 });
    n.add(SHAPE.torus(0.82, 0.014, 3, 26), { p: [0, 0.58, 0], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
  });
}

// The planet mobile from over her bed: a stand, a turning cross of wires,
// four planets on strings, a sleepy moon face at the hub. Nodes: "arms"
// (turns), "p0" … "p3" (the planets, hidden once thrown), "hub".
export function planetMobile(b) {
  b.add(SHAPE.cyl(0.5, 0.6, 0.12, 14, 0.03), { p: [0, 0.06, 0], c: 0x3a3e56 });
  b.add(SHAPE.cyl(0.05, 0.06, 2.4, 8), { p: [0, 1.25, 0], c: C.brass, mat: "metal" });
  b.add(SHAPE.torus(0.62, 0.014, 3, 24), { p: [0, 0.2, 0], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
  b.node("hub", [0, 2.5, 0], [0, 0, 0], (h) => {
    h.add(SHAPE.ball(0.22, 12, 9), { c: MOONC, mat: "glow", glow: 0.7 });
    h.both((s) => h.add(SHAPE.torus(0.04, 0.012, 3, 8, Math.PI), { p: [s * 0.08, 0.03, -0.2], r: [0, 0, Math.PI], c: 0x5a4a30 }));
  });
  b.node("arms", [0, 2.5, 0], [0, 0, 0], (a) => {
    const P = [[0xe8a050, 0.24, "saturn"], [0x5a9ae8, 0.2, "earth"], [0xd8483a, 0.16, "mars"], [0xb88ae8, 0.18, "neptune"]];
    for (let i = 0; i < 4; i++) {
      const an = i * Math.PI / 2, x = Math.cos(an) * 0.9, z = Math.sin(an) * 0.9;
      a.add(SHAPE.cyl(0.012, 0.012, 0.9, 4), { p: [x / 2, 0, z / 2], r: [0, -an, RX], c: C.brassL, mat: "metal" });
      a.add(SHAPE.cyl(0.005, 0.005, 0.5, 3), { p: [x, -0.25, z], c: C.paper });
      a.node(`p${i}`, [x, -0.6, z], [0, 0, 0], (p) => {
        const [c, r, kind] = P[i];
        p.add(SHAPE.ball(r, 12, 9), { grad: [shade(c, 0.7), c], facet: 0.03 });
        if (kind === "saturn") p.add(SHAPE.torus(r * 1.6, 0.03, 3, 20), { r: [RX - 0.4, 0, 0], c: 0xf0d8a0 });
        if (kind === "earth") p.add(SHAPE.blob(r * 0.75, 7, 0.3), { p: [0, 0.05, -r * 0.4], c: 0x5ab06a });
      });
    }
  });
}

// ── The Moon Lamp ──
// Her night-light: a pale moon with craters, a sleepy face that wakes up
// cross, a brass cap on top, and its pull-chain hanging below, beads and
// a gold star at the end. Built round its middle. Nodes: "moon" (turns),
// "lids" (the eyelids: scaled shut), "chain" (sways).
export function moonLamp(b) {
  const R = 2.1;
  b.node("moon", [0, 0, 0], [0, 0, 0], (m) => {
    m.add(SHAPE.sphere(R, 3), { c: MOONC, mat: "glow", glow: 0.75, facet: 0.06 });
    const rnd = rng(9);
    for (let i = 0; i < 16; i++) {
      // Craters (none on the face).
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), x = Math.cos(a) * s, y = u, z = Math.sin(a) * s;
      if (z < -0.45 && Math.abs(y) < 0.6) continue;
      const r = 0.2 + rnd() * 0.35;
      m.add(SHAPE.cyl(r, r * 0.8, 0.12, 10), { p: [x * (R - 0.09), y * (R - 0.09), z * (R - 0.09)], r: dirQ(x, y, z), c: 0xe0d4ac, mat: "glow", glow: 0.6 });
    }
    // The face, on the front (−z).
    m.both((s) => {
      m.add(SHAPE.ball(0.34, 12, 9), { p: [s * 0.62, 0.35, -R + 0.16], s: [1, 1, 0.4], c: C.white });
      m.add(SHAPE.ball(0.17, 10, 7), { p: [s * 0.58, 0.3, -R + 0.05], s: [1, 1, 0.4], c: 0x1a1a3a });
      m.add(SHAPE.box(0.6, 0.1, 0.1, 0.03), { p: [s * 0.62, 0.78, -R + 0.22], r: [0, 0, s * -0.35], c: 0xb8a878 });
      m.add(SHAPE.ball(0.22, 10, 7), { p: [s * 1.1, -0.35, -R + 0.42], s: [1, 0.6, 0.3], c: 0xf0a8a0, mat: "glow", glow: 0.5 });
    });
    m.node("lids", [0, 0.35, -R + 0.08], [0, 0, 0], (l) => {
      l.both((s) => l.add(SHAPE.ball(0.36, 12, 9), { p: [s * 0.62, 0.05, 0], s: [1, 1, 0.45], c: 0xe8dcb0 }));
    });
    m.add(SHAPE.torus(0.38, 0.06, 5, 16, Math.PI), { p: [0, -0.55, -R + 0.12], r: [0, 0, 0], c: 0x6a5a3a });
    // Its brass cap and the ring it hangs by.
    m.add(SHAPE.cyl(0.55, 0.75, 0.4, 16, 0.05), { p: [0, R - 0.05, 0], c: C.brass, mat: "metal" });
    m.add(SHAPE.torus(0.25, 0.06, 6, 16), { p: [0, R + 0.35, 0], c: C.brassL, mat: "metal" });
    m.add(SHAPE.torus(R + 0.05, 0.03, 3, 40), { r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
  });
  // The pull-chain, from the bottom of the moon down to its star bead.
  b.node("chain", [0, -R + 0.1, 0], [0, 0, 0], (ch) => {
    const L = 3.4 - R + 0.1;
    for (let i = 0; i < 9; i++) ch.add(SHAPE.ball(0.06, 6, 4), { p: [0, -i * L / 9, 0], c: C.brassL, mat: "metal" });
    ch.add(SHAPE.extrude(starOutline(0.42), 0.14, 0.03), { p: [0, -L - 0.1, 0], c: GOLD, mat: "glow", glow: 2 });
  });
}
// A turn that takes +y onto (x, y, z).
const UP = new T.Vector3(0, 1, 0);
const dirQ = (x, y, z) => new T.Quaternion().setFromUnitVectors(UP, new T.Vector3(x, y, z).normalize());

// ── The station ──

// The airlock you come out of: a thick round door in a frame, warning stripes.
export function airlock(b) {
  b.add(SHAPE.box(6, 4, 0.8, 0.12), { p: [0, 2, 0], grad: [0x8a96b0, 0xe4e8f0], facet: 0.03 });
  b.add(SHAPE.cyl(1.5, 1.5, 0.3, 24, 0.06), { p: [0, 1.9, -0.45], r: [RX, 0, 0], c: 0xc8d0e0, mat: "metal" });
  b.add(SHAPE.torus(1.5, 0.1, 6, 28), { p: [0, 1.9, -0.6], c: 0x5a6680, mat: "metal" });
  b.add(SHAPE.cyl(0.5, 0.5, 0.2, 14), { p: [0, 1.9, -0.65], r: [RX, 0, 0], c: 0x9fe0ff, mat: "glow", glow: 0.8 });
  for (let i = 0; i < 6; i++) b.add(SHAPE.box(0.5, 0.25, 0.05), { p: [-2.6 + i * 1.04, 0.3, -0.42], r: [0, 0, 0.6], c: i % 2 ? 0x2a2a30 : 0xffd23a });
  b.add(SHAPE.box(0.4, 0.2, 0.05), { p: [2.2, 3.4, -0.42], c: 0x5ab06a, mat: "glow", glow: 1.4 });
}

// Her childhood bed, as big as she remembers it: a wooden frame, a quilt
// with stars, a pillow and a plush bear. Long side along z.
export function kidBed(b) {
  b.add(SHAPE.box(2.4, 0.5, 4.4, 0.06), { p: [0, 0.35, 0], grad: [C.woodD, C.woodL], facet: 0.05 });
  for (const [x, z] of [[-1.1, -2.1], [1.1, -2.1], [-1.1, 2.1], [1.1, 2.1]]) b.add(SHAPE.box(0.18, 0.4, 0.18, 0.03), { p: [x, 0.2, z], c: C.woodD });
  b.add(SHAPE.box(2.5, 1.5, 0.15, 0.05), { p: [0, 0.85, 2.25], grad: [C.wood, C.woodL] });
  b.add(SHAPE.box(2.3, 0.22, 4.1, 0.1), { p: [0, 0.7, 0], c: C.white });
  b.add(SHAPE.box(2.36, 0.12, 2.9, 0.06), { p: [0, 0.85, -0.6], grad: [0x2a3a8a, 0x3a5ab8], facet: 0.04 });
  for (let i = 0; i < 6; i++) b.add(SHAPE.extrude(starOutline(0.14), 0.02), { p: [-0.7 + (i % 3) * 0.7, 0.92, -1.5 + Math.floor(i / 3) * 1.2], r: [-RX, 0, i], c: GOLD, mat: "glow", glow: 0.9 });
  b.add(SHAPE.box(1.4, 0.24, 0.7, 0.12), { p: [0, 0.93, 1.6], c: 0xf4f0f8 });
  b.add(SHAPE.ball(0.22, 10, 8), { p: [0.6, 1.05, 1.1], c: 0xb8865a });
  b.add(SHAPE.ball(0.15, 10, 8), { p: [0.6, 1.35, 1.1], c: 0xc8966a });
  b.both((s) => b.add(SHAPE.ball(0.06, 6, 4), { p: [0.6 + s * 0.1, 1.48, 1.1], c: 0x8a5a3a }));
}

// Her desk with a lamp, a globe on its stand, a chair (desk along x).
export function kidDesk(b) {
  b.add(SHAPE.box(2.6, 0.1, 1.3, 0.03), { p: [0, 1.15, 0], grad: [C.wood, C.woodL] });
  for (const [x, z] of [[-1.2, -0.55], [1.2, -0.55], [-1.2, 0.55], [1.2, 0.55]]) b.add(SHAPE.box(0.1, 1.1, 0.1, 0.02), { p: [x, 0.55, z], c: C.woodD });
  b.add(SHAPE.box(0.8, 0.5, 1.1, 0.03), { p: [0.8, 0.85, 0], c: C.wood });
  // The globe.
  b.add(SHAPE.cyl(0.15, 0.2, 0.06, 10), { p: [-0.6, 1.23, 0], c: C.brassD, mat: "metal" });
  b.add(SHAPE.torus(0.36, 0.02, 4, 18, Math.PI * 1.3), { p: [-0.6, 1.62, 0], r: [0, 0, -0.4], c: C.brass, mat: "metal" });
  b.add(SHAPE.ball(0.32, 14, 10), { p: [-0.6, 1.62, 0], c: 0x3a7ad8 });
  for (let i = 0; i < 4; i++) b.add(SHAPE.blob(0.12 + i * 0.03, 30 + i, 0.4), { p: [-0.6 + Math.cos(i * 1.7) * 0.2, 1.62 + Math.sin(i * 2.3) * 0.18, -0.2], s: [1, 1, 0.5], c: 0x5ab06a });
  // A desk lamp with a warm bulb.
  b.add(SHAPE.cyl(0.14, 0.16, 0.05, 10), { p: [0.9, 1.22, 0.3], c: 0x2a4a9a });
  b.add(SHAPE.cyl(0.025, 0.025, 0.5, 6), { p: [0.9, 1.47, 0.3], c: C.steel, mat: "metal" });
  b.add(SHAPE.cone(0.18, 0.22, 10), { p: [0.8, 1.72, 0.2], r: [Math.PI - 0.4, 0, 0.3], c: 0x2a4a9a });
  b.add(SHAPE.ball(0.06, 8, 6), { p: [0.76, 1.66, 0.16], c: 0xffe8b0, mat: "glow", glow: 1.8 });
  // The chair, tucked in.
  b.add(SHAPE.box(0.7, 0.08, 0.7, 0.02), { p: [-0.3, 0.6, -0.9], c: 0xd8343a });
  b.add(SHAPE.box(0.7, 0.7, 0.08, 0.02), { p: [-0.3, 0.95, -1.25], c: 0xd8343a });
  for (const [x, z] of [[-0.6, -0.6], [0, -0.6], [-0.6, -1.2], [0, -1.2]]) b.add(SHAPE.box(0.06, 0.6, 0.06), { p: [x, 0.3, z], c: C.steel, mat: "metal" });
}

// A wooden toy chest, painted with stars, the lid ajar and toys peeking out.
export function toyChest(b) {
  b.add(SHAPE.box(2, 0.9, 1.2, 0.06), { p: [0, 0.45, 0], grad: [0x2a6a8a, 0x3a8ab0], facet: 0.04 });
  b.add(SHAPE.box(2.06, 0.18, 1.26, 0.05), { p: [0, 0.98, 0.1], r: [-0.25, 0, 0], c: 0x2a5a7a });
  for (const x of [-0.7, 0, 0.7]) b.add(SHAPE.extrude(starOutline(0.16), 0.02), { p: [x, 0.5, -0.61], c: GOLD });
  b.add(SHAPE.ball(0.2, 10, 8), { p: [-0.5, 1, -0.2], c: 0xd8343a });
  b.add(SHAPE.box(0.3, 0.3, 0.3, 0.03), { p: [0.4, 1, -0.2], r: [0.3, 0.4, 0.2], c: 0xffd23a });
}

// A bookcase as tall as a wall, books and toys on its shelves.
export function bookcase(b) {
  const W = 3.2, H = 3.6, D = 1.2;
  b.add(SHAPE.box(W, H, 0.1), { p: [0, H / 2, D / 2 - 0.05], grad: [C.woodD, C.wood] });
  b.both((s) => b.add(SHAPE.box(0.12, H, D, 0.02), { p: [s * (W / 2 - 0.06), H / 2, 0], grad: [C.woodD, C.woodL] }));
  const rnd = rng(13), COLS = [0xd84a48, 0x3a7fae, 0x2a8a3a, 0xe0a020, 0x7a4aa0, 0xf0f0e8];
  for (let i = 0; i < 4; i++) {
    const y = 0.1 + i * 0.88;
    b.add(SHAPE.box(W, 0.08, D, 0.02), { p: [0, y, 0], c: C.woodL });
    if (i === 3) break;
    let x = -W / 2 + 0.2;
    while (x < W / 2 - 0.4) {
      const w = 0.08 + rnd() * 0.08, h = 0.45 + rnd() * 0.3;
      if (rnd() < 0.12) { b.add(SHAPE.ball(0.18, 8, 6), { p: [x + 0.18, y + 0.22, 0], c: COLS[(rnd() * 6) | 0] }); x += 0.42; continue; }
      b.add(SHAPE.box(w, h, 0.7, 0.01), { p: [x + w / 2, y + 0.04 + h / 2, 0.05], r: [0, 0, (rnd() - 0.5) * 0.12], c: COLS[(rnd() * 6) | 0] });
      x += w + 0.01;
    }
  }
  b.add(SHAPE.box(W, 0.08, D, 0.02), { p: [0, H, 0], c: C.woodL });
}

// A station console: a sloped desk of switches and two glowing screens.
export function stationConsole(b) {
  b.add(SHAPE.box(1.8, 0.9, 0.8, 0.06), { p: [0, 0.45, 0], grad: [0x5a6688, 0xc8d0e0], facet: 0.03 });
  b.add(SHAPE.box(1.7, 0.08, 0.7, 0.02), { p: [0, 1.0, -0.05], r: [0.35, 0, 0], c: 0x3a3e56 });
  b.both((s) => b.add(SHAPE.box(0.6, 0.36, 0.04), { p: [s * 0.45, 1.05, -0.08], r: [0.35, 0, 0], c: s < 0 ? 0x5ad0a0 : 0x6aa8ff, mat: "glow", glow: 1.1 }));
  for (let i = 0; i < 6; i++) b.add(SHAPE.box(0.08, 0.04, 0.08), { p: [-0.55 + i * 0.22, 0.88, -0.36], c: [0xe8423a, 0xffd23a, 0x5ab06a][i % 3], mat: "glow", glow: 1.3 });
}

// A lamp on a slim post, a round white light.
export function spaceLamp(b) {
  b.add(SHAPE.cyl(0.25, 0.3, 0.1, 10), { p: [0, 0.05, 0], c: 0x3a3e56 });
  b.add(SHAPE.cyl(0.06, 0.07, 3.2, 8), { p: [0, 1.65, 0], c: 0xc8d0e0, mat: "metal" });
  b.add(SHAPE.ball(0.24, 12, 9), { p: [0, 3.3, 0], c: 0xe8f0ff, mat: "glow", glow: 1.6 });
  b.add(SHAPE.torus(0.24, 0.03, 4, 14), { p: [0, 3.18, 0], r: [RX, 0, 0], c: C.brass, mat: "metal" });
}

// A glow-in-the-dark star hanging in the air (decoration).
export function glowStar(b, { seed = 1 } = {}) {
  const rnd = rng(seed), s = 0.25 + rnd() * 0.3;
  b.add(SHAPE.extrude(starOutline(s), 0.06, 0.015), { r: [rnd() * 0.6, rnd() * 6, rnd() * 0.6], c: 0xd8ffd0, mat: "glow", glow: 1.2 });
}

// Her parents' porch light, on a post with a bit of porch rail: warm.
export function porchLight(b) {
  b.add(SHAPE.box(0.2, 2.2, 0.2, 0.03), { p: [0, 1.1, 0], c: C.white });
  for (const s of [-1, 1]) b.add(SHAPE.box(1.6, 0.1, 0.08), { p: [s * 0.85, 0.9, 0], c: C.white });
  for (let i = 0; i < 6; i++) b.add(SHAPE.box(0.06, 0.8, 0.06), { p: [-1.5 + i * 0.6 + (i > 2 ? 0.3 : 0), 0.45, 0], c: C.white });
  b.add(SHAPE.box(0.34, 0.06, 0.34, 0.02), { p: [0, 2.24, -0.22], c: 0x2a2a30 });
  b.add(SHAPE.box(0.3, 0.05, 0.3, 0.02), { p: [0, 1.78, -0.22], c: 0x2a2a30 });
  b.add(SHAPE.box(0.26, 0.4, 0.26), { p: [0, 2.0, -0.22], c: 0xffd890, mat: "glow", glow: 1.8 });
}

// A round porthole for a wall, stars behind the glass (faces −z).
export function porthole(b) {
  b.add(SHAPE.torus(0.7, 0.12, 6, 24), { p: [0, 1.8, 0], c: C.steel, mat: "metal" });
  b.add(SHAPE.cyl(0.66, 0.66, 0.04, 22), { p: [0, 1.8, 0.02], r: [RX, 0, 0], c: 0x0a1030 });
  const rnd = rng(3);
  for (let i = 0; i < 7; i++) b.add(SHAPE.ball(0.025, 4, 3), { p: [(rnd() - 0.5) * 0.9, 1.8 + (rnd() - 0.5) * 0.9, -0.01], c: 0xffffff, mat: "glow", glow: 1.5 });
}

// Her bunk bed: two beds on posts, a ladder up the side (long side along z).
export function bunkBed(b) {
  for (const [x, z] of [[-1.05, -2.05], [1.05, -2.05], [-1.05, 2.05], [1.05, 2.05]]) b.add(SHAPE.box(0.14, 2.3, 0.14, 0.03), { p: [x, 1.15, z], grad: [C.woodD, C.woodL] });
  for (const y of [0.3, 1.7]) {
    b.add(SHAPE.box(2.2, 0.2, 4.2, 0.04), { p: [0, y, 0], c: C.wood });
    b.add(SHAPE.box(2.0, 0.16, 3.9, 0.06), { p: [0, y + 0.17, 0], c: C.white });
    b.add(SHAPE.box(2.04, 0.08, 2.6, 0.04), { p: [0, y + 0.27, -0.6], c: y > 1 ? 0xd8608a : 0x3a8a6a });
    b.add(SHAPE.box(1.1, 0.16, 0.6, 0.08), { p: [0, y + 0.32, 1.6], c: 0xf4f0f8 });
  }
  b.add(SHAPE.box(2.2, 0.35, 0.08), { p: [0, 2.15, 0.6], c: C.woodL });
  for (let i = 0; i < 4; i++) b.add(SHAPE.box(0.06, 0.06, 0.6), { p: [1.15, 0.4 + i * 0.42, -1.6], c: C.woodL });
  b.both((s) => b.add(SHAPE.box(0.06, 1.8, 0.06), { p: [1.15, 0.9, -1.6 + s * 0.3], c: C.woodL }));
}

// A wardrobe, one door open a crack (long side along z).
export function wardrobe(b) {
  b.add(SHAPE.box(1.6, 2.8, 2.4, 0.06), { p: [0, 1.4, 0], grad: [0xb8c8e0, 0xe8eef8], facet: 0.03 });
  b.add(SHAPE.box(0.04, 2.6, 1.1), { p: [-0.81, 1.4, -0.58], r: [0, 0.2, 0], c: 0xd8e0f0 });
  b.add(SHAPE.box(0.04, 2.6, 1.1), { p: [-0.81, 1.4, 0.58], c: 0xd8e0f0 });
  for (const z of [-0.1, 0.1]) b.add(SHAPE.ball(0.05, 6, 4), { p: [-0.86, 1.4, z], c: C.brass, mat: "metal" });
  b.add(SHAPE.extrude(starOutline(0.3), 0.03), { p: [-0.84, 2.2, 0.58], r: [0, RX, 0], c: GOLD });
}

// A dollhouse: two floors, a pointed roof, lit windows.
export function dollhouse(b) {
  b.add(SHAPE.box(2.2, 1.4, 1.2, 0.04), { p: [0, 0.7, 0], grad: [0xe8b8c8, 0xf8d8e0] });
  b.add(SHAPE.extrude([[-1.3, 0], [1.3, 0], [0, 0.8]], 1.4, 0.03), { p: [0, 1.4, 0], c: 0xd84a48, facet: 0.05 });
  for (const [x, y] of [[-0.6, 0.45], [0.6, 0.45], [-0.6, 1.05], [0.6, 1.05]]) b.add(SHAPE.box(0.36, 0.3, 0.04), { p: [x, y, -0.61], c: 0xffe0a0, mat: "glow", glow: 1.2 });
  b.add(SHAPE.box(0.3, 0.5, 0.04), { p: [0, 0.25, -0.61], c: 0x7a4a2a });
}

// A satellite dish on a short mast.
export function dish(b) {
  b.add(SHAPE.cyl(0.4, 0.5, 0.2, 10), { p: [0, 0.1, 0], c: 0x5a6688 });
  b.add(SHAPE.cyl(0.08, 0.1, 1, 8), { p: [0, 0.7, 0], c: C.steel, mat: "metal" });
  b.at([0, 1.3, 0], [-0.6, 0.4, 0], 1, () => {
    // Both faces of the bowl (a lathe is one-sided).
    b.add(SHAPE.lathe([[0, 0], [0.5, 0.06], [0.9, 0.22], [1.1, 0.38]], 18), { c: 0xe4e8f0, facet: 0.03 });
    b.add(SHAPE.lathe([[1.08, 0.4], [0.88, 0.25], [0.48, 0.09], [0, 0.03]], 18), { c: 0xc8d0e0, facet: 0.03 });
    b.add(SHAPE.cyl(0.02, 0.02, 0.8, 4), { p: [0, 0.4, 0], c: C.steel, mat: "metal" });
    b.add(SHAPE.ball(0.07, 8, 6), { p: [0, 0.8, 0], c: 0xff6a6a, mat: "glow", glow: 1.6 });
  });
}

// Her dad's telescope: brass tube on a wooden tripod, aimed at the sky.
export function telescope(b) {
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    b.add(SHAPE.cyl(0.04, 0.05, 1.4, 6), { p: [Math.cos(a) * 0.3, 0.65, Math.sin(a) * 0.3], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], c: C.wood });
  }
  b.add(SHAPE.ball(0.1, 8, 6), { p: [0, 1.32, 0], c: C.brassD, mat: "metal" });
  b.at([0, 1.4, 0], [-0.7, 0, 0], 1, () => {
    b.add(SHAPE.cyl(0.11, 0.13, 1.5, 12), { p: [0, 0, -0.35], r: [RX, 0, 0], c: C.brass, mat: "metal" });
    b.add(SHAPE.cyl(0.14, 0.14, 0.12, 12), { p: [0, 0, -1.08], r: [RX, 0, 0], c: C.brassD, mat: "metal" });
    b.add(SHAPE.cyl(0.04, 0.05, 0.2, 8), { p: [0, 0.02, 0.45], r: [RX, 0, 0], c: C.black });
  });
}

// A star chart on an easel: constellations joined up in gold.
export function starChart(b) {
  b.add(SHAPE.box(1.6, 1.2, 0.06), { p: [0, 1.4, 0], c: 0x14183a });
  b.add(SHAPE.box(1.7, 1.3, 0.04), { p: [0, 1.4, 0.03], c: C.wood });
  for (const s of [-1, 1]) b.add(SHAPE.box(0.06, 1.6, 0.06), { p: [s * 0.6, 0.75, 0.15], r: [-0.15, 0, 0], c: C.woodD });
  const pts = [[-0.6, 0.3], [-0.3, 0.4], [-0.1, 0.2], [0.2, 0.3], [0.5, 0.1], [0.3, -0.2], [-0.2, -0.3], [0.55, -0.4]];
  for (const [x, y] of pts) b.add(SHAPE.ball(0.03, 4, 3), { p: [x, 1.4 + y, -0.04], c: GOLD, mat: "glow", glow: 1.6 });
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
    b.add(SHAPE.box(L, 0.008, 0.005), { p: [(x0 + x1) / 2, 1.4 + (y0 + y1) / 2, -0.04], r: [0, 0, Math.atan2(y1 - y0, x1 - x0)], c: 0xc8b070 });
  }
}

// The cupola: tall window ribs arching over the arena (open between them).
export function cupolaFrame(b, { w = 28, d = 24 } = {}) {
  const H = 11, ribs = 7;
  for (let i = 0; i < ribs; i++) {
    const x = -w / 2 + (i + 0.5) * w / ribs;
    // An arch over z: a few straight pieces.
    const N = 8;
    for (let k = 0; k < N; k++) {
      const a0 = Math.PI * k / N, a1 = Math.PI * (k + 1) / N;
      const z0 = -Math.cos(a0) * d / 2, y0 = Math.sin(a0) * H, z1 = -Math.cos(a1) * d / 2, y1 = Math.sin(a1) * H, L = Math.hypot(z1 - z0, y1 - y0);
      b.add(SHAPE.box(0.18, 0.18, L + 0.1), { p: [x, (y0 + y1) / 2, (z0 + z1) / 2], r: [-Math.atan2(y1 - y0, z1 - z0), 0, 0], c: 0xc8d0e0, mat: "metal" });
    }
  }
  for (const s of [-1, 1]) b.add(SHAPE.box(w, 0.3, 0.3), { p: [0, 0.15, s * d / 2], c: 0x5a6688, mat: "metal" });
  b.add(SHAPE.box(w, 0.25, 0.25), { p: [0, H, 0], c: 0xc8d0e0, mat: "metal" });
}

// A lump of rock drifting in space (in place of a dream's clouds).
export function asteroid(b, { seed = 1, s = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.blob(2.2 * s, seed * 7, 0.28, 1), { s: [1, 0.7 + rnd() * 0.4, 0.8 + rnd() * 0.4], grad: [0x4a4658, 0x8a8698], facet: 0.08 });
  for (let i = 0; i < 3; i++) b.add(SHAPE.blob((0.6 + rnd()) * s, seed * 13 + i, 0.3, 0), { p: [(rnd() - 0.5) * 4 * s, (rnd() - 0.5) * 2 * s, (rnd() - 0.5) * 4 * s], grad: [0x3a3648, 0x7a7688], facet: 0.08 });
}

// ── Memories ──
export function spaceMemory(n, item) {
  if (item === "glowstars") {
    n.add(SHAPE.box(0.24, 0.3, 0.01), { c: 0x2a3a8a, facet: 0 });
    for (let i = 0; i < 5; i++) n.add(SHAPE.extrude(starOutline(0.04 + (i % 2) * 0.02), 0.01), { p: [-0.07 + (i % 3) * 0.07, -0.08 + Math.floor(i / 2) * 0.08, -0.01], c: 0xd8ffd0, mat: "glow", glow: 1.6 });
    return true;
  }
  if (item === "patch") {
    n.add(SHAPE.cyl(0.16, 0.16, 0.02, 20), { r: [RX, 0, 0], c: 0xd8343a });
    n.add(SHAPE.cyl(0.14, 0.14, 0.022, 20), { r: [RX, 0, 0], c: 0x1a2a6a });
    n.add(SHAPE.extrude(starOutline(0.05), 0.01), { p: [0.05, 0.05, -0.013], c: GOLD });
    n.add(SHAPE.box(0.03, 0.12, 0.01), { p: [-0.03, -0.02, -0.013], r: [0, 0, -0.5], c: C.white });
    return true;
  }
  if (item === "planisphere") {
    n.add(SHAPE.cyl(0.15, 0.15, 0.015, 20), { r: [RX, 0, 0], c: 0x14183a });
    n.add(SHAPE.torus(0.15, 0.012, 4, 20), { c: C.brass, mat: "metal" });
    for (let i = 0; i < 7; i++) n.add(SHAPE.ball(0.012, 4, 3), { p: [Math.cos(i * 1.3) * 0.09, Math.sin(i * 2.1) * 0.09, -0.01], c: GOLD, mat: "glow", glow: 1.6 });
    return true;
  }
  if (item === "fireflies") {
    n.add(SHAPE.cyl(0.08, 0.08, 0.2, 12), { c: 0xd8f0ff, mat: "glass" });
    n.add(SHAPE.cyl(0.085, 0.085, 0.04, 12), { p: [0, 0.12, 0], c: C.brass, mat: "metal" });
    for (let i = 0; i < 6; i++) n.add(SHAPE.ball(0.014, 4, 3), { p: [Math.cos(i * 2.4) * 0.04, -0.06 + i * 0.025, Math.sin(i * 2.4) * 0.04], c: 0xe8ff80, mat: "glow", glow: 2 });
    return true;
  }
  if (item === "porch") {
    n.add(SHAPE.box(0.14, 0.2, 0.14, 0.02), { c: 0x2a2a30 });
    n.add(SHAPE.box(0.1, 0.15, 0.1), { c: 0xffd890, mat: "glow", glow: 1.8 });
    n.add(SHAPE.box(0.04, 0.06, 0.04), { p: [0, 0.13, 0], c: 0x2a2a30 });
    return true;
  }
  return false;
}
