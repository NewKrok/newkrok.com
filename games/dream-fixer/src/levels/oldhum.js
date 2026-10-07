import { rng } from "../rng.js";

// ── Old Hum's dream (chapter 6, the finale) ──────────────────────────────
// The Factory's great old machine has not slept in a hundred years, and
// the glitches of the whole week leaked out of him. You climb in through
// a service hatch. Inside it is warm and dark, brass and copper, gears as
// big as rooms turning slowly, and floating in it the pieces of every
// dream the week sent through him: you walk from one to the next.
//
//  South: the hatch you climb in through, a landing and a catwalk.
//  The works in the middle: a round floor with a great gear turning in
//  it, dream columns round it, three locks out of it. Off its south-east
//  corner a stack of boxes 2.8 m up, and past it, higher still, a deck of
//  Sophie's station (a memory: a sand ramp, then another).
//  West, through the first lock: Biscuit's park, and stood up on its
//  north edge Ethan's school corridor, 2.8 m up (the first anchor in the
//  park, the second up in the corridor: a sand ramp).
//  East, through the second lock and across a gap: Rosie's kitchen (the
//  third anchor). North-east of it, 3 m down across a gap: Joe's garden,
//  with stairs back up to the works.
//  North, through the last lock: Old Hum's heart.
//
// Cog knows his way round in here: he opens the locks as you come up to
// them (the east one once an anchor holds, the heart's once all three
// do). The Dream Sand sack comes down after the first anchor.

const BRASS = { top: 0xc8964a, side: 0x8f6424, sideD: 0x4a3010, bevel: 0.08 };
const PLATE = { top: 0x9a7a52, side: 0x6a4a2a, sideD: 0x2a1a0e, bevel: 0.06 };
const IRON = { side: 0x3a3f47, sideD: 0x1a1c22 };
const RAIL = { top: 0xe0b860, side: 0xa07a30, bevel: 0.03 };
const GRASS = { top: 0x6ab04a, side: 0x7a5a3a, sideD: 0x3a2a1a, bevel: 0.12 };
const SCHOOL = { top: 0xd8d0b8, side: 0xc8b890, sideD: 0x6a5a40, bevel: 0.06 };
const TILE = { top: 0xeee6d6, side: 0xc8c0b0, sideD: 0x5a5448, bevel: 0.06 };
const COUNTER = { top: 0xb08a5a, side: 0xf2ece0, sideD: 0x8a8478, bevel: 0.06 };
const SOIL = { top: 0x7aa04a, side: 0x6a4a2a, sideD: 0x2a1a10, bevel: 0.12 };
const DECK = { top: 0xd8dde6, side: 0x8a96b0, sideD: 0x3c4560, bevel: 0.1 };

