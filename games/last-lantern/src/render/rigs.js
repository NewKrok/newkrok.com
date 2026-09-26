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
      { g: "box", s: [r * 0.12, r * 0.9, r * 0.12], p: [r * 0.72, r * 0.5, r * 1.3], c: 0x8a8a90 },
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
      { g: "box", s: [r * 0.14, r * 0.9, r * 1.2], p: [-r * 0.85, r * 0.3, r * 1.9], c: c2 },
      { g: "box", s: [r * 0.1, r * 0.25, r * 1.7], p: [r * 0.9, r * 0.35, r * 1.5], c: 0xd8dde6 },
      { g: "box", s: [r * 1.4, r * 0.1, r * 1.6], p: [0, -r * 0.45, r * 1.6], c: c2, a: "tail", k: 0.08 },
      { g: "hang", s: [r * 0.38, r * 0.38, r * 1.05], p: [-r * 0.35, 0, r * 1.05], c: c2, a: "legL", k: 0.6 },
      { g: "hang", s: [r * 0.38, r * 0.38, r * 1.05], p: [r * 0.35, 0, r * 1.05], c: c2, a: "legR", k: 0.6 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [-r * 0.8, 0, r * 2.3], c, a: "armL", k: 0.5 },
      { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [r * 0.8, 0, r * 2.3], c, a: "armR", k: 0.5 },
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
      { g: "box", s: [r * 0.08, r * 1.3, r * 0.08], p: [r * 0.8, r * 0.5, r * 1.3], c: c2, e: 1 },
    ] };
    case "colossus": return { parts: [
      { g: "box", s: [r * 1.0, r * 0.6, r * 0.5], p: [0, 0, r * 1.3], c },
      { g: "box", s: [r * 1.3, r * 0.7, r * 1.3], p: [0, 0, r * 2.2], c },
      { g: "box", s: [r * 1.36, r * 0.76, r * 0.08], p: [0, 0, r * 1.85], c: c2 },
      { g: "box", s: [r * 1.36, r * 0.76, r * 0.08], p: [0, 0, r * 2.1], c: c2 },
      { g: "box", s: [r * 1.36, r * 0.76, r * 0.08], p: [0, 0, r * 2.35], c: c2 },
      { g: "sph", s: [r * 0.55, r * 0.55, r * 0.55], p: [0, r * 0.1, r * 3.25], c },
      { g: "box", s: [r * 0.45, r * 0.4, r * 0.18], p: [0, r * 0.3, r * 2.9], c: c2 },
      { g: "sph", s: [r * 0.09, r * 0.09, r * 0.09], p: [-r * 0.2, r * 0.55, r * 3.3], c: 0xff3b3b, e: 1 },
      { g: "sph", s: [r * 0.09, r * 0.09, r * 0.09], p: [r * 0.2, r * 0.55, r * 3.3], c: 0xff3b3b, e: 1 },
      { g: "cone", s: [r * 0.35, r * 0.35, r * 0.45], p: [0, 0, r * 3.85], c: 0xffd166 },
      { g: "box", s: [r * 0.3, r * 0.3, r * 1.9], p: [r * 1.1, r * 0.2, r * 1.5], c: 0x5a3a1e },
      { g: "hang", s: [r * 0.42, r * 0.42, r * 1.3], p: [-r * 0.45, 0, r * 1.3], c, a: "legL", k: 0.45 },
      { g: "hang", s: [r * 0.42, r * 0.42, r * 1.3], p: [r * 0.45, 0, r * 1.3], c, a: "legR", k: 0.45 },
      { g: "hang", s: [r * 0.36, r * 0.36, r * 1.6], p: [-r * 0.95, 0, r * 2.8], c, a: "armL", k: 0.45 },
      { g: "hang", s: [r * 0.36, r * 0.36, r * 1.6], p: [r * 0.95, 0, r * 2.8], c, a: "armR", k: 0.45 },
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
      { g: "box", s: [r * 0.06, r * 0.06, r * 2.8], p: [r * 1.0, r * 0.3, r * 1.4], c: 0x8a8aa0 },
      { g: "sph", s: [r * 0.2, r * 0.2, r * 0.2], p: [r * 1.0, r * 0.3, r * 2.9], c: c2, e: 1, a: "pulse", k: 0.3 },
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

const RIG_GEO = { ...GEO, taperUp: GEO.taper };

export class Rigs {
  constructor(scene) {
    this.scene = scene;
    this.rigs = new Map();
    this.dummy = new T.Object3D();
    this.root = new T.Matrix4();
    this.pm = new T.Matrix4();
    this.col = new T.Color();
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
    const cap = def.boss ? 2 : def.elite ? 8 : id === "wormseg" ? 20 : id === "candle" ? 24 : ["bat", "ghoul", "skeleton", "leech", "drowned", "imp", "frostbat", "iceskel", "gargoyle", "hollow"].includes(id) ? MAX_MON + 20 : 200;
    const sc = def.scale || 1;
    const parts = sp.parts.map((ps) => {
      const mat = ps.e
        ? new T.MeshBasicMaterial({ color: 0xffffff, transparent: !!sp.ghost, opacity: sp.ghost ? 0.9 : 1 })
        : sp.ghost || ps.ghostMat
          ? new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: ps.ghostMat ? 0.82 : 0.72, depthWrite: !sp.ghost })
          : new T.MeshLambertMaterial({ color: 0xffffff });
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
      this.root.makeRotationZ(-m.face - Math.PI / 2);
      if (m.stun > 0 || R.freeze > 0) this.root.multiply(new T.Matrix4().makeRotationX(Math.sin(time * 20) * 0.04));
      this.root.scale(new T.Vector3(s, s, s));
      this.root.setPosition(p.x + jx, -p.y + jy, z);
      const flash = m.hitFlash > 0;
      const frozen = R.freeze > 0 && !m.def.boss;
      for (const { mesh, spec: ps } of rig.parts) {
        d.position.set(ps.p[0], ps.p[1], ps.p[2]);
        d.rotation.set(ps.rx || 0, ps.ry || 0, 0);
        let sx = ps.s[0], sy = ps.s[1], sz = ps.s[2];
        switch (ps.a) {
          case "legL": d.rotation.x = (ps.b || 0) + Math.sin(t) * ps.k; break;
          case "legR": d.rotation.x = (ps.b || 0) - Math.sin(t) * ps.k; break;
          case "armL": d.rotation.x = (ps.b || 0) - Math.sin(t) * ps.k; break;
          case "armR": d.rotation.x = (ps.b || 0) + Math.sin(t) * ps.k; break;
          case "wingL": d.rotation.z = Math.PI; d.rotation.y = Math.sin(t * 3) * 0.7; break;
          case "wingR": d.rotation.y = -Math.sin(t * 3) * 0.7; break;
          case "pulse": { const q = 1 + Math.sin(t * 2) * ps.k; sx *= q; sy *= q; sz *= q; break; }
          case "flick": { const q = 1 + Math.sin(time * 17 + m.wobble) * ps.k * 0.5; sz *= q; break; }
          case "tail": d.rotation.z = Math.sin(t * 1.5) * ps.k; break;
          case "wiggle": d.rotation.z = Math.sin(t * 3) * ps.k; break;
          case "jaw": d.rotation.x = Math.max(0, Math.sin(t * 0.7)) * 0.4; break;
          case "hop": d.position.z += Math.abs(Math.sin(t * 1.2)) * ps.k * 30; break;
          default:
        }
        d.scale.set(sx, sy, sz);
        d.updateMatrix();
        this.pm.multiplyMatrices(this.root, d.matrix);
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
  const lam = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const g = new T.Group();
  const body = new T.Group();
  g.add(body);
  const u = 14;
  const skin = lam(0xe8b48a), coat = lam(heroDef.color), trim = lam(heroDef.trim), dark = lam(0x1a1a20), boots = lam(0x3a2e28);
  const part = (geo, mat, s, p, parent = body) => { const m = new T.Mesh(geo, mat); m.scale.set(...s); m.position.set(...p); m.castShadow = true; parent.add(m); return m; };
  const joint = (p, parent = body) => { const j = new T.Group(); j.position.set(...p); parent.add(j); return j; };
  // Legs.
  const legL = joint([-u * 0.3, 0, u * 1.0]), legR = joint([u * 0.3, 0, u * 1.0]);
  part(GEO.hang, dark, [u * 0.32, u * 0.34, u * 0.8], [0, 0, 0], legL);
  part(GEO.hang, dark, [u * 0.32, u * 0.34, u * 0.8], [0, 0, 0], legR);
  part(GEO.box, boots, [u * 0.36, u * 0.5, u * 0.26], [0, u * 0.08, -u * 0.86], legL);
  part(GEO.box, boots, [u * 0.36, u * 0.5, u * 0.26], [0, u * 0.08, -u * 0.86], legR);
  // Torso and coat.
  part(GEO.box, coat, [u * 1.05, u * 0.62, u * 0.95], [0, 0, u * 1.45]);
  const cape = joint([0, -u * 0.3, u * 1.9]);
  part(GEO.hang, coat, [u * 1.2, u * 0.12, u * 1.35], [0, 0, 0], cape);
  part(GEO.box, trim, [u * 1.08, u * 0.66, u * 0.14], [0, 0, u * 1.02]);
  // Head.
  const head = joint([0, 0, u * 2.2]);
  part(GEO.sph, skin, [u * 0.36, u * 0.36, u * 0.38], [0, 0, 0], head);
  const eyeM = new T.MeshBasicMaterial({ color: 0x14181d });
  part(GEO.sph, eyeM, [1.4, 1.4, 1.6], [-u * 0.13, u * 0.32, u * 0.04], head);
  part(GEO.sph, eyeM, [1.4, 1.4, 1.6], [u * 0.13, u * 0.32, u * 0.04], head);
  // Arms.
  const armL = joint([-u * 0.68, 0, u * 1.85]), armR = joint([u * 0.68, 0, u * 1.85]);
  part(GEO.hang, coat, [u * 0.26, u * 0.26, u * 0.85], [0, 0, 0], armL);
  part(GEO.hang, coat, [u * 0.26, u * 0.26, u * 0.85], [0, 0, 0], armR);
  part(GEO.sph, skin, [u * 0.15, u * 0.15, u * 0.15], [0, 0, -u * 0.9], armL);
  part(GEO.sph, skin, [u * 0.15, u * 0.15, u * 0.15], [0, 0, -u * 0.9], armR);
  const handR = joint([0, 0, -u * 0.9], armR), handL = joint([0, 0, -u * 0.9], armL);
  const glowM = new T.MeshBasicMaterial({ color: 0xffd28a });
  let lanternAt = null;
  // Per hero: hat and gear.
  if (heroDef.id === "wren") {
    // Wide-brimmed lamplighter's hat, a lantern on a staff.
    part(GEO.cyl, dark, [u * 0.62, u * 0.62, u * 0.06], [0, 0, u * 0.28], head);
    part(GEO.taper, dark, [u * 0.34, u * 0.34, u * 0.36], [0, 0, u * 0.3], head);
    part(GEO.box, trim, [u * 0.36, u * 0.05, u * 0.08], [0, u * 0.3, u * 0.36], head);
    part(GEO.cylUp, lam(0x4a3626), [1.3, 1.3, u * 2.6], [0, u * 0.1, -u * 0.6], handR);
    const lan = joint([0, u * 0.1, u * 2.0], handR);
    part(GEO.box, lam(0x2b2f36), [u * 0.34, u * 0.34, u * 0.44], [0, u * 0.3, -u * 0.2], lan);
    part(GEO.box, glowM, [u * 0.24, u * 0.24, u * 0.32], [0, u * 0.3, -u * 0.2], lan);
    lanternAt = lan;
  } else if (heroDef.id === "mira") {
    // Hood and a crossbow.
    part(GEO.cone, coat, [u * 0.46, u * 0.46, u * 0.7], [0, -u * 0.08, u * 0.28], head);
    part(GEO.box, lam(0x4a3626), [u * 0.14, u * 1.1, u * 0.14], [0, u * 0.5, -u * 0.05], handR);
    part(GEO.box, lam(0x6a6a70), [u * 0.9, u * 0.1, u * 0.08], [0, u * 0.9, -u * 0.05], handR);
    part(GEO.box, trim, [u * 0.3, u * 0.25, u * 0.7], [0, -u * 0.45, u * 1.65]);
    lanternAt = joint([-u * 0.5, u * 0.1, u * 1.1]);
    part(GEO.box, lam(0x2b2f36), [u * 0.26, u * 0.26, u * 0.34], [0, 0, 0], lanternAt);
    part(GEO.box, glowM, [u * 0.18, u * 0.18, u * 0.24], [0, 0, 0], lanternAt);
  } else if (heroDef.id === "oskar") {
    // Monk's tonsure, a heavy robe and the bell.
    part(GEO.sph, lam(0x5a3a2a), [u * 0.37, u * 0.37, u * 0.2], [0, -u * 0.05, u * 0.1], head);
    part(GEO.box, coat, [u * 1.25, u * 0.8, u * 0.9], [0, 0, u * 0.75]);
    part(GEO.box, lam(0x8a6a3a), [u * 1.12, u * 0.7, u * 0.1], [0, 0, u * 1.25]);
    const bell = joint([0, u * 0.2, -u * 0.1], handR);
    part(new T.CylinderGeometry(0.55, 1, 1, 10, 1).rotateX(Math.PI / 2), lam(0xc9a35a), [u * 0.34, u * 0.34, u * 0.44], [0, 0, -u * 0.2], bell);
    lanternAt = joint([0, u * 0.45, u * 1.55]);
    part(GEO.sph, glowM, [u * 0.14, u * 0.14, u * 0.14], [0, 0, 0], lanternAt);
  } else {
    // Sable: a flat cap and a spade over the shoulder.
    part(GEO.cyl, dark, [u * 0.42, u * 0.46, u * 0.14], [0, u * 0.05, u * 0.26], head);
    part(GEO.box, dark, [u * 0.36, u * 0.26, u * 0.04], [0, u * 0.4, u * 0.2], head);
    part(GEO.cylUp, lam(0x4a3626), [1.2, 1.2, u * 1.6], [0, 0, -u * 0.2], handR);
    part(GEO.box, lam(0x8a929e), [u * 0.34, u * 0.05, u * 0.44], [0, 0, u * 1.55], handR);
    lanternAt = joint([u * 0.55, -u * 0.1, u * 1.1]);
    part(GEO.box, lam(0x2b2f36), [u * 0.26, u * 0.26, u * 0.34], [0, 0, 0], lanternAt);
    part(GEO.box, glowM, [u * 0.18, u * 0.18, u * 0.24], [0, 0, 0], lanternAt);
    void handL;
  }
  return { g, body, legL, legR, armL, armR, head, cape, lanternAt, handR, u };
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
