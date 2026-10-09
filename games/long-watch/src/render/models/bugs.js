import { SHAPE as S, shade, mix } from "../modelkit.js";

// ── The Hive ─────────────────────────────────────────────────────────────
// Beetle-like, in the way of the silithids: a big domed carapace split down
// the middle and striped with dark markings, a ridged abdomen tucked under
// it, a small horned head low in front, blade-like legs with serrated fins
// and pointed feet, scythe forelimbs on the big ones. Low poly in the Synty
// manner: surfaces of revolution with ten facets, flat colours, a glowing
// seam or two for the bloom. Each type has its own shell colour.
//
// Legs are nodes "l0"…"l5" (pivot at the body) for the scuttle; heads,
// jaws, sacs and frills are nodes too. Faces −z.

export const HIVE = { chitin: 0x3a2a36, plate: 0x5a3f62, belly: 0x6a5460, glow: 0xb8ff4a, eye: 0xffe36a, acid: 0x9cff3a, bone: 0xd8c8a8 };

const SEG = 10;
const FACE = [0, Math.PI / SEG, 0];
// A dome standing on y = 0 (a half ball).
const dome = (r) => S.lathe([[r, 0], [r * 0.97, r * 0.25], [r * 0.87, r * 0.5], [r * 0.7, r * 0.72], [r * 0.45, r * 0.9], [0, r]], SEG);
// A rounded segment with a slight belly.
const pod = (rTop, rBot, h, bulge = 1.04) => {
  const y = h / 2, c = Math.min(0.03, h * 0.22), rm = ((rTop + rBot) / 2) * bulge;
  return S.lathe([[0, -y], [rBot * 0.78, -y], [rBot, -y + c], [rm, 0], [rTop, y - c], [rTop * 0.78, y], [0, y]], SEG);
};
// A ridged abdomen: a lathe along y with notches between its rings, widest
// near the base (y = 0), pointed at the tip (y = L).
const abdomen = (r, L) => S.lathe([[0, 0], [r * 0.85, 0], [r, L * 0.14], [r * 0.8, L * 0.3], [r * 0.96, L * 0.34], [r * 0.72, L * 0.52], [r * 0.86, L * 0.56], [r * 0.5, L * 0.74], [r * 0.6, L * 0.78], [r * 0.25, L * 0.93], [0, L]], SEG);

// A tapered rod from point a to point b (in the x-y plane of the current frame).
function seg(b, [ax, ay], [bx, by], r0, r1, c, mat) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  b.add(S.cyl(r1, r0, L, 6), { p: [(ax + bx) / 2, (ay + by) / 2, 0], r: [0, 0, Math.atan2(-dx, dy)], c, mat });
}
// A thin serrated fin hanging under a rod from a to b: a plate and teeth.
function fin(b, [ax, ay], [bx, by], h, t, n, c) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const px = uy, py = -ux;                 // perpendicular, pointing down-ish
  const a = Math.atan2(-dx, dy);
  b.add(S.box(h, L * 0.8, t, 0.004), { p: [(ax + bx) / 2 + px * h * 0.45, (ay + by) / 2 + py * h * 0.45, 0], r: [0, 0, a], c });
  for (let i = 0; i < n; i++) {
    const f = 0.2 + (i / (n - 1 || 1)) * 0.6;
    b.add(S.cone(h * 0.28, h * 0.8, 4), { p: [ax + dx * f + px * h * 1.1, ay + dy * f + py * h * 1.1, 0], r: [0, 0, a + Math.PI], c: shade(c, 1.1) });
  }
}

