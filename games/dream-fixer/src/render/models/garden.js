import { SHAPE, shade, rng, vary } from "../modelkit.js";
import { C } from "../palette.js";
import { tree } from "./park.js";

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

const RX = Math.PI / 2;

function eyes(n, { x = 0.09, y = 0, z = 0, r = 0.06, brow = 0x2a1a10, tilt = 0.4 } = {}) {
  n.both((s) => {
    n.add(SHAPE.ball(r, 10, 7), { p: [s * x, y, z], s: [1, 1.1, 0.45], c: C.white, facet: 0.02 });
    n.add(SHAPE.ball(r * 0.5, 8, 6), { p: [s * (x - r * 0.15), y - r * 0.1, z - r * 0.35], s: [1, 1, 0.45], c: C.black, facet: 0 });
    n.add(SHAPE.ball(r * 0.15, 6, 4), { p: [s * (x - r * 0.3), y + r * 0.15, z - r * 0.5], c: 0xffffff, mat: "glow", glow: 1.2 });
    n.add(SHAPE.box(r * 1.9, r * 0.4, r * 0.4, r * 0.12), { p: [s * x, y + r * 1.25, z - r * 0.1], r: [0, 0, s * tilt], c: brow });
  });
}

// ── Glitches ──

// A garden gnome: red pointy hat, white beard, blue coat, a little shovel
// in its right hand. Node "body" (pivot at its feet) waddles; "shovel"
// (pivot at the hand) swings up to bonk.
export function gnome(b) {
  gnomeBody(b, { hat: [0xb02a22, 0xe8423a], coat: [0x24487e, 0x3a6ab8] }, (h) => {
    h.add(SHAPE.cyl(0.015, 0.015, 0.55, 5), { p: [0, 0.05, 0], c: C.woodL });
    h.add(SHAPE.box(0.13, 0.17, 0.02, 0.01), { p: [0, -0.28, 0], c: C.steel, mat: "metal" });
  });
}

// The slingshot gnome: green hat, brown coat, a forked slingshot with a
// pebble in its sling instead of the shovel (the same "shovel" node, so
// it draws the same way).
export function slingerGnome(b) {
  gnomeBody(b, { hat: [0x2a7a3a, 0x4aa85a], coat: [0x6a4424, 0x8a5a32] }, (h) => {
    h.add(SHAPE.cyl(0.018, 0.018, 0.22, 5), { p: [0, -0.02, 0], c: C.woodD });
    h.both((s) => h.add(SHAPE.cyl(0.014, 0.014, 0.14, 5), { p: [s * 0.045, 0.14, 0], r: [0, 0, -s * 0.35], c: C.woodD }));
    h.add(SHAPE.box(0.12, 0.012, 0.012, 0.004), { p: [0, 0.2, 0.02], c: 0x3a2a20 });
    h.add(SHAPE.ball(0.035, 6, 4), { p: [0, 0.2, 0.04], c: 0x8a867a });
  });
}

function gnomeBody(b, { hat, coat }, hand) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.both((s) => n.add(SHAPE.box(0.11, 0.1, 0.18, 0.03), { p: [s * 0.09, 0.05, -0.02], c: 0x4a2e1a }));
    n.add(SHAPE.lathe([[0.2, 0], [0.23, 0.1], [0.21, 0.3], [0.15, 0.42], [0, 0.44]], 12), { p: [0, 0.08, 0], grad: coat, facet: 0.06 });
    n.add(SHAPE.cyl(0.215, 0.225, 0.05, 12), { p: [0, 0.2, 0], c: 0x2a1a10 });
    n.add(SHAPE.box(0.07, 0.06, 0.02, 0.01), { p: [0, 0.2, -0.225], c: C.brass, mat: "metal" });
    n.both((s) => n.add(SHAPE.capsule(0.05, 0.12, 6, 2), { p: [s * 0.22, 0.32, -0.04], r: [0.5, 0, s * 0.5], c: coat[1] }));
    n.add(SHAPE.ball(0.15, 10, 8), { p: [0, 0.58, 0], c: 0xf0c0a0 });
    n.add(SHAPE.ball(0.05, 8, 6), { p: [0, 0.56, -0.15], c: 0xf09a8a });
    n.add(SHAPE.cone(0.15, 0.3, 8), { p: [0, 0.4, -0.08], r: [Math.PI - 0.15, 0, 0], c: 0xf4f2ea, facet: 0.08 });
    eyes(n, { x: 0.06, y: 0.63, z: -0.12, r: 0.035, brow: 0xf4f2ea, tilt: 0.5 });
    n.add(SHAPE.cone(0.17, 0.44, 10), { p: [0, 0.9, 0.02], r: [0.15, 0, 0], grad: hat, facet: 0.05 });
    n.add(SHAPE.torus(0.155, 0.025, 4, 14), { p: [0, 0.69, 0], r: [RX, 0, 0], c: hat[0] });
    n.add(SHAPE.torus(0.25, 0.012, 3, 20), { p: [0, 0.3, 0], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
    n.node("shovel", [0.26, 0.26, -0.1], [0, 0, 0], hand);
  });
}

