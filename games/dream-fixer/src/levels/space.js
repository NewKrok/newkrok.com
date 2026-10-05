import { rng } from "../rng.js";

// ── Sophie's station (chapter 5) ─────────────────────────────────────────
// Sophie grew up in Dayton, Ohio, under glow-in-the-dark stars her dad
// stuck on her ceiling in the real constellations. Now she has been six
// months on the station, and tomorrow is her first spacewalk. Tonight she
// is homesick, and in her dream the station is full of her childhood
// room. It is light up here: everything jumps high and falls slowly.
//
//  South: the docking port, where you come in. Off its east side, a lump
//  of moon rock with a memory on it (star handles over the gap).
//  The hub in the middle: her bedroom, grown into the station (her bed,
//  her desk and globe, the toy chest, a bookcase as tall as a wall).
//  West, through a corridor: the bunk module, the first anchor.
//  East: the solar array, two decks across two gaps no jump clears; a
//  string of star handles over each. The second anchor on the far one,
//  and a satellite dish up off its north side.
//  North-west, up on a tower over the annex: the observatory, her dad's
//  telescope, the third anchor. Two handles up.
//  North, through a short corridor: the cupola, where the Moon Lamp waits.
//
// Sophie's yo-yo comes down after the first anchor; the array, the
// observatory and the memories off the edges wait for its lasso.

const DECK = { top: 0xd8dde6, side: 0x8a96b0, sideD: 0x3c4560, bevel: 0.1 };
const HULL = { side: 0x5a6688, sideD: 0x262c44 };
const WALL = { top: 0xf2f4f8, side: 0xe4e8f0, sideD: 0xa8b0c4, bevel: 0.06 };
const TRIM = { top: 0xffd27a, side: 0xb08a3a, bevel: 0.04 };
const PANEL = { top: 0x2a4a9a, side: 0x1a2a5a, bevel: 0.04 };
const ROCK = { top: 0xb8b4ac, side: 0x8a867e, sideD: 0x4a4844, bevel: 0.12 };
const RUG = { flat: { top: 0x6a5e9a, side: 0x4a3e78 } };

