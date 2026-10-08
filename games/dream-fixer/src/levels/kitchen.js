import { rng } from "../rng.js";

// ── Rosie's kitchen (chapter 3) ──────────────────────────────────────────
// The night before her little diner opens, and her kitchen has grown
// enormous: you are the size of a teaspoon in it. A floating piece of the
// kitchen floor in a warm evening sky, the tiled wall and the window at
// its back. You come in on the doormat at the south edge. The counter
// runs along the back wall (five metres up, the sink and the stove on
// it), the fridge stands in the corner, the pantry is a room of its own
// on the west side, the big table and its chairs stand to the south-west,
// and the open floor in the middle is where the Pressure Cooker will come
// up. The anchors: under the table, in the pantry, on the counter by the
// stove.
//
// The Lullaby Bell comes after the first anchor. The pantry door is
// stuffed with a risen soufflé (a ring flattens it), and only a jelly
// that wobbles throws you up onto the counter (a foam stair falls just
// short): so the table comes first. Jellies also throw you up to the high
// shelf and the chair seat, where memories wait.

const H = 14;              // back and west walls
const TOP = 5;             // the counter
const PANTRY = 8;          // the pantry's walls
const SHELF = 10;          // the high shelf over the counter
const TABLE = 9;           // the table top
const SEAT = 4.6;          // the chairs' seats

const TILE_A = 0xf2e6cc, TILE_B = 0xd88a62;
const WALLTILE = { side: 0xeef0e4, sideD: 0xc8d0c4, bevel: 0.05 };
const CABINET = { side: 0x8fb89a, sideD: 0x5e8a6e, bevel: 0.08 };
const WORKTOP = { flat: { top: 0xe8dcc4, side: 0xb89a72 } };
const WOOD = { side: 0xb07a48, sideD: 0x7a4e2a, cap: 0xc8925a, capD: 0xa87440, bevel: 0.08 };
const PLASTER = { side: 0xf0d8b0, sideD: 0xc8a880, bevel: 0.05 };
const UNDER = { side: 0x7e5a40, sideD: 0x4a3222 };

