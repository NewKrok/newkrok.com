import { SHAPE as S, shade, mix } from "../modelkit.js";

// ── The Hive ─────────────────────────────────────────────────────────────
// Dark, glossy chitin in overlapping plates, bioluminescent seams (the
// bloom catches them), bright eyes, mandibles. Legs are nodes "l0"…"l5"
// (pivot at the body) for the scuttle; heads, jaws, sacs and frills are
// nodes too. Faces −z.

export const HIVE = { chitin: 0x2b2030, plate: 0x4b3550, belly: 0x5d4a52, glow: 0xb8ff4a, eye: 0xffe36a, acid: 0x9cff3a, bone: 0x8a7a80 };

// A tapered rod from point a to point b (in the x-y plane of the current frame).
function seg(b, [ax, ay], [bx, by], r0, r1, c, mat) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  b.add(S.cyl(r1, r0, L, 6), { p: [(ax + bx) / 2, (ay + by) / 2, 0], r: [0, 0, Math.atan2(-dx, dy)], c, mat });
}

// A leg from the body (pivot at height y above the ground) out to a knee
// high over it, then down to a foot on the ground: a joint ball at the
// hip, a thick femur, a thinner tibia, a claw.
function leg(b, name, x, y, z, side, len, thick, c, splay = 0.7, rise = 0.8) {
  b.node(name, [x, y, z], [0, 0, 0], (l) => {
    const knee = [side * len * 0.42, len * rise * 0.55], foot = [side * len * (0.55 + splay * 0.25), -y + thick * 0.4];
    l.add(S.sphere(thick * 0.75, 0), { p: [side * thick * 0.3, 0, 0], c: shade(c, 1.2) });
    seg(l, [0, 0], knee, thick * 1.1, thick * 0.7, c);
    l.add(S.sphere(thick * 0.8, 0), { p: [knee[0], knee[1], 0], c: shade(c, 0.9) });
    l.add(S.cone(thick * 0.5, thick * 1.6, 4), { p: [knee[0] + side * thick * 0.3, knee[1] + thick * 1.1, 0], r: [0, 0, side * -0.4], c: shade(c, 1.3) });
    seg(l, knee, foot, thick * 0.65, thick * 0.35, shade(c, 0.85));
    l.add(S.cone(thick * 0.45, thick * 2.2, 4), { p: [foot[0], foot[1] - thick * 0.3, 0], r: [Math.PI, 0, 0], c: HIVE.bone });
  });
}

// Overlapping back plates along +z from z0, each a flattened blob.
function plates(bd, n, w, y, z0, dz, c, seed = 1) {
  for (let i = 0; i < n; i++) bd.add(S.blob(w * (1 - i * 0.07), seed + i, 0.06, 1), { p: [0, y - i * w * 0.08, z0 + i * dz], s: [1, 0.42, 0.75], c: i % 2 ? c : shade(c, 1.12), grad: [shade(c, 0.8), shade(c, 1.15)] });
}
// Dorsal spines along +z.
function spines(bd, n, y, z0, dz, h, c) {
  for (let i = 0; i < n; i++) bd.add(S.cone(h * 0.28, h * (1 - i * 0.1), 4), { p: [0, y, z0 + i * dz], r: [0.5, 0, 0], c });
}
// A pair of mandibles under the head and a set of eyes.
function mandibles(h, x, y, z, len, c) {
  for (const s of [-1, 1]) h.add(S.cone(len * 0.18, len, 4), { p: [s * x, y, z], r: [-Math.PI / 2 + 0.35, s * 0.55, 0], c });
}
function eyes(h, list, r, c = HIVE.eye) {
  for (const [x, y, z, k = 1] of list) h.add(S.sphere(r * k, 0), { p: [x, y, z], c, mat: "glow", glow: 1.4 });
}

