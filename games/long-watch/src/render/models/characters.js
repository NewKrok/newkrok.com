import { SHAPE as S, shade, mix } from "../modelkit.js";

// ── People and their guns ────────────────────────────────────────────────
// Stylised low poly in the spirit of the Synty packs: chunky, chamfered
// plates in flat colours, a few bold accents, big hands and boots, and a
// readable face. The ranger armour is a cross between a COG suit (heavy
// chest plate, pauldrons, knee pads, segmented abdomen) and a space-ranger
// suit (white shell, bubble visor, chest panel with buttons, wing pack).
//
// A ranger is jointed for procedural animation (see render/rangerfig.js):
//   hips → legL/legR → shinL/shinR
//        → torso → head
//                → armL/armR (upper arm, pivot at the shoulder, hangs −y)
//                  → foreL/foreR (forearm, hand at its end; magL on the left)
//                → gun   (the gun in hand; placed by the animation)
//                → stow  (the slung long gun on the back)
//        → holster (the pistol on the right thigh)
// Faces −z; +x is the figure's right.

export const RIG = {
  hips: 0.95,                      // hips node above the ground
  torso: 0.08,                     // torso pivot above the hips
  head: [0, 0.56, 0],              // head pivot in torso space
  shoulder: [0.27, 0.45, 0.0],     // shoulder pivots in torso space (±x)
  upper: 0.31,                     // upper arm, pivot to elbow
  fore: 0.3,                       // forearm, elbow to the palm
  pouch: [-0.2, -0.06, -0.17],     // the spare magazine on the belt (torso space)
  chest: [-0.08, 0.28, -0.26],     // where a free left hand rests
  stow: [0.14, 0.12, 0.27],        // the slung long gun (torso space): grip at the right hip, muzzle over the left shoulder
  holster: [0.24, -0.08, -0.02],   // the pistol holster (hips space)
};

export const RANGER_SKINS = {
  // "Seven": white shell, lime and violet, blue visor lights.
  player: { armour: 0xe4e8eb, armour2: 0xc4ccd3, under: 0x2b3036, accent: 0x74d14a, trim: 0x5a46a8, glove: 0x3a3f46, light: 0x6fe8ff, skin: 0xd9a98a, hair: 0x4a3324, eye: 0x3a5f8a, hairStyle: "short" },
  // Kessler: worn grey-green shell, orange, steel-blue trim, amber lights.
  kessler: { armour: 0x8a948f, armour2: 0x6b7670, under: 0x2b302e, accent: 0xe08a2a, trim: 0x3d4c58, glove: 0x33382f, light: 0xffc46a, skin: 0xc68f6c, hair: 0x1f1b19, eye: 0x4a2f20, hairStyle: "bun", female: true },
};

// ── A face ──
// Draws a neck and a head into `h` (a head node's builder): skull, ears,
// hair, brows, eyes, nose and mouth. o: { skin, hair, eye, hairStyle:
// "short" | "bun" | "bald" | "cap", female, bandana }.
export function face(h, o) {
  const skin = o.skin ?? 0xd9a98a, hair = o.hair ?? 0x3a2a20, eye = o.eye ?? 0x3a5f8a;
  const f = o.female ? 0.94 : 1;
  h.add(S.cyl(0.055, 0.07, 0.1, 8), { p: [0, 0.03, 0.005], c: shade(skin, 0.85) });
  // Skull: a little narrower at the jaw.
  h.add(S.box(0.2 * f, 0.23, 0.215, 0.07), { p: [0, 0.18, 0.005], c: skin, grad: [shade(skin, 0.82), shade(skin, 1.04)] });
  h.add(S.box(0.17 * f, 0.08, 0.17, 0.04), { p: [0, 0.075, 0.0], c: shade(skin, 0.9) });   // jaw / chin
  for (const s of [-1, 1]) h.add(S.box(0.02, 0.05, 0.04, 0.01), { p: [s * 0.105 * f, 0.19, 0.02], c: shade(skin, 0.95) });
  // Hair.
  if (o.hairStyle === "bun" || o.hairStyle === "short" || o.hairStyle === "cap") {
    h.add(S.box(0.215 * f, 0.075, 0.2, 0.04), { p: [0, 0.295, 0.025], c: hair });
    h.add(S.box(0.21 * f, 0.1, 0.08, 0.03), { p: [0, 0.23, 0.095], c: hair });              // back of the head
    for (const s of [-1, 1]) h.add(S.box(0.022, 0.07, 0.07, 0.01), { p: [s * 0.1 * f, 0.235, 0.045], c: hair });
  }
  if (o.hairStyle === "bun") {
    h.add(S.ball(0.045, 8, 6), { p: [0, 0.25, 0.14], c: hair });
    h.add(S.box(0.16, 0.035, 0.06, 0.015), { p: [0.02, 0.32, -0.07], r: [0, 0, 0.12], c: hair });   // the fringe swept aside
  }
  if (o.hairStyle === "short") h.add(S.box(0.18 * f, 0.03, 0.05, 0.01), { p: [0, 0.325, -0.06], c: hair });
  if (o.bandana) {
    h.add(S.box(0.22 * f, 0.06, 0.23, 0.02), { p: [0, 0.27, 0.005], c: o.bandana });
    h.add(S.box(0.05, 0.1, 0.03, 0.01), { p: [-0.07, 0.22, 0.12], r: [0, 0, 0.5], c: o.bandana });
  }
  // Brows (a little set: these people are tired), eyes, nose, mouth.
  for (const s of [-1, 1]) {
    h.add(S.box(0.05, 0.014, 0.02, 0), { p: [s * 0.045, 0.245, -0.104], r: [0, 0, s * -0.18], c: shade(hair, 0.9) });
    h.add(S.ball(0.026, 8, 6), { p: [s * 0.046, 0.215, -0.092], c: 0xf2f0ea, facet: 0 });
    h.add(S.ball(0.0135, 6, 5), { p: [s * 0.046, 0.215, -0.114], c: eye, facet: 0 });
    h.add(S.ball(0.0065, 5, 4), { p: [s * 0.046, 0.215, -0.1245], c: 0x15110f, facet: 0 });
  }
  h.add(S.box(0.03, 0.05, 0.035, 0.012), { p: [0, 0.185, -0.112], c: shade(skin, 1.03) });
  h.add(S.box(0.052, 0.011, 0.012, 0), { p: [0, 0.128, -0.106], c: mix(skin, 0x7a3a3a, 0.6) });
  if (o.scar) h.add(S.box(0.008, 0.07, 0.006, 0), { p: [0.065 * f, 0.19, -0.102], r: [0, 0, 0.25], c: shade(skin, 0.78) });
}