export const kitchen = {
  id: "kitchen",
  killY: -25,
  calm: 9,
  song: "kitchen",
  lamps: 4,
  unlockTool: { id: "bell", anchors: 1 },
  boss: { kind: "cooker", x: 8, z: 0, arena: { minX: -5, maxX: 21, minZ: -12.5, maxZ: 12.5 }, seal: { minX: -7.5, maxX: 23.5, minZ: -15.5, maxZ: 15.5 } },
  skins: {},
  // [id, x, z, y]: on the high shelf, on the flour sacks in the pantry,
  // by a table leg, on a chair seat, by the stove.
  memories: [["recipe", -10, -26.6, SHELF + 0.4], ["firstpan", -29.5, 3, 3], ["sign", -23.8, 12.2, 0], ["letter", -17, 24.3, SEAT], ["apron", 29, -26, TOP]],
  sky: { top: 0x3a4ab0, horizon: 0xffb88a, bottom: 0xe0a0b8, sunDir: [-0.4, 0.25, 0.85], sunGlow: 0xffd0a0 },
  fog: { color: 0xf0c0a8, near: 100, far: 320 },
  sun: { color: 0xffe0c0, intensity: 2.3, dir: [-0.4, 0.8, 0.5], sky: 0xc0c8f0, ground: 0x7a5a4a, hemi: 0.9 },
  gloom: { top: 0x2a2244, horizon: 0x7a5a78, bottom: 0x4a3a5a, sunGlow: 0x8a7088, fog: 0x6a5a70, sun: 1.2, hemi: 0.6 },
  clouds: { count: 28, rMin: 18, rMax: 80, yMin: -22, yMax: 36 },
  shards: 80,

  // Waves by how far along you are: meatballs and pepper first, then the
  // rolling pin, the last one with a meat grinder.
  tiers: [
    [[0, ["meatball", 2]], [0.35, ["pepper", 2]], [0.65, ["meatball", 2], ["pepper", 1]]],
    [[0, ["meatball", 2], ["pepper", 1]], [0.3, ["rollingpin", 1]], [0.55, ["meatball", 2], ["pepper", 1]], [0.8, ["pepper", 2], ["meatball", 1]]],
    [[0, ["pepper", 2], ["meatball", 1]], [0.3, ["grinder", 1]], [0.55, ["rollingpin", 1], ["pepper", 1]], [0.8, ["meatball", 2], ["pepper", 1]]],
  ],

  // Routes for the headless bot, from the doormat. ("bell", id): it rings
  // that ringable, as a player would.
  botRoutes: {
    table: [[4, 24], [-4, 19], [-12, 17], [-17, 16]],
    pantry: [[4, 24], [-4, 18], [-10, 0], [-12, -4.8], ["bell", "door"], [-18, -4.8], [-23, -4]],
    stove: [[4, 24], [-4, 18], [-10, -2], [-13, -12], ["bell", "toCounter"], [-13, -21], [-4, -22], [10, -22]],
  },

  build(k) {
    const rnd = rng(31);
    this.floor(k);
    this.counter(k, rnd);
    this.pantry(k, rnd);
    this.table(k, rnd);
    this.floorThings(k, rnd);

    // ── Anchors ──
    k.anchor("table", -17, 16, { y: 0, duration: 24, spawns: [[-24, 12], [-10, 12], [-10, 20.5], [-24, 20.5]] });
    k.anchor("pantry", -23, -4, { duration: 26, ring: 5.5, spawns: [[-29, -11], [-18, -11], [-18, 3], [-29, -1]] });
    k.anchor("stove", 10, -23, { duration: 28, ring: 5.5, spawns: [[1, -24], [19, -24], [6, -26.5], [15, -20]] });

    // Glitches already loose, a kind at a time: meatballs by the door,
    // pepper shakers by the table, rolling pins out east, meatballs and a
    // pepper in the pantry, meatballs and a pepper up on the counter.
    for (const [kind, x, z] of [
      ["meatball", 13, 22], ["meatball", 15, 23.5], ["meatball", 16.5, 21],
      ["pepper", -4, 9], ["pepper", -12, 4],
      ["rollingpin", 27, 6], ["rollingpin", 27, -8],
      ["meatball", -27, -9], ["meatball", -20, -11], ["pepper", -26, 0],
      ["pepper", 24, -22], ["meatball", 2, -21], ["meatball", 4, -25],
    ]) k.foe(kind, x, z);

    k.start(4, 24, 0);
  },

  // ── The floor: big terracotta and cream tiles, the walls at its back ──
  floor(k) {
    k.block(0, 0, 64, 56, -1.5, 0, { flat: { top: TILE_A, side: 0xb8a088 } });
    k.block(0, 0, 60, 52, -4.5, -1.5, { side: 0xa88a6a, sideD: 0x6a5240 });
    k.block(-2, 2, 40, 34, -8, -4.5, UNDER);
    k.block(4, -4, 16, 14, -12, -8, { side: 0x6e4c36, sideD: 0x3e2a1e });
    for (let x = -30; x < 32; x += 4) for (let z = -26; z < 28; z += 4) {
      if (((x + z) / 4) % 2 === 0) continue;
      deco(k, x + 2, z + 2, 3.96, 3.96, -0.2, 0.025, { flat: { top: TILE_B, side: TILE_B } });
    }
    // The tiled back wall with a skirting and a window, and the west wall.
    k.block(0, -28.5, 64, 1, 0, H, WALLTILE);
    k.block(-32.5, 0, 1, 56, 0, H, WALLTILE);
    for (const [x, z, w, d] of [[0, -27.95, 64, 0.12], [-31.95, 0, 0.12, 56]]) deco(k, x, z, w, d, 0, 0.6, { flat: { top: 0x8a5a3a, side: 0x6a4228 } });
    k.prop("kitchenWindow", 8, -27.95, { y: 6.5 });
    k.prop("panRail", 22, -27.9, { y: 9 });
  },

  // ── North: the counter, the sink, the stove, the shelf, the fridge ──
  counter(k, rnd) {
    const x0 = -19, x1 = 32, cx = (x0 + x1) / 2, w = x1 - x0;
    // (No overhang: you would bump your head on it bouncing up.)
    k.block(cx, -23, w, 10, 0, TOP - 0.3, CABINET);
    k.block(cx, -23, w + 0.1, 10.1, TOP - 0.3, TOP, WORKTOP);
    deco(k, cx, -17.93, w, 0.1, 0, 0.5, { flat: { top: 0x3e5a48, side: 0x3e5a48 } });
    // Cabinet doors and their knobs down the front.
    for (let x = x0 + 2.6; x < x1 - 1; x += 5) {
      deco(k, x, -17.85, 4.4, 0.08, 0.8, TOP - 0.7, { flat: { top: 0xa8ccb0, side: 0xa8ccb0 } });
      k.prop("knob", x + 1.6, -17.8, { y: 2.6 });
    }
    // The sink, set into the worktop, its tap against the wall.
    deco(k, -6, -23.5, 7, 5, TOP - 0.05, TOP + 0.02, { flat: { top: 0x9aa8b4, side: 0x7a8894 } });
    deco(k, -6, -23.5, 6.2, 4.2, TOP - 0.04, TOP + 0.035, { flat: { top: 0x5a6874, side: 0x5a6874 } });
    k.prop("faucet", -6, -26.8, { y: TOP, yaw: Math.PI, collide: { r: 0.35, h: 4 } });
    // The stove: a black glass top, four burners, the oven door below.
    deco(k, 24, -23, 11, 9, TOP - 0.05, TOP + 0.03, { flat: { top: 0x24242c, side: 0x24242c } });
    for (const [x, z] of [[21, -25.5], [27, -25.5], [21, -20.5], [27, -20.5]]) k.prop("burner", x, z, { y: TOP + 0.03 });
    deco(k, 24, -17.84, 9, 0.1, 0.6, TOP - 0.8, { flat: { top: 0x3a3a44, side: 0x3a3a44 } });
    deco(k, 24, -17.78, 6, 0.06, 1.4, 3.2, { flat: { top: 0x6a3a2a, side: 0x6a3a2a } });
    k.prop("kettle", 27, -25.5, { y: TOP + 0.03, collide: { r: 1.2, h: 2.6 } });
    // Things standing about on the worktop.
    k.prop("jar", 15, -26.5, { y: TOP, opts: { color: 0xf0a040, seed: 1 }, collide: { r: 0.9, h: 2.4 } });
    k.prop("jar", 13, -26.6, { y: TOP, opts: { color: 0xc04a3a, seed: 2, h: 1.8 }, collide: { r: 0.9, h: 1.8 } });
    k.prop("cuttingBoard", 3, -24.5, { y: TOP, yaw: 0.2 });
    k.prop("breadLoaf", 2.5, -25, { y: TOP + 0.12, yaw: 0.3, collide: { w: 2.4, d: 1.3, h: 1.2 } });
    // The high shelf over the worktop, on brackets, with jars on it.
    k.block(-10, -26.6, 12, 2, SHELF, SHELF + 0.4, WOOD);
    for (const x of [-15, -5]) deco(k, x, -27.7, 0.3, 0.3, SHELF - 1.4, SHELF, { flat: { top: 0x3a3a44, side: 0x3a3a44 } });
    for (const [x, c] of [[-14.5, 0x6ab0d0], [-13, 0xd8b050], [-6.5, 0xb05a8a]]) k.prop("jar", x, -26.8, { y: SHELF + 0.4, opts: { color: c, seed: Math.round(x), h: 1.4, r: 0.55 }, collide: { r: 0.55, h: 1.4 } });
    // Jellies: one at the foot of the counter (up onto it), one on the
    // worktop (up to the shelf).
    k.ringable("jelly", -13, -16.4, { id: "toCounter", boing: 16 });
    k.ringable("jelly", -10, -21.4, { id: "toShelf", boing: 16.5, color: 0x6ad070 });
    // The fridge in the corner, humming.
    k.prop("fridge", -25.5, -23.5, { collide: { w: 12.6, d: 8.6, h: 16 } });
    k.light(-6, TOP + 3, -22, 0xffe8c8, 5, 12);
    k.light(22, TOP + 3.5, -22, 0xffd8a8, 5, 12);
    void rnd;
  },

  // ── West: the pantry, its door stuffed with a soufflé ──
  pantry(k, rnd) {
    const ex = -15;
    k.block(-23.5, -14, 17, 0.6, 0, PANTRY, PLASTER);
    k.block(-23.5, 6, 17, 0.6, 0, PANTRY, PLASTER);
    k.block(ex, -10.05, 0.6, 7.9, 0, PANTRY, PLASTER);
    k.block(ex, 1.35, 0.6, 9.9, 0, PANTRY, PLASTER);
    k.block(ex, -4.8, 0.6, 2.4, 5, PANTRY, PLASTER);
    for (const [x, z, w, d] of [[-23.5, -14, 17.2, 0.8], [-23.5, 6, 17.2, 0.8], [ex, -4, 0.8, 20.8]]) deco(k, x, z, w, d, PANTRY, PANTRY + 0.2, { flat: { top: 0xb07a48, side: 0x8a5a34 } });
    deco(k, -23.5, -4, 16.4, 19.4, -0.2, 0.03, { flat: { top: 0xc8a878, side: 0xa88858 } });
    k.ringable("souffle", ex, -4.8, { id: "door", h: 4.6, r: 1.25, y: 0 });
    // Shelves along the back wall, full of jars; flour sacks in a pile.
    for (const z of [-10, -4, 2]) {
      k.block(-30.6, z, 2.4, 5, 0, 0.4, WOOD);
      for (const y of [2.6, 5]) k.block(-30.6, z, 2.4, 5, y, y + 0.25, WOOD);
      for (let i = 0; i < 3; i++) k.prop("jar", -30.6, z - 1.6 + i * 1.6, { y: 2.85, opts: { color: [0xd8a040, 0xc05040, 0x80a050][(i + z + 99) % 3], seed: i + z * 3, h: 1.4, r: 0.55 } });
    }
    k.block(-29.5, 3, 4, 4, 0, 3, { side: 0xe8dcc0, sideD: 0xc0b498, cap: 0xf4ead4, capD: 0xe0d4b8, bevel: 0.4 });
    k.prop("flourSack", -29.5, 3, { y: 3, opts: { seed: 4 } });
    k.prop("flourSack", -26.6, -12, { opts: { seed: 5 }, collide: { r: 1.1, h: 2.2 } });
    k.ringable("jelly", -25.4, 3.6, { id: "toSacks", boing: 12, color: 0xf0c040 });
    k.light(-23, 6, -4, 0xffd8a0, 5, 12);
    void rnd;
  },

  // ── South-west: the table and its chairs ──
  table(k, rnd) {
    const x0 = -26, x1 = -8, z0 = 10, z1 = 22;
    k.block((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, TABLE, TABLE + 0.6, WOOD);
    for (const [x, z] of [[x0 + 0.6, z0 + 0.6], [x1 - 0.6, z0 + 0.6], [x0 + 0.6, z1 - 0.6], [x1 - 0.6, z1 - 0.6]]) k.block(x, z, 1, 1, 0, TABLE, WOOD);
    // A checked cloth hanging over the edges.
    k.prop("tableCloth", (x0 + x1) / 2, (z0 + z1) / 2, { y: TABLE + 0.6, opts: { w: x1 - x0, d: z1 - z0 } });
    // Chairs: one on the south side (a jelly beside it), one on the west.
    chair(k, -17, 24, 0);
    chair(k, -29.5, 16, Math.PI / 2);
    k.ringable("jelly", -12.2, 24.6, { id: "toSeat", boing: 14.5, color: 0xff7aa8 });
    k.prop("mug", -14, 14, { y: TABLE + 0.6 });
    k.light(-17, 6, 16, 0xffe0b0, 5, 13);
    void rnd;
  },

  // ── Out on the floor: the doormat, a rug for the arena, odds and ends ──
  floorThings(k, rnd) {
    deco(k, 4, 24.5, 5, 3, -0.2, 0.06, { flat: { top: 0x8a5a3a, side: 0x6a4228 } });
    deco(k, 4, 24.5, 4.4, 2.4, -0.2, 0.07, { flat: { top: 0xb88a5a, side: 0x9a6a3a } });
    k.prop("rug", 8, 0, { opts: { r: 9 } });
    k.prop("tomato", 28, 18, { collide: { r: 1.6, h: 2.9 } });
    k.prop("bucket", 29, -13, { collide: { r: 1.3, h: 2.2 } });
    k.prop("spoon", 26, 23, { yaw: 0.6, collide: { w: 1.4, d: 8, h: 0.6 } });
    k.prop("pea", -2, 26, {});
    k.prop("pea", 18, 26.5, {});
    k.prop("pea", -30, 24, {});
    k.light(4, 4, 22, 0xffd08a, 5, 10);
    k.light(8, 7, 0, 0xffe8c8, 6, 20);
    void rnd;
  },
};

// Drawn, not solid (tiles, doors, trims).
function deco(k, x, z, w, d, y0, y1, look) { k.draw.push({ kind: "block", x, z, w, d, y0, y1, yaw: 0, look }); }

// A giant chair: a seat on four legs and a tall back, facing yaw (its
// back away from the table).
function chair(k, x, z, yaw) {
  const sn = Math.sin(yaw), cs = Math.cos(yaw), at = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  const SEATW = 5;
  k.block(x, z, SEATW, SEATW, SEAT - 0.4, SEAT, WOOD);
  for (const [lx, lz] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) { const [px, pz] = at(lx, lz); k.block(px, pz, 0.6, 0.6, 0, SEAT - 0.4, WOOD); }
  const [bx, bz] = at(0, 2.2);
  k.block(bx, bz, Math.abs(cs) > 0.5 ? SEATW : 0.5, Math.abs(cs) > 0.5 ? 0.5 : SEATW, SEAT, SEAT + 5.5, WOOD);
  // A cushion.
  deco(k, x, z, SEATW - 0.8, SEATW - 0.8, SEAT - 0.1, SEAT + 0.12, { flat: { top: 0xd84a5a, side: 0xa83a48 } });
}