// A punched train ticket, flying flat: a cream card with a red band, the
// station's name in little grey lines, a hole punched through, and a
// cross face. Node "body" (pivot at its middle) flutters.
export function trainTicket(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.box(0.62, 0.34, 0.025, 0.02), { c: 0xf4ead0 });
    n.add(SHAPE.box(0.62, 0.07, 0.03, 0.01), { p: [0, 0.11, 0], c: 0xc8302a });
    for (const y of [-0.04, -0.1]) n.add(SHAPE.box(0.3, 0.018, 0.03, 0.005), { p: [0.1, y, 0], c: 0x8a8478 });
    n.add(SHAPE.cyl(0.04, 0.04, 0.035, 8), { p: [-0.22, -0.06, 0], r: [RX, 0, 0], c: 0x2a2420 });
    eyes(n, { x: 0.07, y: 0.02, z: -0.02, r: 0.035, brow: 0x3a2a20, tilt: 0.5 });
    n.add(SHAPE.torus(0.38, 0.012, 3, 20), { p: [0, 0, 0], r: [0, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
  });
}

// The body of a green watering can, its rose (the sprinkler) forward.
function canShape(n) {
  n.add(SHAPE.cyl(0.3, 0.32, 0.46, 14, 0.04), { grad: [0x2e7a44, 0x5ab06a], facet: 0.04 });
  for (const y of [-0.17, 0.17]) n.add(SHAPE.torus(0.315, 0.018, 3, 18), { p: [0, y, 0], r: [RX, 0, 0], c: 0x2a6a3a });
  n.add(SHAPE.torus(0.2, 0.03, 4, 12, Math.PI), { p: [0, 0.23, 0.05], r: [0, RX, 0], c: 0x2e7a44 });
  n.add(SHAPE.cyl(0.035, 0.055, 0.6, 8), { p: [0, 0.02, -0.5], r: [-1.1, 0, 0], c: 0x3a8a50 });
  n.node("rose", [0, 0.16, -0.76], [0, 0, 0], (r) => {
    r.add(SHAPE.cyl(0.1, 0.06, 0.08, 10), { r: [-1.1, 0, 0], c: C.brass, mat: "metal" });
    r.add(SHAPE.cyl(0.095, 0.095, 0.01, 10), { p: [0, 0.02, -0.04], r: [-1.1, 0, 0], c: 0x9fe0ff, mat: "glow", glow: 1.2 });
  });
}

// A watering can, flying. Node "body" (pivot at its middle) tips to pour.
export function wateringCan(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    canShape(n);
    eyes(n, { x: 0.12, y: 0.07, z: -0.3, r: 0.07, brow: 0x1a3a22, tilt: 0.45 });
    n.add(SHAPE.torus(0.06, 0.012, 3, 10, Math.PI), { p: [0, -0.1, -0.31], r: [0, 0, Math.PI], c: 0x1a3a22 });
    n.add(SHAPE.torus(0.34, 0.012, 3, 20), { p: [0, 0, 0], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
  });
}
// The one standing by the shed (just a can).
export function wateringPot(b) { b.at([0, 0.25, 0], [0, 0.6, 0], 0.7, () => canShape(b)); }