// ── Rounded parts for the suit ──
// A surface of revolution with ten facets gives the Synty look (flat
// facets on a round form) that a chamfered box never does. Everything
// below is a lathe, a ring or a dome; boxes are left to the pouches, the
// boots and the hands.
const SEG = 10;
const FACE = [0, Math.PI / SEG, 0];     // turn a lathe so a flat facet, not an edge, faces −z
// A rounded segment: a cylinder with a slight belly and rounded ends.
const pod = (rTop, rBot, h, bulge = 1.04) => {
  const y = h / 2, c = Math.min(0.03, h * 0.22), rm = ((rTop + rBot) / 2) * bulge;
  return S.lathe([[0, -y], [rBot * 0.78, -y], [rBot, -y + c], [rm, 0], [rTop, y - c], [rTop * 0.78, y], [0, y]], SEG);
};
// A dome standing on y = 0.
const dome = (r) => S.lathe([[r, 0], [r * 0.97, r * 0.25], [r * 0.87, r * 0.5], [r * 0.7, r * 0.72], [r * 0.45, r * 0.9], [0, r]], SEG);
// The helmet shell: a ball open at the front, wrapping a little past the
// equator (pole at +y, rim at −0.33 R).
const shell = (R) => S.lathe([[R * 0.95, -R * 0.33], [R, 0], [R * 0.96, R * 0.33], [R * 0.84, R * 0.6], [R * 0.63, R * 0.82], [R * 0.33, R * 0.95], [0, R]], 12);
// Soft-suit ribbing at a joint: stacked rings, every other one lighter.
function ribs(b, p, r, h, n, c, s = 1) {
  const pitch = h / n;
  b.add(S.cyl(r * 0.92, r * 0.92, h, SEG), { p, s, c: shade(c, 0.9) });
  for (let i = 0; i < n; i++) b.add(S.cyl(r, r, pitch * 0.55, SEG), { p: [p[0], p[1] - h / 2 + pitch * (i + 0.5), p[2]], s, c: i % 2 ? shade(c, 1.4) : c });
}

