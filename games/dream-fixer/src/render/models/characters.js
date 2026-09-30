import { SHAPE, rng, vary, mix } from "../modelkit.js";
import { C } from "../palette.js";

// ── Characters ───────────────────────────────────────────────────────────
// Origin at the feet (or, for fliers, the centre of the body); they face −z.

const RX = Math.PI / 2;

// Csavar, the little workshop robot who flies along into the dreams.
// Nodes: "body" (bob), "prop" (spins), "armL"/"armR", "eye" (looks around).
export function csavar(b) {
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    // Round brass shell with a copper belt.
    n.add(SHAPE.ball(0.2, 14, 10), { s: [1, 0.92, 1], grad: [C.brassD, C.brassL], mat: "metal", facet: 0.03 });
    n.add(SHAPE.torus(0.2, 0.024, 6, 20), { r: [RX, 0, 0], c: C.copper, mat: "metal" });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      n.add(SHAPE.ball(0.009, 6, 4), { p: [Math.sin(a) * 0.222, 0, Math.cos(a) * 0.222], c: C.brassL, mat: "metal" });
    }
    // The big eye: iron socket, glowing iris, dark pupil, glass lens.
    n.add(SHAPE.cyl(0.12, 0.13, 0.06, 16, 0.012), { p: [0, 0.02, -0.17], r: [RX, 0, 0], c: C.iron, mat: "metal" });
    n.node("eye", [0, 0.02, -0.2], [0, 0, 0], (e) => {
      e.add(SHAPE.cyl(0.095, 0.095, 0.01, 18), { r: [RX, 0, 0], c: C.tealD, facet: 0 });
      e.add(SHAPE.torus(0.062, 0.018, 6, 18), { p: [0, 0, -0.006], c: C.dream, mat: "glow", glow: 2.2 });
      e.add(SHAPE.cyl(0.036, 0.036, 0.012, 14), { p: [0, 0, -0.008], r: [RX, 0, 0], c: C.black, facet: 0 });
      e.add(SHAPE.ball(0.012, 6, 4), { p: [0.022, 0.024, -0.014], c: 0xffffff, mat: "glow", glow: 1.4 });
    });
    n.add(SHAPE.ball(0.1, 12, 6), { p: [0, 0.02, -0.215], s: [1, 1, 0.35], c: 0xdaf8ff, mat: "glass", smooth: true });
    // Eyelid visor and two bolts on the cheeks.
    n.add(SHAPE.torus(0.135, 0.02, 5, 14, Math.PI), { p: [0, 0.03, -0.17], c: C.copper, mat: "metal" });
    n.both((s) => n.add(SHAPE.cyl(0.02, 0.02, 0.02, 6), { p: [s * 0.19, -0.02, -0.07], r: [0, 0, RX], c: C.iron, mat: "metal" }));
    // Antenna with a glowing tip.
    n.add(SHAPE.cyl(0.005, 0.007, 0.14, 6), { p: [0.1, 0.23, 0.04], r: [0, 0, -0.35], c: C.iron, mat: "metal" });
    n.add(SHAPE.ball(0.02, 8, 6), { p: [0.126, 0.3, 0.04], c: C.dreamPink, mat: "glow", glow: 2 });
    // Rotor hub and the propeller.
    n.add(SHAPE.cyl(0.035, 0.05, 0.04, 10, 0.008), { p: [0, 0.19, 0], c: C.iron, mat: "metal" });
    n.node("prop", [0, 0.23, 0], [0, 0, 0], (p) => {
      p.add(SHAPE.cyl(0.012, 0.012, 0.05, 8), { c: C.brass, mat: "metal" });
      p.both((s) => p.add(SHAPE.box(0.2, 0.008, 0.045, 0.004), { p: [s * 0.1, 0.02, 0], r: [s * 0.25, 0, 0], c: C.red, facet: 0.03 }));
    });
    // Thruster underneath.
    n.add(SHAPE.lathe([[0.03, 0], [0.06, -0.02], [0.065, -0.06], [0.05, -0.07]], 12), { p: [0, -0.16, 0], c: C.iron, mat: "metal" });
    n.add(SHAPE.cyl(0.04, 0.02, 0.02, 10), { p: [0, -0.235, 0], c: C.dream, mat: "glow", glow: 2.4 });
    // Little arms with pincers.
    for (const [name, s] of [["armL", -1], ["armR", 1]]) {
      n.node(name, [s * 0.19, -0.04, 0], [0, 0, s * -0.4], (a) => {
        a.add(SHAPE.ball(0.03, 8, 6), { c: C.iron, mat: "metal" });
        a.add(SHAPE.capsule(0.016, 0.08, 6, 2), { p: [s * 0.012, -0.06, 0], c: C.copper, mat: "metal" });
        a.both((k) => a.add(SHAPE.box(0.01, 0.04, 0.012, 0.003), { p: [s * 0.012 + k * 0.012, -0.13, 0], r: [0, 0, k * 0.3], c: C.brass, mat: "metal" }));
      });
    }
  });
}

