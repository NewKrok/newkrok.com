import { SHAPE as S, shade, mix } from "../modelkit.js";

// ── The Hive ─────────────────────────────────────────────────────────────
// Dark, glossy chitin with bioluminescent seams (the bloom catches them).
// Legs are nodes "l0"…"l5" (pivot at the body) for the scuttle; heads,
// jaws, sacs and frills are nodes too. Faces −z.

export const HIVE = { chitin: 0x2b2030, plate: 0x4b3550, belly: 0x5d4a52, glow: 0xb8ff4a, eye: 0xffe36a, acid: 0x9cff3a };

// A box from point a to point b (in the x-y plane of the current frame).
function seg(b, [ax, ay], [bx, by], thick, c) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  b.add(S.box(thick, L, thick, thick * 0.3), { p: [(ax + bx) / 2, (ay + by) / 2, 0], r: [0, 0, Math.atan2(-dx, dy)], c });
}

// A leg from the body (pivot at height y above the ground) out to a knee
// high over it, then down to a foot on the ground.
function leg(b, name, x, y, z, side, len, thick, c, splay = 0.7, rise = 0.8) {
  b.node(name, [x, y, z], [0, 0, 0], (l) => {
    const knee = [side * len * 0.42, len * rise * 0.55], foot = [side * len * (0.55 + splay * 0.25), -y + thick * 0.4];
    seg(l, [0, 0], knee, thick, c);
    seg(l, knee, foot, thick * 0.85, shade(c, 0.85));
    l.add(S.cone(thick * 0.45, thick * 2, 4), { p: [foot[0], foot[1] - thick * 0.2, 0], r: [Math.PI, 0, 0], c: shade(c, 0.7) });
  });
}

export function swarmer(b) {
  const H = HIVE;
  b.node("body", [0, 0.42, 0], [0, 0, 0], (bd) => {
    bd.add(S.blob(0.36, 3, 0.12, 1), { p: [0, 0.02, 0.32], s: [1, 0.75, 1.25], c: H.plate, grad: [H.belly, H.plate] });
    for (let i = 0; i < 3; i++) bd.add(S.box(0.34 - i * 0.05, 0.03, 0.06, 0.01), { p: [0, 0.27 - i * 0.02, 0.18 + i * 0.16], c: H.glow, mat: "glow", glow: 1.0 });
    bd.add(S.blob(0.24, 5, 0.1, 1), { p: [0, 0.02, -0.08], s: [1, 0.8, 1], c: H.chitin });
    bd.node("head", [0, 0.02, -0.3], [0, 0, 0], (h) => {
      h.add(S.blob(0.17, 8, 0.12, 1), { s: [1, 0.8, 1.1], c: H.plate });
      for (const s of [-1, 1]) {
        h.add(S.cone(0.04, 0.22, 4), { p: [s * 0.08, -0.05, -0.18], r: [-Math.PI / 2 + 0.3, s * 0.4, 0], c: 0x1a141c });
        h.add(S.sphere(0.03, 0), { p: [s * 0.08, 0.06, -0.13], c: H.eye, mat: "glow", glow: 1.4 });
      }
    });
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.16, 0.44, -0.18 + row * 0.2, side, 0.62, 0.06, H.chitin);
  }
}

export function spitter(b) {
  const H = HIVE;
  b.node("body", [0, 0.6, 0], [0, 0, 0], (bd) => {
    bd.add(S.blob(0.55, 11, 0.1, 1), { p: [0, 0.05, 0.12], s: [1, 0.75, 1.1], c: H.plate, grad: [H.belly, H.plate] });
    bd.node("sac", [0, 0.45, 0.55], [0, 0, 0], (s) => {
      s.add(S.blob(0.33, 4, 0.12, 1), { s: [1, 0.9, 1.15], c: H.acid, mat: "glow", glow: 0.9 });
      s.add(S.torus(0.3, 0.035, 4, 12), { r: [Math.PI / 2, 0, 0], p: [0, -0.1, 0], c: H.chitin });
    });
    bd.node("head", [0, 0.25, -0.55], [0, 0, 0], (h) => {
      h.add(S.cyl(0.13, 0.18, 0.4, 7), { p: [0, 0, 0.1], r: [-1.1, 0, 0], c: H.chitin });
      h.add(S.blob(0.2, 13, 0.12, 1), { p: [0, 0.08, -0.12], s: [1, 0.85, 1.2], c: H.plate });
      h.add(S.cyl(0.08, 0.11, 0.1, 7), { p: [0, 0.02, -0.33], r: [Math.PI / 2, 0, 0], c: H.acid, mat: "glow", glow: 1.2 });
      for (const s of [-1, 1]) h.add(S.sphere(0.035, 0), { p: [s * 0.1, 0.16, -0.22], c: H.eye, mat: "glow", glow: 1.4 });
    });
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.3, 0.6, -0.3 + row * 0.32, side, 0.85, 0.08, H.chitin, 0.6, 0.8);
  }
}

