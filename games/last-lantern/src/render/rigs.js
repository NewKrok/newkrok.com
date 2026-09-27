import * as T from "three";
import { GEO } from "./batch.js";
import { MON } from "../data/monsters.js";
import { MAX_MON } from "../config.js";

// ── Monster rigs ─────────────────────────────────────────────────────────
// Each monster type is a list of parts; each part is one InstancedMesh, so
// every monster of a type costs one draw call per part however many there
// are. Rig space: +Y faces forward, +Z is up, units are the body radius r.
// a: animation (legL/legR/armL/armR swing, wingL/wingR flap, pulse, tail,
// jaw, spin); e: unlit (eyes, fire, glow), so it reads at night and blooms.

const RED = 0xff4a3a, DARK = 0x14161c;

function spec(def) {
  const r = def.r, c = def.c, c2 = def.c2 ?? c, c3 = def.c3 ?? RED;
  switch (def.rig) {
    // ── Hollowmere ──
    case "crow": return { fly: def.fly || 26, bobK: 3, parts: [
      { g: "ico1", s: [r * 0.7, r * 1.2, r * 0.62], p: [0, 0, 0], c },
      { g: "ico1", s: [r * 0.46, r * 0.5, r * 0.44], p: [0, r * 1.05, r * 0.28], c },
      { g: "coneFwd", s: [r * 0.16, r * 0.62, r * 0.16], p: [0, r * 1.62, r * 0.2], c: 0x8a8070 },
      { g: "sph", s: [1.3, 1.3, 1.3], p: [-r * 0.24, r * 1.3, r * 0.44], c: 0xff3a2a, e: 1 },
      { g: "sph", s: [1.3, 1.3, 1.3], p: [r * 0.24, r * 1.3, r * 0.44], c: 0xff3a2a, e: 1 },
      { g: "wing", s: [r * 1.7, r * 1.1, 0.8], p: [-r * 0.4, r * 0.1, r * 0.2], c: c2, a: "wingL" },
      { g: "wing", s: [r * 1.7, r * 1.1, 0.8], p: [r * 0.4, r * 0.1, r * 0.2], c: c2, a: "wingR" },
      { g: "wingTip", s: [r * 1.1, r * 0.8, 0.6], p: [-r * 0.4, r * 0.0, r * 0.2], c, a: "wingL", k: 1.7 },
      { g: "wingTip", s: [r * 1.1, r * 0.8, 0.6], p: [r * 0.4, r * 0.0, r * 0.2], c, a: "wingR", k: 1.7 },
      { g: "box", s: [r * 0.7, r * 0.9, 0.8], p: [0, -r * 1.2, 0], c, a: "tail", k: 0.2 },
    ] };
    case "shambler": return { parts: [
      { g: "taperUp", s: [r * 0.75, r * 0.55, r * 1.25], p: [0, 0, r * 1.05], c: c2, rx: 0.45 },
      { g: "box", s: [r * 1.0, r * 0.6, r * 0.5], p: [0, r * 0.35, r * 1.95], c: c2, rx: 0.45 },
      { g: "box", s: [r * 0.9, r * 0.1, r * 0.5], p: [0, -r * 0.5, r * 1.1], c: 0x3a2c22, a: "tail", k: 0.25 },
      { g: "ico1", s: [r * 0.44, r * 0.48, r * 0.46], p: [0, r * 0.75, r * 2.35], c },
      { g: "box", s: [r * 0.36, r * 0.3, r * 0.14], p: [0, r * 1.02, r * 2.08], c: 0x5a6a4a, a: "jaw" },
      { g: "sph", s: [1.7, 1.7, 1.7], p: [-r * 0.18, r * 1.14, r * 2.44], c: 0xc8ff8a, e: 1 },
      { g: "sph", s: [1.4, 1.4, 1.4], p: [r * 0.2, r * 1.12, r * 2.4], c: 0xc8ff8a, e: 1 },
      { g: "box", s: [r * 0.5, r * 0.06, r * 0.06], p: [0, r * 0.62, r * 1.7], c: 0xd8d0b8 },
      { g: "box", s: [r * 0.44, r * 0.06, r * 0.06], p: [0, r * 0.62, r * 1.52], c: 0xd8d0b8 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.25], p: [-r * 0.6, r * 0.6, r * 2.05], c, a: "armL", b: 1.45, k: 0.22 },
      { g: "hang", s: [r * 0.28, r * 0.28, r * 1.2], p: [r * 0.62, r * 0.4, r * 1.95], c, a: "armR", b: 0.35, k: 0.3 },
      { g: "sph", s: [r * 0.22, r * 0.26, r * 0.16], p: [0, 0, 0], c, hold: "armL" },
      { g: "hang", s: [r * 0.34, r * 0.34, r * 1.0], p: [-r * 0.3, 0, r * 1.0], c: 0x3a3028, a: "legL", k: 0.55 },
      { g: "hang", s: [r * 0.34, r * 0.34, r * 1.0], p: [r * 0.3, 0, r * 1.0], c: 0x3a3028, a: "legR", k: 0.35 },
    ] };
    case "gravebound": return { parts: [
      { g: "box", s: [r * 0.14, r * 0.14, r * 0.9], p: [0, -r * 0.05, r * 1.45], c },
      { g: "torus", s: [r * 0.42, r * 0.34, r * 0.42], p: [0, 0, r * 1.95], c, rx: Math.PI / 2 },
      { g: "torus", s: [r * 0.38, r * 0.3, r * 0.38], p: [0, 0, r * 1.7], c, rx: Math.PI / 2 },
      { g: "torus", s: [r * 0.32, r * 0.26, r * 0.32], p: [0, 0, r * 1.46], c, rx: Math.PI / 2 },
      { g: "box", s: [r * 0.7, r * 0.4, r * 0.24], p: [0, 0, r * 1.05], c: 0xc8c0a8 },
      { g: "ico1", s: [r * 0.36, r * 0.4, r * 0.38], p: [0, r * 0.05, r * 2.55], c },
      { g: "box", s: [r * 0.3, r * 0.3, r * 0.1], p: [0, r * 0.25, r * 2.28], c, a: "jaw" },
      { g: "sphHalf", s: [r * 0.42, r * 0.45, r * 0.4], p: [0, 0, r * 2.62], c: 0x6a5a48 },
      { g: "sph", s: [1.4, 1.4, 1.4], p: [-r * 0.14, r * 0.38, r * 2.58], c: 0x7ad8ff, e: 1 },
      { g: "sph", s: [1.4, 1.4, 1.4], p: [r * 0.14, r * 0.38, r * 2.58], c: 0x7ad8ff, e: 1 },
      { g: "hang", s: [r * 0.14, r * 0.14, r * 1.0], p: [-r * 0.56, 0, r * 2.1], c, a: "armL", b: 0.6, k: 0.3 },
      { g: "hang", s: [r * 0.14, r * 0.14, r * 1.0], p: [r * 0.56, 0, r * 2.1], c, a: "armR", k: 0.8 },
      { g: "cyl", s: [r * 0.62, r * 0.62, r * 0.12], p: [-r * 0.06, r * 0.16, r * 0.34], c: c2, rx: Math.PI / 2, hold: "armL" },
      { g: "sph", s: [r * 0.18, r * 0.1, r * 0.18], p: [-r * 0.06, r * 0.24, r * 0.34], c: 0x8a8a90, hold: "armL" },
      { g: "box", s: [r * 0.08, r * 1.0, r * 0.16], p: [0, r * 0.5, 0], c: 0x9a9aa4, hold: "armR" },
      { g: "hang", s: [r * 0.16, r * 0.16, r * 1.0], p: [-r * 0.24, 0, r * 1.0], c, a: "legL", k: 0.8 },
      { g: "hang", s: [r * 0.16, r * 0.16, r * 1.0], p: [r * 0.24, 0, r * 1.0], c, a: "legR", k: 0.8 },
    ] };
    case "archer": return { parts: [
      { g: "box", s: [r * 0.14, r * 0.14, r * 0.9], p: [0, 0, r * 1.45], c },
      { g: "torus", s: [r * 0.4, r * 0.32, r * 0.4], p: [0, 0, r * 1.85], c, rx: Math.PI / 2 },
      { g: "torus", s: [r * 0.34, r * 0.28, r * 0.34], p: [0, 0, r * 1.58], c, rx: Math.PI / 2 },
      { g: "taperUp", s: [r * 0.8, r * 0.7, r * 1.2], p: [0, -r * 0.1, r * 0.9], c: c2 },
      { g: "ico1", s: [r * 0.34, r * 0.38, r * 0.36], p: [0, r * 0.08, r * 2.5], c },
      { g: "cone", s: [r * 0.5, r * 0.55, r * 0.9], p: [0, -r * 0.08, r * 2.62], c: c2 },
      { g: "sph", s: [1.4, 1.4, 1.4], p: [-r * 0.13, r * 0.4, r * 2.52], c: 0xa8ff7a, e: 1 },
      { g: "sph", s: [1.4, 1.4, 1.4], p: [r * 0.13, r * 0.4, r * 2.52], c: 0xa8ff7a, e: 1 },
      { g: "hang", s: [r * 0.13, r * 0.13, r * 1.0], p: [-r * 0.5, r * 0.1, r * 2.05], c, a: "armL", b: 1.5, k: 0.05 },
      { g: "hang", s: [r * 0.13, r * 0.13, r * 0.9], p: [r * 0.5, 0, r * 2.05], c, a: "armR", b: 1.2, k: 0.1 },
      { g: "torusHalf", s: [r * 0.85, r * 0.85, r * 0.85], p: [0, 0, r * 0.85], c: 0x5a3a20, q: [[0, 1, 0], [0, 0, -1], [-1, 0, 0]], hold: "armL" },
      { g: "box", s: [r * 0.03, r * 1.7, r * 0.03], p: [0, 0, r * 0.85], c: 0xe8e0c8, hold: "armL" },
      { g: "cylUp", s: [r * 0.18, r * 0.18, r * 1.0], p: [r * 0.25, -r * 0.4, r * 1.6], c: 0x4a3020, rx: -0.3 },
      { g: "cone", s: [r * 0.06, r * 0.06, r * 0.3], p: [r * 0.3, -r * 0.62, r * 2.6], c: 0xe0e0e0 },
      { g: "hang", s: [r * 0.16, r * 0.16, r * 0.9], p: [-r * 0.22, 0, r * 0.95], c, a: "legL", k: 0.6 },
      { g: "hang", s: [r * 0.16, r * 0.16, r * 0.9], p: [r * 0.22, 0, r * 0.95], c, a: "legR", k: 0.6 },
    ] };
    case "digger": return { parts: [
      { g: "ico1", s: [r * 0.9, r * 0.75, r * 0.95], p: [0, 0, r * 1.75], c: 0x5a4a3e },
      { g: "box", s: [r * 1.2, r * 0.72, r * 0.9], p: [0, r * 0.22, r * 1.45], c: c2 },
      { g: "box", s: [r * 0.9, r * 0.08, r * 0.8], p: [0, r * 0.6, r * 1.2], c: 0x5a4432 },
      { g: "ico1", s: [r * 0.38, r * 0.4, r * 0.36], p: [0, r * 0.62, r * 2.4], c },
      { g: "box", s: [r * 0.3, r * 0.16, r * 0.12], p: [0, r * 0.95, r * 2.24], c: 0x6a5040, a: "jaw" },
      { g: "sph", s: [2.2, 2.2, 2.2], p: [-r * 0.14, r * 0.96, r * 2.45], c: 0xffaa3a, e: 1 },
      { g: "sph", s: [2.2, 2.2, 2.2], p: [r * 0.14, r * 0.96, r * 2.45], c: 0xffaa3a, e: 1 },
      { g: "hang", s: [r * 0.4, r * 0.4, r * 1.3], p: [-r * 0.95, r * 0.3, r * 2.2], c, a: "armL", b: 0.5, k: 0.4 },
      { g: "hang", s: [r * 0.4, r * 0.4, r * 1.3], p: [r * 0.95, r * 0.3, r * 2.2], c, a: "armR", b: 0.9, k: 0.3 },
      { g: "sph", s: [r * 0.3, r * 0.3, r * 0.3], p: [0, 0, 0], c, hold: "armL" },
      { g: "cyl", s: [r * 0.06, r * 0.06, r * 2.4], p: [0, r * 0.4, 0], c: 0x5a3a20, rx: Math.PI / 2, hold: "armR" },
      { g: "box", s: [r * 0.5, r * 0.62, r * 0.06], p: [0, r * 1.9, 0], c: 0x8a8a90, hold: "armR" },
      { g: "box", s: [r * 0.24, r * 0.24, r * 0.3], p: [r * 0.55, -r * 0.2, r * 1.2], c: 0x2a2a2a },
      { g: "box", s: [r * 0.16, r * 0.16, r * 0.2], p: [r * 0.55, -r * 0.2, r * 1.2], c: 0xffc070, e: 1 },
      { g: "hang", s: [r * 0.48, r * 0.48, r * 1.1], p: [-r * 0.42, 0, r * 1.1], c: 0x3a3028, a: "legL", k: 0.5 },
      { g: "hang", s: [r * 0.48, r * 0.48, r * 1.1], p: [r * 0.42, 0, r * 1.1], c: 0x3a3028, a: "legR", k: 0.5 },
    ] };
    case "banshee": return { fly: def.fly || 10, bobK: 5, ghost: true, parts: [
      { g: "coneDown", s: [r * 1.05, r * 1.0, r * 2.4], p: [0, -r * 0.1, r * 1.9], c, a: "pulse", k: 0.06 },
      { g: "coneDown", s: [r * 0.8, r * 0.7, r * 2.0], p: [0, -r * 0.5, r * 1.9], c: c2, a: "tail", k: 0.3 },
      { g: "ico1", s: [r * 0.42, r * 0.46, r * 0.5], p: [0, r * 0.1, r * 3.3], c: 0xe8f4ff },
      { g: "box", s: [r * 0.7, r * 0.8, r * 1.6], p: [0, -r * 0.4, r * 2.9], c: 0x8aa8c8, a: "tail", k: 0.25 },
      { g: "sph", s: [1.8, 1.8, 2.4], p: [-r * 0.16, r * 0.5, r * 3.4], c: 0xffffff, e: 1 },
      { g: "sph", s: [1.8, 1.8, 2.4], p: [r * 0.16, r * 0.5, r * 3.4], c: 0xffffff, e: 1 },
      { g: "sph", s: [r * 0.14, r * 0.05, r * 0.22], p: [0, r * 0.55, r * 3.1], c: 0x1a2030 },
      { g: "hang", s: [r * 0.16, r * 0.16, r * 1.4], p: [-r * 0.55, r * 0.3, r * 2.8], c, a: "armL", b: 1.4, k: 0.25 },
      { g: "hang", s: [r * 0.16, r * 0.16, r * 1.4], p: [r * 0.55, r * 0.3, r * 2.8], c, a: "armR", b: 1.4, k: 0.25 },
    ] };
    case "headless": return { parts: [
      { g: "box", s: [r * 1.15, r * 0.75, r * 1.2], p: [0, 0, r * 1.85], c },
      { g: "box", s: [r * 0.9, r * 0.1, r * 1.3], p: [0, r * 0.4, r * 1.7], c: c2 },
      { g: "box", s: [r * 0.12, r * 0.12, r * 0.9], p: [0, r * 0.47, r * 1.8], c: 0xc8a050 },
      { g: "box", s: [r * 0.5, r * 0.12, r * 0.12], p: [0, r * 0.47, r * 1.95], c: 0xc8a050 },
      { g: "sph", s: [r * 0.42, r * 0.4, r * 0.3], p: [-r * 0.66, 0, r * 2.4], c },
      { g: "sph", s: [r * 0.42, r * 0.4, r * 0.3], p: [r * 0.66, 0, r * 2.4], c },
      { g: "cyl", s: [r * 0.22, r * 0.22, r * 0.18], p: [0, 0, r * 2.5], c: 0x2a1a14 },
      { g: "sph", s: [r * 0.24, r * 0.24, r * 0.5], p: [0, 0, r * 2.75], c: c3, e: 1, a: "flick", k: 0.6 },
      { g: "sph", s: [r * 0.14, r * 0.14, r * 0.3], p: [0, 0, r * 3.05], c: 0xffe0a0, e: 1, a: "flick", k: 0.8 },
      { g: "hang", s: [r * 1.2, r * 0.1, r * 1.6], p: [0, -r * 0.42, r * 2.4], c: 0x3a1418, a: "tail", k: 0.18 },
      { g: "hang", s: [r * 0.32, r * 0.32, r * 1.1], p: [-r * 0.78, 0, r * 2.3], c, a: "armL", b: 0.7, k: 0.3 },
      { g: "hang", s: [r * 0.32, r * 0.32, r * 1.1], p: [r * 0.78, 0, r * 2.3], c, a: "armR", b: 1.2, k: 0.2 },
      { g: "ico1", s: [r * 0.36, r * 0.36, r * 0.4], p: [0, r * 0.28, r * 0.1], c: 0x6a6e7e, hold: "armL" },
      { g: "box", s: [r * 0.3, r * 0.04, r * 0.06], p: [0, r * 0.64, r * 0.16], c: c3, e: 1, hold: "armL" },
      { g: "box", s: [r * 0.1, r * 2.1, r * 0.2], p: [0, r * 1.12, 0], c: 0xd8dde6, hold: "armR" },
      { g: "box", s: [r * 0.5, r * 0.1, r * 0.1], p: [0, r * 0.08, 0], c: 0xc8a050, hold: "armR" },
      { g: "hang", s: [r * 0.38, r * 0.38, r * 1.05], p: [-r * 0.33, 0, r * 1.2], c, a: "legL", k: 0.6 },
      { g: "hang", s: [r * 0.38, r * 0.38, r * 1.05], p: [r * 0.33, 0, r * 1.2], c, a: "legR", k: 0.6 },
    ] };
    case "colossus": return { parts: [
      { g: "box", s: [r * 0.3, r * 0.3, r * 1.6], p: [0, -r * 0.15, r * 1.8], c: c2 },
      { g: "box", s: [r * 1.0, r * 0.6, r * 0.45], p: [0, 0, r * 1.25], c },
      { g: "torus", s: [r * 0.66, r * 0.5, r * 0.66], p: [0, 0, r * 2.65], c, rx: Math.PI / 2 },
      { g: "torus", s: [r * 0.62, r * 0.48, r * 0.62], p: [0, 0, r * 2.35], c, rx: Math.PI / 2 },
      { g: "torus", s: [r * 0.56, r * 0.44, r * 0.56], p: [0, 0, r * 2.05], c, rx: Math.PI / 2 },
      { g: "torus", s: [r * 0.48, r * 0.38, r * 0.48], p: [0, 0, r * 1.78], c, rx: Math.PI / 2 },
      { g: "ico1", s: [r * 0.3, r * 0.3, r * 0.3], p: [0, 0, r * 2.2], c: 0xff3a2a, e: 1, a: "pulse", k: 0.2 },
      { g: "box", s: [r * 1.4, r * 0.5, r * 0.3], p: [0, -r * 0.05, r * 2.9], c },
      { g: "ico1", s: [r * 0.5, r * 0.56, r * 0.52], p: [0, r * 0.25, r * 3.35], c },
      { g: "box", s: [r * 0.46, r * 0.34, r * 0.16], p: [0, r * 0.55, r * 3.02], c: c2, a: "jaw" },
      { g: "sph", s: [r * 0.1, r * 0.1, r * 0.1], p: [-r * 0.2, r * 0.72, r * 3.42], c: 0xff3b3b, e: 1 },
      { g: "sph", s: [r * 0.1, r * 0.1, r * 0.1], p: [r * 0.2, r * 0.72, r * 3.42], c: 0xff3b3b, e: 1 },
      { g: "cone", s: [r * 0.12, r * 0.12, r * 0.8], p: [-r * 0.42, 0, r * 3.8], c: c2, ry: -0.5 },
      { g: "cone", s: [r * 0.12, r * 0.12, r * 0.8], p: [r * 0.42, 0, r * 3.8], c: c2, ry: 0.5 },
      { g: "ico1", s: [r * 0.2, r * 0.22, r * 0.2], p: [-r * 0.7, r * 0.1, r * 3.0], c },
      { g: "ico1", s: [r * 0.2, r * 0.22, r * 0.2], p: [r * 0.7, r * 0.1, r * 3.0], c },
      { g: "cyl", s: [r * 0.14, r * 0.14, r * 1.8], p: [0, 0, -r * 0.8], c: 0x6a5a40, hold: "armR" },
      { g: "ico1", s: [r * 0.36, r * 0.36, r * 0.36], p: [0, 0, -r * 1.8], c, hold: "armR" },
      { g: "hang", s: [r * 0.36, r * 0.36, r * 1.3], p: [-r * 0.45, 0, r * 1.3], c, a: "legL", k: 0.45 },
      { g: "hang", s: [r * 0.36, r * 0.36, r * 1.3], p: [r * 0.45, 0, r * 1.3], c, a: "legR", k: 0.45 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.6], p: [-r * 0.95, 0, r * 2.85], c, a: "armL", k: 0.45 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.6], p: [r * 0.95, 0, r * 2.85], c, a: "armR", b: 0.4, k: 0.3 },
    ] };
    case "bat": return { fly: def.fly || 24, bobK: 3, parts: [
      { g: "sph", s: [r * 0.9, r * 1.1, r * 0.8], p: [0, 0, 0], c },
      { g: "sph", s: [r * 0.5, r * 0.5, r * 0.5], p: [0, r * 0.9, 1], c },
      { g: "cone", s: [r * 0.18, r * 0.18, r * 0.5], p: [-r * 0.28, r * 0.9, r * 0.6], c },
      { g: "cone", s: [r * 0.18, r * 0.18, r * 0.5], p: [r * 0.28, r * 0.9, r * 0.6], c },
      { g: "wing", s: [r * 2.4, r * 1.3, 0.8], p: [-r * 0.5, 0, 1], c: c2, a: "wingL" },
      { g: "wing", s: [r * 2.4, r * 1.3, 0.8], p: [r * 0.5, 0, 1], c: c2, a: "wingR" },
      { g: "sph", s: [1.7, 1.7, 1.7], p: [-r * 0.2, r * 1.3, 2], c: RED, e: 1 },
      { g: "sph", s: [1.7, 1.7, 1.7], p: [r * 0.2, r * 1.3, 2], c: RED, e: 1 },
    ] };
    case "ghoul": return { parts: [
      { g: "box", s: [r * 1.3, r * 0.8, r * 1.2], p: [0, 0, r * 1.6], c },
      { g: "sph", s: [r * 0.55, r * 0.55, r * 0.55], p: [0, r * 0.25, r * 2.55], c },
      { g: "sph", s: [1.9, 1.9, 1.9], p: [-r * 0.22, r * 0.7, r * 2.6], c: RED, e: 1 },
      { g: "sph", s: [1.9, 1.9, 1.9], p: [r * 0.22, r * 0.7, r * 2.6], c: RED, e: 1 },
      { g: "hang", s: [r * 0.4, r * 0.4, r * 1.0], p: [-r * 0.35, 0, r * 1.05], c: c2, a: "legL", k: 0.7 },
      { g: "hang", s: [r * 0.4, r * 0.4, r * 1.0], p: [r * 0.35, 0, r * 1.05], c: c2, a: "legR", k: 0.7 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [-r * 0.8, r * 0.2, r * 2.1], c, a: "armL", b: 1.3, k: 0.25 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [r * 0.8, r * 0.2, r * 2.1], c, a: "armR", b: 1.3, k: 0.25 },
    ] };
    case "skeleton": return { parts: [
      { g: "box", s: [r * 0.9, r * 0.55, r * 1.1], p: [0, 0, r * 1.7], c },
      { g: "box", s: [r * 0.8, r * 0.5, r * 0.35], p: [0, 0, r * 1.05], c: c2 },
      { g: "sph", s: [r * 0.5, r * 0.5, r * 0.5], p: [0, 0, r * 2.65], c },
      { g: "sph", s: [1.6, 1.6, 1.6], p: [-r * 0.2, r * 0.42, r * 2.7], c: 0xff9a3a, e: 1 },
      { g: "sph", s: [1.6, 1.6, 1.6], p: [r * 0.2, r * 0.42, r * 2.7], c: 0xff9a3a, e: 1 },
      { g: "hang", s: [r * 0.28, r * 0.28, r * 1.0], p: [-r * 0.3, 0, r * 1.0], c: c2, a: "legL", k: 0.8 },
      { g: "hang", s: [r * 0.28, r * 0.28, r * 1.0], p: [r * 0.3, 0, r * 1.0], c: c2, a: "legR", k: 0.8 },
      { g: "hang", s: [r * 0.22, r * 0.22, r * 1.0], p: [-r * 0.62, 0, r * 2.15], c: c2, a: "armL", k: 0.8 },
      { g: "hang", s: [r * 0.22, r * 0.22, r * 1.0], p: [r * 0.62, 0, r * 2.15], c: c2, a: "armR", k: 0.8 },
      { g: "box", s: [r * 0.12, r * 0.9, r * 0.12], p: [0, r * 0.45, 0], c: 0x8a8a90, hold: "armR" },
    ] };
    case "blob": return { parts: [
      { g: "sph", s: [r * 1.1, r * 1.2, r * 0.8], p: [0, 0, r * 0.9], c, a: "pulse", k: 0.05 },
      { g: "sph", s: [r * 0.55, r * 0.55, r * 0.55], p: [0, -r * 0.6, r * 1.5], c: c2, a: "pulse", k: 0.15 },
      { g: "sph", s: [2, 2, 2], p: [-r * 0.3, r * 0.95, r * 1.1], c: 0xffff66, e: 1 },
      { g: "sph", s: [2, 2, 2], p: [0, r * 1.05, r * 1.25], c: 0xffff66, e: 1 },
      { g: "sph", s: [2, 2, 2], p: [r * 0.3, r * 0.95, r * 1.1], c: 0xffff66, e: 1 },
      { g: "hang", s: [r * 0.2, r * 0.2, r * 0.8], p: [-r * 0.8, r * 0.4, r * 0.8], c: c2, a: "legL", k: 0.5 },
      { g: "hang", s: [r * 0.2, r * 0.2, r * 0.8], p: [r * 0.8, r * 0.4, r * 0.8], c: c2, a: "legR", k: 0.5 },
      { g: "hang", s: [r * 0.2, r * 0.2, r * 0.8], p: [-r * 0.8, -r * 0.4, r * 0.8], c: c2, a: "legR", k: 0.5 },
      { g: "hang", s: [r * 0.2, r * 0.2, r * 0.8], p: [r * 0.8, -r * 0.4, r * 0.8], c: c2, a: "legL", k: 0.5 },
    ] };
    case "brute": return { parts: [
      { g: "box", s: [r * 1.5, r * 1.0, r * 1.4], p: [0, 0, r * 1.8], c },
      { g: "sph", s: [r * 0.8, r * 0.6, r * 0.7], p: [0, r * 0.35, r * 1.5], c: c2 },
      { g: "sph", s: [r * 0.5, r * 0.5, r * 0.5], p: [0, r * 0.35, r * 2.75], c },
      { g: "cone", s: [r * 0.08, r * 0.08, r * 0.35], p: [-r * 0.2, r * 0.75, r * 2.55], c: 0xf0e6d2 },
      { g: "cone", s: [r * 0.08, r * 0.08, r * 0.35], p: [r * 0.2, r * 0.75, r * 2.55], c: 0xf0e6d2 },
      { g: "sph", s: [2.4, 2.4, 2.4], p: [-r * 0.2, r * 0.8, r * 2.85], c: RED, e: 1 },
      { g: "sph", s: [2.4, 2.4, 2.4], p: [r * 0.2, r * 0.8, r * 2.85], c: RED, e: 1 },
      { g: "hang", s: [r * 0.5, r * 0.5, r * 1.15], p: [-r * 0.45, 0, r * 1.15], c: c2, a: "legL", k: 0.55 },
      { g: "hang", s: [r * 0.5, r * 0.5, r * 1.15], p: [r * 0.45, 0, r * 1.15], c: c2, a: "legR", k: 0.55 },
      { g: "hang", s: [r * 0.42, r * 0.42, r * 1.35], p: [-r * 0.95, r * 0.15, r * 2.35], c, a: "armL", k: 0.5 },
      { g: "hang", s: [r * 0.42, r * 0.42, r * 1.35], p: [r * 0.95, r * 0.15, r * 2.35], c, a: "armR", k: 0.5 },
    ] };
    case "ghost": return { fly: def.fly || 8, bobK: 5, ghost: true, parts: [
      { g: "coneDown", s: [r * 1.0, r * 1.0, r * 2.2], p: [0, 0, r * 2.0], c },
      { g: "sph", s: [r * 0.55, r * 0.55, r * 0.55], p: [0, 0, r * 3.3], c },
      { g: "cone", s: [r * 0.75, r * 0.75, r * 1.0], p: [0, -r * 0.15, r * 3.6], c: c2 },
      { g: "sph", s: [1.9, 1.9, 1.9], p: [-r * 0.2, r * 0.45, r * 3.35], c: 0xffffff, e: 1 },
      { g: "sph", s: [1.9, 1.9, 1.9], p: [r * 0.2, r * 0.45, r * 3.35], c: 0xffffff, e: 1 },
      { g: "hang", s: [r * 0.22, r * 0.22, r * 1.1], p: [-r * 0.6, r * 0.2, r * 2.6], c, a: "armL", b: 1.0, k: 0.2 },
      { g: "hang", s: [r * 0.22, r * 0.22, r * 1.1], p: [r * 0.6, r * 0.2, r * 2.6], c, a: "armR", b: 1.0, k: 0.2 },
    ] };
    case "wisp": return { fly: def.fly || 14, bobK: 6, ghost: true, parts: [
      { g: "sph", s: [r * 0.9, r * 0.9, r * 1.1], p: [0, 0, r], c, e: 1, a: "pulse", k: 0.15 },
      { g: "coneDown", s: [r * 0.6, r * 0.6, r * 1.6], p: [0, -r * 0.5, r * 0.2], c: c2, e: 1 },
      { g: "sph", s: [r * 0.3, r * 0.3, r * 0.3], p: [-r * 0.35, r * 0.7, r * 1.2], c: 0xffffff, e: 1 },
      { g: "sph", s: [r * 0.3, r * 0.3, r * 0.3], p: [r * 0.35, r * 0.7, r * 1.2], c: 0xffffff, e: 1 },
    ] };
    case "knight": return { parts: [
      { g: "box", s: [r * 1.2, r * 0.8, r * 1.3], p: [0, 0, r * 1.85], c },
      { g: "box", s: [r * 1.25, r * 0.85, r * 0.5], p: [0, 0, r * 1.05], c: c2 },
      { g: "box", s: [r * 0.7, r * 0.7, r * 0.75], p: [0, 0, r * 2.85], c },
      { g: "box", s: [r * 0.1, r * 0.6, r * 0.35], p: [0, -r * 0.25, r * 3.35], c: c3 },
      { g: "box", s: [r * 0.5, r * 0.1, r * 0.12], p: [0, r * 0.36, r * 2.85], c: c3, e: 1 },
      { g: "box", s: [r * 0.8, r * 0.12, r * 1.1], p: [-r * 0.05, r * 0.2, r * 0.35], c: c2, hold: "armL" },
      { g: "box", s: [r * 0.1, r * 1.6, r * 0.2], p: [0, r * 0.8, 0], c: 0xd8dde6, hold: "armR" },
      { g: "box", s: [r * 1.4, r * 0.1, r * 1.6], p: [0, -r * 0.45, r * 1.6], c: c2, a: "tail", k: 0.08 },
      { g: "hang", s: [r * 0.38, r * 0.38, r * 1.05], p: [-r * 0.35, 0, r * 1.05], c: c2, a: "legL", k: 0.6 },
      { g: "hang", s: [r * 0.38, r * 0.38, r * 1.05], p: [r * 0.35, 0, r * 1.05], c: c2, a: "legR", k: 0.6 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [-r * 0.8, 0, r * 2.3], c, a: "armL", k: 0.5 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [r * 0.8, 0, r * 2.3], c, a: "armR", k: 0.5 },
    ] };
    case "witch": return { parts: [
      { g: "taperUp", s: [r * 0.9, r * 0.8, r * 2.0], p: [0, -r * 0.1, 0], c, rx: 0.25 },
      { g: "box", s: [r * 1.0, r * 0.1, r * 0.9], p: [0, -r * 0.55, r * 0.9], c: c2, a: "tail", k: 0.2 },
      { g: "ico1", s: [r * 0.46, r * 0.5, r * 0.48], p: [0, r * 0.35, r * 2.2], c },
      { g: "cone", s: [r * 0.5, r * 0.55, r * 0.9], p: [0, r * 0.25, r * 2.5], c: c2, rx: 0.35 },
      { g: "sph", s: [r * 0.3, r * 0.14, r * 0.26], p: [0, r * 0.72, r * 2.15], c: 0x0a0808 },
      { g: "sph", s: [1.5, 1.5, 1.5], p: [-r * 0.12, r * 0.8, r * 2.2], c: c3, e: 1 },
      { g: "sph", s: [1.5, 1.5, 1.5], p: [r * 0.12, r * 0.8, r * 2.2], c: c3, e: 1 },
      { g: "hang", s: [r * 0.24, r * 0.24, r * 1.0], p: [-r * 0.6, r * 0.3, r * 1.9], c, a: "armL", b: 1.1, k: 0.2 },
      { g: "hang", s: [r * 0.24, r * 0.24, r * 1.0], p: [r * 0.6, r * 0.2, r * 1.9], c, a: "armR", b: 0.3, k: 0.15 },
      { g: "cyl", s: [r * 0.07, r * 0.07, r * 3.0], p: [0, 0, r * 0.6], c: 0x4a3020, hold: "armR" },
      { g: "ico1", s: [r * 0.26, r * 0.26, r * 0.26], p: [0, 0, r * 2.1], c: c3, e: 1, a: "pulse", k: 0.25, hold: "armR" },
      { g: "torus", s: [r * 0.3, r * 0.3, r * 0.3], p: [0, 0, r * 2.1], c: 0x8a7040, hold: "armR" },
    ] };
    case "leech": return { parts: [
      { g: "sph", s: [r * 0.7, r * 1.3, r * 0.5], p: [0, 0, r * 0.5], c, a: "wiggle", k: 0.3 },
      { g: "sph", s: [r * 0.55, r * 0.9, r * 0.42], p: [0, -r * 1.1, r * 0.4], c: c2, a: "wiggle", k: -0.4 },
      { g: "torus", s: [r * 0.4, r * 0.4, r * 0.4], p: [0, r * 1.2, r * 0.6], c: 0xd07080, rx: Math.PI / 2 },
      { g: "sph", s: [1.3, 1.3, 1.3], p: [-r * 0.25, r * 0.9, r * 0.9], c: 0xffe066, e: 1 },
      { g: "sph", s: [1.3, 1.3, 1.3], p: [r * 0.25, r * 0.9, r * 0.9], c: 0xffe066, e: 1 },
    ] };
    case "toad": return { parts: [
      { g: "sph", s: [r * 1.15, r * 1.1, r * 0.7], p: [0, 0, r * 0.75], c, a: "hop", k: 0.1 },
      { g: "sph", s: [r * 0.9, r * 0.5, r * 0.35], p: [0, r * 0.6, r * 0.55], c: 0xd8d8a0 },
      { g: "sph", s: [r * 0.28, r * 0.28, r * 0.28], p: [-r * 0.45, r * 0.55, r * 1.35], c: 0xffd23a, e: 1 },
      { g: "sph", s: [r * 0.28, r * 0.28, r * 0.28], p: [r * 0.45, r * 0.55, r * 1.35], c: 0xffd23a, e: 1 },
      { g: "sph", s: [r * 0.12, r * 0.12, r * 0.12], p: [-r * 0.2, -r * 0.1, r * 1.35], c: c2 },
      { g: "sph", s: [r * 0.14, r * 0.14, r * 0.14], p: [r * 0.3, -r * 0.3, r * 1.3], c: c2 },
      { g: "hang", s: [r * 0.3, r * 0.6, r * 0.6], p: [-r * 0.9, -r * 0.3, r * 0.6], c: c2, a: "legL", k: 0.4 },
      { g: "hang", s: [r * 0.3, r * 0.6, r * 0.6], p: [r * 0.9, -r * 0.3, r * 0.6], c: c2, a: "legR", k: 0.4 },
    ] };
    case "slime": return { parts: [
      { g: "sph", s: [r * 1.05, r * 1.05, r * 0.85], p: [0, 0, r * 0.8], c, a: "pulse", k: 0.1, ghostMat: 1 },
      { g: "sph", s: [r * 0.45, r * 0.45, r * 0.45], p: [0, 0, r * 0.8], c: c2 },
      { g: "sph", s: [r * 0.14, r * 0.14, r * 0.18], p: [-r * 0.3, r * 0.82, r * 1.1], c: 0xffffff, e: 1 },
      { g: "sph", s: [r * 0.14, r * 0.14, r * 0.18], p: [r * 0.3, r * 0.82, r * 1.1], c: 0xffffff, e: 1 },
    ] };
    case "imp": return { fly: def.fly || 20, bobK: 3, parts: [
      { g: "sph", s: [r * 0.7, r * 0.7, r * 0.9], p: [0, 0, 0], c },
      { g: "sph", s: [r * 0.55, r * 0.55, r * 0.55], p: [0, r * 0.3, r * 0.9], c },
      { g: "cone", s: [r * 0.12, r * 0.12, r * 0.5], p: [-r * 0.3, r * 0.3, r * 1.5], c: DARK },
      { g: "cone", s: [r * 0.12, r * 0.12, r * 0.5], p: [r * 0.3, r * 0.3, r * 1.5], c: DARK },
      { g: "wing", s: [r * 1.8, r * 1.0, 0.6], p: [-r * 0.4, -r * 0.3, r * 0.5], c: c2, a: "wingL" },
      { g: "wing", s: [r * 1.8, r * 1.0, 0.6], p: [r * 0.4, -r * 0.3, r * 0.5], c: c2, a: "wingR" },
      { g: "sph", s: [1.6, 1.6, 1.6], p: [-r * 0.2, r * 0.75, r * 1.0], c: 0xffee88, e: 1 },
      { g: "sph", s: [1.6, 1.6, 1.6], p: [r * 0.2, r * 0.75, r * 1.0], c: 0xffee88, e: 1 },
      { g: "sph", s: [r * 0.28, r * 0.28, r * 0.28], p: [0, -r * 0.2, -r * 0.4], c: 0xffb04a, e: 1, a: "pulse", k: 0.3 },
    ] };
    case "wolf": return { parts: [
      { g: "box", s: [r * 0.95, r * 1.9, r * 0.85], p: [0, 0, r * 1.25], c },
      { g: "box", s: [r * 0.75, r * 0.8, r * 0.7], p: [0, r * 1.15, r * 1.55], c },
      { g: "box", s: [r * 0.4, r * 0.6, r * 0.35], p: [0, r * 1.7, r * 1.4], c: c, a: "jaw" },
      { g: "cone", s: [r * 0.15, r * 0.15, r * 0.4], p: [-r * 0.25, r * 1.0, r * 2.05], c },
      { g: "cone", s: [r * 0.15, r * 0.15, r * 0.4], p: [r * 0.25, r * 1.0, r * 2.05], c },
      { g: "sph", s: [1.6, 1.6, 1.6], p: [-r * 0.22, r * 1.55, r * 1.72], c: c2, e: 1 },
      { g: "sph", s: [1.6, 1.6, 1.6], p: [r * 0.22, r * 1.55, r * 1.72], c: c2, e: 1 },
      { g: "box", s: [r * 0.22, r * 1.1, r * 0.22], p: [0, -r * 1.35, r * 1.5], c, a: "tail", k: 0.4 },
      { g: "hang", s: [r * 0.26, r * 0.26, r * 0.9], p: [-r * 0.35, r * 0.7, r * 0.9], c, a: "legL", k: 0.8 },
      { g: "hang", s: [r * 0.26, r * 0.26, r * 0.9], p: [r * 0.35, r * 0.7, r * 0.9], c, a: "legR", k: 0.8 },
      { g: "hang", s: [r * 0.26, r * 0.26, r * 0.9], p: [-r * 0.35, -r * 0.7, r * 0.9], c, a: "legR", k: 0.8 },
      { g: "hang", s: [r * 0.26, r * 0.26, r * 0.9], p: [r * 0.35, -r * 0.7, r * 0.9], c, a: "legL", k: 0.8 },
    ] };
    case "husk": return { parts: [
      { g: "box", s: [r * 1.1, r * 0.7, r * 1.3], p: [0, 0, r * 1.7], c },
      { g: "box", s: [r * 0.9, r * 0.5, r * 0.9], p: [0, r * 0.08, r * 1.7], c: c2, e: 1, a: "pulse", k: 0.12 },
      { g: "sph", s: [r * 0.5, r * 0.5, r * 0.55], p: [0, r * 0.15, r * 2.7], c },
      { g: "sph", s: [r * 0.3, r * 0.3, r * 0.3], p: [0, r * 0.2, r * 3.2], c: 0xffd070, e: 1, a: "flick", k: 0.4 },
      { g: "sph", s: [1.8, 1.8, 1.8], p: [-r * 0.2, r * 0.6, r * 2.75], c: 0xffee88, e: 1 },
      { g: "sph", s: [1.8, 1.8, 1.8], p: [r * 0.2, r * 0.6, r * 2.75], c: 0xffee88, e: 1 },
      { g: "hang", s: [r * 0.35, r * 0.35, r * 1.0], p: [-r * 0.3, 0, r * 1.05], c, a: "legL", k: 0.7 },
      { g: "hang", s: [r * 0.35, r * 0.35, r * 1.0], p: [r * 0.3, 0, r * 1.05], c, a: "legR", k: 0.7 },
      { g: "hang", s: [r * 0.28, r * 0.28, r * 1.1], p: [-r * 0.75, r * 0.2, r * 2.2], c, a: "armL", b: 1.2, k: 0.3 },
      { g: "hang", s: [r * 0.28, r * 0.28, r * 1.1], p: [r * 0.75, r * 0.2, r * 2.2], c, a: "armR", b: 1.2, k: 0.3 },
    ] };
    case "cultist": return { parts: [
      { g: "taperUp", s: [r * 0.95, r * 0.95, r * 2.4], p: [0, 0, 0], c },
      { g: "cone", s: [r * 0.62, r * 0.62, r * 1.1], p: [0, -r * 0.05, r * 2.85], c },
      { g: "sph", s: [r * 0.4, r * 0.3, r * 0.4], p: [0, r * 0.28, r * 2.55], c: DARK },
      { g: "sph", s: [1.6, 1.6, 1.6], p: [-r * 0.15, r * 0.55, r * 2.6], c: c2, e: 1 },
      { g: "sph", s: [1.6, 1.6, 1.6], p: [r * 0.15, r * 0.55, r * 2.6], c: c2, e: 1 },
      { g: "hang", s: [r * 0.28, r * 0.28, r * 1.1], p: [-r * 0.7, r * 0.1, r * 2.1], c, a: "armL", b: 0.8, k: 0.3 },
      { g: "hang", s: [r * 0.28, r * 0.28, r * 1.1], p: [r * 0.7, r * 0.1, r * 2.1], c, a: "armR", b: 0.8, k: 0.3 },
      { g: "sph", s: [r * 0.35, r * 0.35, r * 0.35], p: [0, r * 1.0, r * 1.7], c: c2, e: 1, a: "pulse", k: 0.3 },
    ] };
    case "treant": return { parts: [
      { g: "taperUp", s: [r * 0.8, r * 0.8, r * 3.0], p: [0, 0, 0], c },
      { g: "sph", s: [r * 0.12, r * 0.12, r * 0.12], p: [-r * 0.25, r * 0.7, r * 2.4], c: c2, e: 1 },
      { g: "sph", s: [r * 0.12, r * 0.12, r * 0.12], p: [r * 0.25, r * 0.7, r * 2.4], c: c2, e: 1 },
      { g: "box", s: [r * 0.5, r * 0.1, r * 0.1], p: [0, r * 0.72, r * 2.0], c: c2, e: 1 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.9], p: [-r * 0.85, r * 0.2, r * 2.6], c, a: "armL", b: 0.5, k: 0.35 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.9], p: [r * 0.85, r * 0.2, r * 2.6], c, a: "armR", b: 0.5, k: 0.35 },
      { g: "cone", s: [r * 0.18, r * 0.18, r * 1.4], p: [-r * 0.3, 0, r * 3.4], c },
      { g: "cone", s: [r * 0.14, r * 0.14, r * 1.1], p: [r * 0.35, -r * 0.1, r * 3.3], c },
      { g: "sph", s: [r * 0.3, r * 0.3, r * 0.3], p: [-r * 0.3, 0, r * 4.1], c: c2, e: 1, a: "flick", k: 0.4 },
      { g: "hang", s: [r * 0.4, r * 0.4, r * 0.6], p: [-r * 0.4, 0, r * 0.6], c, a: "legL", k: 0.35 },
      { g: "hang", s: [r * 0.4, r * 0.4, r * 0.6], p: [r * 0.4, 0, r * 0.6], c, a: "legR", k: 0.35 },
    ] };
    case "yeti": return { parts: [
      { g: "sph", s: [r * 0.95, r * 0.8, r * 1.05], p: [0, 0, r * 1.8], c },
      { g: "sph", s: [r * 0.5, r * 0.5, r * 0.5], p: [0, r * 0.35, r * 2.8], c },
      { g: "box", s: [r * 0.5, r * 0.2, r * 0.3], p: [0, r * 0.75, r * 2.7], c: c2 },
      { g: "sph", s: [2.4, 2.4, 2.4], p: [-r * 0.18, r * 0.8, r * 2.95], c: 0x7ad8ff, e: 1 },
      { g: "sph", s: [2.4, 2.4, 2.4], p: [r * 0.18, r * 0.8, r * 2.95], c: 0x7ad8ff, e: 1 },
      { g: "hang", s: [r * 0.5, r * 0.5, r * 1.1], p: [-r * 0.45, 0, r * 1.1], c, a: "legL", k: 0.5 },
      { g: "hang", s: [r * 0.5, r * 0.5, r * 1.1], p: [r * 0.45, 0, r * 1.1], c, a: "legR", k: 0.5 },
      { g: "hang", s: [r * 0.45, r * 0.45, r * 1.7], p: [-r * 1.0, r * 0.1, r * 2.5], c, a: "armL", k: 0.5 },
      { g: "hang", s: [r * 0.45, r * 0.45, r * 1.7], p: [r * 1.0, r * 0.1, r * 2.5], c, a: "armR", k: 0.5 },
    ] };
    case "gargoyle": return { fly: def.fly || 30, bobK: 4, parts: [
      { g: "box", s: [r * 0.9, r * 1.1, r * 1.0], p: [0, 0, 0], c },
      { g: "box", s: [r * 0.6, r * 0.6, r * 0.6], p: [0, r * 0.7, r * 0.5], c },
      { g: "cone", s: [r * 0.15, r * 0.15, r * 0.6], p: [-r * 0.25, r * 0.6, r * 1.0], c: c2 },
      { g: "cone", s: [r * 0.15, r * 0.15, r * 0.6], p: [r * 0.25, r * 0.6, r * 1.0], c: c2 },
      { g: "wing", s: [r * 2.6, r * 1.4, 1], p: [-r * 0.4, -r * 0.2, r * 0.4], c: c2, a: "wingL" },
      { g: "wing", s: [r * 2.6, r * 1.4, 1], p: [r * 0.4, -r * 0.2, r * 0.4], c: c2, a: "wingR" },
      { g: "sph", s: [1.7, 1.7, 1.7], p: [-r * 0.18, r * 1.02, r * 0.6], c: 0x9ab0ff, e: 1 },
      { g: "sph", s: [1.7, 1.7, 1.7], p: [r * 0.18, r * 1.02, r * 0.6], c: 0x9ab0ff, e: 1 },
      { g: "box", s: [r * 0.15, r * 1.2, r * 0.15], p: [0, -r * 1.0, -r * 0.2], c, a: "tail", k: 0.5 },
    ] };
    case "hollow": return { parts: [
      { g: "box", s: [r * 1.1, r * 0.7, r * 1.3], p: [0, 0, r * 1.75], c },
      { g: "box", s: [r * 1.15, r * 0.75, r * 0.5], p: [0, 0, r * 1.0], c: 0x3a3a4e },
      { g: "box", s: [r * 0.62, r * 0.62, r * 0.7], p: [0, 0, r * 2.75], c },
      { g: "box", s: [r * 0.4, r * 0.08, r * 0.1], p: [0, r * 0.32, r * 2.8], c: c2, e: 1 },
      { g: "cone", s: [r * 0.25, r * 0.25, r * 0.5], p: [0, 0, r * 3.35], c: 0x4a4a60 },
      { g: "hang", s: [r * 0.34, r * 0.34, r * 1.0], p: [-r * 0.32, 0, r * 1.0], c: 0x3a3a4e, a: "legL", k: 0.6 },
      { g: "hang", s: [r * 0.34, r * 0.34, r * 1.0], p: [r * 0.32, 0, r * 1.0], c: 0x3a3a4e, a: "legR", k: 0.6 },
      { g: "hang", s: [r * 0.26, r * 0.26, r * 1.1], p: [-r * 0.72, 0, r * 2.2], c, a: "armL", k: 0.5 },
      { g: "hang", s: [r * 0.26, r * 0.26, r * 1.1], p: [r * 0.72, 0, r * 2.2], c, a: "armR", k: 0.5 },
      { g: "box", s: [r * 0.08, r * 1.3, r * 0.08], p: [0, r * 0.65, 0], c: c2, e: 1, hold: "armR" },
    ] };
    case "bogmother": return { parts: [
      { g: "sph", s: [r * 1.15, r * 1.25, r * 0.8], p: [0, 0, r * 0.7], c, a: "pulse", k: 0.04 },
      { g: "sph", s: [r * 0.7, r * 0.6, r * 0.7], p: [0, r * 0.5, r * 1.3], c },
      { g: "sph", s: [r * 0.9, r * 0.35, r * 0.25], p: [0, r * 0.95, r * 1.0], c: 0x2a1a14, a: "jaw" },
      { g: "sph", s: [r * 0.12, r * 0.12, r * 0.12], p: [-r * 0.3, r * 0.95, r * 1.6], c: 0xffe066, e: 1 },
      { g: "sph", s: [r * 0.1, r * 0.1, r * 0.1], p: [r * 0.05, r * 1.02, r * 1.75], c: 0xffe066, e: 1 },
      { g: "sph", s: [r * 0.12, r * 0.12, r * 0.12], p: [r * 0.35, r * 0.95, r * 1.55], c: 0xffe066, e: 1 },
      { g: "sph", s: [r * 0.25, r * 0.25, r * 0.25], p: [-r * 0.6, -r * 0.4, r * 1.3], c: c2, a: "pulse", k: 0.2 },
      { g: "sph", s: [r * 0.3, r * 0.3, r * 0.3], p: [r * 0.5, -r * 0.6, r * 1.2], c: c2, a: "pulse", k: 0.2 },
      { g: "hang", s: [r * 0.22, r * 0.22, r * 1.4], p: [-r * 1.0, r * 0.4, r * 0.9], c, a: "armL", b: 1.1, k: 0.4 },
      { g: "hang", s: [r * 0.22, r * 0.22, r * 1.4], p: [r * 1.0, r * 0.4, r * 0.9], c, a: "armR", b: 1.1, k: 0.4 },
      { g: "hang", s: [r * 0.2, r * 0.2, r * 1.3], p: [-r * 0.9, -r * 0.4, r * 0.8], c, a: "armR", b: 1.3, k: 0.4 },
      { g: "hang", s: [r * 0.2, r * 0.2, r * 1.3], p: [r * 0.9, -r * 0.4, r * 0.8], c, a: "armL", b: 1.3, k: 0.4 },
    ] };
    case "stag": return { parts: [
      { g: "box", s: [r * 0.8, r * 1.8, r * 0.8], p: [0, 0, r * 1.7], c },
      { g: "box", s: [r * 0.6, r * 0.5, r * 0.9], p: [0, r * 0.95, r * 2.2], c },
      { g: "box", s: [r * 0.4, r * 0.7, r * 0.4], p: [0, r * 1.35, r * 2.6], c },
      { g: "box", s: [r * 0.3, r * 1.0, r * 0.12], p: [0, 0, r * 2.12], c: 0xc04a18, e: 1, a: "pulse", k: 0.1 },
      { g: "sph", s: [r * 0.07, r * 0.07, r * 0.07], p: [-r * 0.15, r * 1.6, r * 2.75], c: 0xfff0a0, e: 1 },
      { g: "sph", s: [r * 0.07, r * 0.07, r * 0.07], p: [r * 0.15, r * 1.6, r * 2.75], c: 0xfff0a0, e: 1 },
      // Antlers.
      { g: "box", s: [r * 0.07, r * 0.07, r * 0.9], p: [-r * 0.25, r * 1.2, r * 3.2], c: 0x1a120e, rx: -0.3, ry: -0.4 },
      { g: "box", s: [r * 0.07, r * 0.07, r * 0.9], p: [r * 0.25, r * 1.2, r * 3.2], c: 0x1a120e, rx: -0.3, ry: 0.4 },
      { g: "box", s: [r * 0.06, r * 0.06, r * 0.6], p: [-r * 0.55, r * 1.1, r * 3.55], c: 0x1a120e, ry: -1.0 },
      { g: "box", s: [r * 0.06, r * 0.06, r * 0.6], p: [r * 0.55, r * 1.1, r * 3.55], c: 0x1a120e, ry: 1.0 },
      { g: "sph", s: [r * 0.12, r * 0.12, r * 0.12], p: [-r * 0.7, r * 1.1, r * 3.85], c: 0xffa040, e: 1, a: "flick", k: 0.5 },
      { g: "sph", s: [r * 0.12, r * 0.12, r * 0.12], p: [r * 0.7, r * 1.1, r * 3.85], c: 0xffa040, e: 1, a: "flick", k: 0.5 },
      { g: "hang", s: [r * 0.18, r * 0.18, r * 1.35], p: [-r * 0.3, r * 0.7, r * 1.35], c, a: "legL", k: 0.7 },
      { g: "hang", s: [r * 0.18, r * 0.18, r * 1.35], p: [r * 0.3, r * 0.7, r * 1.35], c, a: "legR", k: 0.7 },
      { g: "hang", s: [r * 0.18, r * 0.18, r * 1.35], p: [-r * 0.3, -r * 0.7, r * 1.35], c, a: "legR", k: 0.7 },
      { g: "hang", s: [r * 0.18, r * 0.18, r * 1.35], p: [r * 0.3, -r * 0.7, r * 1.35], c, a: "legL", k: 0.7 },
    ] };
    case "wormhead": return { parts: [
      { g: "sph", s: [r * 0.95, r * 1.1, r * 0.8], p: [0, 0, r * 0.8], c },
      { g: "cone", s: [r * 0.5, r * 0.5, r * 0.9], p: [-r * 0.55, r * 0.8, r * 0.7], c: 0xe8f4ff, rx: -1.3 },
      { g: "cone", s: [r * 0.5, r * 0.5, r * 0.9], p: [r * 0.55, r * 0.8, r * 0.7], c: 0xe8f4ff, rx: -1.3 },
      { g: "sph", s: [r * 0.14, r * 0.14, r * 0.14], p: [-r * 0.4, r * 0.75, r * 1.25], c: 0x7ad8ff, e: 1 },
      { g: "sph", s: [r * 0.14, r * 0.14, r * 0.14], p: [r * 0.4, r * 0.75, r * 1.25], c: 0x7ad8ff, e: 1 },
      { g: "cone", s: [r * 0.2, r * 0.2, r * 0.8], p: [0, -r * 0.2, r * 1.6], c: 0xcfeaff },
      { g: "cone", s: [r * 0.16, r * 0.16, r * 0.6], p: [-r * 0.35, -r * 0.4, r * 1.4], c: 0xcfeaff },
      { g: "cone", s: [r * 0.16, r * 0.16, r * 0.6], p: [r * 0.35, -r * 0.4, r * 1.4], c: 0xcfeaff },
    ] };
    case "wormseg": return { parts: [
      { g: "sph", s: [r, r, r * 0.75], p: [0, 0, r * 0.75], c },
      { g: "sph", s: [r * 0.7, r * 0.7, r * 0.3], p: [0, 0, r * 0.2], c: c2 },
      { g: "cone", s: [r * 0.22, r * 0.22, r * 0.7], p: [0, 0, r * 1.55], c: 0xcfeaff },
      { g: "sph", s: [r * 0.3, r * 0.3, r * 0.2], p: [0, 0, r * 0.9], c: 0x7ad8ff, e: 1, a: "pulse", k: 0.2 },
    ] };
    case "king": return { parts: [
      { g: "taperUp", s: [r * 0.9, r * 0.9, r * 2.6], p: [0, 0, 0], c },
      { g: "box", s: [r * 1.4, r * 0.4, r * 0.3], p: [0, 0, r * 2.4], c: 0x2a2a40 },
      { g: "sph", s: [r * 0.38, r * 0.38, r * 0.42], p: [0, r * 0.05, r * 2.85], c: 0xd8dcf0 },
      { g: "sph", s: [r * 0.07, r * 0.07, r * 0.07], p: [-r * 0.14, r * 0.38, r * 2.9], c: c2, e: 1 },
      { g: "sph", s: [r * 0.07, r * 0.07, r * 0.07], p: [r * 0.14, r * 0.38, r * 2.9], c: c2, e: 1 },
      { g: "torus", s: [r * 0.4, r * 0.4, r * 0.4], p: [0, 0, r * 3.25], c: 0xc0c8ff, e: 1 },
      { g: "cone", s: [r * 0.07, r * 0.07, r * 0.35], p: [-r * 0.28, 0, r * 3.45], c: 0xc0c8ff, e: 1 },
      { g: "cone", s: [r * 0.07, r * 0.07, r * 0.45], p: [0, r * 0.28, r * 3.5], c: 0xc0c8ff, e: 1 },
      { g: "cone", s: [r * 0.07, r * 0.07, r * 0.35], p: [r * 0.28, 0, r * 3.45], c: 0xc0c8ff, e: 1 },
      { g: "cone", s: [r * 0.07, r * 0.07, r * 0.45], p: [0, -r * 0.28, r * 3.5], c: 0xc0c8ff, e: 1 },
      { g: "hang", s: [r * 0.22, r * 0.22, r * 1.3], p: [-r * 0.75, 0, r * 2.35], c, a: "armL", b: 0.6, k: 0.3 },
      { g: "hang", s: [r * 0.22, r * 0.22, r * 1.3], p: [r * 0.75, 0, r * 2.35], c, a: "armR", b: 0.6, k: 0.3 },
      { g: "cyl", s: [r * 0.06, r * 0.06, r * 2.8], p: [0, r * 0.169, r * 0.248], c: 0x8a8aa0, rx: -0.6, hold: "armR" },
      { g: "sph", s: [r * 0.2, r * 0.2, r * 0.2], p: [0, r * 0.960, r * 1.403], c: c2, e: 1, a: "pulse", k: 0.3, hold: "armR" },
    ] };
    case "candle": return { parts: [
      { g: "cylUp", s: [r * 0.9, r * 0.9, 6], p: [0, 0, 0], c: 0x3a3230 },
      { g: "cylUp", s: [r * 0.18, r * 0.18, 26], p: [0, 0, 6], c: 0x3a3230 },
      { g: "cylUp", s: [r * 1.0, r * 1.0, 4], p: [0, 0, 30], c: 0x5a4a3a },
      { g: "cylUp", s: [2.6, 2.6, 10], p: [-5, 0, 34], c: 0xeae0c8 },
      { g: "cylUp", s: [2.6, 2.6, 13], p: [5, 0, 34], c: 0xeae0c8 },
      { g: "cylUp", s: [2.6, 2.6, 8], p: [0, 5, 34], c: 0xeae0c8 },
      { g: "sph", s: [1.8, 1.8, 3.2], p: [-5, 0, 47], c: 0xffd28a, e: 1, a: "flick", k: 0.3 },
      { g: "sph", s: [1.8, 1.8, 3.2], p: [5, 0, 50], c: 0xffd28a, e: 1, a: "flick", k: 0.3 },
      { g: "sph", s: [1.8, 1.8, 3.2], p: [0, 5, 45], c: 0xffd28a, e: 1, a: "flick", k: 0.3 },
    ] };
    default: return { parts: [{ g: "sph", s: [r, r, r], p: [0, 0, r], c }] };
  }
}

