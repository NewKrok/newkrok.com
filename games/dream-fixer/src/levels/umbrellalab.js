// ── The umbrella lab (dev only: ?level=umbrellalab) ──────────────────────
// Floating garden islands to try the Gust Umbrella on, not a dream. The
// big lawn you arrive on has a yard of small glitches by its west edge to
// gust at close range. North, across a gap too wide to jump, a lower
// island: glide over; flyers and throwers there to hold the umbrella up
// against. East, an updraft that always blows carries you up to a high
// island; south-west, one that only blows while its pinwheel turns, up to
// a little pillar island. One anchor with waves of throwers to try it all
// in a real fight.

const LAWN = { cap: 0x6ab854, capD: 0x50a044, side: 0x9a6a44, sideD: 0x5e3c28, lip: true };
const SOIL = { side: 0x7e5a40, sideD: 0x4a3222 };
const STONE = { side: 0xb9ad98, sideD: 0x857a68, cap: 0xd8cdb5, capD: 0xc0b49a, bevel: 0.08 };

// An island: lawn on top at `top`, tapering down in rings of soil.
function island(k, x, z, w, d, top) {
  k.block(x, z, w, d, top - 2, top, LAWN);
  k.block(x, z, w * 0.82, d * 0.82, top - 4.5, top - 2, SOIL);
  k.block(x, z, w * 0.55, d * 0.55, top - 7, top - 4.5, SOIL);
  k.block(x, z, w * 0.25, d * 0.25, top - 9, top - 7, SOIL);
}

export const umbrellalab = {
  id: "umbrellalab",
  dev: true,
  song: "park",
  killY: -25,
  calm: 6,
  tools: ["stabilizer", "vacuum", "foam", "bell", "umbrella"],
  sky: { top: 0x4a86d8, horizon: 0xffd8b0, bottom: 0xf0b8c8, sunDir: [0.5, 0.3, -0.7], sunGlow: 0xffe8c0 },
  fog: { color: 0xf4d0bc, near: 90, far: 340 },
  sun: { color: 0xfff0d0, intensity: 2.5, dir: [0.5, 0.8, -0.5], sky: 0xb8d0f8, ground: 0x5a7a3a, hemi: 0.9 },
  clouds: { count: 26, rMin: 18, rMax: 80, yMin: -30, yMax: 30 },
  botRoutes: { test: [[0, 10], [4, -4]] },

  build(k) {
    // ── The lawn you arrive on ──
    island(k, 0, 0, 30, 26, 0);
    k.prop("sign", 3, 11, { opts: { color: 0xffe08a }, collide: { r: 0.12, h: 1.75 } });
    for (const [x, z, h] of [[-11, 10, 4.4], [11, 9, 4], [-12, -10, 4.6]])
      k.prop("tree", x, z, { opts: { seed: Math.round(x * 3 + z), h }, collide: { r: 0.4 * h / 4.2, h: 4 } });
    for (const [x, z, s] of [[6, 10, 1], [-4, 11, 0.8], [12, -4, 1.1]])
      k.prop("bush", x, z, { opts: { seed: Math.round(x - z), s }, collide: { r: 0.5 * s, h: 0.85 * s } });
    for (const [x, z] of [[-2, 6], [8, 3], [-7, -2]]) k.prop("flowers", x, z, { opts: { seed: Math.round(x * 7 - z), n: 9, r: 0.9 } });

    // West edge: a yard of small ones to gust at.
    for (const [kind, x, z] of [["fuzz", -11, -1], ["fuzz", -12, 2], ["fuzz", -10, 4], ["bunny", -12.5, -3], ["bunny", -13, 0], ["bunny", -11.5, 5.5], ["meatball", -10, -4], ["pencil", -9, 1]]) k.foe(kind, x, z);

    // ── North: a lower island across a 9 m gap (glide) ──
    island(k, 0, -32, 26, 18, -3);
    k.block(0, -39, 10, 3, -3, -1.5, STONE);
    for (const [kind, x, z] of [["buzzer", -6, -28], ["buzzer", 5, -30], ["clock", 0, -34], ["clock", -8, -35], ["pepper", 8, -27], ["tub", 4, -37], ["knot", -7, -37]]) k.foe(kind, x, z);
    k.prop("tree", 10, -38, { opts: { seed: 21, h: 4.6 }, collide: { r: 0.45, h: 4 } });

    // ── East: an updraft that always blows, up to a high island ──
    k.updraft("east", 12, 0, { r: 1.5, top: 13 });
    island(k, 23, -2, 12, 14, 9);
    k.prop("bench", 24, -2, { y: 9, yaw: Math.PI / 2, collide: { w: 1.7, d: 0.6, h: 0.5 } });
    k.prop("tree", 26, -7, { y: 9, opts: { seed: 31, h: 3.8 }, collide: { r: 0.38, h: 3.6 } });

    // ── South-west: a pinwheel's updraft, up to a little pillar island ──
    k.pinwheel("pw", -6, 9, { yaw: Math.PI });
    k.updraft("sw", -10, 9, { r: 1.4, top: 11, pinwheel: "pw" });
    island(k, -11, 20, 6, 6, 6.5);
    k.prop("crate", -11, 20, { y: 6.5, opts: { seed: 5 }, collide: { w: 0.9, d: 0.9, h: 0.9 } });

    k.anchor("test", 4, -4, {
      duration: 22,
      waves: [[0, ["fuzz", 3], ["bunny", 3]], [0.25, ["buzzer", 2]], [0.45, ["tub", 1], ["fuzz", 2]], [0.65, ["clock", 2], ["knot", 1]], [0.8, ["pepper", 2], ["bunny", 4]]],
      spawns: [[-6, -8], [10, -8], [10, 4], [-6, 4]],
    });

    k.start(0, 10, 0);
  },
};