export function ranger(b, o = {}) {
  const k = RANGER_SKINS[o.skin ?? "player"];
  const A = k.armour, A2 = k.armour2, U = k.under, C = k.accent, P = k.trim, G = k.glove, L = k.light;
  const dark = 0x1f2326;
  const gA = [shade(A, 0.86), shade(A, 1.03)], gA2 = [shade(A2, 0.88), A2];
  b.node("hips", [0, RIG.hips, 0], [0, 0, 0], (h) => {
    // Pelvis: the soft suit, a rounded hip shell, the belt with its buckle and pouches.
    h.add(S.cyl(0.17, 0.13, 0.16, SEG), { p: [0, -0.1, 0], r: FACE, s: [1.15, 1, 0.85], c: U });
    h.add(S.lathe([[0, -0.1], [0.14, -0.1], [0.19, -0.03], [0.2, 0.05], [0.17, 0.1], [0, 0.1]], SEG), { p: [0, -0.04, 0], r: FACE, s: [1.1, 1, 0.8], c: A2, grad: gA2 });
    h.add(S.cyl(0.215, 0.215, 0.07, SEG), { p: [0, 0.07, 0], r: FACE, s: [1.08, 1, 0.8], c: P });
    h.add(S.box(0.09, 0.05, 0.03, 0.01), { p: [0, 0.07, -0.175], c: C });
    for (const s of [-1, 1]) h.add(S.box(0.1, 0.11, 0.07, 0.03), { p: [s * 0.17, -0.02, 0.13], c: shade(U, 1.35) });
    h.add(S.box(0.09, 0.12, 0.06, 0.025), { p: [-0.19, -0.05, -0.1], c: shade(U, 1.35) });     // spare magazines
    h.add(S.box(0.095, 0.02, 0.065, 0.005), { p: [-0.19, 0.005, -0.1], c: P });
    // The holster on the right thigh (the pistol is parented here at run time).
    h.node("holster", RIG.holster, [0, 0, 0], (hs) => {
      hs.add(S.box(0.05, 0.2, 0.09, 0.02), { p: [0.02, -0.1, 0.0], c: dark });
      hs.add(S.box(0.07, 0.03, 0.12, 0.012), { p: [0.0, -0.04, 0], c: P });
      hs.add(S.box(0.07, 0.03, 0.12, 0.012), { p: [0.0, -0.17, 0], c: P });
    });
    for (const side of [-1, 1]) {
      h.node(side < 0 ? "legL" : "legR", [side * 0.13, -0.06, 0], [0, 0, 0], (l) => {
        // Thigh: ribbed hip joint, an armoured shell with an accent ring.
        ribs(l, [0, -0.05, 0], 0.09, 0.1, 3, U);
        l.add(pod(0.105, 0.088, 0.32), { p: [0, -0.24, 0], r: FACE, c: A, grad: gA });
        l.add(S.cyl(0.096, 0.096, 0.028, SEG), { p: [0, -0.36, 0], r: FACE, c: C });
        l.node(side < 0 ? "shinL" : "shinR", [0, -0.42, 0], [0, 0, 0], (s) => {
          // Knee joint and pad, shin shell, ankle, boot.
          ribs(s, [0, -0.01, 0], 0.078, 0.09, 3, U);
          s.add(S.ball(0.08, 8, 6), { p: [0, -0.02, -0.05], s: [1, 1.1, 0.75], c: A, grad: gA });
          s.add(pod(0.085, 0.072, 0.26), { p: [0, -0.2, 0], r: FACE, c: A, grad: gA });
          s.add(S.cyl(0.088, 0.088, 0.025, SEG), { p: [0, -0.15, 0], r: FACE, c: C });
          ribs(s, [0, -0.365, 0], 0.066, 0.06, 2, U);
          s.add(S.box(0.17, 0.1, 0.27, 0.045), { p: [0, -0.415, -0.04], c: A2, grad: gA2 });
          s.add(S.box(0.16, 0.07, 0.09, 0.03), { p: [0, -0.43, -0.15], c: P });
          s.add(S.box(0.18, 0.04, 0.29, 0.012), { p: [0, -0.45, -0.04], c: dark });
        });
      });
    }
    h.node("torso", [0, RIG.torso, 0], [0, 0, 0], (t) => {
      // Abdomen: the ribbed soft suit.
      ribs(t, [0, 0.1, 0], 0.16, 0.2, 4, U, [1.2, 1, 0.82]);
      // Chest: one rounded shell from the waist to the shoulders, pectoral
      // plates, the centre panel with its buttons and light bar.
      t.add(S.lathe([[0, 0.17], [0.19, 0.17], [0.26, 0.27], [0.285, 0.4], [0.275, 0.5], [0.2, 0.565], [0, 0.58]], SEG), { r: FACE, s: [1, 1, 0.72], c: A, grad: gA });
      for (const s of [-1, 1]) t.add(S.box(0.2, 0.16, 0.06, 0.035), { p: [s * 0.12, 0.44, -0.185], r: [0, s * 0.35, 0], c: shade(A, 1.04) });
      t.add(S.box(0.16, 0.12, 0.04, 0.012), { p: [0.0, 0.3, -0.19], c: P });
      [[-0.05, 0xff4a3a], [0, 0x5af07a], [0.05, 0x4aa0ff]].forEach(([x, c]) => t.add(S.box(0.026, 0.026, 0.012, 0), { p: [x, 0.28, -0.212], c, mat: "glow", glow: 1.3 }));
      t.add(S.box(0.1, 0.025, 0.012, 0), { p: [0, 0.33, -0.212], c: L, mat: "glow", glow: 1.1 });
      t.add(S.box(0.2, 0.018, 0.012, 0), { p: [0, 0.525, -0.19], c: L, mat: "glow", glow: 1.0 });
      t.add(S.box(0.07, 0.03, 0.025, 0.005), { p: [-0.19, 0.53, -0.13], r: [0, -0.55, 0], c: C });   // rank stripe
      // Collar ring and the plate behind the neck.
      t.add(S.torus(0.145, 0.04, 6, 14), { p: [0, 0.57, 0.01], r: [Math.PI / 2, 0, 0], c: P });
      t.add(S.box(0.3, 0.1, 0.1, 0.045), { p: [0, 0.58, 0.11], c: A });
      // The pack: a rounded pack, two tanks, folded wing stubs, antenna.
      t.add(S.box(0.34, 0.38, 0.15, 0.07), { p: [0, 0.35, 0.24], c: shade(A, 0.92), grad: [shade(A, 0.8), shade(A, 0.98)] });
      t.add(S.box(0.3, 0.05, 0.155, 0.015), { p: [0, 0.35, 0.245], c: P });
      for (const s of [-1, 1]) {
        t.add(S.cyl(0.05, 0.05, 0.28, 8, 0.015), { p: [s * 0.1, 0.3, 0.32], c: A2, grad: gA2, mat: "metal" });
        t.add(S.cyl(0.03, 0.035, 0.035, 8), { p: [s * 0.1, 0.46, 0.32], c: P });
        t.add(S.cyl(0.028, 0.028, 0.02, 7), { p: [s * 0.1, 0.15, 0.32], c: L, mat: "glow", glow: 0.9 });
        t.add(S.box(0.09, 0.3, 0.035, 0.015), { p: [s * 0.22, 0.42, 0.3], r: [0, 0, s * -0.25], c: P });
        t.add(S.box(0.092, 0.1, 0.037, 0.012), { p: [s * 0.245, 0.53, 0.3], r: [0, 0, s * -0.25], c: C });
      }
      t.add(S.cyl(0.006, 0.006, 0.42, 4), { p: [0.15, 0.72, 0.26], c: 0x111111 });
      t.node("stow", RIG.stow, [0, 0, 0], (st) => { st.add(S.box(0.06, 0.05, 0.05, 0.015), { c: dark }); });
      // Pauldrons: domes tilted outward, with an accent band and a rim.
      for (const s of [-1, 1]) {
        // (Flattened: the aim camera looks over the right one at the gun.)
        t.at([s * 0.29, 0.51, 0], [0, 0, s * -0.5], 1, (p) => {
          p.add(dome(0.135), { s: [1, 0.72, 1.1], c: A, grad: gA });
          p.add(S.cyl(0.135, 0.125, 0.03, SEG), { p: [0, -0.015, 0], s: [1, 1, 1.1], c: P });
          p.add(S.torus(0.128, 0.016, 5, 14), { p: [0, 0.028, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 1.1], c: C });
        });
      }
      t.node("head", RIG.head, [0, 0, 0], (hd) => {
        face(hd, k);
        // The helmet: a hard shell over the top and back, a glass bubble in
        // front, a rim where they meet, a seal on the collar, ear cups with
        // lights and a lamp on the brow.
        const hc = [0, 0.2, 0.02], R = 0.215;
        hd.add(shell(R), { p: hc, r: [Math.PI / 2, 0, 0], c: A, grad: [shade(A, 1.04), shade(A, 0.9)] });
        hd.add(shell(R * 0.97), { p: hc, r: [Math.PI / 2, 0, 0], s: [-1, 1, 1], c: 0x30353a, facet: 0 });   // the inside (mirrored: faces inward)
        hd.add(S.ball(R * 0.94, 12, 8), { p: hc, c: 0xd8ecff, mat: "glass", smooth: true });
        hd.add(S.torus(R * 0.95, 0.016, 5, 16), { p: [0, 0.2, 0.02 - R * 0.33], c: P });
        hd.add(S.cyl(0.165, 0.14, 0.05, SEG), { p: [0, 0.0, 0.02], r: FACE, c: P });
        for (const s of [-1, 1]) {
          hd.add(S.cyl(0.06, 0.06, 0.04, 8), { p: [s * 0.21, 0.2, 0.03], r: [0, 0, Math.PI / 2], c: A2 });
          hd.add(S.cyl(0.034, 0.034, 0.012, 8), { p: [s * 0.236, 0.2, 0.03], r: [0, 0, Math.PI / 2], c: L, mat: "glow", glow: 1.2 });
        }
        hd.add(S.box(0.08, 0.035, 0.04, 0.012), { p: [0, 0.395, -0.06], c: C });
      });
      // Arms: shoulder pivot, upper arm hanging −y, forearm with the hand.
      for (const side of [-1, 1]) {
        const [sx, sy, sz] = RIG.shoulder;
        t.node(side < 0 ? "armL" : "armR", [side * sx, sy, sz], [0, 0, 0], (a) => {
          a.add(pod(0.072, 0.06, 0.2), { p: [0, -0.13, 0], r: FACE, c: U });
          a.add(S.cyl(0.086, 0.078, 0.13, SEG, 0.015), { p: [0, -0.1, 0], r: FACE, c: A2, grad: gA2 });   // the bicep plate
          ribs(a, [0, -0.265, 0], 0.062, 0.08, 3, U);
          a.add(S.ball(0.062, 8, 6), { p: [0, -0.3, 0.035], s: [1, 1.1, 0.8], c: A, grad: gA });        // elbow pad (bends about x, pad at +z)
          a.node(side < 0 ? "foreL" : "foreR", [0, -RIG.upper, 0], [0, 0, 0], (f) => {
            f.add(pod(0.068, 0.084, 0.2), { p: [0, -0.14, 0], r: FACE, c: A, grad: gA });               // the gauntlet
            f.add(S.cyl(0.082, 0.082, 0.025, SEG), { p: [0, -0.07, 0], r: FACE, c: C });
            ribs(f, [0, -0.262, 0], 0.058, 0.05, 2, U);
            if (side < 0) {
              f.add(S.box(0.055, 0.07, 0.085, 0.02), { p: [-0.095, -0.15, 0.0], c: P });                // the wrist computer
              f.add(S.box(0.012, 0.028, 0.04, 0), { p: [-0.124, -0.145, 0], c: 0xff4a3a, mat: "glow", glow: 1.2 });
            }
            f.add(S.box(0.095, 0.1, 0.1, 0.035), { p: [0, -RIG.fore - 0.01, -0.01], c: G });            // the hand
            f.add(S.box(0.04, 0.055, 0.045, 0.015), { p: [side * -0.05, -RIG.fore + 0.01, -0.04], c: G });   // thumb
            f.add(S.box(0.075, 0.03, 0.05, 0.012), { p: [0, -RIG.fore + 0.02, 0.045], c: A2 });           // knuckle plate
            if (side < 0) f.node("magL", [0, -RIG.fore - 0.02, -0.04], [0.3, 0, 0], (m) => magazine(m));
          });
        });
      }
      t.node("gun", [0.2, 0.2, -0.3], [0, 0, 0], () => {});
    });
  });
}