// The swing of a limb part at animation time t (matches the switch below).
function limbAngle(L, t) {
  const sgn = L.a === "legL" || L.a === "armR" ? 1 : -1;
  return (L.b || 0) + sgn * Math.sin(t) * L.k;
}

const RIG_GEO = {
  ...GEO, taperUp: GEO.taper,
  ico1: new T.IcosahedronGeometry(1, 1),
  sphHalf: new T.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2),
  wingTip: new T.BoxGeometry(1, 1, 1).translate(1.2, -0.2, 0),
  torusHalf: new T.TorusGeometry(1, 0.08, 4, 12, Math.PI),
};

// A monster as a plain group of meshes in one pose (for bestiary portraits):
// the same parts, limbs and held things as the instanced rig.
export function monsterFigure(id, t = 0.9) {
  const def = MON[id], sp = spec(def);
  const g = new T.Group();
  const d = new T.Object3D(), am = new T.Matrix4(), ar = new T.Matrix4(), at = new T.Matrix4();
  const hang = (a) => sp.parts.find((q) => q.a === a && q.g === "hang");
  for (const ps of sp.parts) {
    const mat = ps.e ? new T.MeshBasicMaterial({ color: ps.c }) : new T.MeshStandardMaterial({ color: ps.c, roughness: 0.8, flatShading: true, transparent: !!sp.ghost, opacity: sp.ghost ? 0.85 : 1 });
    const mesh = new T.Mesh(RIG_GEO[ps.g], mat);
    d.position.set(ps.p[0], ps.p[1], ps.p[2]);
    d.rotation.set(ps.rx || 0, ps.ry || 0, ps.rz || 0);
    if (ps.g === "hang" && /leg|arm/.test(ps.a || "")) d.rotation.x = limbAngle(ps, t);
    if (ps.a === "wingL") { d.rotation.z = Math.PI; d.rotation.y = 0.35; }
    if (ps.a === "wingR") d.rotation.y = -0.35;
    if (ps.q) { const [x, y, z] = ps.q.map((v) => new T.Vector3(...v)); d.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z)); }
    d.scale.set(ps.s[0], ps.s[1], ps.s[2]);
    d.updateMatrix();
    const L = ps.hold ? hang(ps.hold) : null;
    if (L) {
      am.makeTranslation(L.p[0], L.p[1], L.p[2]).multiply(ar.makeRotationX(limbAngle(L, t))).multiply(at.makeTranslation(0, 0, -L.s[2])).multiply(d.matrix);
      mesh.matrix.copy(am);
    } else mesh.matrix.copy(d.matrix);
    mesh.matrixAutoUpdate = false;
    g.add(mesh);
  }
  g.position.z = sp.fly || 0;
  const s = def.scale || 1;
  g.scale.setScalar(s);
  return g;
}