// A leg from the body (pivot at height y above the ground) out to a knee
// high over it, then down to a pointed foot: a socket at the hip, a thick
// femur with a serrated fin, a thinner tibia, a claw.
function leg(b, name, x, y, z, side, len, thick, c, splay = 0.7, rise = 0.8) {
  b.node(name, [x, y, z], [0, 0, 0], (l) => {
    const knee = [side * len * 0.42, len * rise * 0.55], foot = [side * len * (0.55 + splay * 0.25), -y + thick * 0.4];
    l.add(S.sphere(thick * 0.9, 0), { p: [side * thick * 0.25, 0, 0], c: shade(c, 1.15) });
    seg(l, [0, 0], knee, thick * 1.25, thick * 0.8, c);
    fin(l, [0, 0], knee, thick * 1.3, thick * 0.25, 3, shade(c, 0.8));
    l.add(S.sphere(thick * 0.85, 0), { p: [knee[0], knee[1], 0], c: shade(c, 0.9) });
    l.add(S.cone(thick * 0.45, thick * 1.8, 4), { p: [knee[0] + side * thick * 0.3, knee[1] + thick * 1.1, 0], r: [0, 0, side * -0.4], c: shade(c, 1.2) });
    seg(l, knee, foot, thick * 0.7, thick * 0.32, shade(c, 0.85));
    l.add(S.cone(thick * 0.4, thick * 2.4, 4), { p: [foot[0], foot[1] - thick * 0.4, 0], r: [Math.PI, 0, 0], c: HIVE.bone });
  });
}

// The carapace: a dome scaled to [sx, sy, sz], split by a dark ridge over
// the top, a thick dark rim, and the markings as dark arcs laid into the
// surface (tiger stripes down both sides).
function shell(bd, p, R, s, c, dark, trim = null) {
  bd.at(p, [0, 0, 0], s, (q) => {
    q.add(dome(R), { r: FACE, c, grad: [shade(c, 0.72), shade(c, 1.1)] });
    q.add(S.cyl(R * 1.04, R * 0.98, R * 0.1, SEG), { p: [0, -R * 0.02, 0], r: FACE, c: dark });
    if (trim) q.add(S.cyl(R * 1.0, R * 1.06, R * 0.06, SEG), { p: [0, -R * 0.1, 0], r: FACE, c: trim });
    q.add(S.torus(R * 0.99, R * 0.03, 4, 14, Math.PI), { r: [0, Math.PI / 2, 0], c: dark });
    const marks = [[0.5, 0.25, 0.7], [0.85, 1.1, 0.6], [1.15, 0.35, 0.5], [0.7, 1.9, 0.55], [1.3, 1.5, 0.45]];
    for (const side of [-1, 1]) for (const [tilt, from, arc] of marks) {
      q.at([0, 0, 0], [0, 0, side * tilt], 1, (m) => m.add(S.torus(R * 0.985, R * 0.028, 4, 8, arc), { r: [0, Math.PI / 2, from], c: dark }));
    }
  });
}
// A small horned head: a rounded face with a brow, mandibles, eyes, horns.
function head(h, r, c, dark, eye, horns = 1) {
  h.add(pod(r * 0.8, r, r * 1.6), { r: [Math.PI / 2 + 0.2, 0, 0], c, grad: [shade(c, 0.8), shade(c, 1.05)] });
  h.add(dome(r * 0.9), { p: [0, r * 0.25, r * 0.1], s: [1.15, 0.5, 1.1], r: FACE, c: shade(c, 1.1) });
  for (const s of [-1, 1]) {
    h.add(S.cone(r * 0.22, r * 1.3, 4), { p: [s * r * 0.5, -r * 0.3, -r * 0.8], r: [-Math.PI / 2 + 0.4, s * 0.6, 0], c: dark });   // mandibles
    h.add(S.sphere(r * 0.2, 0), { p: [s * r * 0.5, r * 0.15, -r * 0.7], c: eye, mat: "glow", glow: 1.4 });
    h.add(S.sphere(r * 0.12, 0), { p: [s * r * 0.75, 0, -r * 0.45], c: eye, mat: "glow", glow: 1.2 });
    if (horns) h.add(S.cone(r * 0.16, r * 1.2 * horns, 4), { p: [s * r * 0.45, r * 0.6, -r * 0.3], r: [-1.1, 0, s * 0.5], c: shade(dark, 1.3) });
  }
}