// A Kóc of Morzsa's park: in a dog's dream the glitches come out as
// squirrels, the one thing a dog chases every day, and here they chase
// back. Tangled, with a strand of glowing pink yarn wound round them (the
// glitch) and an acorn to throw a fit with. Nodes: "body" (bounce), "tail"
// (swish), "eyes".
export function kocPark(b) {
  const FUR = [0xa8541f, 0xd97a36], FUR_L = 0xe89a5a, CREAM = 0xf6dcb4, DARK = 0x6a3414;
  b.node("body", [0, 0.36, 0], [0, 0, 0], (n) => {
    // Pear-shaped body sitting up, cream belly.
    n.add(SHAPE.ball(0.24, 12, 9), { p: [0, 0.02, 0.02], s: [1, 1.2, 1.05], grad: FUR, facet: 0.06 });
    n.add(SHAPE.ball(0.18, 10, 8), { p: [0, 0.0, -0.13], s: [0.95, 1.15, 0.6], c: CREAM, facet: 0.04 });
    // Head with a short snout, puffed cheeks and a dark nose.
    n.add(SHAPE.ball(0.2, 12, 9), { p: [0, 0.36, -0.06], s: [1, 0.95, 1], grad: FUR, facet: 0.05 });
    n.add(SHAPE.ball(0.1, 10, 7), { p: [0, 0.3, -0.24], s: [1, 0.8, 1.1], c: CREAM });
    n.both((s) => n.add(SHAPE.ball(0.085, 8, 6), { p: [s * 0.12, 0.28, -0.18], c: CREAM }));
    n.add(SHAPE.ball(0.035, 8, 6), { p: [0, 0.33, -0.34], s: [1.3, 1, 1], c: 0x3a1a10 });
    // Two big front teeth.
    n.both((s) => n.add(SHAPE.box(0.03, 0.05, 0.015, 0.005), { p: [s * 0.017, 0.215, -0.31], c: C.white, facet: 0 }));
    // Ears with tufts.
    n.both((s) => {
      n.add(SHAPE.cone(0.06, 0.16, 5), { p: [s * 0.12, 0.55, -0.02], r: [0, 0, -s * 0.25], grad: FUR });
      n.add(SHAPE.cone(0.03, 0.12, 4), { p: [s * 0.135, 0.66, -0.02], r: [0, 0, -s * 0.35], c: DARK });
    });
    n.node("eyes", [0, 0.42, -0.2], [0, 0, 0], (e) => {
      e.both((s) => {
        e.add(SHAPE.ball(0.068, 10, 7), { p: [s * 0.085, 0, 0], s: [1, 1.15, 0.6], c: C.white, facet: 0.02 });
        e.add(SHAPE.ball(0.036, 8, 6), { p: [s * 0.075, -0.01, -0.035], s: [1, 1, 0.5], c: C.black, facet: 0 });
        e.add(SHAPE.ball(0.011, 6, 4), { p: [s * 0.066, 0.008, -0.052], c: 0xffffff, mat: "glow", glow: 1.2 });
        // The cross brows: this squirrel means business.
        e.add(SHAPE.box(0.1, 0.024, 0.025, 0.008), { p: [s * 0.085, 0.085, -0.02], r: [0, 0, s * 0.45], c: DARK });
      });
    });
    // Front paws clutching an acorn.
    n.both((s) => n.add(SHAPE.capsule(0.035, 0.08, 6, 2), { p: [s * 0.1, 0.12, -0.2], r: [-1.1, 0, s * 0.4], c: FUR[1] }));
    n.add(SHAPE.ball(0.06, 8, 6), { p: [0, 0.09, -0.27], s: [1, 1.2, 1], c: 0x9a6a3a });
    n.add(SHAPE.ball(0.055, 8, 5), { p: [0, 0.15, -0.27], s: [1.1, 0.55, 1.1], c: 0x5a3a1a });
    // Hind feet.
    n.both((s) => n.add(SHAPE.ball(0.08, 8, 6), { p: [s * 0.13, -0.3, -0.06], s: [1, 0.5, 1.6], c: FUR[0] }));
    // The glitch: a strand of glowing pink yarn wound round it, and a stitch.
    n.add(SHAPE.torus(0.27, 0.014, 4, 22), { p: [0, 0.03, 0.02], r: [1.2, 0.3, 0.4], c: C.dreamPink, mat: "glow", glow: 1.5 });
    n.add(SHAPE.torus(0.25, 0.012, 4, 22), { p: [0, 0.08, 0.02], r: [1.9, -0.5, 0], c: C.dreamPink, mat: "glow", glow: 1.3 });
    for (let i = 0; i < 3; i++) n.add(SHAPE.box(0.012, 0.05, 0.012), { p: [0.1 + i * 0.03, 0.44, -0.12], r: [0, 0, 0.4], c: C.dreamPink, mat: "glow", glow: 1.2 });
  });
  // The tail: a huge bushy S curling up behind, lighter towards the tip.
  b.node("tail", [0, 0.3, 0.24], [0, 0, 0], (t) => {
    const pts = [[0, 0, 0, 0.1], [0, 0.14, 0.12, 0.15], [0, 0.36, 0.18, 0.2], [0, 0.6, 0.12, 0.21], [0, 0.78, -0.02, 0.18], [0, 0.84, -0.18, 0.13]];
    pts.forEach(([x, y, z, r], i) => {
      const k = i / (pts.length - 1);
      t.add(SHAPE.blob(r, 50 + i, 0.1, 1), { p: [x, y, z], s: [0.8, 1, 1], grad: [mix(FUR[0], FUR[1], k * 0.6), mix(FUR[1], FUR_L, k)], facet: 0.1 });
    });
    t.add(SHAPE.torus(0.19, 0.012, 4, 18), { p: [0, 0.5, 0.15], r: [0.4, 1.4, 0], c: C.dreamPink, mat: "glow", glow: 1.2 });
  });
}