export const oldhum = {
  id: "oldhum",
  walkIn: true,           // no drop from the sky: you climbed in through the hatch
  killY: -30,
  calm: 9,
  song: "factory",
  lamps: 5,
  unlockTool: { id: "sand", anchors: 1 },
  skins: { fuzz: "koc", buzzer: "buzzer", knot: "knot", bunny: "bunny", tub: "tub" },
  // [id, x, z, y]: in the park's grass, up in the school corridor, on the
  // giant mug in the kitchen, by the roses in the garden, on the station deck.
  memories: [["blueprint", -36, 5, 0], ["firstdream", -35, -18, 2.8], ["chippedmug", 35, -4.5, 2.2], ["musicroll", 38, -23, -3], ["socket", 9, 19, 5]],
  sky: { top: 0x140a06, horizon: 0x5a3418, bottom: 0x100804, sunDir: [0.3, 0.5, -0.8], sunGlow: 0xffa860 },
  fog: { color: 0x2a1a10, near: 60, far: 240 },
  sun: { color: 0xffd8a8, intensity: 1.9, dir: [0.3, 0.85, -0.4], sky: 0xffc890, ground: 0x4a2a18, hemi: 1.1 },
  gloom: { top: 0x10081a, horizon: 0x3a1a3a, bottom: 0x0c0610, sunGlow: 0x8a5a9a, fog: 0x1e1222, sun: 1.2, hemi: 0.7 },
  clouds: { model: "gearBit", count: 26, rMin: 20, rMax: 80, yMin: -30, yMax: 35 },
  shards: 70,

  // Waves by how far along you are: the whole week's glitches, mixed.
  tiers: [
    [[0, ["fuzz", 3]], [0.35, ["pencil", 2]], [0.65, ["meatball", 2], ["buzzer", 1]]],
    [[0, ["gnome", 2], ["clock", 1]], [0.3, ["backpack", 1]], [0.55, ["robot", 3]], [0.8, ["pepper", 2], ["fuzz", 3]]],
    [[0, ["rocket", 2], ["meatball", 2]], [0.3, ["rollingpin", 1], ["can", 1]], [0.55, ["slinger", 2], ["bunny", 3]], [0.8, ["top", 1], ["pencil", 2], ["robot", 2]]],
  ],

  // Routes for the headless bot, from the landing. ("sand", x, z, pitch):
  // face (x, z), tip the view to `pitch` and pour a sand path.
  botRoutes: {
    park: [[0, 20], [0, 4], [-10, 0], ["gate", "west"], [-18, 0], [-26, 0], [-30, 1]],
    school: [[0, 20], [0, 4], [-10, 0], ["gate", "west"], [-18, 0], [-26, 0], [-30, -1], ["sand", -30, -10, 0.5], [-30, -9], [-30, -12], [-30, -15]],
    kitchen: [[0, 20], [0, 4], [10, 0], ["gate", "east"], [19.4, 0], ["sand", 30, 0, -0.05], [26, 0], [30, 0], [34, 1]],
  },
  botBack: {
    park: [[-26, 0], [-18, 0], [-10, 0], [0, 4]],
    school: [[-30, -10], [-30, -3], [-26, 0], [-18, 0], [-10, 0], [0, 4]],
    kitchen: [[28, 0], [26.4, 0], ["sand", 15, 0, -0.05], [19, 0], [10, 0], [0, 4]],
  },

  build(k) {
    const rnd = rng(61);
    this.entry(k);
    this.works(k, rnd);
    this.parkPiece(k, rnd);
    this.schoolPiece(k);
    this.kitchenPiece(k);
    this.gardenPiece(k, rnd);
    this.stationPiece(k, rnd);
    this.heart(k);
    this.machinery(k);

    // ── Anchors ──
    k.anchor("park", -30, 1, { duration: 24, ring: 5, spawns: [[-36, -5], [-24, -5], [-36, 6], [-24, 6]] });
    k.anchor("school", -30, -15, { y: 2.8, duration: 26, ring: 4.4, spawns: [[-35, -18], [-25, -18], [-25, -11], [-35, -11]] });
    k.anchor("kitchen", 34, 1, { duration: 28, ring: 5.5, spawns: [[28, -5], [40, -5], [40, 5], [28, 5]] });

    // Glitches already loose, each in its own dream's piece: a couple of
    // Sophie's toys in the works, Biscuit's squirrels and bunnies in the
    // park, Ethan's pencils and a clock in the corridor, Rosie's food in
    // the kitchen, Joe's gnomes and a can in the garden.
    for (const [kind, x, z] of [
      ["robot", -6, -6], ["robot", 6, -8], ["rocket", 0, -10],
      ["fuzz", -33, -3], ["fuzz", -27, 4], ["fuzz", -35, 3], ["bunny", -25, -4], ["bunny", -28, 6], ["buzzer", -32, 0],
      ["pencil", -33, -16], ["pencil", -27, -17], ["clock", -30, -19],
      ["meatball", 31, -3], ["meatball", 38, 4], ["pepper", 36, -2], ["rollingpin", 39, 0],
      ["gnome", 31, -18], ["gnome", 36, -22], ["slinger", 39, -19], ["can", 33, -24],
    ]) k.foe(kind, x, z);

    k.start(0, 36, 0);
  },

  // ── South: the hatch, the landing, the catwalk to the works ──
  entry(k) {
    k.block(0, 36, 10, 8, -0.8, 0, PLATE);
    k.block(0, 36, 7, 5, -3, -0.8, IRON);
    // The hatch you climbed in through (shut behind you), a lamp over it.
    k.prop("hatch", 0, 39.8, { collide: { w: 4, d: 0.6, h: 3.4 } });
    k.block(0, 40.2, 10, 0.4, -0.8, 5, BRASS);
    k.light(0, 3.5, 38, 0xffc070, 6, 10);
    // The catwalk, railings both sides.
    k.block(0, 23, 3, 18, -0.6, 0, PLATE);
    for (const x of [-1.6, 1.6]) {
      k.block(x, 23, 0.12, 18, 0, 1.05, RAIL);
      for (let z = 15; z <= 31; z += 4) k.block(x, z, 0.16, 0.16, -0.6, 1.05, IRON);
    }
  },

  // ── The works: the round floor in the middle ──
  works(k, rnd) {
    k.block(0, 0, 28, 28, -1, 0, BRASS);
    k.block(0, 0, 22, 22, -4, -1, IRON);
    k.block(0, 0, 10, 10, -9, -4, IRON);
    // A railing round its edge, open at the catwalks and the north-east landing.
    for (const [x, z, w, d] of [[-8, -14, 12, 0.12], [8, -14, 12, 0.12], [-7.75, 14, 12.5, 0.12], [7.75, 14, 12.5, 0.12], [-14, -8, 0.12, 12], [-14, 8, 0.12, 12], [14, -6.5, 0.12, 9], [14, 8, 0.12, 12]]) k.block(x, z, w, d, 0, 1.05, RAIL);
    // The great gear in the floor, turning (you can stand on it).
    k.spinner("gear", 0, 0, { opts: { r: 5, th: 0.25, seed: 3 }, speed: 0.12 });
    k.world.cyl({ x: 0, z: 0, r: 5.3, y0: -0.2, y1: 0.25 });
    // Dream columns round it; pipes up out of the floor.
    for (const [x, z, color, seed] of [[-11, -11, 0x7ff5e0, 1], [11, -11, 0xff8fd0, 2], [-11, 11, 0xffd27a, 3]]) k.prop("dreamColumn", x, z, { opts: { h: 5 + rnd() * 2, color, seed }, collide: { r: 0.95, h: 7 } });
    for (const [x, z] of [[-13, -4], [13, 5], [-4, 13]]) k.prop("pipe", 0, 0, { opts: { a: [x, 0, z], d: [0, 9, 0], r: 0.3 } });
    // Off the south-east corner: a stack of crates 2.8 m up (a sand ramp gets you up).
    k.block(9, 6, 6, 6, 0, 2.8, PLATE);
    for (const [x, z, s] of [[7.5, 4.5, 1], [10.5, 7.6, 0.8]]) k.prop("crate", x, z, { y: 2.8, opts: { seed: x * 7, s }, collide: { w: 0.8 * s, d: 0.8 * s, h: 0.8 * s } });
    k.light(0, 5, 0, 0xffb060, 8, 20);
    k.light(9, 5, 6, 0xffc890, 3, 8);
  },

  // ── West: Biscuit's park, through the first lock ──
  parkPiece(k, rnd) {
    k.gate("west", -14.6, 0, { yaw: Math.PI / 2, w: 4 });
    k.block(-18, 0, 8, 3, -0.6, 0, PLATE);
    for (const z of [-1.6, 1.6]) k.block(-18, z, 8, 0.12, 0, 1.05, RAIL);
    k.block(-30, 0, 16, 16, -1.2, 0, GRASS);
    k.block(-30, 0, 12, 12, -4, -1.2, { side: 0x6a4a2a, sideD: 0x2a1a10 });
    k.prop("tree", -35, -4, { opts: { seed: 21, h: 4.4 }, collide: { r: 0.45, h: 4 } });
    k.prop("tree", -24, 6, { opts: { seed: 22, h: 3.8 }, collide: { r: 0.4, h: 3.5 } });
    k.prop("doghouse", -25, -5, { yaw: -0.4, collide: { w: 2.1, d: 1.9, h: 2.2 } });
    k.prop("bench", -36, 1, { yaw: Math.PI / 2, collide: { w: 1.9, d: 0.6, h: 0.9 } });
    k.prop("lamp", -23, 2, { collide: { r: 0.12, h: 3 } });
    for (let i = 0; i < 5; i++) k.prop("flowers", -37 + rnd() * 14, -6 + rnd() * 13, { opts: { seed: i + 3 } });
    k.prop("tennisBall", -27, 3);
    k.light(-30, 4, 0, 0xffe8b0, 5, 13);
  },

  // ── North of the park: Ethan's corridor, 2.8 m up ──
  schoolPiece(k) {
    k.block(-30, -14, 14, 12, -1, 2.8, SCHOOL);
    // Lockers along its back and west edges, a desk or two.
    k.prop("lockers", -30, -19.6, { opts: { n: 12, seed: 4, h: 2.06 }, y: 2.8, collide: { w: 7.2, d: 0.5, h: 2.06 } });
    k.prop("lockers", -36.6, -14, { yaw: Math.PI / 2, opts: { n: 6, seed: 5, h: 2.06 }, y: 2.8, collide: { w: 3.6, d: 0.5, h: 2.06 } });
    k.prop("schoolDesk", -25, -16, { y: 2.8, yaw: 0.3, opts: { seed: 2 }, collide: { w: 1, d: 0.6, h: 0.75 } });
    k.prop("schoolDesk", -26.5, -12, { y: 2.8, yaw: -0.2, opts: { seed: 3 }, collide: { w: 1, d: 0.6, h: 0.75 } });
    k.prop("wallClock", -30, -19.3, { y: 5.4 });
    k.light(-30, 6, -14, 0xfff0d0, 4, 11);
  },

  // ── East: Rosie's kitchen, through the second lock and over a gap ──
  kitchenPiece(k) {
    k.gate("east", 14.6, 0, { yaw: Math.PI / 2, w: 4, after: 1 });
    k.block(17, 0, 6, 3, -0.6, 0, PLATE);
    for (const z of [-1.6, 1.6]) k.block(17, z, 6, 0.12, 0, 1.05, RAIL);
    // The catwalk breaks off here: a snapped belt hangs into the dark.
    k.block(20.4, 0, 0.8, 3, -0.6, 0, IRON);
    k.block(34, 0, 16, 14, -1, 0, TILE);
    k.block(34, 0, 12, 10, -4, -1, { side: 0xb8b0a0, sideD: 0x4a4440 });
    // The counter along its east edge, a giant mug, a jar, the kettle.
    k.block(41, 0, 2, 12, 0, 1.6, COUNTER);
    k.prop("mug", 35, -4.5, { collide: { r: 1, h: 2.2 } });
    k.prop("jar", 29, 4.5, { opts: { color: 0xf0a040, seed: 1, h: 1.8, r: 0.7 }, collide: { r: 0.7, h: 1.8 } });
    k.prop("kettle", 41, -3.5, { y: 1.6, s: 0.6, collide: { r: 0.75, h: 1.4 } });
    k.prop("breadLoaf", 41, 3, { y: 1.6, s: 0.5 });
    k.light(34, 4, 0, 0xfff0d8, 5, 13);
  },

  // ── North-east, 3 m down: Joe's garden, stairs back up to the works ──
  gardenPiece(k, rnd) {
    k.block(34, -20, 14, 12, -4, -3, SOIL);
    k.block(34, -20, 10, 8, -7, -4, { side: 0x6a4a2a, sideD: 0x2a1a10 });
    k.prop("raisedBed", 31, -23, { y: -3, opts: { seed: 7 }, collide: { w: 4, d: 2.4, h: 0.4 } });
    k.prop("raisedBed", 36, -17, { y: -3, yaw: 0.2, opts: { seed: 8 }, collide: { w: 4, d: 2.4, h: 0.4 } });
    for (const [x, z, seed] of [[39, -24, 1], [37.5, -24.5, 2], [39.5, -21.5, 3]]) k.prop("roseBush", x, z, { y: -3, opts: { seed }, collide: { r: 0.6, h: 1 } });
    k.prop("flowerPot", 29, -16, { y: -3, opts: { seed: 2 } });
    void rnd;
    // Stairs up its west side to a landing off the works' north-east corner.
    k.stairs(27, -16.5, 2.4, 10, 0.3, 0.6, -3, PLATE, Math.PI / 2);
    k.block(17.5, -15.5, 7, 7, -0.6, 0, PLATE);
    k.light(34, 0, -20, 0xffe0a0, 4, 12);
  },

  // ── South-east, high up: a deck of Sophie's station ──
  stationPiece(k, rnd) {
    k.block(9, 18, 6, 6, 3.9, 5, DECK);
    k.block(9, 18, 4.5, 4.5, 2.5, 3.9, { side: 0x5a6688, sideD: 0x262c44 });
    k.prop("console", 11.2, 19.5, { y: 5, yaw: -Math.PI / 2, collide: { w: 1.8, d: 0.8, h: 1.2 } });
    k.prop("spaceLamp", 6.6, 20.4, { y: 5, collide: { r: 0.18, h: 3.4 } });
    for (let i = 0; i < 5; i++) k.prop("glowStar", 6 + rnd() * 6, 15 + rnd() * 6, { y: 7.5 + rnd() * 2, opts: { seed: i + 1 } });
    k.light(9, 7, 18, 0xc8d8ff, 4, 9);
  },

  // ── North: the last lock, and Old Hum's heart ──
  heart(k) {
    k.gate("heart", 0, -14.6, { w: 4, after: 3 });
    k.block(0, -19.5, 4, 10, -0.6, 0, PLATE);
    for (const x of [-2.1, 2.1]) k.block(x, -19.5, 0.12, 10, 0, 1.05, RAIL);
    k.block(0, -37, 26, 24, -1, 0, BRASS);
    k.block(0, -37, 20, 18, -5, -1, IRON);
    k.spinner("gear", 0, -37, { opts: { r: 7, th: 0.2, seed: 9, c: 0xc0683a }, speed: -0.06 });
    k.world.cyl({ x: 0, z: -37, r: 7.4, y0: -0.2, y1: 0.2 });
    k.light(0, 7, -37, 0xff9a70, 8, 24);
  },

  // Far off all round: the walls of the works, gears standing on edge.
  machinery(k) {
    for (const [x, y, z, r, yaw, speed, c] of [
      [-52, 4, -26, 12, 0.6, 0.05, 0xd4a24a], [55, -2, -38, 9, -0.7, -0.07, 0xc0683a],
      [4, -6, -72, 16, 0, 0.03, 0xd4a24a], [-48, -8, 34, 10, -0.9, -0.05, 0xc0683a], [50, 6, 30, 8, 0.8, 0.08, 0xd4a24a],
    ]) k.spinner("gear", x, z, { y, yaw, rx: Math.PI / 2, opts: { r, th: 1.2, seed: Math.round(r), c }, speed });
    // Long pipes running between the pieces, overhead.
    k.prop("pipe", 0, 0, { opts: { a: [-30, 9, 0], d: [64, 0, 0], r: 0.35 } });
    k.prop("pipe", 0, 0, { opts: { a: [-30, 9, 0], d: [0, -12, 0], r: 0.35 } });
    k.prop("pipe", 0, 0, { opts: { a: [34, 9, 0], d: [0, -12, -20], r: 0.35 } });
  },
};