// ── Swarmer: small, rust-orange, many ──
export function swarmer(b) {
  const C = 0xc8702e, D = 0x3a1e1a, B = 0x5a3a2e;
  b.node("body", [0, 0.42, 0], [0, 0, 0], (bd) => {
    bd.add(pod(0.18, 0.2, 0.36), { p: [0, -0.12, -0.15], r: [Math.PI / 2, 0, 0], c: B });                  // thorax
    bd.add(abdomen(0.28, 0.5), { p: [0, -0.14, 0.2], r: [Math.PI / 2, 0, 0], s: [1, 0.7, 1], c: shade(B, 0.9), grad: [shade(B, 0.75), B] });
    shell(bd, [0, -0.02, 0.08], 0.4, [1, 0.7, 1.3], C, D);
    bd.add(S.box(0.22, 0.02, 0.05, 0.005), { p: [0, -0.02, -0.44], c: HIVE.glow, mat: "glow", glow: 0.9 });  // the seam under the shell's front
    bd.node("head", [0, -0.12, -0.42], [0, 0, 0], (h) => head(h, 0.16, B, D, HIVE.eye, 1));
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.16, 0.42, -0.18 + row * 0.2, side, 0.62, 0.065, B);
  }
}

// ── Spitter: teal, the acid sac on its back ──
export function spitter(b) {
  const C = 0x2fb0a0, D = 0x183840, B = 0x3a3340;
  b.node("body", [0, 0.6, 0], [0, 0, 0], (bd) => {
    bd.add(pod(0.28, 0.32, 0.5), { p: [0, -0.2, -0.25], r: [Math.PI / 2, 0, 0], c: B });
    bd.add(abdomen(0.4, 0.8), { p: [0, -0.2, 0.2], r: [Math.PI / 2, 0, 0], s: [1, 0.7, 1], c: shade(B, 0.9), grad: [shade(B, 0.75), B] });
    shell(bd, [0, -0.05, 0.0], 0.6, [1, 0.7, 1.3], C, D);
    bd.add(S.box(0.36, 0.025, 0.06, 0.005), { p: [0, -0.05, -0.66], c: HIVE.glow, mat: "glow", glow: 0.9 });
    // The sac rides in a cage of chitin on the back of the shell.
    bd.node("sac", [0, 0.4, 0.5], [0, 0, 0], (s) => {
      s.add(S.ball(0.3, 10, 7), { s: [1, 0.9, 1.1], c: HIVE.acid, mat: "glow", glow: 0.9, smooth: true });
      s.add(S.torus(0.28, 0.04, 4, 12), { r: [Math.PI / 2, 0, 0], p: [0, -0.1, 0], c: D });
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; s.add(S.cone(0.05, 0.4, 4), { p: [Math.cos(a) * 0.28, 0.0, Math.sin(a) * 0.3], r: [Math.sin(a) * -0.5, 0, Math.cos(a) * 0.5], c: D }); }
    });
    bd.node("head", [0, -0.05, -0.6], [0, 0, 0], (h) => {
      head(h, 0.2, B, D, HIVE.eye, 0.8);
      h.add(S.cyl(0.07, 0.1, 0.1, 7), { p: [0, -0.06, -0.3], r: [Math.PI / 2, 0, 0], c: HIVE.acid, mat: "glow", glow: 1.2 });   // the spout
      h.add(S.torus(0.1, 0.025, 4, 8), { p: [0, -0.06, -0.33], c: D });
    });
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.3, 0.6, -0.3 + row * 0.32, side, 0.85, 0.09, B, 0.6, 0.8);
  }
}