export class Rigs {
  constructor(scene) {
    this.scene = scene;
    this.rigs = new Map();
    this.dummy = new T.Object3D();
    this.root = new T.Matrix4();
    this.pm = new T.Matrix4();
    this.col = new T.Color();
    this.am = new T.Matrix4(); this.ar = new T.Matrix4(); this.at = new T.Matrix4();
    this.shadows = new T.InstancedMesh(GEO.disc, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }), MAX_MON + 80);
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 2;
    scene.add(this.shadows);
    this.castShadow = false;
  }

  rig(id) {
    let rig = this.rigs.get(id);
    if (rig) return rig;
    const def = MON[id];
    const sp = spec(def);
    for (const ps of sp.parts) {
      if (ps.hold) ps.holdPart = sp.parts.find((q) => q.a === ps.hold && q.g === "hang");
      if (ps.q) { const [x, y, z] = ps.q.map((v) => new T.Vector3(...v)); ps.quat = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z)); }
    }
    const cap = def.boss ? 2 : def.elite ? 8 : id === "wormseg" ? 20 : id === "candle" ? 24 : ["crow", "shambler", "gravebound", "leech", "drowned", "imp", "frostbat", "iceskel", "gargoyle", "hollow"].includes(id) ? MAX_MON + 20 : 200;
    const sc = def.scale || 1;
    const parts = sp.parts.map((ps) => {
      const mat = ps.e
        ? new T.MeshBasicMaterial({ color: 0xffffff, transparent: !!sp.ghost, opacity: sp.ghost ? 0.9 : 1 })
        : sp.ghost || ps.ghostMat
          ? new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: ps.ghostMat ? 0.82 : 0.72, depthWrite: !sp.ghost })
          : new T.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
      const mesh = new T.InstancedMesh(RIG_GEO[ps.g], mat, cap);
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.castShadow = this.castShadow && !ps.e && !sp.ghost;
      this.col.setHex(ps.c);
      for (let i = 0; i < cap; i++) mesh.setColorAt(i, this.col);
      this.scene.add(mesh);
      return { mesh, spec: ps };
    });
    rig = { parts, cap, count: 0, spec: sp, sc };
    this.rigs.set(id, rig);
    return rig;
  }

  sync(R, time) {
    for (const rig of this.rigs.values()) rig.count = 0;
    let sh = 0;
    const d = this.dummy;
    const eclipse = R.eclipse;
    for (const m of R.monsters) {
      if (!m.alive) continue;
      const rig = this.rig(m.id);
      if (rig.count >= rig.cap) continue;
      const i = rig.count++;
      const p = m.body.position;
      const t = m.anim;
      const shake = m.wind > 0 ? 2 : 0;
      const jx = shake ? (Math.random() - 0.5) * 4 : 0, jy = shake ? (Math.random() - 0.5) * 4 : 0;
      let z = (rig.spec.fly || 0) + (rig.spec.bobK ? Math.sin(t * 2 + m.wobble) * rig.spec.bobK : 0);
      if (m.z !== undefined) z = m.z;
      if (m.thrown > 0) z += Math.sin((m.thrown / 36) * Math.PI) * 26;
      // Bog mother / king under the ground or mid-blink.
      let sink = 1;
      if (m.hidden > 0) { sink = m.def.ai === "king" ? Math.abs(m.hidden - 20) / 20 : 0.05; z -= m.def.ai === "king" ? 0 : m.def.r * 1.2; }
      const born = Math.min(1, (R.frame - m.born) / 20);
      const s = rig.sc * (m.def.boss || m.def.elite ? 1 : 0.4 + born * 0.6) * (m.def.ai === "king" ? Math.max(0.05, sink) : 1);
      // Turn toward the sim's facing instead of snapping to it.
      if (m.faceVis === undefined) m.faceVis = m.face;
      else {
        const da = Math.atan2(Math.sin(m.face - m.faceVis), Math.cos(m.face - m.faceVis));
        m.faceVis += da * Math.min(1, (m.def.boss ? 0.08 : 0.18) * (m.dash > 0 ? 3 : 1));
      }
      this.root.makeRotationZ(-m.faceVis - Math.PI / 2);
      if (m.stun > 0 || R.freeze > 0) this.root.multiply(new T.Matrix4().makeRotationX(Math.sin(time * 20) * 0.04));
      this.root.scale(new T.Vector3(s, s, s));
      this.root.setPosition(p.x + jx, -p.y + jy, z);
      const flash = m.hitFlash > 0;
      const frozen = R.freeze > 0 && !m.def.boss;
      for (const { mesh, spec: ps } of rig.parts) {
        d.position.set(ps.p[0], ps.p[1], ps.p[2]);
        d.rotation.set(ps.rx || 0, ps.ry || 0, ps.rz || 0);
        let sx = ps.s[0], sy = ps.s[1], sz = ps.s[2];
        switch (ps.a) {
          case "legL": d.rotation.x = (ps.b || 0) + Math.sin(t) * ps.k; break;
          case "legR": d.rotation.x = (ps.b || 0) - Math.sin(t) * ps.k; break;
          case "armL": d.rotation.x = (ps.b || 0) - Math.sin(t) * ps.k; break;
          case "armR": d.rotation.x = (ps.b || 0) + Math.sin(t) * ps.k; break;
          case "wingL": d.rotation.z = Math.PI; d.rotation.y = Math.sin(t * 3) * 0.7 * (ps.k || 1); break;
          case "wingR": d.rotation.y = -Math.sin(t * 3) * 0.7 * (ps.k || 1); break;
          case "pulse": { const q = 1 + Math.sin(t * 2) * ps.k; sx *= q; sy *= q; sz *= q; break; }
          case "flick": { const q = 1 + Math.sin(time * 17 + m.wobble) * ps.k * 0.5; sz *= q; break; }
          case "tail": d.rotation.z = Math.sin(t * 1.5) * ps.k; break;
          case "wiggle": d.rotation.z = Math.sin(t * 3) * ps.k; break;
          case "jaw": d.rotation.x = Math.max(0, Math.sin(t * 0.7)) * 0.4; break;
          case "hop": d.position.z += Math.abs(Math.sin(t * 1.2)) * ps.k * 30; break;
          default:
        }
        if (ps.quat) d.quaternion.copy(ps.quat);
        d.scale.set(sx, sy, sz);
        d.updateMatrix();
        if (ps.holdPart) {
          // Held things live in the hand's frame: shoulder pivot, the arm's
          // swing, then down the forearm to the fist.
          const L = ps.holdPart;
          this.am.makeTranslation(L.p[0], L.p[1], L.p[2]);
          this.am.multiply(this.ar.makeRotationX(limbAngle(L, t)));
          this.am.multiply(this.at.makeTranslation(0, 0, -L.s[2]));
          this.am.multiply(d.matrix);
          this.pm.multiplyMatrices(this.root, this.am);
        } else this.pm.multiplyMatrices(this.root, d.matrix);
        mesh.setMatrixAt(i, this.pm);
        const want = flash ? 0xffffff : frozen && !ps.e ? 0x9fd8ff : ps.c;
        if (m.lastCol?.[mesh.id] !== want || m.slotCheck !== i) {
          this.col.setHex(want);
          if (eclipse && !ps.e && !flash) this.col.multiplyScalar(0.7);
          mesh.setColorAt(i, this.col);
          mesh.userData.dirty = true;
        }
      }
      // Colour cache is per instance slot, which shifts as monsters die, so it
      // is refreshed whenever the slot changes.
      m.slotCheck = i;
      if (!m.lastCol) m.lastCol = {};
      for (const { mesh, spec: ps } of rig.parts) m.lastCol[mesh.id] = flash ? 0xffffff : frozen && !ps.e ? 0x9fd8ff : ps.c;
      if (m.def.prop) continue;
      d.position.set(p.x, -p.y, 0.5);
      d.rotation.set(0, 0, 0);
      const r = m.def.r * (rig.spec.fly ? 0.8 : 1.1) * rig.sc * (m.hidden > 0 && m.def.ai !== "king" ? 1.6 : 1);
      d.scale.set(r, r, 1);
      d.updateMatrix();
      if (sh < this.shadows.instanceMatrix.count) this.shadows.setMatrixAt(sh++, d.matrix);
    }
    for (const rig of this.rigs.values()) {
      for (const { mesh } of rig.parts) {
        mesh.count = rig.count;
        mesh.visible = rig.count > 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.userData.dirty) { mesh.instanceColor.needsUpdate = true; mesh.userData.dirty = false; }
      }
    }
    this.shadows.count = sh;
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    for (const rig of this.rigs.values()) for (const { mesh } of rig.parts) { this.scene.remove(mesh); mesh.dispose(); mesh.material.dispose(); }
    this.rigs.clear();
    this.scene.remove(this.shadows);
  }
}