export const space = {
  id: "space",
  gravity: 0.5,
  killY: -30,
  calm: 9,
  song: "space",
  lamps: 4,
  unlockTool: { id: "yoyo", anchors: 1 },
  boss: { kind: "moon", x: 0, z: -38, arena: { minX: -9, maxX: 9, minZ: -44, maxZ: -30 }, seal: { minX: -13.5, maxX: 13.5, minZ: -47.5, maxZ: -24.5 } },
  skins: {},
  // [id, x, z, y]: on the top bunk, on the bookcase in the hub (a handle
  // above it), by the telescope, on the satellite dish, on the moon rock.
  memories: [["glowstars", -38.5, -3, 2.05], ["patch", 10, -10.5, 3.6], ["planisphere", -27, -24, 12], ["fireflies", 70, -20, 3], ["porch", 26, 25.5, 2]],
  sky: { top: 0x070a24, horizon: 0x2a2660, bottom: 0x140f36, sunDir: [0.5, 0.35, -0.75], sunGlow: 0xb8c8ff, stars: 1, earth: { dir: [0.3, -0.12, -0.95], r: 0.4 } },
  fog: { color: 0x1c1c44, near: 120, far: 420 },
  sun: { color: 0xf0f2ff, intensity: 2.4, dir: [0.5, 0.75, -0.45], sky: 0x9aa8f0, ground: 0x3a3a70, hemi: 0.95 },
  gloom: { top: 0x1a0a24, horizon: 0x4a2a4a, bottom: 0x24102c, sunGlow: 0x8a6a9a, fog: 0x2a1a34, sun: 1.4, hemi: 0.6 },
  clouds: { model: "asteroid", count: 22, rMin: 25, rMax: 95, yMin: -35, yMax: 30 },
  shards: 80,

  // Waves by how far along you are: robots and rockets first, then the
  // spinning top, the last one with a planet mobile.
  tiers: [
    [[0, ["robot", 2]], [0.35, ["rocket", 1]], [0.65, ["robot", 2], ["rocket", 1]]],
    [[0, ["robot", 2], ["rocket", 1]], [0.3, ["top", 1]], [0.55, ["robot", 2]], [0.8, ["rocket", 2], ["robot", 1]]],
    [[0, ["rocket", 2], ["robot", 1]], [0.3, ["mobile", 1]], [0.55, ["robot", 3]], [0.8, ["rocket", 1], ["robot", 2]]],
  ],

  // Routes for the headless bot, from the dock. ("hook", id): lasso that
  // star handle and ride the string to it. botBack: the way back.
  botRoutes: {
    bunk: [[0, 12], [-8, 3], [-16, 2], [-26, 2], [-31, 2], [-33, 2]],
    array: [[0, 12], [8, 1], [15, 0], ["hook", "e2"], ["hook", "e3"], [39, 0], [43, 0], ["hook", "e5"], ["hook", "e6"], [68, 0], [70, 0]],
    dome: [[0, 12], [-8, -6], [-14.5, -11.5], ["hook", "t1"], ["hook", "t2"], [-23, -20], [-24, -21]],
  },
  botBack: {
    array: [[63, 0], ["hook", "e5"], ["hook", "e4"], [41, 0], [35, 0], ["hook", "e2"], ["hook", "e1"], [8, 0], [0, 10]],
    dome: [[-20, -20], [-16, -20], [-12, -12], [0, 10]],
  },
  botBoss: [[0, -10], [0, -20], [0, -30]],

  build(k) {
    const rnd = rng(53);
    this.hub(k, rnd);
    this.bunk(k, rnd);
    this.array(k, rnd);
    this.observatory(k, rnd);
    this.cupola(k, rnd);

    // ── Anchors ──
    k.anchor("bunk", -33, 2, { duration: 24, ring: 4.6, spawns: [[-38, -2], [-29, -2], [-38, 6.5], [-29, 6.5]] });
    k.anchor("array", 70, 0, { duration: 26, ring: 6, spawns: [[64, -6], [76, -6], [76, 6], [64, 6]] });
    k.anchor("dome", -24, -21, { y: 12, duration: 28, ring: 4.2, spawns: [[-29, -26], [-19, -26], [-19, -16], [-29, -16]] });

    // Glitches already loose, a kind at a time: wind-up robots in the hub,
    // plush rockets down the corridor and in the bunk module, a spinning
    // top on the first deck of the array, a planet mobile and its company
    // on the far one, a rocket up at the observatory.
    for (const [kind, x, z] of [
      ["robot", -6, -6], ["robot", 7, -4], ["robot", -4, 7],
      ["rocket", -22, 2], ["rocket", -36, 6], ["robot", -30, -3],
      ["top", 40, 1], ["robot", 42, -3],
      ["mobile", 75, 5], ["robot", 66, -5], ["robot", 74, -4], ["rocket", 67, 5],
      ["rocket", -26, -24],
    ]) k.foe(kind, x, z);

    k.start(0, 21, 0);
  },

  // ── The docking port and the hub: her bedroom, grown into the station ──
  hub(k, rnd) {
    deck(k, 0, 0, 32, 28, 0);
    deck(k, 0, 19, 12, 10, 0);
    // The airlock you come out of, at the dock's south end.
    k.prop("airlock", 0, 24, { collide: { w: 6, d: 0.8, h: 4 } });
    // Her room: a rug, the bed, the desk with the globe, the toy chest,
    // the bookcase (a memory on top, a star handle over it).
    deco(k, 0, 1, 12, 9, -0.1, 0.04, RUG);
    k.prop("kidBed", -8, -6, { yaw: Math.PI / 2, collide: { w: 2.4, d: 4.4, h: 0.95 } });
    k.prop("kidDesk", -9, 8, { yaw: Math.PI, collide: { w: 2.6, d: 1.3, h: 1.2 } });
    k.prop("toyChest", 8, 7, { yaw: -0.3, collide: { w: 2, d: 1.2, h: 1.1 } });
    k.prop("bookcase", 10, -10.5, { collide: { w: 3.2, d: 1.2, h: 3.6 } });
    k.hook("shelf", 10, 6.2, -9.6);
    // The station round it: consoles along the edges, lamps, handholds.
    for (const [x, z, yaw] of [[-15, -6, Math.PI / 2], [-15, 9, Math.PI / 2], [15, 9, -Math.PI / 2], [15, -9, -Math.PI / 2], [-6, -13.2, 0], [6, -13.2, 0]])
      k.prop("console", x, z, { yaw, collide: { w: 1.8, d: 0.8, h: 1.2 } });
    for (const [x, z] of [[-14, 12.5], [14, 12.5], [-14, -12.5], [14, -12.5]]) k.prop("spaceLamp", x, z, { collide: { r: 0.18, h: 3.4 } });
    for (let i = 0; i < 9; i++) k.prop("glowStar", -12 + rnd() * 24, -10 + rnd() * 20, { y: 5 + rnd() * 3, opts: { seed: i + 1 } });
    k.light(0, 4, 0, 0xc8d8ff, 6, 18);
    k.light(-9, 3, 8, 0xffd8a0, 4, 9);

    // ── The moon rock off the dock (handles over the gap) ──
    k.block(26, 25.5, 10, 6, 0.4, 2, ROCK);
    k.block(26, 25.5, 6, 4, -2.5, 0.4, ROCK);
    k.hook("rock0", 7, 3.6, 21.5);
    k.hook("rock1", 14, 3.8, 23.5);
    k.hook("rock2", 22, 4.2, 25.5);
    k.prop("porchLight", 29, 25.5, { y: 2, collide: { r: 0.2, h: 2.4 } });
  },

  // ── West: the corridor and the bunk module ──
  bunk(k, rnd) {
    deck(k, -21.5, 2, 11.5, 6, 0);
    for (const z of [-1.15, 5.15]) k.block(-21.5, z, 11, 0.3, 0, 2.8, WALL);
    for (let x = -26; x < -16; x += 2.5) deco(k, x, 2, 0.3, 6, 2.8, 3.05, TRIM);
    deck(k, -34, 2, 14, 14, 0);
    // Its walls, a doorway east to the corridor, a porthole or two.
    k.block(-34, -5, 14, 0.3, 0, 3.4, WALL);
    k.block(-34, 9, 14, 0.3, 0, 3.4, WALL);
    k.block(-41, 2, 0.3, 14, 0, 3.4, WALL);
    k.block(-27, -3.15, 0.3, 3.7, 0, 3.4, WALL);
    k.block(-27, 7.15, 0.3, 3.7, 0, 3.4, WALL);
    for (const [x, z, yaw] of [[-37, -4.84, 0], [-31, -4.84, 0], [-40.84, 4, Math.PI / 2]]) k.prop("porthole", x, z, { yaw });
    // Her bunk bed (a memory on the top bunk), the wardrobe, the dollhouse.
    k.prop("bunkBed", -38.5, -2.5, { yaw: Math.PI / 2, collide: { w: 2.2, d: 4.2, h: 2.05 } });
    k.prop("wardrobe", -39.6, 6.2, { yaw: -Math.PI / 2, collide: { w: 1.6, d: 2.4, h: 2.8 } });
    k.prop("dollhouse", -30, 7.4, { yaw: Math.PI, collide: { w: 2.2, d: 1.2, h: 1.9 } });
    k.prop("toyChest", -30.5, -3.6, { collide: { w: 2, d: 1.2, h: 1.1 } });
    k.light(-34, 3.2, 2, 0xffe0b8, 5, 11);
    void rnd;
  },

  // ── East: the solar array ──
  array(k, rnd) {
    // Two gaps of 18 m, three star handles over each (1 m out from either
    // side and one halfway): ride them out and back.
    for (const [id, x, y] of [["e1", 17, 3.6], ["e2", 25, 4], ["e3", 33, 3.8], ["e4", 45, 3.6], ["e5", 53, 4], ["e6", 61, 3.8]]) k.hook(id, x, y, 0);
    deck(k, 39, 0, 10, 10, 0);
    deck(k, 70, 0, 16, 16, 0);
    // The wings: long dark-blue panels hanging well below the decks (not a
    // way across), the trusses that hold them.
    for (const [x, z] of [[25, 9], [25, -9], [53, 9], [53, -9], [70, 15], [70, -30]]) {
      deco(k, x, z, 14, 6, -7.1, -7, PANEL);
      deco(k, x, z, 14.4, 0.25, -7.3, -7.1, TRIM);
    }
    for (const [x, z, w, d] of [[25, 0, 18, 0.5], [53, 0, 18, 0.5]]) deco(k, x, z, w, d, -7.6, -7.1, HULL);
    k.prop("console", 41.5, 3.5, { yaw: -Math.PI / 2, collide: { w: 1.8, d: 0.8, h: 1.2 } });
    k.prop("crate", 36, -3, { opts: { seed: 4 }, collide: { w: 0.9, d: 0.9, h: 0.9 } });
    for (const [x, z, yaw] of [[63.5, 6.5, Math.PI / 2], [76.5, -6.5, -Math.PI / 2]]) k.prop("console", x, z, { yaw, collide: { w: 1.8, d: 0.8, h: 1.2 } });
    for (const [x, z] of [[63, -7], [77, 7]]) k.prop("spaceLamp", x, z, { collide: { r: 0.18, h: 3.4 } });
    // Up off the north side: the satellite dish (a memory), a handle there
    // and one back.
    deck(k, 70, -19, 8, 8, 3);
    k.prop("dish", 72, -21, { y: 3, collide: { r: 0.6, h: 1.2 } });
    k.hook("dish", 70, 5.4, -16);
    k.hook("dishBack", 70, 3.4, -9);
    k.light(39, 3, 0, 0xc8d8ff, 4, 10);
    k.light(70, 3.5, 0, 0xc8d8ff, 5, 14);
    void rnd;
  },

  // ── North-west: the annex, and the observatory up on its tower ──
  observatory(k, rnd) {
    deck(k, -21, -18.5, 18, 17, 0);
    // The tower, its top deck high over the annex.
    k.block(-24, -21, 3, 3, 0, 11.2, HULL);
    k.block(-24, -21, 12, 12, 11, 12, DECK);
    for (const s of [-1, 1]) deco(k, -24 + s * 5.95, -21, 0.12, 12, 12, 12.6, TRIM);
    k.prop("telescope", -26, -24, { y: 12, yaw: -0.6, collide: { r: 0.6, h: 1.4 } });
    k.prop("starChart", -27.5, -18.5, { y: 12, yaw: Math.PI / 2 });
    // Two handles up: one beside the tower, one just over its edge.
    k.hook("t1", -15.5, 10.5, -13.5);
    k.hook("t2", -20, 16.5, -17.5);
    k.prop("spaceLamp", -28, -14, { collide: { r: 0.18, h: 3.4 } });
    k.light(-24, 14, -21, 0xc8d8ff, 5, 12);
    void rnd;
  },

  // ── North: the corridor and the cupola (the Moon Lamp's arena) ──
  cupola(k, rnd) {
    deck(k, 0, -19, 6.5, 10.5, 0);
    for (const x of [-3.15, 3.15]) k.block(x, -19, 0.3, 10, 0, 2.8, WALL);
    deck(k, 0, -36, 28, 24, 0);
    k.prop("cupolaFrame", 0, -36, { opts: { w: 28, d: 24 } });
    // Star handles round its edge, to get off the floor when the tide comes.
    for (const [i, x, z] of [[0, -11, -29], [1, 11, -29], [2, -11, -44], [3, 11, -44]]) k.hook(`c${i}`, x, 4.5, z);
    k.light(0, 6, -36, 0xd8e0ff, 7, 22);
    void rnd;
  },
};

// A deck: plating on top at `top`, a hull tapering under it.
function deck(k, x, z, w, d, top) {
  k.block(x, z, w, d, top - 1.2, top, DECK);
  k.block(x, z, w * 0.8, d * 0.8, top - 3.2, top - 1.2, HULL);
  k.block(x, z, w * 0.45, d * 0.45, top - 5.5, top - 3.2, HULL);
}

// Drawn, not solid (rugs, trim, panels).
function deco(k, x, z, w, d, y0, y1, look) { k.draw.push({ kind: "block", x, z, w, d, y0, y1, yaw: 0, look }); }