// ── Guns (they face −z, grip at the origin) ──
// Each has a "mag" node (dropped and replaced on a reload) and, where
// it makes sense, a "bolt" node (racked after it). GUN_RIG tells the
// animation where the fore-end, the magazine and the muzzle are.
export const GUN_COLOURS = { body: 0x2a2e33, metal: 0x50565c, accent: 0xd8862e, light: 0x7ef9ff };

export const GUN_RIG = {
  pistol: { fore: [-0.03, -0.02, 0.0], mag: [0, -0.1, 0.035], magOut: [0, -0.12, 0.03], bolt: [0, 0, 0.045], boltGrab: [0, 0.09, 0.0], muzzle: [0, 0.065, -0.245], long: false },
  rifle: { fore: [0, -0.02, -0.27], mag: [0, -0.01, -0.14], magOut: [0, -0.12, -0.03], bolt: [0, 0, 0.06], boltGrab: [0.05, 0.08, -0.02], muzzle: [0, 0.06, -0.68], long: true },
  launcher: { fore: [0, -0.03, -0.27], mag: [0, 0.04, -0.06], magOut: [0, -0.13, 0], bolt: null, boltGrab: null, muzzle: [0, 0.06, -0.52], long: true },
  laser: { fore: [0, -0.02, -0.26], mag: null, magOut: null, bolt: null, boltGrab: null, muzzle: [0, 0.06, -0.56], long: true },
};

