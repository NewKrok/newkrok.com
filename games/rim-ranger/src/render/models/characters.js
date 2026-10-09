import { SHAPE as S, shade } from "../modelkit.js";

// ── People and their guns ────────────────────────────────────────────────
// A ranger is jointed for procedural animation: hips (root of the pose),
// torso (bends at the waist), head, an "arms" node at the shoulders that
// carries both arms and the gun (it pitches with the aim), and two legs
// with a knee each. Faces −z.

export const RANGER_SKINS = {
  player: { armour: 0x66717c, under: 0x2c3238, accent: 0xe08a2a, visor: 0x6fe8ff, cloth: 0x2c3138 },
  kessler: { armour: 0x6f7a62, under: 0x30362c, accent: 0x5fc3b0, visor: 0xffc46a, cloth: 0x333a34 },
};

export function ranger(b, o = {}) {
  const k = RANGER_SKINS[o.skin ?? "player"];
  const A = k.armour, U = k.under, C = k.accent;
  b.node("hips", [0, 0.95, 0], [0, 0, 0], (h) => {
    h.add(S.box(0.38, 0.2, 0.24, 0.05), { p: [0, 0, 0], c: U });
    h.add(S.box(0.42, 0.08, 0.27, 0.03), { p: [0, 0.07, 0], c: A });
    // Belt pouches.
    h.add(S.box(0.1, 0.1, 0.07, 0.02), { p: [0.15, 0.0, 0.13], c: shade(U, 1.3) });
    h.add(S.box(0.1, 0.1, 0.07, 0.02), { p: [-0.15, 0.0, 0.13], c: shade(U, 1.3) });
    for (const side of [-1, 1]) {
      h.node(side < 0 ? "legL" : "legR", [side * 0.12, -0.04, 0], [0, 0, 0], (l) => {
        l.add(S.box(0.17, 0.42, 0.19, 0.04), { p: [0, -0.21, 0], c: U });
        l.add(S.box(0.18, 0.2, 0.2, 0.04), { p: [0, -0.15, -0.02], c: A });
        l.node(side < 0 ? "shinL" : "shinR", [0, -0.43, 0], [0, 0, 0], (s) => {
          s.add(S.box(0.15, 0.4, 0.17, 0.04), { p: [0, -0.2, 0], c: U });
          s.add(S.box(0.16, 0.24, 0.12, 0.04), { p: [0, -0.16, -0.05], c: A });
          s.add(S.box(0.15, 0.04, 0.05, 0.01), { p: [0, -0.06, -0.12], c: C });
          s.add(S.box(0.16, 0.1, 0.28, 0.03), { p: [0, -0.43, -0.04], c: shade(U, 0.8) });
        });
      });
    }
    h.node("torso", [0, 0.08, 0], [0, 0, 0], (t) => {
      t.add(S.box(0.4, 0.3, 0.24, 0.05), { p: [0, 0.16, 0], c: U });
      t.add(S.box(0.48, 0.34, 0.3, 0.07), { p: [0, 0.4, -0.01], c: A, grad: [shade(A, 0.85), A] });
      t.add(S.box(0.3, 0.12, 0.05, 0.02), { p: [0, 0.38, -0.17], c: shade(A, 1.15) });
      t.add(S.box(0.12, 0.03, 0.02, 0), { p: [0.1, 0.46, -0.18], c: C, mat: "glow", glow: 1.2 });
      // Backpack and its antenna.
      t.add(S.box(0.38, 0.4, 0.16, 0.05), { p: [0, 0.38, 0.21], c: shade(A, 0.9) });
      t.add(S.cyl(0.04, 0.04, 0.3, 6), { p: [0, 0.4, 0.3], r: [Math.PI / 2, 0, 0], c: shade(U, 1.2) });
      t.add(S.cyl(0.006, 0.006, 0.45, 4), { p: [0.14, 0.75, 0.24], c: 0x111111 });
      // Shoulder pads.
      for (const side of [-1, 1]) t.add(S.box(0.16, 0.1, 0.24, 0.04), { p: [side * 0.3, 0.55, 0], r: [0, 0, side * -0.3], c: A });
      t.add(S.box(0.14, 0.04, 0.02, 0), { p: [-0.3, 0.6, -0.12], r: [0, 0, 0.3], c: C });
      t.node("head", [0, 0.6, 0], [0, 0, 0], (hd) => {
        hd.add(S.cyl(0.08, 0.09, 0.08, 8), { p: [0, 0.02, 0], c: U });
        hd.add(S.box(0.27, 0.27, 0.29, 0.08), { p: [0, 0.16, 0.01], c: A, grad: [shade(A, 0.9), shade(A, 1.12)] });
        hd.add(S.box(0.22, 0.09, 0.06, 0.03), { p: [0, 0.17, -0.14], c: k.visor, mat: "glow", glow: 1.3 });
        hd.add(S.box(0.29, 0.04, 0.2, 0.02), { p: [0, 0.3, 0.02], c: shade(A, 1.15) });
        hd.add(S.box(0.04, 0.12, 0.1, 0.01), { p: [0.15, 0.18, 0.02], c: C });
      });
      // Arms and gun: one node pitching at the shoulders.
      t.node("arms", [0, 0.48, 0], [0, 0, 0], (a) => {
        // Right arm reaches to the grip, left to the fore-end.
        a.add(S.box(0.13, 0.3, 0.14, 0.04), { p: [0.27, -0.08, -0.08], r: [0.9, 0, 0.15], c: U });
        a.add(S.box(0.12, 0.28, 0.13, 0.04), { p: [0.18, -0.16, -0.3], r: [1.45, 0, 0.5], c: A });
        a.add(S.box(0.1, 0.1, 0.1, 0.03), { p: [0.1, -0.2, -0.42], c: shade(U, 0.8) });
        a.add(S.box(0.13, 0.3, 0.14, 0.04), { p: [-0.25, -0.1, -0.12], r: [1.1, 0, -0.35], c: U });
        a.add(S.box(0.12, 0.3, 0.13, 0.04), { p: [-0.06, -0.15, -0.42], r: [1.5, 0, -0.8], c: A });
        a.add(S.box(0.1, 0.1, 0.1, 0.03), { p: [0.06, -0.15, -0.6], c: shade(U, 0.8) });
        a.node("gun", [0.08, -0.15, -0.35], [0, 0, 0], () => {});
      });
    });
  });
}

