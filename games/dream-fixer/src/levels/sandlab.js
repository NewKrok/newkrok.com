// ── The sand lab (dev only: ?level=sandlab) ──────────────────────────────
// Brass-and-wood decks in the dark to try the Dream Sand sack on, not a
// dream. The deck you arrive on has a yard of small glitches by its west
// edge to put to sleep (and a big one that only gets drowsy). North, a
// 6 m gap one sand path bridges, then a 10 m one that needs a path and a
// jump off its end. East, a ledge 2.8 m up (a path tipped up climbs it).
// South-east, a deck 3 m down across a 5 m gap (a path tipped down). One
// anchor with waves to try it all in a real fight.

const DECK = { top: 0xb08a5a, side: 0x7a5a3a, sideD: 0x3a2a1a, bevel: 0.1 };
const BRASS = { top: 0xe0b860, side: 0xa07a30, bevel: 0.05 };
const IRON = { side: 0x4a4458, sideD: 0x221e2c };

// A deck: planks on top at `top`, an iron frame tapering under it.
function deck(k, x, z, w, d, top) {
  k.block(x, z, w, d, top - 1, top, DECK);
  k.block(x, z, w * 0.8, d * 0.8, top - 3, top - 1, IRON);
  k.block(x, z, w * 0.4, d * 0.4, top - 5.5, top - 3, IRON);
}

export const sandlab = {
  id: "sandlab",
  dev: true,
  song: "park",
  killY: -25,
  calm: 6,
  tools: ["stabilizer", "vacuum", "foam", "bell", "umbrella", "yoyo", "sand"],
  sky: { top: 0x120c24, horizon: 0x5a3a5a, bottom: 0x24142c, sunDir: [0.4, 0.25, -0.8], sunGlow: 0xffc890 },
  fog: { color: 0x3a2a40, near: 80, far: 320 },
  sun: { color: 0xffe8d0, intensity: 2.3, dir: [0.4, 0.8, -0.5], sky: 0xb8a0e0, ground: 0x4a3040, hemi: 0.9 },
  clouds: { count: 14, rMin: 30, rMax: 90, yMin: -40, yMax: 20 },
  botRoutes: { test: [[0, 6], [4, -4]] },

  build(k) {
    // ── The deck you arrive on ──
    deck(k, 0, 0, 28, 24, 0);
    k.block(0, -11.6, 8, 0.8, 0, 0.25, BRASS);
    for (const [x, z] of [[-6, 6], [7, 4]]) k.prop("crate", x, z, { opts: { seed: x * 3 + z }, collide: { w: 0.9, d: 0.9, h: 0.9 } });
    k.prop("sign", 3, 10, { opts: { color: 0xffe08a }, collide: { r: 0.12, h: 1.75 } });

    // West edge: a yard of small ones to put to sleep, a big one to make drowsy.
    for (const [kind, x, z] of [["fuzz", -11, -1], ["fuzz", -12, 3], ["bunny", -12.5, -4], ["robot", -11.5, 6], ["meatball", -10, -6], ["gnome", -9, 1], ["pencil", -10, 8], ["backpack", -11, -9]]) k.foe(kind, x, z);

    // ── North: a 6 m gap, a small deck, a 10 m gap, the far deck ──
    deck(k, 0, -21, 10, 6, 0);
    deck(k, 0, -41, 24, 14, 0);
    for (const [kind, x, z] of [["buzzer", -6, -38], ["can", 5, -40], ["clock", 0, -44], ["pepper", 8, -37], ["tub", 4, -45], ["knot", -9, -45]]) k.foe(kind, x, z);

    // ── East: a ledge 2.8 m up ──
    k.block(19, 0, 10, 12, -4, 2.8, DECK);
    k.block(14.15, 0, 0.3, 12, 2.55, 2.85, BRASS);
    k.prop("crate", 20, 2, { y: 2.8, opts: { seed: 7 }, collide: { w: 0.9, d: 0.9, h: 0.9 } });

    // ── South-east: a deck 3 m down across a gap ──
    deck(k, 12, 22, 10, 10, -3);

    k.anchor("test", 4, -4, {
      duration: 22,
      waves: [[0, ["fuzz", 3], ["bunny", 3]], [0.25, ["buzzer", 2]], [0.45, ["tub", 1], ["fuzz", 2]], [0.65, ["clock", 2], ["knot", 1]], [0.8, ["pepper", 2], ["bunny", 4]]],
      spawns: [[-6, -8], [10, -8], [10, 4], [-6, 4]],
    });

    k.start(0, 9, 0);
  },
};