// A Zizegő of the park: a fat, cross bumblebee knitted from yarn. Built
// round its centre. Nodes: "body" (bob), "wingL"/"wingR" (buzz), "mouth"
// (swells before it spits).
export function buzzerPark(b) {
  const YEL_L = 0xffe08a, BRN = 0x5a3620;
  b.node("body", [0, 0, 0], [0, 0, 0], (n) => {
    // Abdomen along z with knitted stripes.
    n.add(SHAPE.ball(0.3, 12, 9), { p: [0, 0, 0.12], s: [1, 0.95, 1.2], grad: [0xd8a032, YEL_L], facet: 0.08 });
    for (const [z, r] of [[-0.02, 0.29], [0.14, 0.33], [0.3, 0.26]]) n.add(SHAPE.torus(r, 0.045, 5, 16), { p: [0, 0, z], c: BRN, facet: 0.1 });
    n.add(SHAPE.cone(0.06, 0.18, 6), { p: [0, -0.02, 0.52], r: [RX, 0, 0], c: BRN });
    // Head.
    n.add(SHAPE.ball(0.21, 10, 8), { p: [0, 0.04, -0.28], grad: [BRN, 0x7a4a2a], facet: 0.06 });
    n.both((s) => {
      n.add(SHAPE.ball(0.085, 10, 7), { p: [s * 0.09, 0.08, -0.43], s: [1, 1.1, 0.6], c: C.white, facet: 0.02 });
      n.add(SHAPE.ball(0.042, 8, 6), { p: [s * 0.08, 0.07, -0.48], s: [1, 1, 0.5], c: C.black, facet: 0 });
      n.add(SHAPE.ball(0.012, 6, 4), { p: [s * 0.07, 0.09, -0.5], c: 0xffffff, mat: "glow", glow: 1.2 });
      n.add(SHAPE.box(0.11, 0.025, 0.03, 0.01), { p: [s * 0.09, 0.18, -0.45], r: [0, 0, s * 0.45], c: 0x2a1a10 });
      // Antennae with pompoms.
      n.add(SHAPE.cyl(0.008, 0.01, 0.18, 5), { p: [s * 0.08, 0.26, -0.3], r: [-0.4, 0, -s * 0.35], c: BRN });
      n.add(SHAPE.ball(0.035, 8, 6), { p: [s * 0.115, 0.34, -0.36], c: C.dreamPink });
      // Legs dangling.
      for (let i = 0; i < 2; i++) n.add(SHAPE.cyl(0.015, 0.012, 0.16, 5), { p: [s * 0.12, -0.26, -0.05 + i * 0.16], r: [0.3, 0, s * 0.3], c: BRN });
    });
    n.node("mouth", [0, -0.05, -0.47], [0, 0, 0], (m) => {
      m.add(SHAPE.cyl(0.05, 0.035, 0.06, 8), { r: [RX, 0, 0], c: 0x2a1a10 });
      m.add(SHAPE.ball(0.03, 6, 5), { p: [0, 0, -0.03], c: C.dreamPink, mat: "glow", glow: 1.8 });
    });
  });
  for (const [name, s] of [["wingL", -1], ["wingR", 1]]) {
    b.node(name, [s * 0.1, 0.22, -0.02], [0, 0, 0], (w) => {
      w.add(SHAPE.ball(0.2, 8, 6), { p: [s * 0.2, 0.06, 0.04], s: [1, 0.12, 0.55], r: [0, s * 0.3, s * 0.25], c: 0xe8fbff, mat: "glass", smooth: true });
      w.add(SHAPE.torus(0.2, 0.008, 3, 14), { p: [s * 0.2, 0.06, 0.04], s: [1, 0.55, 1], r: [RX, s * 0.3, s * 0.25], c: 0xffffff, facet: 0 });
    });
  }
}