// ── Charger: deep violet with gold, a horned face plate, scythe forelimbs ──
export function charger(b) {
  const C = 0x4a3a9a, D = 0x1e1838, B = 0x3a2a4a, G = 0xd8a24a;
  b.node("body", [0, 0.85, 0], [0, 0, 0], (bd) => {
    bd.add(pod(0.5, 0.55, 0.9), { p: [0, -0.3, -0.4], r: [Math.PI / 2, 0, 0], c: B });
    bd.add(abdomen(0.6, 1.3), { p: [0, -0.3, 0.3], r: [Math.PI / 2, 0, 0], s: [1, 0.7, 1], c: shade(B, 0.9), grad: [shade(B, 0.72), B] });
    shell(bd, [0, -0.05, 0.1], 0.95, [1, 0.68, 1.3], C, D, G);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) bd.add(S.cone(0.07, 0.35, 4), { p: [s * 0.9, 0.05, -0.4 + i * 0.5], r: [0, 0, s * 1.3], c: G });   // side spikes
    bd.add(S.box(0.6, 0.04, 0.08, 0.01), { p: [0, -0.05, -1.2], c: HIVE.glow, mat: "glow", glow: 0.8 });
    bd.node("head", [0, -0.1, -0.95], [0, 0, 0], (h) => {
      // The face plate: a broad dome turned forward, with a gold rim, the
      // great horn up from its crown and two side horns. What you cannot shoot through.
      h.add(dome(0.7), { p: [0, 0.05, 0.1], r: [-Math.PI / 2 + 0.25, Math.PI / SEG, 0], s: [1.2, 0.55, 1.05], c: C, grad: [shade(C, 0.75), shade(C, 1.15)] });
      h.add(S.torus(0.7, 0.04, 4, 16), { p: [0, 0.05, 0.12], r: [0.25, 0, 0], s: [1.2, 1.05, 1], c: G });
      h.add(S.torus(0.6, 0.03, 4, 16), { p: [0, 0.05, -0.12], r: [0.25, 0, 0], s: [1.2, 1.05, 1], c: D });
      h.add(S.cone(0.14, 1.0, 5), { p: [0, 0.55, -0.35], r: [-0.9, 0, 0], c: shade(D, 1.4) });                  // the great horn
      h.add(S.cone(0.08, 0.5, 5), { p: [0, 0.98, -0.78], r: [-0.3, 0, 0], c: shade(D, 1.5) });                 // its curved tip
      for (const s of [-1, 1]) {
        h.add(S.cone(0.1, 0.6, 5), { p: [s * 0.62, 0.3, -0.3], r: [-1.1, 0, s * -0.7], c: shade(D, 1.4) });
        h.add(S.sphere(0.07, 0), { p: [s * 0.3, -0.1, -0.5], c: 0xff5a3a, mat: "glow", glow: 1.4 });
        h.add(S.sphere(0.04, 0), { p: [s * 0.5, -0.18, -0.38], c: 0xff5a3a, mat: "glow", glow: 1.2 });
        h.add(S.cone(0.1, 0.5, 4), { p: [s * 0.22, -0.38, -0.4], r: [-Math.PI / 2 + 0.4, s * 0.5, 0], c: D });   // mandibles
      }
      h.add(S.box(0.1, 0.4, 0.05, 0.015), { p: [0, 0.0, -0.5], r: [0.25, 0, 0], c: HIVE.glow, mat: "glow", glow: 0.6 });
    });
    // Scythe forelimbs: a leaf-shaped blade on a short arm, each side of the head.
    for (const s of [-1, 1]) {
      bd.at([s * 0.6, -0.45, -0.7], [0, s * 0.5, s * -0.3], 1, (a) => {
        a.add(S.cyl(0.08, 0.1, 0.5, 6), { p: [0, 0, -0.25], r: [Math.PI / 2, 0, 0], c: B });
        a.add(S.extrude([[0, 0], [0.16, -0.25], [0.12, -0.7], [0, -1.05], [-0.08, -0.6], [-0.08, -0.2]], 0.06, 0.02), { p: [0, 0.0, -0.5], r: [Math.PI / 2 - 0.3, 0, s * 0.2], c: D });
      });
    }
  });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.55, 0.85, -0.55 + row * 0.55, side, 1.15, 0.15, B, 0.6, 0.8);
  }
}