// ── Heroes ───────────────────────────────────────────────────────────────
// A hero is a small group of meshes with named joints; the walk cycle is
// driven by distance travelled. Each carries their weapon and a lantern of
// the old sun (the light that walks with you).
export function buildHero(heroDef) {
  const lam = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true, ...o });
  const g = new T.Group();
  const body = new T.Group();
  g.add(body);
  const u = 14;
  const id = heroDef.id;
  const skin = lam(0xe0a882), coat = lam(heroDef.color), coatD = lam(darken(heroDef.color, 0.7)), trim = lam(heroDef.trim, { metalness: 0.4, roughness: 0.45 });
  const dark = lam(0x1c1a20), boots = lam(0x3a2a22), leather = lam(0x5a3a24), hairM = lam(id === "mira" ? 0x6a3a1e : id === "sable" ? 0x1a1414 : 0x3a2a1e);
  const part = (geo, mat, sc, p, parent = body, r) => { const m = new T.Mesh(geo, mat); m.scale.set(...sc); m.position.set(...p); if (r) m.rotation.set(...r); m.castShadow = true; parent.add(m); return m; };
  const joint = (p, parent = body) => { const j = new T.Group(); j.position.set(...p); parent.add(j); return j; };
  const ico = new T.IcosahedronGeometry(1, 1);
  // Legs with boots and cuffs.
  const legL = joint([-u * 0.28, 0, u * 1.0]), legR = joint([u * 0.28, 0, u * 1.0]);
  for (const L of [legL, legR]) {
    part(GEO.hang, dark, [u * 0.3, u * 0.32, u * 0.55], [0, 0, 0], L);
    part(GEO.hang, boots, [u * 0.34, u * 0.36, u * 0.42], [0, 0, -u * 0.5], L);
    part(GEO.box, boots, [u * 0.38, u * 0.4, u * 0.1], [0, 0, -u * 0.52], L);
    part(GEO.box, boots, [u * 0.34, u * 0.54, u * 0.18], [0, u * 0.1, -u * 0.86], L);
  }
  // Torso, belt, collar, shoulders.
  part(GEO.box, coat, [u * 0.95, u * 0.58, u * 0.9], [0, 0, u * 1.5]);
  part(GEO.box, coatD, [u * 0.62, u * 0.6, u * 0.5], [0, u * 0.02, u * 1.72]);
  part(GEO.box, leather, [u * 1.0, u * 0.64, u * 0.14], [0, 0, u * 1.12]);
  part(GEO.box, trim, [u * 0.2, u * 0.08, u * 0.16], [0, u * 0.33, u * 1.12]);
  part(GEO.box, coatD, [u * 0.8, u * 0.5, u * 0.16], [0, -u * 0.02, u * 1.98]);
  for (const sx of [-1, 1]) part(ico, coat, [u * 0.26, u * 0.26, u * 0.2], [sx * u * 0.52, 0, u * 1.9]);
  // Coat tails that swing behind.
  const cape = joint([0, -u * 0.28, u * 1.2]);
  for (const sx of [-1, 1]) part(GEO.hang, coat, [u * 0.46, u * 0.1, u * 0.7], [sx * u * 0.24, 0, 0], cape);
  // Head: face, nose, hair.
  const head = joint([0, 0, u * 2.26]);
  part(ico, skin, [u * 0.34, u * 0.34, u * 0.36], [0, 0, 0], head);
  part(GEO.box, skin, [u * 0.08, u * 0.1, u * 0.1], [0, u * 0.34, -u * 0.02], head);
  const eyeM = new T.MeshBasicMaterial({ color: 0x14181d });
  part(GEO.sph, eyeM, [1.3, 1.1, 1.5], [-u * 0.13, u * 0.3, u * 0.06], head);
  part(GEO.sph, eyeM, [1.3, 1.1, 1.5], [u * 0.13, u * 0.3, u * 0.06], head);
  part(ico, hairM, [u * 0.36, u * 0.34, u * 0.22], [0, -u * 0.06, u * 0.16], head);
  // Arms with gloves.
  const armL = joint([-u * 0.62, 0, u * 1.88]), armR = joint([u * 0.62, 0, u * 1.88]);
  for (const A of [armL, armR]) {
    part(GEO.hang, coat, [u * 0.24, u * 0.24, u * 0.5], [0, 0, 0], A);
    part(GEO.hang, coatD, [u * 0.22, u * 0.22, u * 0.4], [0, 0, -u * 0.48], A);
    part(GEO.box, trim, [u * 0.26, u * 0.26, u * 0.06], [0, 0, -u * 0.5], A);
    part(ico, leather, [u * 0.14, u * 0.14, u * 0.14], [0, 0, -u * 0.9], A);
  }
  const handR = joint([0, 0, -u * 0.9], armR), handL = joint([0, 0, -u * 0.9], armL);
  const glowM = new T.MeshBasicMaterial({ color: 0xffd28a });
  const lantern = (parent, p, sc = 1) => {
    const L = joint(p, parent);
    part(GEO.box, lam(0x2b2f36, { metalness: 0.5 }), [u * 0.3 * sc, u * 0.3 * sc, u * 0.06], [0, 0, u * 0.2 * sc], L);
    part(GEO.box, lam(0x2b2f36, { metalness: 0.5 }), [u * 0.3 * sc, u * 0.3 * sc, u * 0.06], [0, 0, -u * 0.2 * sc], L);
    for (const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(GEO.box, trim, [1, 1, u * 0.4 * sc], [ox * u * 0.13 * sc, oy * u * 0.13 * sc, 0], L);
    part(GEO.box, glowM, [u * 0.2 * sc, u * 0.2 * sc, u * 0.3 * sc], [0, 0, 0], L);
    part(GEO.cone, lam(0x2b2f36), [u * 0.2 * sc, u * 0.2 * sc, u * 0.14], [0, 0, u * 0.28 * sc], L);
    return L;
  };
  let lanternAt = null;
  if (id === "wren") {
    // Wide-brimmed lamplighter's hat, a scarf, the lantern on a hooked staff.
    part(GEO.cyl, dark, [u * 0.6, u * 0.6, u * 0.05], [0, 0, u * 0.3], head);
    part(GEO.taper, dark, [u * 0.32, u * 0.32, u * 0.36], [0, 0, u * 0.3], head);
    part(GEO.box, trim, [u * 0.34, u * 0.05, u * 0.08], [0, u * 0.3, u * 0.38], head);
    part(GEO.box, lam(0xc8a04a), [u * 0.7, u * 0.64, u * 0.14], [0, 0, u * 2.05]);
    part(GEO.hang, lam(0xc8a04a), [u * 0.16, u * 0.06, u * 0.6], [u * 0.2, -u * 0.34, u * 2.05]);
    part(GEO.cylUp, leather, [1.2, 1.2, u * 2.8], [0, u * 0.1, -u * 0.6], handR);
    part(GEO.box, trim, [1, u * 0.3, 1], [0, u * 0.24, u * 2.2], handR);
    lanternAt = lantern(handR, [0, u * 0.38, u * 1.9]);
  } else if (id === "mira") {
    // Hooded green cloak, a quiver of bolts and the crossbow.
    part(GEO.cone, coat, [u * 0.46, u * 0.46, u * 0.66], [0, -u * 0.06, u * 0.3], head);
    part(ico, coat, [u * 0.4, u * 0.4, u * 0.36], [0, -u * 0.1, u * 0.02], head);
    part(GEO.box, leather, [u * 0.14, u * 1.1, u * 0.14], [0, u * 0.5, -u * 0.05], handR);
    part(GEO.box, lam(0x6a6a70, { metalness: 0.6 }), [u * 0.9, u * 0.1, u * 0.08], [0, u * 0.9, -u * 0.05], handR);
    part(GEO.box, lam(0xd8d0c0), [u * 0.9, u * 0.02, u * 0.02], [0, u * 0.82, -u * 0.05], handR);
    part(GEO.cylUp, leather, [u * 0.14, u * 0.14, u * 0.8], [u * 0.22, -u * 0.36, u * 1.3], body, [-0.35, 0, 0]);
    for (const ox of [-2, 0, 2]) part(GEO.cone, lam(0xe0d8c8), [1.3, 1.3, u * 0.2], [u * 0.22 + ox, -u * 0.62, u * 2.05]);
    lanternAt = lantern(body, [-u * 0.52, u * 0.12, u * 1.1], 0.8);
  } else if (id === "oskar") {
    // A friar's robe with a rope belt, the tonsure, the great bell.
    part(ico, lam(0x4a2e22), [u * 0.35, u * 0.35, u * 0.16], [0, -u * 0.04, u * 0.12], head);
    part(GEO.box, coat, [u * 1.2, u * 0.78, u * 0.9], [0, 0, u * 0.75]);
    part(GEO.box, coatD, [u * 1.24, u * 0.8, u * 0.12], [0, 0, u * 0.35]);
    part(GEO.cyl, lam(0xc8b080), [u * 0.52, u * 0.4, u * 0.06], [0, 0, u * 1.14]);
    part(GEO.hang, lam(0xc8b080), [u * 0.05, u * 0.05, u * 0.6], [u * 0.3, u * 0.34, u * 1.12]);
    part(ico, coatD, [u * 0.42, u * 0.3, u * 0.2], [0, -u * 0.26, u * 2.05]);
    const bell = joint([0, u * 0.2, -u * 0.12], handR);
    part(GEO.cylUp, leather, [1, 1, u * 0.2], [0, 0, 0], bell);
    part(new T.CylinderGeometry(0.55, 1, 1, 12).rotateX(Math.PI / 2), trim, [u * 0.36, u * 0.36, u * 0.48], [0, 0, -u * 0.24], bell);
    part(GEO.torus, trim, [u * 0.36, u * 0.36, u * 0.36], [0, 0, -u * 0.48], bell);
    lanternAt = joint([0, u * 0.45, u * 1.55]);
    part(GEO.sph, glowM, [u * 0.14, u * 0.14, u * 0.14], [0, 0, 0], lanternAt);
    part(GEO.torus, trim, [u * 0.16, u * 0.16, u * 0.16], [0, 0, 0], lanternAt, [Math.PI / 2, 0, 0]);
  } else {
    // Sable: flat cap, leather apron, spade over the shoulder.
    part(GEO.cyl, dark, [u * 0.42, u * 0.46, u * 0.14], [0, u * 0.05, u * 0.26], head);
    part(GEO.box, dark, [u * 0.36, u * 0.26, u * 0.04], [0, u * 0.4, u * 0.2], head);
    part(GEO.box, leather, [u * 0.8, u * 0.08, u * 1.0], [0, u * 0.32, u * 1.2]);
    part(GEO.box, trim, [u * 0.4, u * 0.03, u * 0.3], [0, u * 0.37, u * 1.4]);
    part(GEO.cylUp, leather, [1.2, 1.2, u * 1.7], [0, 0, -u * 0.2], handR);
    part(GEO.box, lam(0x8a929e, { metalness: 0.7, roughness: 0.35 }), [u * 0.36, u * 0.05, u * 0.46], [0, 0, u * 1.6], handR);
    part(GEO.box, leather, [u * 0.4, u * 0.08, u * 0.08], [0, 0, u * 1.46], handR);
    lanternAt = lantern(body, [u * 0.56, -u * 0.12, u * 1.1], 0.8);
    void handL;
  }
  return { g, body, legL, legR, armL, armR, head, cape, lanternAt, handR, u };
}
function darken(hex, k) {
  return (Math.round(((hex >> 16) & 255) * k) << 16) | (Math.round(((hex >> 8) & 255) * k) << 8) | Math.round((hex & 255) * k);
}