export function swarmer(b) {
  const H = HIVE;
  b.node("body", [0, 0.42, 0], [0, 0, 0], (bd) => {
    // Abdomen in plates, a thorax, seams that glow between them.
    bd.add(S.blob(0.36, 3, 0.1, 1), { p: [0, 0.0, 0.32], s: [1, 0.72, 1.25], c: H.plate, grad: [H.belly, shade(H.plate, 0.9)] });
    plates(bd, 3, 0.34, 0.14, 0.12, 0.17, H.plate, 30);
    for (let i = 0; i < 3; i++) bd.add(S.box(0.3 - i * 0.04, 0.025, 0.05, 0.01), { p: [0, 0.2 - i * 0.03, 0.2 + i * 0.17], c: H.glow, mat: "glow", glow: 1.0 });
    bd.add(S.blob(0.24, 5, 0.1, 1), { p: [0, 0.02, -0.08], s: [1, 0.8, 1], c: H.chitin });
    bd.add(S.blob(0.2, 6, 0.08, 1), { p: [0, 0.14, -0.06], s: [1, 0.45, 0.9], c: shade(H.plate, 1.1) });
    spines(bd, 3, 0.26, 0.22, 0.15, 0.12, shade(H.plate, 1.3));
    bd.node("head", [0, 0.02, -0.3], [0, 0, 0], (h) => {
      h.add(S.blob(0.17, 8, 0.12, 1), { s: [1, 0.8, 1.1], c: H.plate });
      h.add(S.blob(0.15, 9, 0.06, 1), { p: [0, 0.06, 0.0], s: [1, 0.45, 1], c: shade(H.plate, 1.15) });
      mandibles(h, 0.08, -0.05, -0.16, 0.22, 0x1a141c);
      eyes(h, [[-0.08, 0.06, -0.13], [0.08, 0.06, -0.13], [-0.12, 0.02, -0.08, 0.6], [0.12, 0.02, -0.08, 0.6]], 0.03);
      for (const s of [-1, 1]) h.add(S.cyl(0.004, 0.006, 0.22, 4), { p: [s * 0.06, 0.12, -0.08], r: [-0.6, 0, s * 0.5], c: 0x1a141c });   // antennae
    });
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.16, 0.44, -0.18 + row * 0.2, side, 0.62, 0.05, H.chitin);
  }
}

export function spitter(b) {
  const H = HIVE;
  b.node("body", [0, 0.6, 0], [0, 0, 0], (bd) => {
    bd.add(S.blob(0.55, 11, 0.1, 1), { p: [0, 0.05, 0.12], s: [1, 0.75, 1.1], c: H.plate, grad: [H.belly, shade(H.plate, 0.9)] });
    plates(bd, 3, 0.42, 0.28, -0.2, 0.22, H.plate, 40);
    spines(bd, 4, 0.42, -0.25, 0.14, 0.16, shade(H.plate, 1.3));
    for (let i = 0; i < 2; i++) bd.add(S.box(0.4, 0.03, 0.06, 0.01), { p: [0, 0.3 - i * 0.04, -0.08 + i * 0.22], c: H.glow, mat: "glow", glow: 0.9 });
    bd.node("sac", [0, 0.45, 0.55], [0, 0, 0], (s) => {
      s.add(S.blob(0.33, 4, 0.12, 1), { s: [1, 0.9, 1.15], c: H.acid, mat: "glow", glow: 0.9 });
      s.add(S.torus(0.3, 0.04, 4, 12), { r: [Math.PI / 2, 0, 0], p: [0, -0.1, 0], c: H.chitin });
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; s.add(S.box(0.05, 0.3, 0.05, 0.01), { p: [Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.32], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], c: H.chitin }); }   // the cage that holds the sac
    });
    bd.node("head", [0, 0.25, -0.55], [0, 0, 0], (h) => {
      h.add(S.cyl(0.13, 0.18, 0.4, 7), { p: [0, 0, 0.1], r: [-1.1, 0, 0], c: H.chitin });
      for (let i = 0; i < 3; i++) h.add(S.torus(0.15 - i * 0.015, 0.02, 4, 8), { p: [0, 0.02 + i * 0.07, 0.17 - i * 0.1], r: [-1.1, 0, 0], c: shade(H.plate, 1.2) });   // neck rings
      h.add(S.blob(0.2, 13, 0.12, 1), { p: [0, 0.08, -0.12], s: [1, 0.85, 1.2], c: H.plate });
      h.add(S.blob(0.17, 14, 0.06, 1), { p: [0, 0.17, -0.1], s: [1, 0.4, 1.1], c: shade(H.plate, 1.15) });
      h.add(S.cyl(0.08, 0.11, 0.1, 7), { p: [0, 0.02, -0.33], r: [Math.PI / 2, 0, 0], c: H.acid, mat: "glow", glow: 1.2 });
      h.add(S.torus(0.11, 0.025, 4, 8), { p: [0, 0.02, -0.36], c: H.chitin });
      mandibles(h, 0.1, -0.06, -0.26, 0.2, 0x1a141c);
      eyes(h, [[-0.1, 0.16, -0.22], [0.1, 0.16, -0.22], [-0.15, 0.1, -0.15, 0.6], [0.15, 0.1, -0.15, 0.6]], 0.035);
    });
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.3, 0.6, -0.3 + row * 0.32, side, 0.85, 0.07, H.chitin, 0.6, 0.8);
  }
}