// ── Guns (they face −z, grip at the origin) ──
export const GUN_COLOURS = { body: 0x2a2e33, metal: 0x50565c, accent: 0xd8862e };

export function pistol(b) {
  const G = GUN_COLOURS;
  b.add(S.box(0.05, 0.08, 0.22, 0.015), { p: [0, 0.05, -0.08], c: G.body, mat: "metal" });
  b.add(S.box(0.045, 0.12, 0.06, 0.015), { p: [0, -0.03, 0.0], r: [-0.25, 0, 0], c: G.body });
  b.add(S.cyl(0.014, 0.014, 0.06, 6), { p: [0, 0.06, -0.21], r: [Math.PI / 2, 0, 0], c: G.metal, mat: "metal" });
  b.add(S.box(0.052, 0.012, 0.05, 0), { p: [0, 0.095, -0.03], c: G.accent });
}
export function rifle(b) {
  const G = GUN_COLOURS;
  b.add(S.box(0.07, 0.11, 0.5, 0.02), { p: [0, 0.04, -0.18], c: G.body, mat: "metal" });
  b.add(S.box(0.06, 0.08, 0.22, 0.02), { p: [0, 0.03, 0.16], c: G.body });
  b.add(S.box(0.05, 0.14, 0.07, 0.015), { p: [0, -0.06, -0.02], r: [-0.25, 0, 0], c: G.body });
  b.add(S.box(0.05, 0.16, 0.08, 0.015), { p: [0, -0.06, -0.17], r: [0.15, 0, 0], c: shade(G.body, 1.2) });
  b.add(S.cyl(0.016, 0.016, 0.22, 6), { p: [0, 0.06, -0.52], r: [Math.PI / 2, 0, 0], c: G.metal, mat: "metal" });
  b.add(S.box(0.04, 0.05, 0.12, 0.01), { p: [0, 0.12, -0.1], c: G.metal, mat: "metal" });
  b.add(S.box(0.02, 0.01, 0.01, 0), { p: [0, 0.15, -0.1], c: 0xff4040, mat: "glow" });
  b.add(S.box(0.072, 0.02, 0.18, 0), { p: [0, 0.0, -0.3], c: G.accent });
}
export function launcher(b) {
  const G = GUN_COLOURS;
  b.add(S.cyl(0.07, 0.07, 0.5, 8, 0.01), { p: [0, 0.06, -0.2], r: [Math.PI / 2, 0, 0], c: G.body, mat: "metal" });
  b.add(S.cyl(0.11, 0.11, 0.16, 8, 0.02), { p: [0, 0.03, -0.02], r: [Math.PI / 2, 0, 0], c: 0x5a4a3a });
  b.add(S.box(0.06, 0.08, 0.24, 0.02), { p: [0, 0.03, 0.2], c: G.body });
  b.add(S.box(0.05, 0.14, 0.07, 0.015), { p: [0, -0.07, 0.06], r: [-0.25, 0, 0], c: G.body });
  b.add(S.torus(0.075, 0.012, 4, 10), { p: [0, 0.06, -0.45], c: G.accent });
}
export function laser(b) {
  const G = GUN_COLOURS;
  b.add(S.box(0.08, 0.1, 0.46, 0.03), { p: [0, 0.05, -0.16], c: 0xd8dde2 });
  b.add(S.box(0.06, 0.06, 0.24, 0.02), { p: [0, 0.03, 0.18], c: 0xb8bec4 });
  b.add(S.box(0.05, 0.14, 0.07, 0.015), { p: [0, -0.06, 0.0], r: [-0.25, 0, 0], c: G.body });
  for (let i = 0; i < 3; i++) b.add(S.torus(0.05, 0.012, 4, 10), { p: [0, 0.06, -0.3 - i * 0.07], c: 0x7ef9ff, mat: "glow", glow: 1.1 });
  b.add(S.cyl(0.02, 0.03, 0.12, 6), { p: [0, 0.06, -0.5], r: [Math.PI / 2, 0, 0], c: 0x3a4048, mat: "metal" });
  b.add(S.box(0.084, 0.02, 0.12, 0), { p: [0, 0.11, -0.05], c: 0x2fa9c8 });
}
export const GUNS = { pistol, rifle, launcher, laser };

