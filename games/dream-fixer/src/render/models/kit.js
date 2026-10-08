import { SHAPE } from "../modelkit.js";
import { C } from "../palette.js";

// ── Workbench goods ──────────────────────────────────────────────────────
// What the bench's preview turns round: the kit you carry into a dream and
// the things that stand for your own upgrades. Small, standing on y = 0.

const RX = Math.PI / 2;

function mug(b, { body, bodyD, liquid, h = 0.16, r = 0.08 }) {
  b.add(SHAPE.lathe([[0, 0], [r - 0.006, 0], [r, 0.008], [r + 0.003, h * 0.5], [r, h], [r - 0.008, h + 0.004]], 16), { grad: [bodyD, body], facet: 0.03 });
  b.add(SHAPE.cyl(r - 0.01, r - 0.01, 0.006, 16), { p: [0, h - 0.008, 0], c: liquid, facet: 0 });
  b.add(SHAPE.torus(h * 0.28, 0.013, 6, 12, Math.PI), { p: [r - 0.002, h * 0.52, 0], r: [0, 0, -RX], c: body });
}

export function mugCoffee(b) {
  mug(b, { body: C.cream, bodyD: 0xc8b48c, liquid: 0x4a2a16 });
  b.add(SHAPE.cyl(0.0835, 0.0835, 0.022, 16), { p: [0, 0.1, 0], c: C.teal });
  // A wisp of dreamy steam.
  for (let i = 0; i < 3; i++) b.add(SHAPE.ball(0.014 - i * 0.003, 6, 4), { p: [Math.sin(i * 2) * 0.02, 0.2 + i * 0.035, 0], c: C.dream, mat: "glow", glow: 1.2 });
}

export function mugCocoa(b) {
  mug(b, { body: 0xff9ac0, bodyD: 0xc05a7a, liquid: 0x7a4026 });
  // Marshmallows bobbing on top.
  for (const [x, z, a] of [[-0.03, 0.01, 0.3], [0.025, -0.02, 1.1], [0.01, 0.035, 2]])
    b.add(SHAPE.box(0.028, 0.022, 0.028, 0.006), { p: [x, 0.162, z], r: [0, a, 0.2], c: C.white });
  b.add(SHAPE.ball(0.012, 6, 4), { p: [0.035, 0.3 - 0.1, 0.03], c: C.dreamPink, mat: "glow", glow: 1.4 });
}

export function espresso(b) {
  b.add(SHAPE.cyl(0.085, 0.07, 0.014, 18, 0.004), { p: [0, 0.007, 0], c: C.white, facet: 0.02 });
  b.at([0, 0.014, 0], null, 1, () => mug(b, { body: C.white, bodyD: 0xd8d4c8, liquid: 0xb8763a, h: 0.07, r: 0.045 }));
  b.add(SHAPE.cyl(0.046, 0.046, 0.012, 16), { p: [0, 0.03, 0], c: C.copper, mat: "metal" });
  // A lightning sticker: it is a double.
  b.add(SHAPE.box(0.012, 0.03, 0.004), { p: [0, 0.055, -0.047], r: [0, 0, 0.5], c: C.dreamGold, mat: "glow", glow: 1.4 });
}

export function pillowBomb(b) {
  // A plump pillow tied up with a ribbon, a dream fuse on top.
  b.add(SHAPE.box(0.46, 0.15, 0.32, 0.07), { p: [0, 0.1, 0], grad: [0xd8c8ff, 0xfaf6ff], facet: 0.04 });
  b.both((s) => b.both((t) => b.add(SHAPE.cone(0.025, 0.05, 6), { p: [s * 0.225, 0.1, t * 0.15], r: [t * 0.6, 0, -s * 1.3], c: 0xf0e8ff })));
  // The ribbon round its middle, tied in a bow on top.
  b.add(SHAPE.box(0.03, 0.158, 0.328, 0.01), { p: [0, 0.1, 0], c: C.dreamPink });
  b.both((s) => b.add(SHAPE.torus(0.03, 0.01, 4, 10), { p: [s * 0.03, 0.2, 0], r: [0, 0, s * 0.6], s: [1, 0.7, 1], c: C.dreamPink }));
  b.add(SHAPE.cyl(0.006, 0.006, 0.07, 5), { p: [0.02, 0.23, 0], r: [0, 0, -0.4], c: C.brassD });
  b.add(SHAPE.ball(0.016, 6, 4), { p: [0.035, 0.265, 0], c: C.dreamGold, mat: "glow", glow: 2.4 });
}

export function vest(b) {
  // A padded night-shift vest: quilted rows in two front panels that part
  // into a V at the neck, straps over the shoulders, a brass zip.
  const W = [0.38, 0.38, 0.35, 0.3], GAP = [0, 0.005, 0.035, 0.07];
  for (let i = 0; i < 4; i++) b.both((s) => {
    const w = W[i] / 2 - GAP[i];
    b.add(SHAPE.box(w, 0.1, 0.12, 0.022), { p: [s * (GAP[i] + w / 2), 0.07 + i * 0.09, -0.04], c: i % 2 ? C.overall : 0x4a6fa4, facet: 0.06 });
  });
  b.add(SHAPE.box(0.36, 0.36, 0.1, 0.03), { p: [0, 0.2, 0.05], c: C.overallD });
  b.both((s) => b.add(SHAPE.box(0.06, 0.07, 0.18, 0.025), { p: [s * 0.115, 0.42, 0], c: C.overallD }));
  b.add(SHAPE.box(0.01, 0.2, 0.01), { p: [0, 0.13, -0.101], c: C.brass, mat: "metal" });
  b.add(SHAPE.box(0.024, 0.034, 0.012, 0.004), { p: [0, 0.23, -0.108], c: C.brassL, mat: "metal" });
  b.add(SHAPE.box(0.05, 0.035, 0.008), { p: [-0.1, 0.3, -0.102], c: C.dreamGold, mat: "glow", glow: 1.2 });
}