// A rifle magazine (also the one in the hand during a reload).
export function magazine(b) {
  const G = GUN_COLOURS;
  b.add(S.box(0.04, 0.16, 0.07, 0.012), { p: [0, -0.08, 0], c: G.metal, mat: "metal" });
  b.add(S.box(0.044, 0.016, 0.075, 0), { p: [0, -0.165, 0], c: G.accent });
  b.add(S.box(0.042, 0.03, 0.03, 0), { p: [0, -0.1, 0.0], c: shade(G.metal, 0.7) });
}

export function pistol(b) {
  const G = GUN_COLOURS;
  // Slide (racks on a reload), sights and the LED on it.
  b.node("bolt", [0, 0, 0], [0, 0, 0], (s) => {
    s.add(S.box(0.05, 0.06, 0.215, 0.015), { p: [0, 0.07, -0.09], c: G.metal, mat: "metal" });
    for (let i = 0; i < 3; i++) s.add(S.box(0.052, 0.03, 0.008, 0), { p: [0, 0.07, -0.0 + i * 0.012], c: shade(G.metal, 0.6) });
    s.add(S.box(0.012, 0.016, 0.012, 0), { p: [0, 0.108, -0.185], c: G.body });
    s.add(S.box(0.034, 0.014, 0.014, 0), { p: [0, 0.107, -0.005], c: G.body });
    s.add(S.box(0.052, 0.008, 0.025, 0), { p: [0, 0.05, 0.005], c: G.light, mat: "glow", glow: 1.1 });
  });
  // Frame, rail block, grip with its texture, trigger guard and trigger.
  b.add(S.box(0.046, 0.045, 0.2, 0.012), { p: [0, 0.025, -0.085], c: G.body });
  b.add(S.box(0.04, 0.03, 0.05, 0.01), { p: [0, 0.012, -0.16], c: G.accent });
  b.add(S.box(0.046, 0.135, 0.065, 0.015), { p: [0, -0.045, 0.012], r: [-0.3, 0, 0], c: G.body });
  b.add(S.box(0.048, 0.07, 0.03, 0), { p: [0, -0.05, 0.028], r: [-0.3, 0, 0], c: shade(G.body, 1.4) });
  b.add(S.box(0.012, 0.01, 0.07, 0), { p: [0, -0.032, -0.05], c: G.body });
  b.add(S.box(0.012, 0.035, 0.01, 0), { p: [0, -0.015, -0.085], c: G.body });
  b.add(S.box(0.008, 0.024, 0.008, 0), { p: [0, -0.012, -0.045], c: G.metal, mat: "metal" });
  b.node("mag", GUN_RIG.pistol.mag, [-0.3, 0, 0], (m) => {
    m.add(S.box(0.03, 0.05, 0.05, 0.008), { p: [0, -0.02, 0], c: G.metal, mat: "metal" });
    m.add(S.box(0.05, 0.016, 0.07, 0), { p: [0, -0.045, 0], c: G.accent });
  });
  b.add(S.cyl(0.013, 0.013, 0.05, 6), { p: [0, 0.066, -0.215], r: [Math.PI / 2, 0, 0], c: G.metal, mat: "metal" });
}