// A red push lawnmower, facing forward: its deck on four wheels, the
// engine on top, the handle and the grass bag behind, a grille of teeth
// and a scowl on the front. Nodes: "body" (rocks when it revs), "blades".
export function lawnMower(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.box(1.1, 0.3, 1.2, 0.1), { p: [0, 0.32, 0], grad: [0x9a2a22, 0xd8483a], facet: 0.04 });
    for (const [x, z] of [[-0.55, -0.45], [0.55, -0.45], [-0.55, 0.45], [0.55, 0.45]]) {
      n.add(SHAPE.cyl(0.18, 0.18, 0.12, 12, 0.03), { p: [x, 0.18, z], r: [0, 0, RX], c: 0x1e1e24 });
      n.add(SHAPE.cyl(0.07, 0.07, 0.13, 8), { p: [x, 0.18, z], r: [0, 0, RX], c: C.steel, mat: "metal" });
    }
    n.add(SHAPE.cyl(0.28, 0.3, 0.3, 12, 0.04), { p: [0, 0.62, 0.05], c: 0x3a3e46, mat: "metal" });
    n.add(SHAPE.cyl(0.18, 0.18, 0.12, 10), { p: [0, 0.82, 0.05], c: 0xe8c040 });
    for (const s of [-1, 1]) n.add(SHAPE.cyl(0.025, 0.025, 1.2, 6), { p: [s * 0.35, 0.85, 0.85], r: [0.85, 0, 0], c: C.steel, mat: "metal" });
    n.add(SHAPE.cyl(0.03, 0.03, 0.8, 6), { p: [0, 1.25, 1.3], r: [0, 0, RX], c: 0x1e1e24 });
    n.add(SHAPE.box(0.6, 0.45, 0.5, 0.12), { p: [0, 0.5, 0.82], c: 0x3a7a3a, facet: 0.08 });
    // The grille of teeth and the face on the front.
    for (let i = 0; i < 6; i++) n.add(SHAPE.box(0.1, 0.1, 0.03, 0.015), { p: [-0.3 + i * 0.12, 0.26, -0.61], c: C.white });
    eyes(n, { x: 0.22, y: 0.44, z: -0.6, r: 0.09, brow: 0x3a0e0a, tilt: 0.55 });
    n.add(SHAPE.torus(0.62, 0.014, 3, 24), { p: [0, 0.32, 0], r: [RX, 0, 0], c: C.dreamPink, mat: "glow", glow: 1.4 });
    n.node("blades", [0, 0.12, 0], [0, 0, 0], (q) => {
      for (const a of [0, RX]) q.add(SHAPE.box(0.9, 0.02, 0.1), { r: [0, a, 0], c: C.steel, mat: "metal" });
    });
  });
}

// A sunflower taller than you, rooted: a stem with two big leaves, a head
// of petals round a seed-dark face that turns to follow you. Nodes:
// "head" (turns with the yaw already; nods), "core" (pulses).
export function sunflower(b) {
  b.add(SHAPE.blob(0.5, 3, 0.25, 1), { p: [0, 0.05, 0], s: [1.2, 0.35, 1.2], c: 0x5a3a24 });
  b.add(SHAPE.cyl(0.07, 0.1, 2.3, 7), { p: [0, 1.15, 0], grad: [0x2e6a2a, 0x5aa04a], facet: 0.05 });
  for (const [y, s] of [[0.9, 1], [1.5, -1]]) b.add(SHAPE.ball(0.3, 8, 5), { p: [s * 0.32, y, 0], r: [0, 0, s * 0.6], s: [1, 0.15, 0.55], c: 0x4a8a3a });
  b.node("head", [0, 2.3, 0], [0, 0, 0], (n) => {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = 0.62;
      n.add(SHAPE.ball(0.2, 6, 4), { p: [Math.cos(a) * r, Math.sin(a) * r, 0.02 + (i % 2) * 0.03], r: [0, 0, a], s: [1.3, 0.45, 0.2], c: i % 2 ? 0xf2c030 : 0xffd84a });
    }
    n.add(SHAPE.cyl(0.46, 0.46, 0.14, 18), { r: [RX, 0, 0], c: 0x4a2e1a });
    n.node("core", [0, 0, -0.08], [0, 0, 0], (c) => {
      for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 0.08 + Math.sqrt(i / 18) * 0.34; c.add(SHAPE.ball(0.035, 5, 4), { p: [Math.cos(a) * r, Math.sin(a) * r, 0], c: 0x2a1a0e }); }
      c.add(SHAPE.torus(0.47, 0.02, 3, 22), { c: C.dreamPink, mat: "glow", glow: 1.5 });
    });
    eyes(n, { x: 0.16, y: 0.1, z: -0.1, r: 0.1, brow: 0x1a0e06, tilt: 0.5 });
    n.add(SHAPE.torus(0.1, 0.02, 3, 10, Math.PI), { p: [0, -0.16, -0.1], r: [0, 0, Math.PI], c: 0x1a0e06 });
  });
}