// A Csomó of the park: a tangled heap of yarn round a pink glowing heart
// that keeps knotting out new fuzzes. Nodes: "core" (pulses), "heap".
export function knotPark(b, { seed = 5 } = {}) {
  const rnd = rng(seed);
  const cols = [0xc8743a, 0xe8a060, 0x93502a, 0xb85a3a];
  b.node("heap", [0, 0, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.blob(0.85, 31, 0.1, 1), { p: [0, 0.55, 0], s: [1.15, 0.8, 1.15], grad: [0x7a4428, 0xc07a48], facet: 0.12 });
    for (let i = 0; i < 16; i++) {
      const r = [rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI];
      const R = 0.55 + rnd() * 0.4;
      n.add(SHAPE.torus(R, 0.035 + rnd() * 0.02, 4, 18), { p: [(rnd() - 0.5) * 0.4, 0.55 + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.4], r, s: [1, 0.8, 1], c: vary(cols[i % 4], rnd, 0.08), facet: 0.12 });
    }
    // Loose ends sticking up like thorns.
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2, y = 0.5 + rnd() * 0.5;
      n.add(SHAPE.cone(0.05, 0.4 + rnd() * 0.3, 4), { p: [Math.cos(a) * 0.75, y, Math.sin(a) * 0.75], r: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], c: cols[i % 4] });
    }
    // Two sleepy-angry eyes peering out of the tangle.
    n.both((s) => {
      n.add(SHAPE.ball(0.14, 10, 7), { p: [s * 0.24, 0.82, -0.9], s: [1, 0.8, 0.5], c: C.white, facet: 0.02 });
      n.add(SHAPE.ball(0.07, 8, 6), { p: [s * 0.22, 0.79, -0.96], s: [1, 1, 0.5], c: C.black, facet: 0 });
      n.add(SHAPE.ball(0.02, 6, 4), { p: [s * 0.2, 0.82, -0.99], c: 0xffffff, mat: "glow", glow: 1.2 });
      n.add(SHAPE.box(0.24, 0.05, 0.05, 0.015), { p: [s * 0.24, 0.97, -0.9], r: [0, 0, s * 0.35], c: 0x4a2412 });
    });
  });
  // The heart shows through a gap in the tangle, below the eyes.
  b.node("core", [0, 0.42, -0.82], [0, 0, 0], (c) => {
    c.add(SHAPE.sphere(0.24, 1), { c: C.dreamPink, mat: "glow", glow: 1.6, facet: 0.15 });
    c.add(SHAPE.torus(0.27, 0.04, 4, 14), { c: 0x6a3a22 });
  });
}