export function syncHero(H, R, time) {
  const h = R.hero;
  const p = h.body.position;
  const dead = R.phase === "dead" ? Math.min(1, R.phaseT / 60) : 0;
  H.g.position.set(p.x, -p.y, h.dig > 0 ? -H.u * 2.8 : 0);
  H.g.rotation.set(0, 0, -h.face - Math.PI / 2);
  const run = Math.min(1, h.speedNow / 120);
  const ph = h.dist * 0.11;
  H.legL.rotation.x = Math.sin(ph) * 0.8 * run;
  H.legR.rotation.x = -Math.sin(ph) * 0.8 * run;
  H.armL.rotation.x = -Math.sin(ph) * 0.6 * run;
  H.armR.rotation.x = Math.sin(ph) * 0.6 * run + (h.attackFlash > 0 ? -1.2 * (h.attackFlash / 6) : 0);
  H.cape.rotation.x = -0.15 - run * 0.5 + Math.sin(time * 3) * 0.05;
  H.body.position.z = Math.abs(Math.sin(ph)) * 2 * run;
  H.body.rotation.x = -run * 0.12 - dead * 1.45;
  H.g.visible = !(h.iframes > 0 && Math.floor(time * 20) % 2 && R.phase === "play" && h.sanct <= 0);
  if (h.dig > 0) H.g.visible = false;
}