// ── Sentry: tall on four legs, purple, a long neck and one great eye ──
export function sentry(b) {
  const C = 0x7a4a9a, D = 0x2a1a38, B = 0x4a3350;
  b.node("body", [0, 0.95, 0], [0, 0, 0], (bd) => {
    bd.add(pod(0.2, 0.24, 0.4), { p: [0, -0.12, -0.1], r: [Math.PI / 2, 0, 0], c: B });
    bd.add(abdomen(0.28, 0.5), { p: [0, -0.15, 0.2], r: [Math.PI / 2, 0, 0], s: [1, 0.7, 1], c: shade(B, 0.9), grad: [shade(B, 0.75), B] });
    shell(bd, [0, -0.02, 0.05], 0.4, [1, 0.7, 1.3], C, D);
    bd.add(S.box(0.24, 0.025, 0.05, 0.005), { p: [0, -0.02, -0.46], c: HIVE.glow, mat: "glow", glow: 0.9 });
    bd.node("head", [0, 0.25, -0.1], [0, 0, 0], (h) => {
      // The neck: ringed segments up to the head.
      for (let i = 0; i < 5; i++) h.add(S.cyl(0.085 - i * 0.006, 0.1 - i * 0.006, 0.1, SEG), { p: [0, 0.05 + i * 0.12, -i * 0.02], c: i % 2 ? shade(B, 1.25) : B });
      h.add(pod(0.16, 0.14, 0.3), { p: [0, 0.64, -0.1], r: [Math.PI / 2 + 0.3, 0, 0], c: B });
      h.add(dome(0.2), { p: [0, 0.68, -0.02], r: FACE, s: [1.1, 0.5, 1.2], c: C, grad: [shade(C, 0.75), shade(C, 1.1)] });
      // One big eye: the sentry's whole point, with a lid ridge over it.
      h.add(S.ball(0.11, 10, 7), { p: [0, 0.64, -0.22], s: [1, 0.8, 0.6], c: 0xff9a3a, mat: "glow", glow: 1.7, smooth: true });
      h.add(S.ball(0.045, 8, 6), { p: [0, 0.64, -0.27], s: [1, 1, 0.6], c: 0x1a0a08, facet: 0 });
      h.add(S.torus(0.12, 0.025, 4, 10, Math.PI), { p: [0, 0.65, -0.2], c: D });
      for (const s of [-1, 1]) h.add(S.cone(0.03, 0.3, 4), { p: [s * 0.12, 0.78, -0.08], r: [-0.8, 0, s * 0.6], c: shade(D, 1.4) });
      h.node("frill", [0, 0.68, 0.06], [0, 0, 0], (f) => {
        for (let i = 0; i < 7; i++) {
          const a = (i / 6 - 0.5) * 2.6;
          f.add(S.box(0.05, 0.42, 0.02, 0.01), { p: [Math.sin(a) * 0.18, Math.cos(a) * 0.18, 0.02], r: [0, 0, -a], c: i % 2 ? HIVE.glow : shade(C, 1.2), mat: i % 2 ? "glow" : "solid", glow: 0.7 });
        }
      });
    });
  });
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 0.2, 0.95, -0.12 + row * 0.3, side, 1.25, 0.06, B, 0.4, 0.3);
  }
}