export function charger(b) {
  const H = HIVE, P = 0x6a3442;
  b.node("body", [0, 0.85, 0], [0, 0, 0], (bd) => {
    bd.add(S.blob(0.85, 21, 0.08, 1), { p: [0, 0.05, 0.25], s: [1, 0.72, 1.25], c: H.chitin, grad: [H.belly, H.plate] });
    bd.add(S.blob(0.42, 22, 0.1, 1), { p: [0, 0.35, 1.05], s: [1, 0.7, 1], c: H.plate });
    plates(bd, 4, 0.7, 0.5, -0.3, 0.35, P, 50);
    for (let i = 0; i < 4; i++) bd.add(S.box(0.9 - i * 0.12, 0.05, 0.08, 0.02), { p: [0, 0.52 - i * 0.04, 0.0 + i * 0.32], c: H.glow, mat: "glow", glow: 0.8 });
    spines(bd, 5, 0.68, -0.4, 0.3, 0.3, shade(P, 1.3));
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) bd.add(S.cone(0.06, 0.25, 4), { p: [s * 0.7, 0.3, -0.2 + i * 0.4], r: [0, 0, s * 1.2], c: shade(P, 1.3) });   // side spikes
    bd.node("head", [0, 0.05, -0.85], [0, 0, 0], (h) => {
      // The armoured face plate: what you cannot shoot through.
      h.add(S.blob(0.75, 23, 0.06, 1), { p: [0, 0.05, -0.05], s: [1.25, 1.0, 0.55], c: P, grad: [shade(P, 0.6), shade(P, 1.35)] });
      h.add(S.blob(0.5, 24, 0.05, 1), { p: [0, 0.25, -0.2], s: [1.3, 0.5, 0.5], c: shade(P, 1.2) });
      h.add(S.torus(0.62, 0.05, 4, 16), { p: [0, 0.05, -0.32], s: [1.25, 1, 1], c: H.glow, mat: "glow", glow: 0.7 });
      h.add(S.box(0.08, 0.5, 0.06, 0.02), { p: [0, 0.1, -0.38], c: H.glow, mat: "glow", glow: 0.6 });
      for (const s of [-1, 1]) {
        h.add(S.cone(0.11, 0.55, 5), { p: [s * 0.5, 0.3, -0.3], r: [-1.2, 0, s * -0.5], c: shade(P, 1.3) });
        h.add(S.cone(0.07, 0.3, 5), { p: [s * 0.75, 0.0, -0.2], r: [-1.0, 0, s * -1.0], c: shade(P, 1.3) });
      }
      eyes(h, [[-0.22, -0.12, -0.45], [0.22, -0.12, -0.45], [-0.4, -0.2, -0.35, 0.6], [0.4, -0.2, -0.35, 0.6]], 0.05);
      mandibles(h, 0.2, -0.35, -0.3, 0.45, 0x1a141c);
    });
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.55, 0.85, -0.55 + row * 0.55, side, 1.15, 0.13, H.chitin, 0.6, 0.8);
  }
}

