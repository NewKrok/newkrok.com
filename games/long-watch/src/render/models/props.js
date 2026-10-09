import { SHAPE as S, shade, rng } from "../modelkit.js";
import { HIVE } from "./bugs.js";
import { GUNS } from "./characters.js";

// ── The colony's things, rocks and the dropship ──────────────────────────
// Industrial: painted steel with hazard stripes, concrete, dust on it all.

const STEEL = 0x5b6670, DARK = 0x2e3338, CONC = 0x8d8a86, HAZ = 0xd8862e, WHITE = 0xc9cbc8;

export function pad(b) {
  b.add(S.cyl(11, 11.4, 0.4, 16, 0.08), { p: [0, 0.05, 0], c: 0x4c4a48 });
  b.add(S.torus(9.4, 0.18, 3, 32), { p: [0, 0.27, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.3], c: HAZ });
  for (let i = 0; i < 4; i++) b.add(S.box(5, 0.04, 0.5, 0), { p: [0, 0.27, 0], r: [0, i * Math.PI / 4, 0], c: 0xd8d4c8 });
}
export function padLight(b) {
  b.add(S.cyl(0.18, 0.24, 0.35, 6), { p: [0, 0.17, 0], c: DARK });
  b.add(S.cyl(0.13, 0.13, 0.12, 6), { p: [0, 0.4, 0], c: 0xff8a3a, mat: "glow", glow: 1.4 });
}
export function crate(b) {
  b.add(S.box(1.2, 1.1, 1.2, 0.06), { p: [0, 0.55, 0], c: 0x6b6040, grad: [0x51492f, 0x6f6444] });
  b.add(S.box(1.24, 0.08, 1.24, 0.02), { p: [0, 0.95, 0], c: 0x3d3a30 });
  b.add(S.box(0.5, 0.2, 0.02, 0), { p: [0, 0.6, -0.61], c: 0xdedbd0 });
}
export function crateStack(b) {
  b.add(S.box(2.4, 0.6, 1.6, 0.05), { p: [0, 0.3, 0], c: 0x4f5a5f });
  b.at([-0.55, 0.6, 0], [0, 0.1, 0], 1, (q) => { q.add(S.box(1.1, 0.65, 1.1, 0.05), { p: [0, 0.32, 0], c: 0x6b6040 }); q.add(S.box(0.4, 0.15, 0.02, 0), { p: [0, 0.4, -0.56], c: 0xdedbd0 }); });
  b.add(S.cyl(0.32, 0.32, 0.9, 8, 0.03), { p: [0.7, 1.05, 0.2], c: 0x8a3a2a });
  b.add(S.cyl(0.32, 0.32, 0.9, 8, 0.03), { p: [0.75, 1.05, -0.45], c: 0x3a6a8a });
}
export function barrier(b) {
  b.add(S.extrude([[-0.35, 0], [0.35, 0], [0.18, 0.25], [0.12, 1.1], [-0.12, 1.1], [-0.18, 0.25]], 3.0, 0.03), { r: [0, Math.PI / 2, 0], c: CONC, grad: [shade(CONC, 0.8), CONC] });
  b.add(S.box(3.02, 0.12, 0.27, 0), { p: [0, 0.75, 0], c: HAZ });
}
export function fence(b) {
  for (const x of [-1.6, 1.6]) b.add(S.box(0.14, 2.6, 0.14, 0.02), { p: [x, 1.3, 0], c: DARK, mat: "metal" });
  b.add(S.box(3.3, 2.0, 0.08, 0.02), { p: [0, 1.25, 0], c: 0x7a8288 });
  for (let i = 0; i < 5; i++) b.add(S.box(3.2, 0.06, 0.12, 0), { p: [0, 0.4 + i * 0.45, 0], c: shade(STEEL, 0.8) });
  b.add(S.box(3.3, 0.18, 0.1, 0), { p: [0, 2.45, 0], c: HAZ });
}
export function gatePost(b) {
  b.add(S.box(0.8, 4, 0.8, 0.06), { p: [0, 2, 0], c: STEEL, grad: [shade(STEEL, 0.75), STEEL] });
  b.add(S.box(0.82, 0.25, 0.82, 0), { p: [0, 3.6, 0], c: HAZ });
  b.add(S.box(0.3, 0.15, 0.3, 0.02), { p: [0, 4.08, 0], c: 0xff4a2a, mat: "glow", glow: 1.2 });
}
export function roadLamp(b) {
  b.add(S.cyl(0.08, 0.12, 5, 6), { p: [0, 2.5, 0], c: DARK, mat: "metal" });
  b.add(S.box(0.12, 0.12, 1.4, 0.02), { p: [0, 5, -0.6], c: DARK });
  b.add(S.box(0.35, 0.1, 0.5, 0.03), { p: [0, 4.92, -1.2], c: 0xffe2b0, mat: "glow", glow: 1.3 });
}
export function lamp(b) {
  b.add(S.cyl(0.1, 0.16, 6, 6), { p: [0, 3, 0], c: DARK, mat: "metal" });
  b.add(S.box(0.6, 0.14, 0.6, 0.04), { p: [0, 6, 0], c: DARK });
  b.add(S.box(0.48, 0.06, 0.48, 0), { p: [0, 5.92, 0], c: 0xffd9a0, mat: "glow", glow: 1.4 });
}
export function rover(b, o = {}) {
  const C = 0xc9a23a;
  b.at([0, o.flipped ? 0.9 : 0, 0], [0, 0, o.flipped ? 2.6 : 0], 1, (r) => {
    r.add(S.box(2.4, 1.0, 4.4, 0.12), { p: [0, 1.1, 0], c: C, grad: [shade(C, 0.7), C] });
    r.add(S.box(2.0, 0.8, 1.8, 0.12), { p: [0, 1.95, -0.6], c: shade(C, 1.05) });
    r.add(S.box(1.8, 0.5, 0.05, 0.02), { p: [0, 2.0, -1.52], c: 0x223040, mat: "glass" });
    for (const [x, z] of [[-1.3, -1.4], [1.3, -1.4], [-1.3, 1.4], [1.3, 1.4]]) r.add(S.cyl(0.55, 0.55, 0.45, 10, 0.06), { p: [x, 0.55, z], r: [0, 0, Math.PI / 2], c: 0x232426 });
    r.add(S.box(2.42, 0.15, 4.42, 0), { p: [0, 0.9, 0], c: DARK });
  });
  // Claw marks and dust.
  b.add(S.blob(1.2, 5, 0.3, 1), { p: [1.6, 0.05, 0.5], s: [1.4, 0.15, 1], c: 0x8e4a31 });
}
export function console(b) {
  b.add(S.box(2.6, 0.9, 0.8, 0.05), { p: [0, 0.45, 0], c: STEEL, grad: [shade(STEEL, 0.7), STEEL] });
  b.add(S.box(2.5, 0.08, 0.7, 0.02), { p: [0, 0.94, 0.02], r: [-0.3, 0, 0], c: DARK });
  b.add(S.box(1.2, 0.7, 0.06, 0.02), { p: [0, 1.4, 0.3], r: [-0.15, 0, 0], c: DARK });
  b.add(S.box(1.1, 0.6, 0.02, 0), { p: [0, 1.4, 0.26], r: [-0.15, 0, 0], c: 0x3fb6d8, mat: "glow", glow: 0.9 });
  for (let i = 0; i < 6; i++) b.add(S.box(0.12, 0.02, 0.08, 0), { p: [-0.9 + i * 0.36, 0.98, -0.05], r: [-0.3, 0, 0], c: i % 2 ? 0x6aff8a : 0xff8a3a, mat: "glow", glow: 1.1 });
}
export function screenWall(b) {
  for (let i = 0; i < 3; i++) {
    b.add(S.box(1.6, 1.0, 0.08, 0.02), { p: [-1.8 + i * 1.8, 2.3, 0], c: DARK });
    b.add(S.box(1.5, 0.9, 0.02, 0), { p: [-1.8 + i * 1.8, 2.3, -0.05], c: i === 1 ? 0xd84a3a : 0x2a7a9a, mat: "glow", glow: 0.7 });
  }
}
export function rack(b, o = {}) {
  b.add(S.box(2.2, 2.0, 0.5, 0.04), { p: [0, 1.0, 0], c: STEEL });
  b.add(S.box(2.0, 1.8, 0.05, 0), { p: [0, 1.0, -0.24], c: DARK });
  b.add(S.box(2.22, 0.1, 0.52, 0), { p: [0, 1.95, 0], c: HAZ });
}
export function generator(b) {
  b.add(S.box(5.4, 0.4, 3.2, 0.05), { p: [0, 0.2, 0], c: DARK });
  b.add(S.cyl(1.2, 1.2, 4.2, 12, 0.08), { p: [0, 1.5, 0], r: [0, 0, Math.PI / 2], c: STEEL, mat: "metal" });
  for (let i = 0; i < 5; i++) b.add(S.torus(1.22, 0.06, 4, 14), { p: [-1.6 + i * 0.8, 1.5, 0], r: [0, Math.PI / 2, 0], c: HAZ });
  b.add(S.box(1.2, 1.6, 1.0, 0.05), { p: [2.2, 1.2, 1.0], c: STEEL });
  b.node("core", [0, 1.5, 0], [0, 0, 0], (c) => {
    c.add(S.cyl(0.5, 0.5, 4.3, 10), { r: [0, 0, Math.PI / 2], c: 0x6ac8ff, mat: "glow", glow: 0.3 });
  });
  b.add(S.box(0.6, 0.4, 0.05, 0), { p: [2.2, 1.6, 0.48], c: 0xff4a2a, mat: "glow", glow: 1 });
}
export function hab(b, o = {}) {
  // Details over the plain building walls: a stripe, a sign, an airlock frame.
  b.add(S.box(9.1, 0.2, 6.6, 0), { p: [0, 2.2, 0], c: HAZ });
  b.add(S.box(2.6, 0.5, 2.0, 0.08), { p: [-2, 3.6, 0], c: 0x8a8f92 });
  b.add(S.cyl(0.2, 0.2, 0.6, 8), { p: [2.5, 3.6, 1], c: STEEL, mat: "metal" });
  void o;
}
export function container(b, o = {}) {
  const C = o.c ?? 0xb5562c;
  b.add(S.box(6, 2.6, 2.5, 0.05), { p: [0, 1.3, 0], c: C, grad: [shade(C, 0.75), C] });
  for (let i = 0; i < 9; i++) b.add(S.box(0.08, 2.4, 2.54, 0), { p: [-2.6 + i * 0.65, 1.3, 0], c: shade(C, 0.82) });
  b.add(S.box(6.02, 0.1, 2.52, 0), { p: [0, 2.58, 0], c: shade(C, 1.15) });
  b.add(S.box(0.02, 2.2, 2.2, 0), { p: [3.01, 1.3, 0], c: shade(C, 0.6) });
}
export function truck(b) {
  const C = 0xd8a22a;
  for (const z of [-2.6, 0, 2.6]) for (const s of [-1, 1]) b.add(S.cyl(0.9, 0.9, 0.7, 12, 0.08), { p: [s * 1.5, 0.9, z], r: [0, 0, Math.PI / 2], c: 0x1f2022 });
  b.add(S.box(3.0, 0.6, 8, 0.08), { p: [0, 1.4, 0], c: DARK });
  b.add(S.box(3.2, 1.6, 2.4, 0.15), { p: [0, 2.6, -2.8], c: C, grad: [shade(C, 0.7), C] });
  b.add(S.box(2.8, 0.6, 0.05, 0), { p: [0, 3.0, -4.01], c: 0x203040, mat: "glass" });
  b.add(S.wedge(3.4, 5.2, 1.2, 2.4), { p: [0, 1.7, 1.2], r: [0, Math.PI / 2, 0], c: shade(C, 0.9) });
}
export function waterTower(b) {
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.add(S.cyl(0.18, 0.22, 5, 6), { p: [x, 2.5, z], c: DARK, mat: "metal" });
  b.add(S.cyl(2.6, 2.6, 3.4, 14, 0.12), { p: [0, 6.6, 0], c: WHITE, grad: [shade(WHITE, 0.8), WHITE] });
  b.add(S.cone(2.8, 1.0, 14), { p: [0, 8.8, 0], c: shade(WHITE, 0.85) });
  b.add(S.box(3.0, 0.5, 0.05, 0), { p: [0, 6.6, -2.58], c: HAZ });
}
export function dish(b) {
  b.add(S.cyl(0.3, 0.45, 2.2, 8), { p: [0, 1.1, 0], c: STEEL });
  b.at([0, 2.6, 0], [0.7, 0.6, 0], 1, (d) => {
    d.add(S.lathe([[0, 0], [0.6, 0.06], [1.2, 0.3], [1.5, 0.55]], 14), { c: WHITE });
    d.add(S.cyl(0.04, 0.04, 1.2, 4), { p: [0, 0.6, 0], c: DARK });
  });
}
export function relayTower(b) {
  const legs = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]];
  for (const [x, z] of legs) b.add(S.box(0.2, 22, 0.2, 0), { p: [x * 0.6, 11, z * 0.6], r: [z * 0.035, 0, -x * 0.035], c: 0x8a3a2a, mat: "metal" });
  for (let i = 0; i < 7; i++) {
    const y = 1.5 + i * 3, w = 2.0 - i * 0.18;
    b.add(S.box(w * 1.8, 0.1, 0.1, 0), { p: [0, y, w * 0.9], c: i % 2 ? WHITE : 0x8a3a2a });
    b.add(S.box(w * 1.8, 0.1, 0.1, 0), { p: [0, y, -w * 0.9], c: i % 2 ? WHITE : 0x8a3a2a });
    b.add(S.box(0.1, 0.1, w * 1.8, 0), { p: [w * 0.9, y, 0], c: i % 2 ? WHITE : 0x8a3a2a });
    b.add(S.box(0.1, 0.1, w * 1.8, 0), { p: [-w * 0.9, y, 0], c: i % 2 ? WHITE : 0x8a3a2a });
  }
  b.add(S.box(1.6, 1.6, 1.6, 0.05), { p: [0, 0.8, 0], c: STEEL });
  b.at([0, 18, 0], [0.4, 2.2, 0], 1, (d) => d.add(S.lathe([[0, 0], [0.6, 0.08], [1.1, 0.35], [1.3, 0.55]], 12), { c: WHITE }));
  b.node("beacon", [0, 22.3, 0], [0, 0, 0], (n) => n.add(S.sphere(0.25, 1), { c: 0xff3a2a, mat: "glow", glow: 1.6 }));
}
export function deepcoreCrate(b) {
  const C = 0xe8e8e4;
  b.add(S.box(2.4, 1.2, 1.4, 0.08), { p: [0, 0.6, 0], c: C, grad: [shade(C, 0.75), C] });
  b.add(S.box(2.42, 0.12, 1.42, 0), { p: [0, 0.9, 0], c: 0x2a6a8a });
  b.add(S.box(0.9, 0.25, 0.02, 0), { p: [0, 0.55, -0.71], c: 0x2a6a8a });
  b.add(S.box(0.12, 0.12, 0.02, 0), { p: [0.9, 0.6, -0.71], c: 0x5af0ff, mat: "glow" });
}
export function shelter(b) {
  b.add(S.box(4, 0.2, 3, 0.04), { p: [0, 2.5, 0], c: 0x6b7178 });
  for (const [x, z] of [[-1.8, -1.3], [1.8, -1.3], [-1.8, 1.3], [1.8, 1.3]]) b.add(S.box(0.15, 2.5, 0.15, 0), { p: [x, 1.25, z], c: DARK });
  b.add(S.box(4, 1.6, 0.1, 0.02), { p: [0, 0.8, 1.45], c: 0x7a8288 });
  b.add(S.box(1.5, 0.8, 0.8, 0.04), { p: [0.6, 0.4, 0.6], c: STEEL });
}
export function rock(b, o = {}) {
  const r = rng(o.seed ?? 3);
  const seed = Math.floor(r() * 50);
  b.add(S.blob(1.6, seed, 0.25, 1), { p: [0, 0.9, 0], s: [1, 0.85, 0.9], c: 0x7a4a36, grad: [0x5e3a2c, 0x8e5a40] });
  b.add(S.blob(0.9, seed + 1, 0.25, 1), { p: [1.1, 0.5, 0.6], c: 0x6e4232 });
}
export function rockLow(b, o = {}) {
  b.add(S.blob(1.5, 60 + (o.seed ?? 1), 0.2, 1), { p: [0, 0.35, 0], s: [1, 0.55, 0.9], c: 0x7e4c37, grad: [0x5e3a2c, 0x8a5640] });
}
export function spire(b) {
  b.add(S.cone(1.1, 4.4, 6), { p: [0, 1.6, 0], c: 0x6a3e2e, grad: [0x5a3428, 0x8e5a40] });
  b.add(S.blob(0.9, 70, 0.2, 1), { p: [0.4, 0.3, 0.2], c: 0x6e4232 });
}
export function pebbles(b, o = {}) {
  const r = rng(o.seed ?? 9);
  for (let i = 0; i < 6; i++) b.add(S.blob(0.18 + r() * 0.2, i + 80, 0.2, 0), { p: [(r() - 0.5) * 2, 0.05, (r() - 0.5) * 2], s: [1, 0.6, 1], c: 0x6e4232 });
}
export function bunkerDoor(b) {
  b.add(S.box(3.4, 3.0, 0.4, 0.05), { p: [0, 1.5, 0.25], c: STEEL });
  b.node("door", [0, 0, 0], [0, 0, 0], (d) => {
    d.add(S.box(2.4, 2.5, 0.25, 0.04), { p: [0, 1.25, 0.1], c: 0x8a8f92 });
    for (let i = 0; i < 5; i++) d.add(S.box(2.42, 0.12, 0.27, 0), { p: [0, 0.3 + i * 0.5, 0.1], c: i % 2 ? HAZ : DARK });
  });
  b.node("lamp", [1.4, 2.7, -0.05], [0, 0, 0], (n) => n.add(S.box(0.2, 0.2, 0.08, 0.02), { c: 0xff3a2a, mat: "glow", glow: 1.4 }));
}
export function excavator(b) {
  const C = 0xd8a22a;
  b.add(S.box(4.2, 1.2, 7, 0.1), { p: [0, 0.6, 0], c: 0x2a2a2a });
  b.add(S.box(3.6, 2.4, 3.6, 0.12), { p: [0, 2.4, 1], c: C, grad: [shade(C, 0.7), C] });
  b.add(S.box(1.4, 1.4, 1.6, 0.08), { p: [-1, 4.2, -0.2], c: shade(C, 1.05) });
  b.add(S.box(0.6, 0.6, 5, 0.06), { p: [0.6, 4.4, -3], r: [-0.5, 0, 0], c: C });
  b.add(S.box(0.5, 0.5, 3.4, 0.06), { p: [0.6, 3.3, -6.2], r: [0.9, 0, 0], c: C });
  b.add(S.box(1.8, 1.2, 1.2, 0.08), { p: [0.6, 1.3, -7.1], c: 0x3a3a3a, mat: "metal" });
}
export function conveyor(b) {
  for (let i = 0; i < 4; i++) b.add(S.box(0.2, 2.2, 0.2, 0), { p: [0, 1.1 + i * 0.25, -6 + i * 4], c: DARK, mat: "metal" });
  b.add(S.box(1.8, 0.25, 14, 0.03), { p: [0, 2.6, 0], r: [0.08, 0, 0], c: STEEL });
  b.add(S.box(1.4, 0.06, 13.8, 0), { p: [0, 2.74, 0], r: [0.08, 0, 0], c: 0x1f2022 });
}
export function vent(b, o = {}) {
  // A ragged hole lined with hive resin, glowing from below.
  b.add(S.torus(1.5, 0.45, 5, 12), { p: [0, 0.2, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.8], c: HIVE.plate });
  b.add(S.cyl(1.25, 1.0, 0.1, 12), { p: [0, 0.06, 0], c: 0x120c14 });
  b.node("glow", [0, 0.1, 0], [0, 0, 0], (g) => g.add(S.cyl(0.8, 0.8, 0.05, 10), { c: HIVE.glow, mat: "glow", glow: 0.6 }));
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    b.add(S.cone(0.18, 1.0 + (i % 3) * 0.4, 4), { p: [Math.sin(a) * 1.7, 0.4, Math.cos(a) * 1.7], r: [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5], c: HIVE.chitin });
  }
  b.node("charge", [1.2, 0.5, 0], [0, 0, 0], (c) => {
    c.add(S.box(0.4, 0.3, 0.5, 0.04), { c: HAZ });
    c.add(S.box(0.1, 0.06, 0.1, 0), { p: [0, 0.18, 0], c: 0xff2a2a, mat: "glow", glow: 1.8 });
  });
  void o;
}
export function drillRig(b) {
  b.add(S.box(2.4, 0.4, 2.4, 0.05), { p: [0, 0.2, 0], c: DARK });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(S.box(0.15, 4, 0.15, 0), { p: [x * 0.8, 2.2, z * 0.8], r: [z * 0.12, 0, -x * 0.12], c: HAZ, mat: "metal" });
  b.add(S.cyl(0.25, 0.25, 3.5, 6), { p: [0, 1.8, 0], c: 0x4a4f54, mat: "metal" });
}
export function burrow(b) {
  b.add(S.torus(0.95, 0.35, 5, 10), { p: [0, 0.05, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.6], c: 0x5e3a2c });
  b.add(S.cyl(0.8, 0.6, 0.06, 10), { p: [0, 0.04, 0], c: 0x140e10 });
  b.add(S.cyl(0.35, 0.35, 0.04, 8), { p: [0, 0.06, 0], c: HIVE.glow, mat: "glow", glow: 0.35 });
}
export function ammoBox(b) {
  b.add(S.box(0.9, 0.45, 0.5, 0.04), { p: [0, 0.23, 0], c: 0x4a5a3a, grad: [0x3a4a2e, 0x55663f] });
  b.add(S.box(0.92, 0.06, 0.52, 0), { p: [0, 0.42, 0], c: HAZ });
  b.add(S.box(0.3, 0.12, 0.02, 0), { p: [0, 0.25, -0.26], c: 0xe8e0c0 });
}
export function datapad(b) {
  b.add(S.box(0.32, 0.03, 0.22, 0.01), { p: [0, 0.82, 0], c: DARK });
  b.add(S.box(0.28, 0.01, 0.18, 0), { p: [0, 0.84, 0], c: 0x5af0b0, mat: "glow", glow: 1.2 });
  b.add(S.box(0.5, 0.8, 0.5, 0.04), { p: [0, 0.4, 0], c: STEEL });
}
export function rackGun(b, o = {}) {
  b.at([0, 1.1, -0.3], [0, Math.PI / 2, -0.2], 1.4, (g) => GUNS[o.gun ?? "rifle"](g));
}
export function dropGun(b, o = {}) {
  b.at([0, 0.08, 0], [0, 0, Math.PI / 2], 1.3, (g) => GUNS[o.gun ?? "rifle"](g));
}

