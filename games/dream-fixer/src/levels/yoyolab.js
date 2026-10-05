// ── The yo-yo lab (dev only: ?level=yoyolab) ─────────────────────────────
// Station decks in low gravity to try the Star Yo-Yo on, not a dream. The
// deck you arrive on has a yard of small glitches by its west edge to
// yank. North, across a gap no jump clears, a second deck: two star
// handles hang over the gap, catch one, then the next. Flyers and big
// ones wait over there. East, a tower whose top only a handle over its
// edge reaches. One anchor with waves to try it all in a real fight.

const DECK = { top: 0xd8dde6, side: 0x7a86a0, sideD: 0x3c4560, bevel: 0.1 };
const TRIM = { top: 0xffd27a, side: 0xb08a3a, bevel: 0.05 };
const HULL = { side: 0x5a6688, sideD: 0x262c44 };

// A deck: plating on top at `top`, a hull tapering under it.
function deck(k, x, z, w, d, top) {
  k.block(x, z, w, d, top - 1.2, top, DECK);
  k.block(x, z, w * 0.8, d * 0.8, top - 3.2, top - 1.2, HULL);
  k.block(x, z, w * 0.4, d * 0.4, top - 5.5, top - 3.2, HULL);
}

export const yoyolab = {
  id: "yoyolab",
  dev: true,
  song: "park",
  gravity: 0.5,
  killY: -25,
  calm: 6,
  tools: ["stabilizer", "vacuum", "foam", "bell", "umbrella", "yoyo"],
  sky: { top: 0x0a0e2a, horizon: 0x3a3070, bottom: 0x1a1440, sunDir: [0.4, 0.25, -0.8], sunGlow: 0xb8c8ff },
  fog: { color: 0x2a2a58, near: 90, far: 340 },
  sun: { color: 0xf0f0ff, intensity: 2.3, dir: [0.4, 0.8, -0.5], sky: 0x8a9ae8, ground: 0x3a3060, hemi: 0.9 },
  clouds: { count: 14, rMin: 30, rMax: 90, yMin: -40, yMax: 20 },
  botRoutes: { test: [[0, 6], [4, -4]] },

  build(k) {
    // ── The deck you arrive on ──
    deck(k, 0, 0, 28, 24, 0);
    k.block(0, -11.6, 8, 0.8, 0, 0.25, TRIM);
    for (const [x, z] of [[-6, 6], [7, 4], [9, -6]]) k.prop("crate", x, z, { opts: { seed: x * 3 + z }, collide: { w: 0.9, d: 0.9, h: 0.9 } });
    k.prop("sign", 3, 10, { opts: { color: 0xffe08a }, collide: { r: 0.12, h: 1.75 } });

    // West edge: a yard of small ones to yank.
    for (const [kind, x, z] of [["fuzz", -11, -1], ["fuzz", -12, 3], ["bunny", -12.5, -4], ["bunny", -11.5, 6], ["meatball", -10, -6], ["gnome", -9, 1], ["pencil", -10, 8]]) k.foe(kind, x, z);

    // ── North: a deck across an 18 m gap, two handles over it ──
    deck(k, 0, -37, 26, 14, 0);
    k.hook("gap1", 0, 3.2, -19);
    k.hook("gap2", 0, 3.6, -29);
    for (const [kind, x, z] of [["buzzer", -6, -34], ["can", 5, -36], ["clock", 0, -40], ["pepper", 8, -33], ["tub", 4, -41], ["backpack", -5, -40], ["knot", -9, -42]]) k.foe(kind, x, z);

    // ── East: a tower, a handle over its edge ──
    k.block(20, 0, 4, 4, -6, 10, HULL);
    k.block(20, 0, 8, 8, 9, 10.2, DECK);
    k.hook("tower", 16.6, 12.3, 0);
    k.prop("crate", 21, 1, { y: 10.2, opts: { seed: 7 }, collide: { w: 0.9, d: 0.9, h: 0.9 } });

    k.anchor("test", 4, -4, {
      duration: 22,
      waves: [[0, ["fuzz", 3], ["bunny", 3]], [0.25, ["buzzer", 2]], [0.45, ["tub", 1], ["fuzz", 2]], [0.65, ["clock", 2], ["knot", 1]], [0.8, ["pepper", 2], ["bunny", 4]]],
      spawns: [[-6, -8], [10, -8], [10, 4], [-6, 4]],
    });

    k.start(0, 9, 0);
  },
};
