// ── The foam lab (dev only: ?level=lab) ──────────────────────────────────
// A plain island to try the Foam Cannon on, not a dream. Everything in it
// asks for a foam step or two: a terrace one step too high, a tall wall to
// climb on ledges, a pit to get out of, a pillar to stack steps up to.
// A few glitches to soak by the start, and one anchor with waves to try
// the foam in a real fight.

const LAWN = { cap: 0x62b04e, capD: 0x4a9440, side: 0x9a6a44, sideD: 0x5e3c28, lip: true };
const STONE = { side: 0xb9ad98, sideD: 0x857a68, cap: 0xd8cdb5, capD: 0xc0b49a, bevel: 0.08 };
const BRICK = { side: 0xc07a5a, sideD: 0x8a4e38, bevel: 0.05 };

export const lab = {
  id: "lab",
  dev: true,
  song: "park",
  killY: -25,
  calm: 6,
  // You come in with every tool.
  tools: ["stabilizer", "vacuum", "foam"],
  sky: { top: 0x3f7fd8, horizon: 0xffc9a0, bottom: 0xe8a8c8, sunDir: [-0.5, 0.35, -0.7], sunGlow: 0xffe0b0 },
  fog: { color: 0xf0c4a8, near: 90, far: 320 },
  sun: { color: 0xffe2c0, intensity: 2.4, dir: [-0.5, 0.75, -0.6], sky: 0xb0c8f0, ground: 0x5a6a3a, hemi: 0.85 },
  clouds: { count: 20, rMin: 18, rMax: 70, yMin: -20, yMax: 30 },
  botRoutes: { test: [[0, 8], [5.5, 10]] },

  build(k) {
    // The island, with a pit cut into its east side (3 m deep, walls all round).
    k.block(-6, 0, 40, 44, -5, 0, LAWN);
    k.block(20, -13, 12, 18, -5, 0, LAWN);
    k.block(20, 13, 12, 18, -5, 0, LAWN);
    k.block(23, 0, 6, 8, -5, 0, LAWN);
    k.block(17, 0, 6, 8, -5, -3, { cap: 0x8a7a50, capD: 0x6a5a3a, side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(4, 0, 46, 40, -9, -5, { side: 0x7e5a40, sideD: 0x4a3222 });

    // North: a terrace 2 m up (one step and a jump).
    k.block(-6, -17, 22, 8, -0.5, 2, STONE);
    k.prop("sign", -6, -12.4, { opts: { color: 0xffe08a }, collide: { r: 0.12, h: 1.75 } });
    // West: a brick wall 5 m tall to climb on ledges, capped with stone.
    k.block(-24.5, 0, 1.2, 14, 0, 5, BRICK);
    k.block(-24.5, 0, 1.4, 14.2, 5, 5.25, STONE);
    // South: a pillar to stack steps up to (3 m), a crate on top.
    k.block(-2, 15, 3, 3, 0, 3, STONE);
    k.prop("crate", -2, 15, { y: 3, opts: { seed: 2 }, collide: { w: 0.9, d: 0.9, h: 0.9 } });
    // Low hedges and trees round the edge.
    for (const [x, z, h] of [[-22, -18, 4.6], [-22, 18, 4.2], [10, 19, 4.4], [10, -19, 4.8]])
      k.prop("tree", x, z, { opts: { seed: Math.round(x * 3 + z), h }, collide: { r: 0.4 * h / 4.2, h: 4 } });
    for (const [x, z, s] of [[-14, 8, 1], [-16, 9.5, 0.8], [6, -8, 1.1]])
      k.prop("bush", x, z, { opts: { seed: Math.round(x - z), s }, collide: { r: 0.5 * s, h: 0.85 * s } });
    k.light(-6, 4.5, -14, 0xffd08a, 5, 10);

    // Glitches to soak, near the start.
    for (const [kind, x, z] of [["fuzz", -4, -6], ["fuzz", -2, -7], ["bunny", 2, -5], ["bunny", 3, -6], ["bunny", 1.5, -6.5], ["tub", 8, -10], ["buzzer", -10, -4]]) k.foe(kind, x, z);
    // An anchor to fight round, out by the pillar.
    k.anchor("test", 6, 12, {
      duration: 22,
      waves: [[0, ["fuzz", 3]], [0.3, ["bunny", 5]], [0.55, ["tub", 1], ["fuzz", 2]], [0.8, ["buzzer", 2], ["bunny", 4]]],
      spawns: [[0, 6], [12, 6], [12, 18], [0, 18]],
    });

    k.start(-6, 4, 0);
  },
};