export function rifle(b) {
  const G = GUN_COLOURS;
  // Receiver, top rail, sight with a red dot, the ammo counter.
  b.add(S.box(0.07, 0.1, 0.3, 0.02), { p: [0, 0.045, -0.08], c: G.metal, mat: "metal" });
  b.add(S.box(0.05, 0.02, 0.52, 0), { p: [0, 0.105, -0.2], c: G.body });
  b.add(S.box(0.04, 0.045, 0.1, 0.01), { p: [0, 0.135, -0.08], c: G.metal, mat: "metal" });
  b.add(S.box(0.022, 0.012, 0.008, 0), { p: [0, 0.145, -0.125], c: 0xff4040, mat: "glow", glow: 1.4 });
  b.add(S.box(0.005, 0.02, 0.05, 0), { p: [-0.037, 0.05, -0.04], c: G.light, mat: "glow", glow: 1.0 });
  // Handguard with vents, fore grip, barrel and muzzle brake.
  b.add(S.box(0.075, 0.09, 0.3, 0.025), { p: [0, 0.04, -0.4], c: G.body });
  for (let i = 0; i < 4; i++) b.add(S.box(0.08, 0.012, 0.03, 0), { p: [0, 0.06, -0.31 - i * 0.055], c: shade(G.body, 0.55) });
  b.add(S.box(0.077, 0.016, 0.14, 0), { p: [0, 0.085, -0.4], c: G.accent });
  b.add(S.box(0.035, 0.085, 0.04, 0.012), { p: [0, -0.04, -0.33], r: [-0.15, 0, 0], c: G.body });
  b.add(S.cyl(0.016, 0.016, 0.16, 6), { p: [0, 0.06, -0.6], r: [Math.PI / 2, 0, 0], c: G.metal, mat: "metal" });
  b.add(S.cyl(0.024, 0.024, 0.06, 6), { p: [0, 0.06, -0.66], r: [Math.PI / 2, 0, 0], c: shade(G.metal, 0.8), mat: "metal" });
  // Stock, butt pad, cheek riser; pistol grip; trigger guard.
  b.add(S.box(0.05, 0.075, 0.2, 0.02), { p: [0, 0.045, 0.14], c: G.body });
  b.add(S.box(0.055, 0.11, 0.04, 0.01), { p: [0, 0.03, 0.25], c: shade(G.body, 0.7) });
  b.add(S.box(0.052, 0.03, 0.12, 0.01), { p: [0, 0.095, 0.16], c: shade(G.body, 1.2) });
  b.add(S.box(0.052, 0.012, 0.1, 0), { p: [0, 0.02, 0.15], c: G.accent });
  b.add(S.box(0.045, 0.12, 0.06, 0.015), { p: [0, -0.05, 0.0], r: [-0.3, 0, 0], c: G.body });
  b.add(S.box(0.012, 0.01, 0.09, 0), { p: [0, -0.035, -0.07], c: G.body });
  b.add(S.box(0.008, 0.024, 0.008, 0), { p: [0, -0.015, -0.05], c: G.metal, mat: "metal" });
  b.node("mag", GUN_RIG.rifle.mag, [0.2, 0, 0], (m) => magazine(m));
  b.node("bolt", [0.038, 0.07, -0.02], [0, 0, 0], (s) => { s.add(S.box(0.03, 0.02, 0.045, 0.006), { c: G.metal, mat: "metal" }); });
}