export function sentry(b) {
  const H = HIVE;
  b.node("body", [0, 0.95, 0], [0, 0, 0], (bd) => {
    bd.add(S.blob(0.36, 31, 0.1, 1), { p: [0, 0, 0.12], s: [1, 0.85, 1.2], c: H.plate, grad: [H.belly, H.plate] });
    plates(bd, 2, 0.3, 0.2, 0.0, 0.2, H.plate, 60);
    bd.add(S.box(0.26, 0.025, 0.05, 0.01), { p: [0, 0.22, 0.1], c: H.glow, mat: "glow", glow: 0.9 });
    bd.node("head", [0, 0.25, -0.1], [0, 0, 0], (h) => {
      h.add(S.cyl(0.08, 0.12, 0.6, 6), { p: [0, 0.28, 0], c: H.chitin });
      for (let i = 0; i < 4; i++) h.add(S.torus(0.1 - i * 0.008, 0.018, 4, 8), { p: [0, 0.1 + i * 0.13, 0], r: [Math.PI / 2, 0, 0], c: shade(H.plate, 1.2) });
      h.add(S.blob(0.18, 33, 0.1, 1), { p: [0, 0.62, -0.06], s: [1, 0.9, 1.2], c: H.plate });
      // One big eye: the sentry's whole point, with a lid ridge over it.
      h.add(S.ball(0.11, 10, 7), { p: [0, 0.64, -0.22], s: [1, 0.8, 0.6], c: 0xff9a3a, mat: "glow", glow: 1.7 });
      h.add(S.ball(0.045, 8, 6), { p: [0, 0.64, -0.27], s: [1, 1, 0.6], c: 0x1a0a08, facet: 0 });
      h.add(S.blob(0.14, 34, 0.05, 1), { p: [0, 0.74, -0.14], s: [1, 0.3, 0.8], c: shade(H.plate, 1.2) });
      h.node("frill", [0, 0.68, 0.06], [0, 0, 0], (f) => {
        for (let i = 0; i < 7; i++) {
          const a = (i / 6 - 0.5) * 2.6;
          f.add(S.box(0.05, 0.42, 0.02, 0.01), { p: [Math.sin(a) * 0.18, Math.cos(a) * 0.18, 0.02], r: [0, 0, -a], c: i % 2 ? H.glow : shade(H.plate, 1.4), mat: i % 2 ? "glow" : "solid", glow: 0.7 });
        }
      });
    });
  });
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.2, 0.95, -0.12 + row * 0.3, side, 1.25, 0.05, H.chitin, 0.4, 0.3);
  }
}