export function balloon(b) {
  b.add(SHAPE.ball(0.15, 14, 10), { p: [0, 0.42, 0], s: [1, 1.15, 1], grad: [0xd04a8a, C.dreamPink], facet: 0.02, smooth: true });
  b.add(SHAPE.cone(0.025, 0.04, 6), { p: [0, 0.255, 0], c: 0xd04a8a });
  for (let i = 0; i < 4; i++) b.add(SHAPE.cyl(0.003, 0.003, 0.07, 4), { p: [Math.sin(i * 1.7) * 0.012, 0.2 - i * 0.065, 0], r: [0, 0, Math.sin(i * 1.7 + 1) * 0.3], c: C.white });
  b.add(SHAPE.ball(0.03, 8, 6), { p: [-0.05, 0.5, -0.11], c: C.white, mat: "glow", glow: 0.9 });
}

export function slipper(b) {
  // A fluffy slipper with a pompom: quieter, quicker feet.
  b.add(SHAPE.box(0.13, 0.03, 0.3, 0.014), { p: [0, 0.015, 0], c: C.cream });
  b.add(SHAPE.ball(0.075, 12, 8), { p: [0, 0.03, -0.05], s: [0.9, 0.8, 1.35], c: 0xc9a0ff, facet: 0.06 });
  b.add(SHAPE.box(0.13, 0.04, 0.012, 0.005), { p: [0, 0.05, 0.145], c: 0xb088f0 });
  b.both((s) => b.add(SHAPE.box(0.012, 0.04, 0.12, 0.005), { p: [s * 0.06, 0.05, 0.09], c: 0xb088f0 }));
  b.add(SHAPE.ball(0.03, 10, 7), { p: [0, 0.1, -0.1], c: C.white, facet: 0.1 });
}

export function magnet(b) {
  b.add(SHAPE.torus(0.09, 0.035, 8, 16, Math.PI), { p: [0, 0.2, 0], c: C.red });
  b.both((s) => {
    b.add(SHAPE.cyl(0.035, 0.035, 0.09, 8), { p: [s * 0.09, 0.155, 0], c: C.red });
    b.add(SHAPE.cyl(0.036, 0.036, 0.05, 8), { p: [s * 0.09, 0.085, 0], c: C.steel, mat: "metal" });
  });
  for (let i = 0; i < 4; i++) b.add(SHAPE.ball(0.012, 6, 4), { p: [-0.06 + i * 0.04, 0.025 + (i % 2) * 0.02, 0], c: C.dreamGold, mat: "glow", glow: 2 });
}

export function sieve(b) {
  // A brass sieve with dream dust caught in it.
  b.at([0, 0.05, 0], null, 1, () => {
    b.add(SHAPE.lathe([[0, 0], [0.09, 0.008], [0.15, 0.06], [0.16, 0.075]], 16), { c: C.steel, mat: "metal" });
    b.add(SHAPE.torus(0.16, 0.009, 5, 18), { p: [0, 0.075, 0], r: [RX, 0, 0], c: C.brass, mat: "metal" });
    b.add(SHAPE.box(0.3, 0.02, 0.04, 0.008), { p: [0.3, 0.07, 0], c: C.woodL });
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, r = 0.03 + (i % 3) * 0.035;
      b.add(SHAPE.ball(0.013, 6, 4), { p: [Math.cos(a) * r, 0.03 + r * 0.25, Math.sin(a) * r], c: i % 3 ? C.dreamGold : C.dream, mat: "glow", glow: 2 });
    }
  });
}

export function pouch(b) {
  // A leather tool pouch on a strap: bigger pockets, more kit.
  b.add(SHAPE.box(0.3, 0.035, 0.012), { p: [0, 0.2, 0.056], c: C.woodD });
  b.add(SHAPE.box(0.22, 0.22, 0.1, 0.03), { p: [0, 0.11, 0], grad: [C.wood, C.woodL], facet: 0.07 });
  b.add(SHAPE.box(0.226, 0.02, 0.108, 0.008), { p: [0, 0.225, 0], c: C.woodD });
  b.add(SHAPE.box(0.226, 0.075, 0.014, 0.006), { p: [0, 0.195, -0.054], c: C.woodD });
  b.add(SHAPE.box(0.034, 0.03, 0.012, 0.005), { p: [0, 0.165, -0.062], c: C.brass, mat: "metal" });
  b.add(SHAPE.ball(0.02, 6, 4), { p: [0.07, 0.25, 0], c: C.dreamGold, mat: "glow", glow: 2 });
}
