import { rng } from "../rng.js";

// ── The Dream Factory (the hub) ──────────────────────────────────────────
// The night-shift workshop, between dreams: the job board by the big
// window (and Álmos, the great dream machine, dozing outside it), the
// workbench, Margó's desk with the radio, and the lift down to the dreams.

const WALL = { side: 0xd9b88a, sideD: 0xb08858, bevel: 0.04 };
const WAINSCOT = { flat: { top: 0x6a3f24, side: 0x7a4a2a } };
const BEAM = { side: 0x5a3620, sideD: 0x4a2c1a, bevel: 0.05 };
const H = 5.6;         // ceiling height

export const factory = {
  id: "factory",
  hub: true,
  killY: -20,
  song: "factory",
  sky: { top: 0x0e1230, horizon: 0x3a2c5a, bottom: 0x1a1430, sunDir: [0.2, 0.4, -0.9], sunGlow: 0x6a5aa0 },
  fog: { color: 0x2a2440, near: 30, far: 90 },
  sun: { color: 0xb8c0ff, intensity: 0.7, dir: [0.2, 0.9, -0.5], sky: 0xffe0b8, ground: 0x6a4a30, hemi: 1.5 },
  lamps: 5,

  build(k) {
    const rnd = rng(3);
    k.floorLimit = 3;
    // Floor: rows of planks.
    for (let i = 0; i < 14; i++) {
      const z = -6.5 + i;
      k.block(0, z, 20, 0.97, -0.3, 0, { flat: { top: [0xa8703f, 0x9a6436, 0xb07a46][i % 3], side: 0x7a4a2a } });
    }
    k.block(0, 0, 20.6, 14.6, -1, -0.3, { side: 0x5a3620 });
    // Walls (the back one has the big window in it).
    k.block(-10.2, 0, 0.4, 14.8, 0, H, WALL);
    k.block(10.2, 0, 0.4, 14.8, 0, H, WALL);
    k.block(0, 7.2, 20, 0.4, 0, H, WALL);
    k.block(-7, -7.2, 6, 0.4, 0, H, WALL);
    k.block(7, -7.2, 6, 0.4, 0, H, WALL);
    k.block(0, -7.2, 8, 0.4, 0, 1.0, WALL);
    k.block(0, -7.2, 8, 0.4, 4.6, H, WALL);
    // The window can't be walked through.
    k.block(0, -7.2, 8, 0.3, 1.0, 4.6, null);
    // Window frame and mullions.
    const FR = { side: 0x6a3f24, sideD: 0x4a2c1a, bevel: 0.02 };
    k.block(0, -6.95, 8.2, 0.2, 0.9, 1.05, FR);
    k.block(0, -6.95, 8.2, 0.2, 4.55, 4.7, FR);
    for (const x of [-4.05, -1.35, 1.35, 4.05]) k.block(x, -6.95, 0.14, 0.2, 1, 4.6, FR);
    k.block(0, -6.95, 8, 0.12, 2.75, 2.85, FR);
    // Wainscot along the walls.
    k.block(-9.95, 0, 0.1, 14.2, 0, 1.1, WAINSCOT);
    k.block(9.95, 0, 0.1, 14.2, 0, 1.1, WAINSCOT);
    k.block(0, 6.95, 19.8, 0.1, 0, 1.1, WAINSCOT);
    // Ceiling and beams.
    k.block(0, 0, 20.6, 14.8, H, H + 0.4, { side: 0x8a6a4a });
    for (let i = 0; i < 5; i++) k.block(-8 + i * 4, 0, 0.35, 14, H - 0.4, H, BEAM);
    k.block(0, 0, 20, 0.35, H - 0.75, H - 0.4, BEAM);

    // ── Furniture ──
    k.prop("jobBoard", -5.2, -5.9, { yaw: Math.PI, collide: { w: 2.1, d: 0.3, h: 2.2 } });
    k.use("board", -5.2, -5.2, { r: 2.4, label: "useBoard" });
    k.prop("dock", -2.6, -5.8, { collide: { r: 0.3, h: 1.4 } });
    k.prop("workbench", 8.8, -1, { yaw: Math.PI / 2, collide: { w: 2.4, d: 1.1, h: 1.0 } });
    k.use("bench", 7.8, -1, { r: 2.3, label: "useBench" });
    k.prop("desk", -8.4, 1.8, { yaw: -Math.PI / 2, opts: { mugs: 3 }, collide: { w: 1.8, d: 0.9, h: 0.9 } });
    k.use("radio", -7.6, 1.8, { r: 2.2, label: "useRadio" });
    k.prop("lift", 8.4, -5.2, { yaw: Math.PI / 2 });
    // The lift is solid on three sides; you step up to its gate.
    k.block(9.55, -5.2, 0.1, 2.4, 0, 3.2, null);
    k.block(8.4, -6.35, 2.4, 0.1, 0, 3.2, null);
    k.block(8.4, -4.05, 2.4, 0.1, 0, 3.2, null);
    k.use("lift", 7.0, -5.2, { r: 2.2, label: "useLift" });
    k.prop("dreamTank", -8.8, -5.9, { opts: { color: 0xff8fd0, seed: 2, h: 3 }, collide: { r: 0.8, h: 4.5 } });
    k.prop("dreamTank", 4.6, -6.1, { opts: { color: 0x7ff5e0, seed: 5, h: 2.6 }, collide: { r: 0.8, h: 4.2 } });
    k.prop("shelf", -9.6, -2.4, { yaw: -Math.PI / 2, collide: { w: 1.9, d: 0.5, h: 2.3 } });
    k.prop("shelf", 9.6, 3.4, { yaw: Math.PI / 2, opts: { seed: 4 }, collide: { w: 1.9, d: 0.5, h: 2.3 } });
    k.prop("rug", 0, 1.8, { opts: { r: 2.4 } });
    for (const [x, z, s] of [[6.8, 5.8, 1], [7.9, 5.9, 0.8], [7.3, 5.8, 0.7]]) k.prop("crate", x, z, { y: s === 0.7 ? 0.8 : 0, yaw: rnd() * 0.6, opts: { seed: Math.round(x * 10), s }, collide: { w: 0.8, d: 0.8, h: 0.8 } });
    // Pipes along the walls and ceiling.
    k.prop("pipe", 0, 0, { opts: { a: [-9.7, 0.3, -6.6], d: [0, H - 0.8, 0], r: 0.14 } });
    k.prop("pipe", 0, 0, { opts: { a: [-9.7, H - 0.5, -6.6], d: [19.2, 0, 0], r: 0.14 } });
    k.prop("pipe", 0, 0, { opts: { a: [9.6, H - 0.5, -6.6], d: [0, 0, 13], r: 0.1, c: 0x9aa4ad } });
    k.prop("pipe", 0, 0, { opts: { a: [-8.8, 4.3, -5.9], d: [0, 0.8, 0], r: 0.12 } });
    k.prop("pipe", 0, 0, { opts: { a: [4.6, 3.8, -6.1], d: [0, H - 0.5 - 3.8, 0], r: 0.12 } });
    // Hanging lamps (and the lights they give).
    for (const [x, z] of [[0, 1.8], [-5.5, -3], [5.5, -2.5], [-5.5, 4], [5, 4.5]]) {
      k.prop("hangLamp", x, z, { y: H - 0.4, opts: { cord: 1.1 } });
      k.light(x, H - 1.8, z, 0xffc880, 9, 11);
    }
    k.light(8.4, 2.8, -5.2, 0x7ff5e0, 5, 7);
    // Outside the window: Álmos, dozing in the dark.
    k.prop("almos", 0, -26, { y: -6 });
    k.start(0, 4.5, 0);
  },
};