// The Long Watch's dropship: blunt, armoured, two engine pods.
export function dropship(b) {
  const C = 0x5a6670, A = 0xd8862e;
  b.add(S.box(4.2, 2.6, 11, 0.4), { p: [0, 2.4, 0], c: C, grad: [shade(C, 0.6), shade(C, 1.1)] });
  b.add(S.wedge(4.0, 3.2, 0.8, 2.4), { p: [0, 1.3, -6.5], r: [0, -Math.PI / 2, 0], c: shade(C, 0.95) });
  b.add(S.box(3.2, 0.8, 0.1, 0.02), { p: [0, 3.2, -7.3], r: [-0.5, 0, 0], c: 0x30506a, mat: "glass" });
  b.add(S.box(4.25, 0.3, 11.05, 0), { p: [0, 2.0, 0], c: A });
  for (const s of [-1, 1]) {
    b.add(S.box(3.2, 0.3, 3.6, 0.1), { p: [s * 3.2, 2.6, 1], c: shade(C, 0.9) });
    b.add(S.cyl(0.9, 0.9, 3.6, 10, 0.1), { p: [s * 4.6, 2.4, 1], r: [Math.PI / 2, 0, 0], c: shade(C, 0.8), mat: "metal" });
    b.add(S.cyl(0.6, 0.6, 0.2, 10), { p: [s * 4.6, 2.4, 2.85], r: [Math.PI / 2, 0, 0], c: 0x8ad8ff, mat: "glow", glow: 1.8 });
    b.add(S.box(0.25, 1.4, 0.25, 0.04), { p: [s * 1.6, 0.7, -3], c: DARK });
    b.add(S.box(0.25, 1.4, 0.25, 0.04), { p: [s * 1.6, 0.7, 3], c: DARK });
    b.add(S.box(0.6, 0.12, 1.6, 0.03), { p: [s * 1.6, 0.06, -3], c: DARK });
    b.add(S.box(0.6, 0.12, 1.6, 0.03), { p: [s * 1.6, 0.06, 3], c: DARK });
  }
  b.add(S.box(3.4, 0.2, 2.4, 0.05), { p: [0, 1.0, 5.4], r: [-0.4, 0, 0], c: shade(C, 0.8) });
  b.add(S.box(0.8, 0.12, 0.12, 0), { p: [0, 3.75, -2], c: 0xff3a2a, mat: "glow", glow: 1.6 });
}