export function launcher(b) {
  const G = GUN_COLOURS;
  // Fat barrel with a muzzle ring; the drum; a receiver on top with a rail.
  b.add(S.cyl(0.062, 0.062, 0.4, 8, 0.01), { p: [0, 0.06, -0.3], r: [Math.PI / 2, 0, 0], c: G.body, mat: "metal" });
  b.add(S.torus(0.066, 0.014, 4, 10), { p: [0, 0.06, -0.49], c: G.accent });
  b.add(S.box(0.07, 0.06, 0.26, 0.02), { p: [0, 0.125, -0.1], c: G.body });
  b.add(S.box(0.05, 0.02, 0.3, 0), { p: [0, 0.165, -0.12], c: shade(G.body, 1.3) });
  b.add(S.box(0.005, 0.02, 0.05, 0), { p: [-0.037, 0.125, -0.08], c: 0xff9a4a, mat: "glow", glow: 1.0 });
  b.node("mag", GUN_RIG.launcher.mag, [0, 0, 0], (m) => {
    m.add(S.cyl(0.1, 0.1, 0.14, 8, 0.02), { r: [Math.PI / 2, 0, 0], c: 0x5a4a3a });
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      m.add(S.cyl(0.025, 0.025, 0.02, 6), { p: [Math.cos(a) * 0.06, Math.sin(a) * 0.06, -0.075], r: [Math.PI / 2, 0, 0], c: 0xff9a4a, mat: "glow", glow: 0.7 });
    }
    m.add(S.box(0.2, 0.025, 0.145, 0), { p: [0, 0, 0], c: G.accent });
  });
  // Stock, grip, fore grip.
  b.add(S.box(0.06, 0.08, 0.2, 0.02), { p: [0, 0.05, 0.17], c: G.body });
  b.add(S.box(0.065, 0.12, 0.04, 0.01), { p: [0, 0.035, 0.28], c: shade(G.body, 0.7) });
  b.add(S.box(0.045, 0.12, 0.06, 0.015), { p: [0, -0.05, 0.02], r: [-0.3, 0, 0], c: G.body });
  b.add(S.box(0.012, 0.01, 0.08, 0), { p: [0, -0.035, -0.05], c: G.body });
  b.add(S.box(0.04, 0.085, 0.04, 0.012), { p: [0, -0.03, -0.3], r: [-0.15, 0, 0], c: G.body });
}

export function laser(b) {
  const G = GUN_COLOURS, W = 0xd8dde2;
  // White body with heat fins and three glowing focus rings, the emitter.
  b.add(S.box(0.08, 0.1, 0.44, 0.03), { p: [0, 0.05, -0.16], c: W, grad: [shade(W, 0.85), W] });
  for (let i = 0; i < 4; i++) b.add(S.box(0.1, 0.03, 0.012, 0), { p: [0, 0.1, -0.2 - i * 0.045], c: 0xb8bec4 });
  for (let i = 0; i < 3; i++) b.add(S.torus(0.05, 0.012, 4, 10), { p: [0, 0.06, -0.3 - i * 0.07], c: G.light, mat: "glow", glow: 1.1 });
  b.add(S.cyl(0.022, 0.034, 0.14, 6), { p: [0, 0.06, -0.46], r: [Math.PI / 2, 0, 0], c: 0x3a4048, mat: "metal" });
  b.add(S.cyl(0.014, 0.014, 0.02, 6), { p: [0, 0.06, -0.535], r: [Math.PI / 2, 0, 0], c: G.light, mat: "glow", glow: 1.6 });
  // Coolant tank on the left, a handle on top, stock, grip, accent.
  b.add(S.cyl(0.03, 0.03, 0.16, 7), { p: [-0.058, 0.075, -0.06], r: [Math.PI / 2, 0, 0], c: 0xbfe8ff, mat: "glass", smooth: true });
  b.add(S.cyl(0.014, 0.014, 0.14, 6), { p: [-0.058, 0.075, -0.06], r: [Math.PI / 2, 0, 0], c: G.light, mat: "glow", glow: 0.8 });
  b.add(S.box(0.03, 0.03, 0.14, 0.01), { p: [0, 0.135, -0.1], c: 0xb8bec4 });
  b.add(S.box(0.06, 0.06, 0.22, 0.02), { p: [0, 0.03, 0.17], c: 0xb8bec4 });
  b.add(S.box(0.065, 0.09, 0.03, 0.01), { p: [0, 0.03, 0.28], c: G.body });
  b.add(S.box(0.045, 0.13, 0.065, 0.015), { p: [0, -0.05, 0.0], r: [-0.25, 0, 0], c: G.body });
  b.add(S.box(0.084, 0.02, 0.14, 0), { p: [0, 0.11, -0.03], c: 0x2fa9c8 });
  b.add(S.box(0.084, 0.012, 0.1, 0), { p: [0, 0.01, -0.3], c: 0x2fa9c8 });
}
export const GUNS = { pistol, rifle, launcher, laser };