// ── The Big Alarm Clock ──
// An old wind-up alarm clock taller than a house: a red drum of a case on
// two stubby legs, a cream dial with its hands, angry eyes over the dial,
// a glass that swings open on a hinge, two bells and a hammer on its head,
// and the winding key on top, glowing so you know what to aim for.
// Nodes: "body", "minute", "hour", "glass", "bells", "hammer", "key".
export function bigAlarmClock(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    n.both((s) => {
      n.add(SHAPE.cyl(0.28, 0.34, 1.1, 10), { p: [s * 0.9, 0.55, 0], c: C.brassD, mat: "metal" });
      n.add(SHAPE.ball(0.45, 10, 7), { p: [s * 0.95, 0.12, -0.15], s: [1, 0.45, 1.3], c: C.brass, mat: "metal" });
    });
    const CY = 3;
    n.add(SHAPE.cyl(1.75, 1.75, 1.6, 28, 0.2), { p: [0, CY, 0], r: [RX, 0, 0], grad: [0x8a1a20, 0xd8343a], facet: 0.03 });
    n.add(SHAPE.torus(1.72, 0.12, 6, 32), { p: [0, CY, -0.82], c: C.brass, mat: "metal" });
    n.add(SHAPE.torus(1.72, 0.1, 6, 32), { p: [0, CY, 0.82], c: C.brass, mat: "metal" });
    n.add(SHAPE.cyl(1.58, 1.58, 0.04, 28), { p: [0, CY, -0.84], r: [RX, 0, 0], c: 0xfaf3e0, facet: 0 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; n.add(SHAPE.box(0.08, i % 3 ? 0.16 : 0.32, 0.03), { p: [Math.sin(a) * 1.32, CY + Math.cos(a) * 1.32, -0.87], r: [0, 0, -a], c: 0x2a2440 }); }
    eyes(n, { x: 0.55, y: CY + 0.55, z: -0.88, r: 0.28, brow: 0x3a0a10, tilt: 0.55 });
    n.add(SHAPE.torus(0.3, 0.05, 4, 12, Math.PI), { p: [0, CY - 0.75, -0.88], r: [0, 0, 0], c: 0x2a2440 });
    n.node("minute", [0, CY, -0.9], [0, 0, 0], (h) => h.add(SHAPE.box(0.1, 1.25, 0.04), { p: [0, 0.55, 0], c: 0x2a2440 }));
    n.node("hour", [0, CY, -0.93], [0, 0, 0], (h) => h.add(SHAPE.box(0.14, 0.8, 0.04), { p: [0, 0.34, 0], c: C.red }));
    n.add(SHAPE.ball(0.12, 8, 6), { p: [0, CY, -0.96], c: C.brass, mat: "metal" });
    // The glass over the dial, hinged on the left.
    n.node("glass", [-1.62, CY, -0.98], [0, 0, 0], (g) => {
      g.add(SHAPE.cyl(1.6, 1.6, 0.04, 28), { p: [1.62, 0, 0], r: [RX, 0, 0], c: 0xd8f0ff, mat: "glass" });
      g.add(SHAPE.torus(1.62, 0.06, 4, 32), { p: [1.62, 0, 0], c: C.brassL, mat: "metal" });
    });
    n.add(SHAPE.torus(1.8, 0.03, 3, 36), { p: [0, CY, 0], c: C.dreamPink, mat: "glow", glow: 1.5 });
    // Bells and the hammer between them.
    n.node("bells", [0, CY + 1.6, 0], [0, 0, 0], (bl) => {
      bl.both((s) => bl.add(SHAPE.lathe([[0, 0], [0.75, 0], [0.7, 0.2], [0.5, 0.5], [0, 0.62]], 16), { p: [s * 1.0, 0.1, 0], r: [0, 0, -s * 0.55], grad: [C.brassD, C.brassL], mat: "metal" }));
      bl.add(SHAPE.box(0.16, 0.5, 0.16), { p: [0, 0.1, 0], c: C.steel, mat: "metal" });
    });
    n.node("hammer", [0, CY + 1.95, 0], [0, 0, 0], (h) => {
      h.add(SHAPE.box(0.08, 0.6, 0.08), { p: [0, 0.3, 0], c: C.steel, mat: "metal" });
      h.add(SHAPE.ball(0.16, 8, 6), { p: [0, 0.62, 0], c: C.steel, mat: "metal" });
    });
    // The winding key on top: a long shaft and two glowing wings.
    n.node("key", [0, 7, 0], [0, 0, 0], (k) => {
      k.add(SHAPE.cyl(0.1, 0.12, 2.2, 8), { p: [0, -1.1, 0], c: C.brassD, mat: "metal" });
      k.both((s) => k.add(SHAPE.extrude([[0, -0.2], [0.55, -0.4], [0.7, 0], [0.55, 0.4], [0, 0.2]], 0.12, 0.03), { p: [s * 0.05, 0, 0], r: [0, s > 0 ? 0 : Math.PI, 0], c: C.brass, mat: "metal" }));
      k.add(SHAPE.torus(0.62, 0.04, 4, 20), { r: [0, RX, 0], c: C.dreamPink, mat: "glow", glow: 2 });
    });
  });
}