// A dust bunny (Porcica): a grey fluffball with long floppy ears, the
// Vacuum Cleaner's own little pests. They come in packs. Nodes: "body",
// "ears", "eyes".
export function bunnyPark(b) {
  const GREY = [0x7a7684, 0xc4c0cc];
  b.node("body", [0, 0.22, 0], [0, 0, 0], (n) => {
    n.add(SHAPE.blob(0.2, 61, 0.16, 1), { s: [1, 0.9, 1], grad: GREY, facet: 0.14 });
    // Lint caught in the fluff.
    const bits = [[0.12, 0.1, -0.1, 0xff8fb8], [-0.14, 0.05, 0.02, 0x7ab8ff], [0.05, 0.16, 0.08, 0xffe08a]];
    for (const [x, y, z, c] of bits) n.add(SHAPE.box(0.08, 0.012, 0.012), { p: [x, y, z], r: [x * 5, y * 5, z * 5], c });
    n.add(SHAPE.blob(0.07, 63, 0.2, 0), { p: [0, -0.02, 0.19], c: GREY[1] });
    n.node("eyes", [0, 0.04, -0.17], [0, 0, 0], (e) => {
      e.both((s) => {
        e.add(SHAPE.ball(0.055, 8, 6), { p: [s * 0.065, 0, 0], s: [1, 1, 0.5], c: C.white, facet: 0 });
        e.add(SHAPE.ball(0.03, 8, 6), { p: [s * 0.058, -0.012, -0.024], s: [1, 1, 0.5], c: C.black, facet: 0 });
        // Heavy lids: sleepy and grumpy.
        e.add(SHAPE.box(0.08, 0.03, 0.03, 0.01), { p: [s * 0.065, 0.035, -0.01], r: [0, 0, s * 0.2], c: GREY[0] });
      });
      e.add(SHAPE.ball(0.02, 6, 4), { p: [0, -0.05, -0.02], c: 0xff8fb8 });
    });
    n.node("ears", [0, 0.16, 0], [0, 0, 0], (e) => {
      e.both((s) => e.add(SHAPE.capsule(0.035, 0.2, 6, 2), { p: [s * 0.07, 0.12, 0.02], r: [0.35, 0, -s * 0.35], grad: GREY }));
    });
    n.both((s) => n.add(SHAPE.ball(0.05, 6, 5), { p: [s * 0.1, -0.18, -0.06], s: [1, 0.5, 1.4], c: GREY[0] }));
  });
}