// ── A colony survivor ──
// Overalls over a shirt, work boots, a hard hat with a lamp (or a bandana),
// and a face. o: { c (overalls), sit, hat, hair, skin, bandana, female }.
export function survivor(b, o = {}) {
  const C = o.c ?? 0xd08a2a, shirt = o.shirt ?? 0x8c8a80, skin = o.skin ?? 0xc69a7a, hair = o.hair ?? 0x3a2a20;
  const boot = 0x3a2f28, sit = o.sit;
  if (sit) {
    b.add(S.box(0.44, 0.42, 0.44, 0.04), { p: [0, 0.21, 0.14], c: 0x55585c });
    for (const s of [-1, 1]) {
      b.add(S.box(0.15, 0.17, 0.46, 0.04), { p: [s * 0.11, 0.5, -0.1], c: shade(C, 0.85) });                   // thigh forward
      b.add(S.box(0.14, 0.42, 0.15, 0.04), { p: [s * 0.11, 0.22, -0.32], c: shade(C, 0.8) });                    // shin down
      b.add(S.box(0.15, 0.1, 0.26, 0.03), { p: [s * 0.11, 0.05, -0.36], c: boot });
    }
  } else {
    for (const s of [-1, 1]) {
      b.add(S.box(0.16, 0.44, 0.18, 0.05), { p: [s * 0.11, 0.62, 0], c: shade(C, 0.85) });
      b.add(S.box(0.15, 0.4, 0.17, 0.05), { p: [s * 0.11, 0.26, 0.0], c: shade(C, 0.8) });
      b.add(S.box(0.16, 0.12, 0.27, 0.03), { p: [s * 0.11, 0.06, -0.04], c: boot });
      b.add(S.box(0.17, 0.04, 0.29, 0.01), { p: [s * 0.11, 0.02, -0.04], c: 0x1f1b18 });
    }
  }
  const y0 = sit ? 0.42 : 0.84;
  // Torso: shirt, the bib of the overalls, straps, a chest pocket, belt.
  b.add(S.box(0.38, 0.5, 0.24, 0.06), { p: [0, y0 + 0.28, 0], c: shirt, grad: [shade(shirt, 0.85), shirt] });
  b.add(S.box(0.4, 0.26, 0.26, 0.05), { p: [0, y0 + 0.14, 0], c: C, grad: [shade(C, 0.8), C] });
  b.add(S.box(0.24, 0.2, 0.27, 0.03), { p: [0, y0 + 0.36, 0], c: C });
  for (const s of [-1, 1]) b.add(S.box(0.05, 0.3, 0.26, 0.01), { p: [s * 0.1, y0 + 0.4, 0.0], c: shade(C, 0.75) });
  b.add(S.box(0.1, 0.07, 0.02, 0.005), { p: [0.05, y0 + 0.4, -0.14], c: shade(C, 0.9) });
  b.add(S.box(0.41, 0.05, 0.27, 0.01), { p: [0, y0 + 0.02, 0], c: 0x3a2f28 });
  // Arms: sleeves, forearms rolled up, hands.
  for (const s of [-1, 1]) {
    const rx = sit ? -1.1 : 0.15;
    b.at([s * 0.25, y0 + 0.46, 0], [rx, 0, s * 0.12], 1, (a) => {
      a.add(S.box(0.12, 0.28, 0.13, 0.04), { p: [0, -0.14, 0], c: shirt });
      a.add(S.box(0.1, 0.24, 0.11, 0.04), { p: [0, -0.38, sit ? -0.08 : 0], r: [sit ? 0.9 : 0.2, 0, 0], c: skin });
      a.add(S.box(0.09, 0.08, 0.09, 0.03), { p: [0, -0.52, sit ? -0.2 : -0.04], c: shade(skin, 0.95) });
    });
  }
  b.node("head", [0, y0 + 0.5, 0], [0, 0, 0], (h) => {
    face(h, { skin, hair, eye: o.eye ?? 0x3a2a1a, hairStyle: o.hat === false && !o.bandana ? "short" : "cap", bandana: o.bandana, female: o.female });
    if (o.hat !== false && !o.bandana) {
      const Y = o.hatColour ?? 0xe8c23a;
      h.add(S.lathe([[0.17, 0], [0.15, 0.06], [0.12, 0.11], [0.07, 0.14], [0, 0.15]], 10), { p: [0, 0.27, 0.01], c: Y, grad: [shade(Y, 0.9), Y] });
      h.add(S.cyl(0.19, 0.19, 0.02, 10), { p: [0, 0.27, 0.01], c: shade(Y, 0.95) });
      h.add(S.box(0.1, 0.02, 0.08, 0.005), { p: [0, 0.27, -0.21], c: shade(Y, 0.95) });
      h.add(S.cyl(0.025, 0.03, 0.04, 7), { p: [0, 0.34, -0.14], r: [Math.PI / 2, 0, 0], c: 0x2a2a2a });
      h.add(S.cyl(0.018, 0.018, 0.01, 7), { p: [0, 0.34, -0.165], r: [Math.PI / 2, 0, 0], c: 0xfff2c0, mat: "glow", glow: 1.4 });
    }
  });
}