// ── The garden round them ──

// A raised vegetable bed: plank sides, dark soil, a row of cabbages and
// a row of carrot tops.
export function raisedBed(b, { seed = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.box(4, 0.4, 2.4, 0.04), { p: [0, 0.2, 0], grad: [C.woodD, C.wood], facet: 0.06 });
  b.add(SHAPE.box(3.8, 0.06, 2.2), { p: [0, 0.4, 0], c: 0x3e2a1c });
  for (let i = 0; i < 5; i++) {
    b.add(SHAPE.blob(0.24, seed * 7 + i, 0.2, 1), { p: [-1.5 + i * 0.75, 0.55, -0.5], s: [1, 0.75, 1], c: vary(0x7ab85a, rnd, 0.12) });
    for (let k = 0; k < 3; k++) b.add(SHAPE.cone(0.05, 0.28, 3), { p: [-1.6 + i * 0.75 + k * 0.08, 0.55, 0.5], r: [(rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.4], c: 0x4a9a3a });
  }
}

// Joe's shed: plank walls, a green door, a window, a tar-paper roof.
export function shed(b) {
  b.add(SHAPE.box(4, 2.6, 3.4, 0.06), { p: [0, 1.3, 0], grad: [0x7a5a3a, 0xa8805a], facet: 0.05 });
  for (let i = 0; i < 9; i++) b.add(SHAPE.box(0.03, 2.5, 3.42), { p: [-1.85 + i * 0.46, 1.3, 0], c: 0x6a4a2e });
  b.add(SHAPE.box(1, 2, 0.08, 0.03), { p: [0.6, 1.0, -1.72], c: 0x3a7a5a });
  b.add(SHAPE.ball(0.05, 6, 4), { p: [0.25, 1.0, -1.78], c: C.brass, mat: "metal" });
  b.add(SHAPE.box(0.9, 0.7, 0.06), { p: [-1, 1.6, -1.72], c: 0xffe0a0, mat: "glow", glow: 0.7 });
  b.add(SHAPE.box(1, 0.08, 0.1), { p: [-1, 1.6, -1.74], c: C.woodL });
  b.add(SHAPE.box(4.4, 0.6, 3.8, 0.08), { p: [0, 2.9, 0], c: 0x3a4a3a, facet: 0.04 });
}

// A rose bush: a dark green mound dotted with red and pink roses.
export function roseBush(b, { seed = 1 } = {}) {
  const rnd = rng(seed);
  b.add(SHAPE.blob(0.65, seed, 0.25, 1), { p: [0, 0.5, 0], s: [1, 0.8, 1], c: 0x2e6a32 });
  for (let i = 0; i < 9; i++) {
    const a = rnd() * 6.28, u = 0.2 + rnd() * 0.7;
    b.add(SHAPE.ball(0.09, 6, 5), { p: [Math.cos(a) * 0.6 * Math.cos(u * 1.2), 0.5 + Math.sin(u) * 0.45, Math.sin(a) * 0.6 * Math.cos(u * 1.2)], c: [0xd8303a, 0xf07890, 0xffd0d8][i % 3] });
  }
}

// The greenhouse: a low brick base, white frame posts, glass walls and a
// pitched glass roof; a doorway in the east (+x) wall.
export function greenhouse(b, { w = 12, d = 10, h = 4.4 } = {}) {
  const W = w / 2, D = d / 2, wall = h - 1.2, GLASS = 0xd8f0f4, WHITE = 0xf4f4ee;
  const base = (x, z, ww, dd) => b.add(SHAPE.box(ww, 0.45, dd, 0.03), { p: [x, 0.22, z], grad: [0x8a4430, 0xb86a4a] });
  base(0, -D, w, 0.3); base(0, D, w, 0.3); base(-W, 0, 0.3, d);
  base(W, -D / 2 - 0.75, 0.3, D - 1.5); base(W, D / 2 + 0.75, 0.3, D - 1.5);
  const pane = (x, z, ww, dd) => b.add(SHAPE.box(ww, wall - 0.45, dd), { p: [x, 0.45 + (wall - 0.45) / 2, z], c: GLASS, mat: "glass" });
  pane(0, -D, w, 0.05); pane(0, D, w, 0.05); pane(-W, 0, 0.05, d);
  pane(W, -D / 2 - 0.75, 0.05, D - 1.5); pane(W, D / 2 + 0.75, 0.05, D - 1.5);
  for (let x = -W; x <= W + 0.01; x += w / 6) for (const z of [-D, D]) b.add(SHAPE.box(0.1, wall, 0.1), { p: [x, wall / 2, z], c: WHITE });
  for (let z = -D; z <= D + 0.01; z += d / 5) b.add(SHAPE.box(0.1, wall, 0.1), { p: [-W, wall / 2, z], c: WHITE });
  for (const z of [-D, -1.5, 1.5, D]) b.add(SHAPE.box(0.1, wall, 0.1), { p: [W, wall / 2, z], c: WHITE });
  // The roof: two glass slopes on a ridge.
  const slope = Math.atan2(1.2, D), L = Math.hypot(1.2, D);
  for (const s of [-1, 1]) {
    b.add(SHAPE.box(w + 0.2, 0.04, L), { p: [0, wall + 0.6, s * D / 2], r: [s * slope, 0, 0], c: GLASS, mat: "glass" });
    for (let x = -W; x <= W + 0.01; x += w / 6) b.add(SHAPE.box(0.08, 0.08, L), { p: [x, wall + 0.6, s * D / 2], r: [s * slope, 0, 0], c: WHITE });
  }
  b.add(SHAPE.box(w + 0.3, 0.12, 0.12), { p: [0, h, 0], c: WHITE });
  b.add(SHAPE.box(w + 0.1, 0.1, 0.1), { p: [0, wall, -D], c: WHITE }); b.add(SHAPE.box(w + 0.1, 0.1, 0.1), { p: [0, wall, D], c: WHITE });
}

// A terracotta pot with a plant in it (a big one with a shrub).
export function flowerPot(b, { seed = 1, big = false } = {}) {
  const k = big ? 2.2 : 1, rnd = rng(seed);
  b.add(SHAPE.lathe([[0, 0], [0.16 * k, 0], [0.2 * k, 0.3 * k], [0.22 * k, 0.32 * k], [0.22 * k, 0.36 * k], [0.18 * k, 0.36 * k]], 10), { grad: [0x9a4a2a, 0xd0784a] });
  b.add(SHAPE.cyl(0.18 * k, 0.18 * k, 0.02, 10), { p: [0, 0.33 * k, 0], c: 0x3e2a1c });
  if (big) b.add(SHAPE.blob(0.45, seed, 0.25, 1), { p: [0, 1.05, 0], c: vary(0x4a8a3a, rnd, 0.1) });
  else {
    b.add(SHAPE.cyl(0.012, 0.012, 0.25, 4), { p: [0, 0.48, 0], c: 0x3f8a3c });
    b.add(SHAPE.ball(0.07, 6, 4), { p: [0, 0.62, 0], c: [0xff7fa8, 0xfff07a, 0xb58cff, 0xffffff][seed % 4] });
  }
}

// An apple tree: the park's tree, with apples set into the outer surface
// of its canopy (half in the leaves, never inside another clump of them),
// on the sides and underneath, none on top.
export function appleTree(b, { seed = 1 } = {}) {
  const balls = tree(b, { seed, h: 4 });
  const rnd = rng(seed + 50);
  // (The clumps are lumpy and squashed a little: count them as a bit smaller.)
  const R = 0.9;
  let n = 0;
  for (let tries = 0; tries < 400 && n < 14; tries++) {
    const [x, y, z, r] = balls[Math.floor(rnd() * balls.length)];
    const a = rnd() * Math.PI * 2, u = rnd() * 1.1 - 0.75, cu = Math.cos(u);
    const p = [x + Math.cos(a) * cu * r * R, y + Math.sin(u) * r * R, z + Math.sin(a) * cu * r * R];
    if (balls.some(([bx, by, bz, br]) => Math.hypot(p[0] - bx, p[1] - by, p[2] - bz) < br * R - 0.02)) continue;
    b.add(SHAPE.ball(0.15, 7, 5), { p, c: n % 4 ? 0xd8302a : 0xf0c040 });
    n++;
  }
}

// The old signal box: a brick ground floor, a wooden cabin with windows
// all round above it, a pitched roof, a signal arm on a post beside it.
export function signalBox(b) {
  b.add(SHAPE.box(3.4, 2, 3, 0.04), { p: [0, 1, 0], grad: [0x8a4430, 0xb86a4a], facet: 0.05 });
  b.add(SHAPE.box(3.6, 1.8, 3.2, 0.05), { p: [0, 2.9, 0], c: 0x7a9a6a, facet: 0.05 });
  for (const s of [-1, 1]) b.add(SHAPE.box(3.0, 0.9, 0.06), { p: [0, 3.0, s * 1.62], c: 0xffe0a0, mat: "glow", glow: 0.6 });
  b.add(SHAPE.box(0.06, 0.9, 2.6), { p: [1.82, 3.0, 0], c: 0xffe0a0, mat: "glow", glow: 0.6 });
  for (const s of [-1, 1]) b.add(SHAPE.box(4, 0.08, 2.2), { p: [0, 4.2, s * 0.9], r: [s * 0.5, 0, 0], c: 0x5a3a2a });
  b.add(SHAPE.box(1.8, 0.4, 0.08), { p: [0, 1.6, -1.53], c: C.cream });
  b.add(SHAPE.cyl(0.07, 0.09, 5, 6), { p: [2.6, 2.5, 0], c: 0x3a3a44, mat: "metal" });
  b.add(SHAPE.box(1.2, 0.22, 0.06), { p: [3.0, 4.5, 0], r: [0, 0, -0.5], c: 0xd8302a });
  b.add(SHAPE.box(0.25, 0.06, 0.07), { p: [3.3, 4.32, 0], r: [0, 0, -0.5], c: C.white });
}

// The station house along the platform: brick, a slate roof, doors and
// windows, a canopy over the platform on iron brackets, the name board,
// and the old station clock hanging under the canopy.
export function stationHouse(b) {
  b.add(SHAPE.box(22, 4.2, 4.4, 0.06), { p: [0, 2.1, 0], grad: [0x8a4430, 0xc0745a], facet: 0.03 });
  b.add(SHAPE.box(22.6, 0.3, 4.8, 0.06), { p: [0, 4.3, 0], c: 0xe8dcc0 });
  for (const s of [-1, 1]) b.add(SHAPE.box(22.8, 0.12, 2.9), { p: [0, 5.2, s * 1.2], r: [s * 0.6, 0, 0], c: 0x4a4a5a });
  for (let i = 0; i < 7; i++) {
    const x = -9 + i * 3;
    if (i === 3) { b.add(SHAPE.box(1.6, 2.6, 0.1), { p: [x, 1.3, 2.22], c: 0x2a4a6a }); continue; }
    b.add(SHAPE.box(1.3, 1.6, 0.08), { p: [x, 2.2, 2.22], c: 0xffe0a0, mat: "glow", glow: 0.55 });
    b.add(SHAPE.box(1.5, 0.14, 0.16), { p: [x, 1.35, 2.25], c: 0xe8dcc0 });
  }
  // The canopy over the platform (south, +z), on brackets from the wall.
  b.add(SHAPE.box(22, 0.18, 3.6), { p: [0, 4.0, 4.0], r: [-0.08, 0, 0], c: 0x3a5a4a });
  for (let x = -10; x <= 10.01; x += 4) b.add(SHAPE.box(0.12, 0.12, 2.8), { p: [x, 3.55, 3.4], r: [0.35, 0, 0], c: 0x2a3a34, mat: "metal" });
  for (let x = -10.8; x <= 10.81; x += 0.6) b.add(SHAPE.box(0.36, 0.22, 0.04), { p: [x, 3.82, 5.8], c: 0xf4ecd8 });
  // MILLBROOK.
  b.add(SHAPE.box(5.2, 0.8, 0.12), { p: [0, 3.3, 2.26], c: 0x1a3a5a });
  for (let i = 0; i < 9; i++) b.add(SHAPE.box(0.32, 0.46, 0.04), { p: [-2.1 + i * 0.52, 3.3, 2.33], c: C.white, facet: 0 });
  // The station clock, hanging from the canopy.
  b.add(SHAPE.cyl(0.03, 0.03, 0.6, 5), { p: [5, 3.5, 4.4], c: 0x2a2a30 });
  b.add(SHAPE.cyl(0.5, 0.5, 0.2, 18, 0.04), { p: [5, 2.9, 4.4], r: [RX, 0, 0], c: 0x2a2a30 });
  for (const s of [-1, 1]) b.add(SHAPE.cyl(0.42, 0.42, 0.02, 18), { p: [5, 2.9, 4.4 + s * 0.11], r: [RX, 0, 0], c: 0xfaf3e0, facet: 0 });
}

// ── Joe's memories, inside their bubbles ──
export function gardenMemory(n, item) {
  if (item === "watch") {
    n.add(SHAPE.cyl(0.13, 0.13, 0.04, 16, 0.01), { r: [RX, 0, 0], c: C.brass, mat: "metal" });
    n.add(SHAPE.cyl(0.11, 0.11, 0.01, 16), { p: [0, 0, -0.022], r: [RX, 0, 0], c: 0xfaf3e0, facet: 0 });
    n.add(SHAPE.box(0.012, 0.08, 0.005), { p: [0, 0.03, -0.03], c: C.black });
    n.add(SHAPE.box(0.05, 0.012, 0.005), { p: [0.02, 0, -0.03], c: C.black });
    n.add(SHAPE.torus(0.03, 0.01, 4, 8), { p: [0, 0.16, 0], c: C.brass, mat: "metal" });
    for (let i = 0; i < 5; i++) n.add(SHAPE.torus(0.018, 0.006, 3, 6), { p: [0.03 + i * 0.03, 0.2 + Math.sin(i) * 0.02, 0], r: [0, i % 2 ? RX : 0, 0], c: C.brassL, mat: "metal" });
    return true;
  }
  if (item === "seeds") {
    n.add(SHAPE.box(0.24, 0.16, 0.08, 0.015), { c: 0x6a9a7a, mat: "metal" });
    n.add(SHAPE.box(0.16, 0.08, 0.005), { p: [0, 0, -0.043], c: C.paper, facet: 0 });
    for (let i = 0; i < 2; i++) n.add(SHAPE.box(0.12 - i * 0.03, 0.008, 0.006), { p: [-0.01, 0.015 - i * 0.03, -0.046], c: 0x3a5aa0, facet: 0 });
    return true;
  }
  if (item === "hat") {
    n.add(SHAPE.lathe([[0, 0.1], [0.08, 0.1], [0.1, 0.02], [0.24, 0.0], [0.26, -0.01], [0, -0.01]], 16), { c: 0xe8cf8a, facet: 0.08 });
    n.add(SHAPE.torus(0.095, 0.018, 4, 14), { p: [0, 0.03, 0], r: [RX, 0, 0], c: 0xf07890 });
    return true;
  }
  if (item === "ticket") {
    n.add(SHAPE.box(0.26, 0.13, 0.008), { r: [0, 0, 0.12], c: 0xf0e4c0, facet: 0 });
    n.add(SHAPE.box(0.26, 0.03, 0.01), { p: [0, 0.03, -0.002], r: [0, 0, 0.12], c: 0xc0303a, facet: 0 });
    n.add(SHAPE.cyl(0.015, 0.015, 0.012, 8), { p: [0.08, -0.03, -0.004], r: [RX, 0, 0], c: 0x3a2a20 });
    return true;
  }
  if (item === "cutting") {
    n.add(SHAPE.cyl(0.07, 0.06, 0.16, 10), { p: [0, -0.06, 0], c: 0xd8f0ff, mat: "glass" });
    n.add(SHAPE.cyl(0.06, 0.055, 0.1, 10), { p: [0, -0.09, 0], c: 0x9fd0f0, mat: "glow", glow: 0.6 });
    n.add(SHAPE.cyl(0.008, 0.008, 0.28, 4), { p: [0, 0.06, 0], c: 0x2e6a32 });
    n.add(SHAPE.ball(0.04, 6, 4), { p: [0.03, 0.06, 0], s: [1, 0.3, 0.6], c: 0x4a9a3a });
    n.add(SHAPE.ball(0.045, 7, 5), { p: [0, 0.21, 0], s: [0.8, 1.1, 0.8], c: 0xd8303a });
    return true;
  }
  return false;
}