// ── Warden: the boss, dark violet and gold, three sacs, a maw ──
export function warden(b) {
  const C = 0x3c2a6a, D = 0x16102a, B = 0x2e2238, G = 0xd8a24a, P = mix(HIVE.plate, 0x6a4a5a, 0.4);
  b.node("body", [0, 2.0, 0], [0, 0, 0], (bd) => {
    bd.add(pod(1.1, 1.3, 2.2), { p: [0, -0.6, -0.9], r: [Math.PI / 2, 0, 0], c: B, grad: [shade(B, 0.8), shade(B, 1.1)] });
    bd.add(abdomen(1.3, 2.8), { p: [0, -0.6, 0.6], r: [Math.PI / 2, 0, 0], s: [1, 0.7, 1], c: shade(B, 0.9), grad: [shade(B, 0.7), B] });
    shell(bd, [0, -0.1, 0.1], 2.0, [0.9, 0.68, 1.3], C, D, G);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) bd.add(S.cone(0.14, 0.7, 4), { p: [s * 1.7, -0.1, -1.2 + i * 0.8], r: [0, 0, s * 1.25], c: G });
    bd.add(S.box(1.4, 0.08, 0.2, 0.03), { p: [0, -0.1, -2.5], c: HIVE.glow, mat: "glow", glow: 0.8 });
    const sac = (name, p) => bd.node(name, p, [0, 0, 0], (s) => {
      s.add(S.ball(0.6, 10, 7), { s: [1, 0.9, 1.1], c: HIVE.acid, mat: "glow", glow: 1.0, smooth: true });
      s.add(S.torus(0.56, 0.07, 4, 14), { r: [Math.PI / 2, 0, 0], p: [0, -0.2, 0], c: D });
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; s.add(S.cone(0.1, 0.8, 4), { p: [Math.cos(a) * 0.56, 0.05, Math.sin(a) * 0.58], r: [Math.sin(a) * -0.5, 0, Math.cos(a) * 0.5], c: D }); }
    });
    sac("sacL", [-1.75, 0.2, -0.2]);
    sac("sacR", [1.75, 0.2, -0.2]);
    sac("sacT", [0, 0.2, 3.2]);
    bd.node("head", [0, 0.1, -2.0], [0, 0, 0], (h) => {
      h.add(pod(0.9, 1.0, 1.6), { p: [0, 0.3, -0.2], r: [Math.PI / 2 + 0.2, 0, 0], s: [1.2, 1, 1], c: P, grad: [shade(P, 0.7), shade(P, 1.1)] });
      h.add(dome(1.0), { p: [0, 0.6, -0.1], r: FACE, s: [1.3, 0.45, 1.1], c: C, grad: [shade(C, 0.75), shade(C, 1.15)] });
      h.add(S.torus(1.0, 0.05, 4, 16, Math.PI), { p: [0, 0.62, -0.1], r: [0, 0, 0], s: [1.3, 1, 1], c: G });
      h.add(S.box(0.1, 0.06, 1.2, 0.02), { p: [0, 0.95, -0.4], c: HIVE.glow, mat: "glow", glow: 0.8 });
      h.add(S.cone(0.2, 1.6, 5), { p: [0, 1.2, -0.3], r: [-0.9, 0, 0], c: shade(D, 1.4) });                      // the great horn
      h.add(S.cone(0.1, 0.8, 5), { p: [0, 1.9, -0.95], r: [-0.3, 0, 0], c: shade(D, 1.5) });
      for (const s of [-1, 1]) {
        h.add(S.cone(0.18, 1.3, 5), { p: [s * 0.9, 0.8, 0.0], r: [-1.0, 0, s * -0.7], c: shade(D, 1.4) });
        h.add(S.cone(0.12, 0.7, 5), { p: [s * 1.2, 0.4, -0.2], r: [-0.8, 0, s * -1.1], c: shade(D, 1.4) });
        h.add(S.cone(0.12, 0.9, 5), { p: [s * 0.45, -0.4, -1.2], r: [-Math.PI / 2 + 0.4, s * 0.5, 0], c: D });
        h.add(S.sphere(0.1, 0), { p: [s * 0.45, 0.5, -1.0], c: HIVE.eye, mat: "glow", glow: 1.4 });
        h.add(S.sphere(0.07, 0), { p: [s * 0.62, 0.35, -0.9], c: HIVE.eye, mat: "glow", glow: 1.2 });
        h.add(S.sphere(0.05, 0), { p: [s * 0.3, 0.65, -0.95], c: HIVE.eye, mat: "glow", glow: 1.2 });
      }
      // The maw: glowing inside, the jaw drops open.
      h.add(S.ball(0.45, 8, 6), { p: [0, -0.05, -0.75], s: [1.1, 0.7, 0.8], c: 0xff6a3a, mat: "glow", glow: 1.2 });
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) h.add(S.cone(0.05, 0.2, 4), { p: [s * (0.15 + i * 0.15), 0.12, -1.0 + i * 0.1], r: [Math.PI, 0, 0], c: HIVE.bone });   // upper teeth
      h.node("jaw", [0, -0.2, -0.4], [0, 0, 0], (j) => {
        j.add(pod(0.55, 0.65, 1.0), { p: [0, -0.15, -0.45], r: [Math.PI / 2, 0, 0], s: [1.2, 0.5, 1], c: shade(P, 0.9) });
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) j.add(S.cone(0.05, 0.2, 4), { p: [s * (0.15 + i * 0.15), 0.0, -0.75 + i * 0.1], c: HIVE.bone });
      });
    });
    // Scythe forelimbs.
    for (const s of [-1, 1]) {
      bd.at([s * 1.4, -0.4, -1.5], [0, s * 0.5, s * -0.3], 1, (a) => {
        a.add(S.cyl(0.18, 0.24, 1.2, 6), { p: [0, 0, -0.6], r: [Math.PI / 2, 0, 0], c: B });
        a.add(S.extrude([[0, 0], [0.4, -0.6], [0.3, -1.7], [0, -2.6], [-0.2, -1.5], [-0.2, -0.5]], 0.14, 0.04), { p: [0, 0.0, -1.2], r: [Math.PI / 2 - 0.3, 0, s * 0.2], c: D });
      });
    }
  });
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    leg(b, `l${i}`, side * 1.2, 2.0, -1.4 + row * 1.0, side, 3.0, 0.32, B, 0.6, 1.0);
  }
}

export const BUG_MODELS = { swarmer, spitter, charger, sentry, warden };