export function warden(b) {
  const H = HIVE, P = mix(H.plate, 0x6a4a5a, 0.4);
  b.node("body", [0, 2.0, 0], [0, 0, 0], (bd) => {
    bd.add(S.blob(1.9, 41, 0.08, 2), { p: [0, 0, 0.2], s: [1, 0.68, 1.3], c: H.chitin, grad: [H.belly, P] });
    bd.add(S.blob(1.2, 42, 0.1, 1), { p: [0, 0.15, 2.4], s: [1, 0.7, 1.1], c: P });
    plates(bd, 6, 1.5, 1.05, -1.2, 0.62, P, 70);
    for (let i = 0; i < 5; i++) bd.add(S.box(1.6 - i * 0.15, 0.08, 0.2, 0.03), { p: [0, 1.12 - i * 0.1, -0.9 + i * 0.6], c: H.glow, mat: "glow", glow: 0.8 });
    spines(bd, 5, 1.45, -0.8, 0.6, 0.8, shade(P, 1.4));
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) bd.add(S.cone(0.14, 0.7, 4), { p: [s * 1.5, 0.6, -0.9 + i * 0.7], r: [0, 0, s * 1.1], c: shade(P, 1.3) });
    const sac = (name, p) => bd.node(name, p, [0, 0, 0], (s) => {
      s.add(S.blob(0.62, 44, 0.12, 1), { s: [1, 0.9, 1.1], c: H.acid, mat: "glow", glow: 1.0 });
      s.add(S.torus(0.56, 0.07, 4, 14), { r: [Math.PI / 2, 0, 0], p: [0, -0.2, 0], c: H.chitin });
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; s.add(S.box(0.1, 0.6, 0.1, 0.02), { p: [Math.cos(a) * 0.58, 0.05, Math.sin(a) * 0.6], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4], c: H.chitin }); }
    });
    sac("sacL", [-1.75, 0.3, -0.2]);
    sac("sacR", [1.75, 0.3, -0.2]);
    sac("sacT", [0, 0.2, 3.2]);
    bd.node("head", [0, 0.1, -2.0], [0, 0, 0], (h) => {
      h.add(S.blob(1.0, 45, 0.08, 1), { p: [0, 0.35, -0.2], s: [1.2, 0.8, 1.1], c: P, grad: [shade(P, 0.7), shade(P, 1.2)] });
      h.add(S.blob(0.8, 48, 0.05, 1), { p: [0, 0.75, -0.3], s: [1.3, 0.35, 1.0], c: shade(P, 1.2) });
      h.add(S.box(0.1, 0.06, 1.2, 0.02), { p: [0, 0.85, -0.4], c: H.glow, mat: "glow", glow: 0.8 });
      for (const s of [-1, 1]) {
        h.add(S.cone(0.2, 1.4, 5), { p: [s * 0.8, 0.9, 0.2], r: [-1.0, 0, s * -0.6], c: shade(P, 1.4) });
        h.add(S.cone(0.12, 0.7, 5), { p: [s * 1.1, 0.5, -0.1], r: [-0.8, 0, s * -1.1], c: shade(P, 1.4) });
        h.add(S.cone(0.12, 0.9, 5), { p: [s * 0.45, -0.4, -1.2], r: [-Math.PI / 2 + 0.4, s * 0.5, 0], c: 0x1a141c });
      }
      eyes(h, [[-0.45, 0.55, -1.0], [0.45, 0.55, -1.0], [-0.62, 0.38, -0.9, 0.8], [0.62, 0.38, -0.9, 0.8], [-0.3, 0.7, -0.95, 0.5], [0.3, 0.7, -0.95, 0.5]], 0.09);
      // The maw: glowing inside, the jaw drops open.
      h.add(S.blob(0.45, 46, 0.1, 1), { p: [0, -0.05, -0.75], s: [1.1, 0.7, 0.8], c: 0xff6a3a, mat: "glow", glow: 1.2 });
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) h.add(S.cone(0.05, 0.2, 4), { p: [s * (0.15 + i * 0.15), 0.12, -1.0 + i * 0.1], r: [Math.PI, 0, 0], c: H.bone });   // upper teeth
      h.node("jaw", [0, -0.2, -0.4], [0, 0, 0], (j) => {
        j.add(S.blob(0.6, 47, 0.08, 1), { p: [0, -0.15, -0.45], s: [1.2, 0.45, 1], c: shade(P, 0.9) });
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) j.add(S.cone(0.05, 0.2, 4), { p: [s * (0.15 + i * 0.15), 0.0, -0.75 + i * 0.1], c: H.bone });
      });
    });
  });
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 1.2, 2.0, -1.4 + row * 1.0, side, 3.0, 0.3, H.chitin, 0.6, 1.0);
  }
}

export const BUG_MODELS = { swarmer, spitter, charger, sentry, warden };
