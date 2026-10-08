// ── The bell lab (dev only: ?level=belllab) ──────────────────────────────
// A plain island to try the Lullaby Bell on, not a dream. West, a yard of
// small glitches to sing to sleep; north, the ones that throw things (a
// bathtub, buzzers, a backpack, a sharpener) to bat their orbs back at;
// east, a terrace and a pillar only a wobbling jelly throws you up to;
// south, a wall whose one gap a soufflé fills. One anchor with waves to
// try it all in a real fight.

const LAWN = { cap: 0x62b04e, capD: 0x4a9440, side: 0x9a6a44, sideD: 0x5e3c28, lip: true };
const STONE = { side: 0xb9ad98, sideD: 0x857a68, cap: 0xd8cdb5, capD: 0xc0b49a, bevel: 0.08 };
const BRICK = { side: 0xc07a5a, sideD: 0x8a4e38, bevel: 0.05 };

export const belllab = {
  id: "belllab",
  dev: true,
  song: "park",
  killY: -25,
  calm: 6,
  tools: ["stabilizer", "vacuum", "foam", "bell"],
  sky: { top: 0x5a6fd0, horizon: 0xffc9b8, bottom: 0xd8a8e8, sunDir: [-0.5, 0.35, -0.7], sunGlow: 0xffe0c0 },
  fog: { color: 0xeac4c8, near: 90, far: 320 },
  sun: { color: 0xffe2c8, intensity: 2.4, dir: [-0.5, 0.75, -0.6], sky: 0xb8c0f0, ground: 0x5a6a3a, hemi: 0.85 },
  clouds: { count: 20, rMin: 18, rMax: 70, yMin: -20, yMax: 30 },
  botRoutes: { test: [[-14, 8], [-6, 6]] },

  build(k) {
    k.block(0, 0, 56, 48, -5, 0, LAWN);
    k.block(0, 0, 50, 42, -9, -5, { side: 0x7e5a40, sideD: 0x4a3222 });

    // East: a terrace 4 m up with a jelly at its foot, a pillar 7.5 m up
    // with a jelly on the terrace.
    k.block(22.5, -3, 9, 14, -0.5, 4, STONE);
    k.ringable("jelly", 15.6, -3);
    k.block(24.5, -7.5, 3, 3, 4, 7.5, BRICK);
    k.block(24.5, -7.5, 3.3, 3.3, 7.5, 7.75, STONE);
    k.prop("crate", 24.5, -7.5, { y: 7.75, opts: { seed: 4 }, collide: { w: 0.9, d: 0.9, h: 0.9 } });
    k.ringable("jelly", 21, -2, { color: 0x6ad070 });
    k.prop("sign", 15, 2, { opts: { color: 0xffe08a }, collide: { r: 0.12, h: 1.75 } });

    // South: a wall right across, its one gap filled with a soufflé.
    k.block(-12.6, 17, 30.8, 1, 0, 3.2, BRICK);
    k.block(16.6, 17, 22.8, 1, 0, 3.2, BRICK);
    k.ringable("souffle", 4, 17);
    k.prop("crate", 4, 21.5, { opts: { seed: 7 }, collide: { w: 0.9, d: 0.9, h: 0.9 } });
    k.prop("tree", 9, 21, { opts: { seed: 11, h: 4.4 }, collide: { r: 0.42, h: 4 } });

    // Trees and bushes round the edge.
    for (const [x, z, h] of [[-24, -20, 4.6], [-25, 4, 4.2], [8, -21, 4.4]])
      k.prop("tree", x, z, { opts: { seed: Math.round(x * 3 + z), h }, collide: { r: 0.4 * h / 4.2, h: 4 } });
    for (const [x, z, s] of [[-12, 10, 1], [-14, 11.5, 0.8], [2, -4, 1.1]])
      k.prop("bush", x, z, { opts: { seed: Math.round(x - z), s }, collide: { r: 0.5 * s, h: 0.85 * s } });
    k.light(15, 4.5, 2, 0xffd08a, 5, 10);

    // West: a yard of small ones to sing to sleep.
    for (const [kind, x, z] of [["fuzz", -18, -6], ["fuzz", -16, -8], ["fuzz", -20, -9], ["bunny", -17, -4], ["bunny", -19, -5], ["bunny", -15, -6], ["bunny", -21, -7], ["pencil", -14, -10], ["pencil", -22, -11], ["clock", -18, -12]]) k.foe(kind, x, z);
    // North: the throwers.
    for (const [kind, x, z] of [["tub", 0, -16], ["buzzer", 4, -12], ["buzzer", -4, -13], ["backpack", 9, -18], ["sharpener", -8, -19]]) k.foe(kind, x, z);

    k.anchor("test", -6, 6, {
      duration: 22,
      waves: [[0, ["fuzz", 3], ["bunny", 3]], [0.3, ["pencil", 2], ["clock", 1]], [0.55, ["tub", 1], ["fuzz", 3]], [0.8, ["buzzer", 2], ["bunny", 5]]],
      spawns: [[-14, 0], [2, 0], [2, 12], [-14, 12]],
    });

    k.start(-18, 13, 0);
  },
};