// A bathtub (Fürdőkád): every dog knows what a tub means. It waddles on
// brass claw feet, a rubber duck riding the rim, and lobs soap bubbles out
// of its shower head. Nodes: "body", "shower", "mouth", "legFL" … "legBR".
export function tubPark(b) {
  const ENAMEL = [0xc8d8e8, 0xfafcff];
  for (const [name, x, z] of [["legFL", -0.62, -0.28], ["legFR", 0.62, -0.28], ["legBL", -0.62, 0.28], ["legBR", 0.62, 0.28]]) {
    b.node(name, [x, 0.32, z], [0, 0, 0], (l) => {
      l.add(SHAPE.cyl(0.05, 0.07, 0.28, 6), { p: [0, -0.14, 0], c: C.brass, mat: "metal" });
      l.add(SHAPE.ball(0.08, 8, 6), { p: [0, -0.28, 0], s: [1.2, 0.6, 1.3], c: C.brassD, mat: "metal" });
      for (let i = -1; i <= 1; i++) l.add(SHAPE.cone(0.025, 0.08, 4), { p: [i * 0.04, -0.3, -0.09], r: [-1.3, 0, 0], c: C.brassD, mat: "metal" });
    });
  }
  b.node("body", [0, 0.3, 0], [0, 0, 0], (n) => {
    // The tub: a rounded enamel box, rim on top, water and foam inside.
    n.add(SHAPE.box(1.6, 0.62, 0.82, 0.22), { p: [0, 0.34, 0], grad: ENAMEL, facet: 0.03 });
    n.add(SHAPE.box(1.66, 0.08, 0.88, 0.04), { p: [0, 0.66, 0], c: 0xffffff, facet: 0.02 });
    n.add(SHAPE.box(1.44, 0.04, 0.66, 0.02), { p: [0, 0.69, 0], c: 0x8fd0f0, facet: 0.02 });
    for (let i = 0; i < 12; i++) {
      const x = -0.6 + (i % 6) * 0.24, z = i < 6 ? -0.14 : 0.14;
      n.add(SHAPE.ball(0.09 + (i % 3) * 0.03, 8, 6), { p: [x, 0.74 + (i % 2) * 0.04, z], c: 0xffffff, facet: 0.02 });
    }
    // Angry face on the front.
    n.node("eyes", [0, 0.42, -0.42], [0, 0, 0], (e) => {
      e.both((s) => {
        e.add(SHAPE.ball(0.11, 10, 7), { p: [s * 0.2, 0, 0], s: [1, 1.1, 0.4], c: C.white, facet: 0 });
        e.add(SHAPE.ball(0.055, 8, 6), { p: [s * 0.18, -0.01, -0.035], s: [1, 1, 0.4], c: C.black, facet: 0 });
        e.add(SHAPE.box(0.18, 0.04, 0.03, 0.01), { p: [s * 0.2, 0.12, -0.02], r: [0, 0, s * 0.4], c: 0x3a4a5a });
      });
    });
    n.node("mouth", [0, 0.2, -0.42], [0, 0, 0], (m) => {
      m.add(SHAPE.cyl(0.08, 0.08, 0.03, 12), { r: [Math.PI / 2, 0, 0], s: [1.6, 1, 0.8], c: 0x2a3440 });
      m.add(SHAPE.torus(0.085, 0.015, 4, 14), { s: [1.6, 0.8, 1], c: C.steel, mat: "metal" });
    });
    // Taps at the back end, and the rubber duck.
    n.add(SHAPE.cyl(0.04, 0.04, 0.2, 6), { p: [0.7, 0.8, 0.2], c: C.steel, mat: "metal" });
    n.add(SHAPE.ball(0.12, 10, 7), { p: [-0.55, 0.86, -0.2], c: 0xffd23a });
    n.add(SHAPE.ball(0.08, 8, 6), { p: [-0.62, 0.98, -0.25], c: 0xffd23a });
    n.add(SHAPE.cone(0.035, 0.07, 5), { p: [-0.62, 0.97, -0.33], r: [-Math.PI / 2, 0, 0], c: 0xff8a2a });
    n.add(SHAPE.ball(0.015, 5, 4), { p: [-0.6, 1.01, -0.31], c: C.black });
  });
  // The shower head on its hose: the bubble cannon.
  b.node("shower", [0.62, 1.05, 0.28], [0, 0, 0], (s) => {
    s.add(SHAPE.cyl(0.025, 0.025, 0.6, 6), { p: [0, 0.3, 0], c: C.steel, mat: "metal" });
    s.add(SHAPE.cyl(0.14, 0.06, 0.1, 12), { p: [0, 0.62, -0.06], r: [-0.9, 0, 0], c: C.steel, mat: "metal" });
    s.add(SHAPE.cyl(0.12, 0.12, 0.02, 12), { p: [0, 0.6, -0.1], r: [-0.9, 0, 0], c: 0x8fd0f0, mat: "glow", glow: 1.2 });
  });
}