export function charger(b) {
  const H = HIVE, P = 0x6a3442;
  b.node("body", [0, 0.85, 0], [0, 0, 0], (bd) => {
    bd.add(S.blob(0.85, 21, 0.08, 1), { p: [0, 0.05, 0.25], s: [1, 0.72, 1.25], c: H.chitin, grad: [H.belly, H.plate] });
    bd.add(S.blob(0.42, 22, 0.1, 1), { p: [0, 0.35, 1.05], s: [1, 0.7, 1], c: H.plate });
    for (let i = 0; i < 4; i++) bd.add(S.box(0.9 - i * 0.12, 0.05, 0.08, 0.02), { p: [0, 0.58 - i * 0.04, 0.0 + i * 0.32], c: H.glow, mat: "glow", glow: 0.8 });
    bd.node("head", [0, 0.05, -0.85], [0, 0, 0], (h) => {
      // The armoured face plate: what you cannot shoot through.
      h.add(S.blob(0.75, 23, 0.06, 1), { p: [0, 0.05, -0.05], s: [1.25, 1.0, 0.55], c: P, grad: [shade(P, 0.6), shade(P, 1.35)] });
      h.add(S.torus(0.62, 0.05, 4, 16), { p: [0, 0.05, -0.32], s: [1.25, 1, 1], c: H.glow, mat: "glow", glow: 0.7 });
      for (const s of [-1, 1]) {
        h.add(S.cone(0.11, 0.55, 5), { p: [s * 0.5, 0.3, -0.3], r: [-1.2, 0, s * -0.5], c: shade(P, 1.3) });
        h.add(S.sphere(0.05, 0), { p: [s * 0.22, -0.12, -0.45], c: H.eye, mat: "glow", glow: 1.4 });
      }
    });
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.55, 0.85, -0.55 + row * 0.55, side, 1.15, 0.15, H.chitin, 0.6, 0.8);
  }
}

export function sentry(b) {
  const H = HIVE;
  b.node("body", [0, 0.95, 0], [0, 0, 0], (bd) => {
    bd.add(S.blob(0.36, 31, 0.1, 1), { p: [0, 0, 0.12], s: [1, 0.85, 1.2], c: H.plate, grad: [H.belly, H.plate] });
    bd.node("head", [0, 0.25, -0.1], [0, 0, 0], (h) => {
      h.add(S.cyl(0.08, 0.12, 0.6, 6), { p: [0, 0.28, 0], c: H.chitin });
      h.add(S.blob(0.18, 33, 0.1, 1), { p: [0, 0.62, -0.06], s: [1, 0.9, 1.2], c: H.plate });
      // One big eye: the sentry's whole point.
      h.add(S.ball(0.11, 10, 7), { p: [0, 0.64, -0.22], s: [1, 0.8, 0.6], c: 0xff9a3a, mat: "glow", glow: 1.7 });
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
    leg(b, `l${i}`, side * 0.2, 0.95, -0.12 + row * 0.3, side, 1.25, 0.06, H.chitin, 0.4, 0.3);
  }
}

export function warden(b) {
  const H = HIVE, P = mix(H.plate, 0x6a4a5a, 0.4);
  b.node("body", [0, 2.0, 0], [0, 0, 0], (bd) => {
    bd.add(S.blob(1.9, 41, 0.08, 2), { p: [0, 0, 0.2], s: [1, 0.68, 1.3], c: H.chitin, grad: [H.belly, P] });
    bd.add(S.blob(1.2, 42, 0.1, 1), { p: [0, 0.15, 2.4], s: [1, 0.7, 1.1], c: P });
    for (let i = 0; i < 6; i++) bd.add(S.box(2.0 - i * 0.2, 0.12, 0.3, 0.05), { p: [0, 1.3 - i * 0.12, -1.0 + i * 0.6], r: [0.2, 0, 0], c: shade(P, 1.25) });
    for (let i = 0; i < 5; i++) bd.add(S.cone(0.16, 0.7, 5), { p: [0, 1.45 - i * 0.1, -0.8 + i * 0.6], r: [-0.4, 0, 0], c: shade(P, 1.4) });
    const sac = (name, p) => bd.node(name, p, [0, 0, 0], (s) => {
      s.add(S.blob(0.62, 44, 0.12, 1), { s: [1, 0.9, 1.1], c: H.acid, mat: "glow", glow: 1.0 });
      s.add(S.torus(0.56, 0.06, 4, 14), { r: [Math.PI / 2, 0, 0], p: [0, -0.2, 0], c: H.chitin });
    });
    sac("sacL", [-1.75, 0.3, -0.2]);
    sac("sacR", [1.75, 0.3, -0.2]);
    sac("sacT", [0, 0.2, 3.2]);
    bd.node("head", [0, 0.1, -2.0], [0, 0, 0], (h) => {
      h.add(S.blob(1.0, 45, 0.08, 1), { p: [0, 0.35, -0.2], s: [1.2, 0.8, 1.1], c: P, grad: [shade(P, 0.7), shade(P, 1.2)] });
      for (const s of [-1, 1]) {
        h.add(S.cone(0.2, 1.4, 5), { p: [s * 0.8, 0.9, 0.2], r: [-1.0, 0, s * -0.6], c: shade(P, 1.4) });
        h.add(S.sphere(0.09, 0), { p: [s * 0.45, 0.55, -1.0], c: H.eye, mat: "glow", glow: 1.6 });
        h.add(S.sphere(0.07, 0), { p: [s * 0.62, 0.38, -0.9], c: H.eye, mat: "glow", glow: 1.6 });
        h.add(S.cone(0.12, 0.9, 5), { p: [s * 0.45, -0.4, -1.2], r: [-Math.PI / 2 + 0.4, s * 0.5, 0], c: 0x1a141c });
      }
      // The maw: glowing inside, the jaw drops open.
      h.add(S.blob(0.45, 46, 0.1, 1), { p: [0, -0.05, -0.75], s: [1.1, 0.7, 0.8], c: 0xff6a3a, mat: "glow", glow: 1.2 });
      h.node("jaw", [0, -0.2, -0.4], [0, 0, 0], (j) => {
        j.add(S.blob(0.6, 47, 0.08, 1), { p: [0, -0.15, -0.45], s: [1.2, 0.45, 1], c: shade(P, 0.9) });
      });
    });
  });
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 1.2, 2.0, -1.4 + row * 1.0, side, 3.0, 0.34, H.chitin, 0.6, 1.0);
  }
}

export const BUG_MODELS = { swarmer, spitter, charger, sentry, warden };
