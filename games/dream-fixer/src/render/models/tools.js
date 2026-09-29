import * as T from "three";
import { SHAPE } from "../modelkit.js";
import { C } from "../palette.js";

// ── Tools in the hand ────────────────────────────────────────────────────
// Built in the tool's own frame: the grip at the origin, the muzzle
// along −z. The view model places and animates the whole thing.

const RX = Math.PI / 2;
const up = new T.Vector3(0, 1, 0);
const dirQ = (x, y, z) => new T.Quaternion().setFromUnitVectors(up, new T.Vector3(x, y, z).normalize());

// The muzzle's position in the tool frame (shots and flashes start here).
export const STABILIZER_MUZZLE = [0, 0.035, -0.29];

export function stabilizer(b, { hand = true } = {}) {
  const CY = 0.035;                        // chamber axis height

  // ── Receiver and grip ──
  b.add(SHAPE.box(0.068, 0.072, 0.15, 0.014), { p: [0, CY - 0.004, 0.005], grad: [C.brassD, C.brass], mat: "metal" });
  b.both((s) => {
    // Enamel side plates with four rivets each.
    b.add(SHAPE.box(0.004, 0.044, 0.1, 0.0015), { p: [s * 0.0345, CY - 0.004, 0.01], c: C.teal, facet: 0.02 });
    for (const [dy, dz] of [[-0.016, -0.04], [0.016, -0.04], [-0.016, 0.06], [0.016, 0.06]])
      b.add(SHAPE.ball(0.0035, 6, 4), { p: [s * 0.037, CY - 0.004 + dy, 0.01 + dz], c: C.brassL, mat: "metal" });
  });
  b.add(SHAPE.box(0.074, 0.012, 0.03, 0.004), { p: [0, CY - 0.034, 0.07], c: C.brassD, mat: "metal" });
  b.at([0, -0.055, 0.045], [-0.3, 0, 0], 1, () => {
    b.add(SHAPE.box(0.042, 0.13, 0.058, 0.013), { grad: [C.woodD, C.woodL], facet: 0.08 });
    for (let i = 0; i < 4; i++)              // finger grooves at the back of the grip
      b.add(SHAPE.box(0.044, 0.004, 0.012, 0.001), { p: [0, -0.04 + i * 0.024, 0.026], c: C.woodD });
    b.add(SHAPE.box(0.048, 0.018, 0.064, 0.006), { p: [0, -0.068, 0], c: C.brassD, mat: "metal" });
  });
  // Trigger and its guard.
  b.add(SHAPE.box(0.01, 0.032, 0.012, 0.003), { p: [0, -0.012, -0.03], r: [0.25, 0, 0], c: C.iron, mat: "metal" });
  b.add(SHAPE.torus(0.03, 0.0045, 5, 12, Math.PI), { p: [0, -0.005, -0.028], r: [0, RX, Math.PI], c: C.brassD, mat: "metal" });

  // ── Chamber: a glass tube with the glowing core ──
  const zc = -0.135;
  b.add(SHAPE.cyl(0.034, 0.034, 0.14, 14), { p: [0, CY, zc], r: [RX, 0, 0], c: 0xc8f4f0, mat: "glass" });
  b.add(SHAPE.cyl(0.018, 0.018, 0.13, 8), { p: [0, CY, zc], r: [RX, 0, 0], c: C.dream, mat: "glow", glow: 2 });
  for (const z of [zc + 0.075, zc - 0.075]) {
    b.add(SHAPE.cyl(0.043, 0.043, 0.02, 14, 0.005), { p: [0, CY, z], r: [RX, 0, 0], c: C.brass, mat: "metal" });
    b.add(SHAPE.cyl(0.046, 0.046, 0.006, 14), { p: [0, CY, z], r: [RX, 0, 0], c: C.copperD, mat: "metal" });
  }
  for (const a of [0.35, 0.35 + 2.094, 0.35 + 4.189])     // three rails hold the tube
    b.add(SHAPE.cyl(0.0055, 0.0055, 0.15, 6), { p: [Math.sin(a) * 0.04, CY + Math.cos(a) * 0.04, zc], r: [RX, 0, 0], c: C.copper, mat: "metal" });

  // ── Emitter ──
  b.add(SHAPE.lathe([[0.03, 0], [0.032, 0.012], [0.046, 0.04], [0.052, 0.058], [0.046, 0.062], [0.03, 0.05]], 14),
    { p: [0, CY, zc - 0.083], r: [-RX, 0, 0], grad: [C.copperD, C.copper], mat: "metal" });
  b.add(SHAPE.torus(0.037, 0.0065, 5, 16), { p: [0, CY, STABILIZER_MUZZLE[2] + 0.012], c: C.dream, mat: "glow", glow: 2.4 });
  for (let i = 0; i < 3; i++) {               // tuning prongs
    const a = i * 2.094;
    b.at([Math.sin(a) * 0.05, CY + Math.cos(a) * 0.05, zc - 0.155], [0, 0, -a], 1, () => {
      b.add(SHAPE.box(0.012, 0.01, 0.05, 0.003), { c: C.brass, mat: "metal" });
      b.add(SHAPE.ball(0.006, 6, 4), { p: [0, 0, -0.027], c: C.dream, mat: "glow", glow: 2 });
    });
  }

  // ── Gauge on top, facing the player ──
  b.at([0, CY + 0.043, 0.05], [0.85, 0, 0], 1, () => {
    b.add(SHAPE.cyl(0.03, 0.03, 0.014, 16, 0.004), { c: C.brass, mat: "metal" });
    b.add(SHAPE.cyl(0.024, 0.024, 0.004, 16), { p: [0, 0.007, 0], c: 0xd8ccb0, facet: 0 });
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + i * 0.4;
      b.add(SHAPE.box(0.0018, 0.002, 0.005), { p: [Math.sin(a) * 0.018, 0.0095, -Math.cos(a) * 0.018], r: [0, -a, 0], c: i > 4 ? C.red : C.black, facet: 0 });
    }
    b.node("needle", [0, 0.0105, 0], [0, 0, 0], (n) => {
      n.add(SHAPE.box(0.0024, 0.0016, 0.02), { p: [0, 0, -0.008], c: C.red, facet: 0 });
      n.add(SHAPE.cyl(0.003, 0.003, 0.003, 8), { c: C.black });
    });
    b.add(SHAPE.cyl(0.025, 0.025, 0.003, 16), { p: [0, 0.013, 0], c: 0xffffff, mat: "glass" });
  });
  // Copper pipe from the gauge down into the chamber.
  b.add(SHAPE.torus(0.03, 0.0045, 5, 10, Math.PI / 2), { p: [-0.02, CY + 0.012, 0.0], r: [0, RX, 0], c: C.copper, mat: "metal" });

  // ── Valve wheel on the right side ──
  b.at([0.045, CY + 0.004, -0.035], [0, RX, 0], 1, () => {
    b.add(SHAPE.cyl(0.006, 0.006, 0.02, 8), { r: [RX, 0, 0], c: C.iron, mat: "metal" });
    b.node("valve", [0, 0, -0.011], [0, 0, 0], (n) => {
      n.add(SHAPE.torus(0.021, 0.0045, 5, 14), { c: C.red, mat: "metal" });
      for (let i = 0; i < 3; i++) n.add(SHAPE.box(0.04, 0.004, 0.004), { r: [0, 0, i * 1.047], c: C.redD, mat: "metal" });
      n.add(SHAPE.cyl(0.007, 0.007, 0.008, 8), { r: [RX, 0, 0], c: C.brass, mat: "metal" });
    });
  });

  // ── Sight ──
  b.add(SHAPE.box(0.012, 0.014, 0.03, 0.003), { p: [0, CY + 0.043, -0.02], c: C.iron, mat: "metal" });
  b.add(SHAPE.ball(0.004, 6, 4), { p: [0, CY + 0.052, -0.02], c: C.dreamPink, mat: "glow", glow: 2 });

  if (hand) glovedHand(b);
}