// A colony survivor: overalls, no helmet.
export function survivor(b, o = {}) {
  const C = o.c ?? 0xd08a2a, skin = 0xc69a7a;
  const sit = o.sit;
  if (sit) {
    b.add(S.box(0.4, 0.4, 0.4, 0.04), { p: [0, 0.2, 0.15], c: 0x55585c });
    b.add(S.box(0.34, 0.16, 0.5, 0.04), { p: [0, 0.48, -0.08], c: C });
    b.add(S.box(0.3, 0.45, 0.12, 0.03), { p: [0, 0.25, -0.33], c: shade(C, 0.7) });
  } else {
    for (const s of [-1, 1]) b.add(S.box(0.15, 0.85, 0.17, 0.04), { p: [s * 0.1, 0.43, 0], c: shade(C, 0.85) });
  }
  const y0 = sit ? 0.45 : 0.85;
  b.add(S.box(0.4, 0.55, 0.24, 0.06), { p: [0, y0 + 0.3, 0], c: C, grad: [shade(C, 0.8), C] });
  b.add(S.box(0.3, 0.05, 0.02, 0), { p: [0, y0 + 0.42, -0.125], c: 0xeeeeee });
  for (const s of [-1, 1]) b.add(S.box(0.11, 0.5, 0.12, 0.03), { p: [s * 0.27, y0 + 0.27, 0], r: [sit ? -0.6 : 0.1, 0, s * 0.1], c: shade(C, 0.9) });
  b.add(S.box(0.2, 0.24, 0.22, 0.07), { p: [0, y0 + 0.72, 0], c: skin });
  b.add(S.box(0.21, 0.08, 0.23, 0.04), { p: [0, y0 + 0.85, 0.01], c: 0x3a2a20 });
}
