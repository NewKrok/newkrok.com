import { rng } from "../rng.js";
import { CLIENTS, isOpen, finaleNight } from "./index.js";
import { OLD_HUM_RODS } from "../render/models/factory.js";

// ── The Dream Factory (the hub) ──────────────────────────────────────────
// The night-shift workshop, between dreams: the job board by the big
// window (and Old Hum, the great dream machine, dozing outside it), the
// workbench, Margo's desk with the radio, and the lift down to the dreams.
// The walls fill up as the week goes on (ctx: the player's progress): a
// framed picture for every dream fixed, a trophy for every achievement,
// the nights crossed off on the calendar.
//
// The night of the finale (the week's five dreams fixed, Old Hum's not
// yet) it is different: the lamps are out, the lift runs on its red
// backup lamp (the old dreams can still be taken again, to grow
// stronger first), and the big window stands open onto a gangway out to
// Old Hum, wide awake, and a service hatch in his side.

const WALL = { side: 0xd9b88a, sideD: 0xb08858, bevel: 0.04 };
const WAINSCOT = { flat: { top: 0x6a3f24, side: 0x7a4a2a } };
const BEAM = { side: 0x5a3620, sideD: 0x4a2c1a, bevel: 0.05 };
const H = 5.6;         // ceiling height

export const factory = {
  id: "factory",
  hub: true,
  killY: -20,
  song: "factory",
  sky: { top: 0x0e1230, horizon: 0x3a2c5a, bottom: 0x1a1430, sunDir: [0.2, 0.4, -0.9], sunGlow: 0x6a5aa0, stars: 1, shooting: true },
  fog: { color: 0x2a2440, near: 30, far: 90 },
  sun: { color: 0xb8c0ff, intensity: 0.7, dir: [0.2, 0.9, -0.5], sky: 0xffe0b8, ground: 0x6a4a30, hemi: 1.5 },
  lamps: 5,

  build(k, ctx) {
    const rnd = rng(3), P = ctx ?? { done: [], ach: {}, night: 0 }, finale = finaleNight(P);
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
    // The window can't be walked through, but you can stand and gaze out
    // of it. (The finale's night it stands open: a step up to the sill.)
    if (!finale) {
      k.use("window", 0, -6.3, { r: 2, label: "useWindow" });
      k.block(0, -7.2, 8, 0.3, 1.0, 4.6, null);
    } else k.block(0, -6.55, 3, 0.9, 0, 0.5, { flat: { top: 0xa8703f, side: 0x7a4a2a } });
    // Window frame and mullions.
    const FR = { side: 0x6a3f24, sideD: 0x4a2c1a, bevel: 0.02 };
    k.block(0, -6.95, 8.2, 0.2, 0.9, 1.05, FR);
    k.block(0, -6.95, 8.2, 0.2, 4.55, 4.7, FR);
    for (const x of finale ? [-4.05, 4.05] : [-4.05, -1.35, 1.35, 4.05]) k.block(x, -6.95, 0.14, 0.2, 1, 4.6, FR);
    if (!finale) k.block(0, -6.95, 8, 0.12, 2.75, 2.85, FR);
    // Wainscot along the walls.
    k.block(-9.95, 0, 0.1, 14.2, 0, 1.1, WAINSCOT);
    k.block(9.95, 0, 0.1, 14.2, 0, 1.1, WAINSCOT);
    k.block(0, 6.95, 19.8, 0.1, 0, 1.1, WAINSCOT);
    // Ceiling and beams.
    k.block(0, 0, 20.6, 14.8, H, H + 0.4, { side: 0x8a6a4a });
    for (let i = 0; i < 5; i++) k.block(-8 + i * 4, 0, 0.35, 14, H - 0.4, H, BEAM);
    k.block(0, 0, 20, 0.35, H - 0.75, H - 0.4, BEAM);

    // ── Furniture ──
    k.prop("jobBoard", -5.2, -5.9, { yaw: Math.PI, opts: { open: CLIENTS.filter((c) => isOpen(c, P)).map((c) => c.id), done: P.done }, collide: { w: 2.1, d: 0.3, h: 2.2 } });
    k.use("board", -5.2, -5.2, { r: 2.4, label: "useBoard" });
    k.prop("dock", -2.6, -5.8, { collide: { r: 0.3, h: 1.4 } });
    k.prop("workbench", 8.8, -1, { yaw: Math.PI / 2, collide: { w: 2.4, d: 1.1, h: 1.0 } });
    k.use("bench", 7.8, -1, { r: 2.3, label: "useBench" });
    // Margo's mugs pile up: one more every night of the week.
    k.prop("desk", -8.4, 1.8, { yaw: -Math.PI / 2, opts: { mugs: Math.min(9, 2 + (P.night ?? 0)) }, collide: { w: 1.8, d: 0.9, h: 0.9 } });
    k.use("radio", -7.6, 1.8, { r: 2.2, label: "useRadio" });
    // (The finale's night it runs on the red backup lamp.)
    k.prop("lift", 8.4, -5.2, { yaw: Math.PI / 2, opts: { backup: finale } });
    // The lift is solid all round, its gate too: you step up to the gate.
    k.block(9.55, -5.2, 0.1, 2.4, 0, 3.2, null);
    k.block(7.25, -5.2, 0.1, 2.4, 0, 3.2, null);
    k.block(8.4, -6.35, 2.4, 0.1, 0, 3.2, null);
    k.block(8.4, -4.05, 2.4, 0.1, 0, 3.2, null);
    k.use("lift", 7.0, -5.2, { r: 2.2, label: "useLift" });
    k.mark("lift", 7.0, -5.2);
    k.prop("dreamTank", -8.8, -5.9, { opts: { color: 0xff8fd0, seed: 2, h: 3 }, collide: { r: 0.8, h: 4.5 } });
    k.prop("dreamTank", 4.6, -6.1, { opts: { color: 0x7ff5e0, seed: 5, h: 2.6 }, collide: { r: 0.8, h: 4.2 } });
    k.prop("shelf", -9.6, -2.4, { yaw: -Math.PI / 2, collide: { w: 1.9, d: 0.5, h: 2.3 } });
    // The journal on its lectern by the shelf: everything said on the radio.
    k.prop("lectern", -8.7, -4.2, { yaw: -Math.PI / 2, collide: { r: 0.36, h: 1.3 } });
    k.use("journal", -8.0, -4.2, { r: 2.2, label: "useJournal" });
    k.light(-8.3, 2.4, -4.2, 0xffd27a, 0.9, 3.5);
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
      k.prop("hangLamp", x, z, { y: H - 0.4, opts: { cord: 1.1, off: finale } });
      if (!finale) k.light(x, H - 1.8, z, 0xffc880, 9, 11);
    }
    // The finale's night the lamps are out: the room dark but for the
    // starlight through the window, the dream tanks and two red emergency lights.
    if (finale) {
      k.sun = { intensity: 0.15, hemi: 0.16, sky: 0x8a90c8, ground: 0x1a1420, env: 0.08 };
      k.light(-9.4, 4.6, -6.6, 0xff3a2a, 4, 9);
      k.light(9.4, 4.6, 6.6, 0xff3a2a, 4, 9);
      k.light(0, 3, -9, 0xb0b8ff, 3, 10);
    }
    if (!finale) k.light(8.4, 2.8, -5.2, 0x7ff5e0, 5, 7);
    // ── On the walls ──
    // Behind you as you come in: a picture of every dream fixed (an empty
    // frame for the ones to come), the clock over them, the trophy case.
    ["park", "school", "kitchen", "garden", "space", "oldhum"].forEach((id, i) => k.prop("dreamFrame", 4 - i * 2 + (i === 5 ? 12 : 0), 6.9, { y: 2.5, s: 1.35, opts: { kind: id, on: P.done.includes(id) } }));
    // Old Hum's picture, once he sleeps: step up to it for the week's epilogue.
    if (P.done.includes("oldhum")) k.use("epilogue", 6, 6.1, { r: 1.8, label: "useEpilogue" });
    // Under the pictures, the week's tools on a table, as they come.
    k.prop("toolTable", 2, 6.35, { opts: { tools: P.tools ?? [] }, collide: { w: 3.6, d: 0.8, h: 0.9 } });
    k.prop("wallClock", 0, 6.9, { y: 4.2 });
    k.prop("trophyCase", -7.4, 6.9, { y: 2.1, opts: { n: Object.keys(P.ach ?? {}).length } });
    k.block(-7.4, 6.7, 1.7, 0.45, 0, 2.9, null);
    k.use("trophies", -7.4, 6.0, { r: 2.2, label: "useTrophies" });
    k.light(-7.4, 3.4, 5.6, 0xffd27a, 1.2, 4);
    // By Margo's desk: the cork board and Cog's "employee of the month".
    // Margo's notes on the broken dreams, one more every night; strung
    // together, and the night she has worked it out, all to Old Hum.
    k.prop("corkboard", -9.9, 4.6, { y: 2.2, yaw: -Math.PI / 2, opts: { n: P.done.length + 1, finale: P.done.includes("space") } });
    k.prop("cogPoster", -9.9, -0.2, { y: 2.4, s: 1.3, yaw: -Math.PI / 2 });
    // Over the workbench, gauges; by the lift, the week's calendar.
    k.prop("gauges", 9.9, -1, { y: 3.4, yaw: Math.PI / 2 });
    k.prop("calendar", 9.9, -3.1, { y: 2.1, yaw: Math.PI / 2, opts: { night: P.night ?? 0 } });

    // Outside the window: Old Hum, dozing in the dark (wide awake, the
    // finale's night, a gangway out to the hatch in his side).
    k.prop("oldHum", 0, -26, { y: -6, opts: { awake: finale } });
    if (finale) {
      const PL = { top: 0x9a7a52, side: 0x6a4a2a, sideD: 0x2a1a0e, bevel: 0.05 }, RL = { top: 0xe0b860, side: 0xa07a30, bevel: 0.03 };
      k.block(0, -13.6, 2.6, 12.6, 0.6, 1.0, PL);
      for (const x of [-1.35, 1.35]) k.block(x, -13.6, 0.1, 12.6, 1.0, 2.05, RL);
      k.prop("hatch", 0, -20.1, { y: 1.0, yaw: Math.PI, collide: { w: 3.6, d: 0.6, h: 3.4 } });
      k.light(0, 3.5, -18, 0xffc070, 5, 9);
      // He is solid: his sphere (centre 1 m up, 6 m round) in slices a
      // metre thick, and the rods out of his sides.
      for (let y = -5; y < 7; y++) {
        const off = y >= 1 ? y - 1 : y + 1 <= 1 ? -y : 0;
        k.world.cyl({ x: 0, z: -26, r: Math.sqrt(36 - off * off), y0: y, y1: y + 1 });
      }
      for (const [x, y, z, a] of OLD_HUM_RODS) k.world.box({ x, z: z - 26, y0: 1 + y - 0.3, y1: 1 + y + 0.3, hx: 2, hz: 0.3, yaw: -a });
      k.use("hatch", 0, -18.6, { r: 2.2, label: "useHatch" });
      k.mark("hatch", 0, -18.6);
    }
    k.start(0, 4.5, 0);
  },
};