// A work-gloved right hand around the grip, with the overall's sleeve.
function glovedHand(b) {
  b.at([0, -0.055, 0.045], [-0.3, 0, 0], 1, () => {
    // Palm and back of the hand wrap the grip.
    b.add(SHAPE.box(0.074, 0.1, 0.076, 0.022), { p: [0.008, 0.004, 0.006], grad: [C.gloveD, C.glove], facet: 0.06 });
    b.add(SHAPE.box(0.006, 0.07, 0.05, 0.002), { p: [0.046, 0.006, 0.004], c: C.gloveD });     // stitched patch
    // Four fingers curl round the front.
    for (let i = 0; i < 4; i++) {
      const y = 0.036 - i * 0.024, w = i === 3 ? 0.044 : 0.054;
      b.add(SHAPE.box(w, 0.022, 0.03, 0.009), { p: [-0.002, y, -0.046], grad: [C.gloveD, C.glove] });
      b.add(SHAPE.box(0.024, 0.02, 0.03, 0.008), { p: [-0.03, y, -0.03], c: C.glove });
    }
    // Thumb along the left of the receiver.
    b.add(SHAPE.capsule(0.013, 0.036, 7, 2), { p: [-0.036, 0.062, -0.012], r: [-1.2, 0, 0.15], c: C.glove });
    // Cuff and sleeve reaching back to the shoulder.
    const d = [0.28, -0.45, 1];
    const q = dirQ(...d);
    const L = Math.hypot(...d);
    const at = (t) => [0.02 + d[0] / L * t, -0.06 + d[1] / L * t, 0.05 + d[2] / L * t];
    b.add(SHAPE.cyl(0.05, 0.046, 0.075, 10, 0.008), { p: at(0.03), r: q, grad: [C.glove, C.gloveD] });
    b.add(SHAPE.cyl(0.058, 0.058, 0.05, 10, 0.012), { p: at(0.1), r: q, c: C.overallD });
    b.add(SHAPE.cyl(0.056, 0.062, 0.42, 10), { p: at(0.33), r: q, grad: [C.overallD, C.overall], facet: 0.07 });
  });
}

// The Fuzz Vacuum: a brass motor behind the grip, a glass tank on top
// that glows with whatever it has swallowed, a ribbed copper tube and a
// wide nozzle with a fan inside. Nodes: "fan", "tank" (the contents), "flap".
export const VACUUM_MUZZLE = [0, 0.03, -0.33];

export function fuzzVacuum(b, { hand = true } = {}) {
  const CY = 0.03;
  // Grip, as on the Stabilizer, so the hand fits both.
  b.at([0, -0.055, 0.045], [-0.3, 0, 0], 1, () => {
    b.add(SHAPE.box(0.042, 0.13, 0.058, 0.013), { grad: [C.woodD, C.woodL], facet: 0.08 });
    b.add(SHAPE.box(0.048, 0.018, 0.064, 0.006), { p: [0, -0.068, 0], c: C.iron, mat: "metal" });
  });
  b.add(SHAPE.box(0.01, 0.03, 0.012, 0.003), { p: [0, -0.012, -0.03], r: [0.25, 0, 0], c: C.red, mat: "metal" });
  b.add(SHAPE.torus(0.03, 0.0045, 5, 12, Math.PI), { p: [0, -0.005, -0.028], r: [0, RX, Math.PI], c: C.iron, mat: "metal" });
  // Motor: an iron drum with brass cooling rings, and a vent at the back.
  b.add(SHAPE.cyl(0.058, 0.058, 0.13, 12, 0.01), { p: [0, CY, 0.03], r: [RX, 0, 0], grad: [C.ironD, C.iron], mat: "metal" });
  for (let i = 0; i < 4; i++) b.add(SHAPE.torus(0.059, 0.006, 4, 16), { p: [0, CY, -0.015 + i * 0.03], c: C.brass, mat: "metal" });
  b.add(SHAPE.cyl(0.045, 0.045, 0.01, 12), { p: [0, CY, 0.097], r: [RX, 0, 0], c: C.black });
  for (let i = -2; i <= 2; i++) b.add(SHAPE.box(0.07, 0.004, 0.004), { p: [0, CY + i * 0.013, 0.1], c: C.brassD, mat: "metal" });
  // Glass tank on top with the glowing contents.
  b.add(SHAPE.cyl(0.036, 0.036, 0.012, 12, 0.003), { p: [0, CY + 0.064, 0.0], c: C.brass, mat: "metal" });
  b.add(SHAPE.cyl(0.04, 0.034, 0.07, 12), { p: [0, CY + 0.106, 0.0], c: 0xd8fff6, mat: "glass" });
  b.add(SHAPE.cyl(0.03, 0.03, 0.014, 12, 0.004), { p: [0, CY + 0.146, 0.0], c: C.brass, mat: "metal" });
  b.node("tank", [0, CY + 0.1, 0], [0, 0, 0], (n) => n.add(SHAPE.sphere(0.026, 1), { c: C.dreamGold, mat: "glow", glow: 1.8 }));
  // Tube, ribbed.
  b.add(SHAPE.cyl(0.034, 0.038, 0.15, 12), { p: [0, CY, -0.11], r: [RX, 0, 0], c: C.copper, mat: "metal" });
  for (let i = 0; i < 5; i++) b.add(SHAPE.torus(0.037, 0.006, 4, 14), { p: [0, CY, -0.05 - i * 0.03], c: C.copperD, mat: "metal" });
  // Nozzle: a flared mouth with a fan and a glowing throat.
  b.add(SHAPE.lathe([[0.038, 0], [0.042, 0.02], [0.06, 0.06], [0.08, 0.1], [0.083, 0.11], [0.074, 0.11], [0.05, 0.07]], 16),
    { p: [0, CY, -0.215], r: [-RX, 0, 0], grad: [C.brassD, C.brassL], mat: "metal" });
  b.add(SHAPE.torus(0.07, 0.007, 5, 20), { p: [0, CY, VACUUM_MUZZLE[2] + 0.01], c: C.dreamGold, mat: "glow", glow: 2 });
  b.node("fan", [0, CY, -0.235], [0, 0, 0], (n) => {
    n.add(SHAPE.cyl(0.012, 0.012, 0.02, 8), { r: [RX, 0, 0], c: C.brass, mat: "metal" });
    for (let i = 0; i < 4; i++) n.add(SHAPE.box(0.07, 0.016, 0.004, 0.002), { r: [0, 0.3, i * Math.PI / 4], c: C.steel, mat: "metal" });
  });
  // A hinged flap on top of the nozzle (clacks when it launches).
  b.node("flap", [0, CY + 0.055, -0.22], [0, 0, 0], (n) => n.add(SHAPE.box(0.05, 0.006, 0.05, 0.002), { p: [0, 0, -0.022], c: C.red, mat: "metal" }));
  // Power switch and a dial on the side.
  b.add(SHAPE.box(0.012, 0.02, 0.03, 0.004), { p: [0.06, CY + 0.02, 0.03], c: C.red, mat: "metal" });
  b.add(SHAPE.cyl(0.018, 0.018, 0.008, 12), { p: [-0.06, CY, 0.03], r: [0, 0, RX], c: C.cream });
  if (hand) glovedHand(b);
}
