import { rng } from "../rng.js";

// ── Ethan's school (chapter 2) ───────────────────────────────────────────
// The night before a maths test, and the school will not let him out:
// its corridor goes round and round. The school floats in a dusky sky,
// no roof over the halls. You land on the front steps by the bus; inside,
// the corridor runs in a square round the gym (where the Red Pen will
// come up through the floor). Off it: the classroom to the west, the
// library to the east, the stairwell up to the roof and its bell tower to
// the north. The three anchors are at the teacher's end of the classroom,
// in the library's reading corner and by the bell on the roof.
//
// The Foam Cannon comes after the first anchor: lockers, shelves and the
// bus roof hide memories that only foam steps reach.

const WALL = { side: 0xd8ccb4, sideD: 0xb8a888, bevel: 0.03 };
const TRIM = { flat: { top: 0x2f6f9a, side: 0x2f6f9a } };
const FLOOR = { cap: 0xcfc6b4, capD: 0xb8ae9a, side: 0x8a8070, sideD: 0x5a5248 };
const CONCRETE = { side: 0x9a9286, sideD: 0x5e5850 };
const H = 3.2;            // wall height

export const school = {
  id: "school",
  killY: -25,
  calm: 10,
  song: "school",
  lamps: 4,
  unlockTool: { id: "foam", anchors: 1 },
  boss: { kind: "pen", x: 0, z: 2, arena: { minX: -15, maxX: 15, minZ: -10.5, maxZ: 15.5 } },
  skins: {},
  // [id, x, z, y]: on the lockers, on the teacher's desk, on a bookshelf,
  // on the top row of the bleachers, on the bus roof.
  memories: [["goldstar", -14, -23.55, 2.06], ["lunchnote", -42.6, 6.4, 0.82], ["dragon", 33, -5.5, 3.0], ["hamster", -13.5, -16.35, 1.5], ["luckypencil", -9, 31.5, 2.75]],
  sky: { top: 0x4a5fc0, horizon: 0xffc8a0, bottom: 0xc8a0d8, sunDir: [0.5, 0.3, -0.8], sunGlow: 0xffd8a8 },
  fog: { color: 0xe8c4c0, near: 90, far: 300 },
  sun: { color: 0xffe0c8, intensity: 2.3, dir: [0.45, 0.8, -0.5], sky: 0xb8c4f0, ground: 0x6a5a4a, hemi: 0.9 },
  gloom: { top: 0x24264a, horizon: 0x6a6488, bottom: 0x3e3a5e, sunGlow: 0x7a7098, fog: 0x625e7c, sun: 1.2, hemi: 0.6 },
  clouds: { count: 30, rMin: 16, rMax: 80, yMin: -22, yMax: 34 },
  shards: 80,

  // Waves by how far along you are: pencils and planes first, then the
  // backpack, the last one with a sharpener.
  tiers: [
    [[0, ["pencil", 2]], [0.35, ["plane", 2]], [0.65, ["pencil", 2], ["plane", 1]]],
    [[0, ["plane", 2], ["pencil", 2]], [0.3, ["backpack", 1]], [0.55, ["pencil", 3]], [0.8, ["plane", 2], ["pencil", 1]]],
    [[0, ["plane", 2], ["pencil", 2]], [0.3, ["sharpener", 1]], [0.55, ["backpack", 1], ["plane", 2]], [0.8, ["pencil", 3], ["plane", 1]]],
  ],

  // Routes for the headless bot, from the front steps.
  botRoutes: {
    classroom: [[0, 27], [0, 21], [-21, 21], [-21, 0], [-27, 0], [-35.4, 0]],
    library: [[0, 27], [0, 21], [21, 21], [21, 0], [27, 0], [39.4, 0]],
    roof: [[0, 27], [0, 21], [21, 21], [21, -21], [0, -21], [0, -25.2], [0, -34], [0, -41.4]],
  },

  build(k) {
    const rnd = rng(11);
    this.halls(k);
    this.gym(k, rnd);
    this.classroom(k, rnd);
    this.library(k, rnd);
    this.roof(k, rnd);
    this.front(k, rnd);

    // ── Anchors ──
    k.anchor("classroom", -37, 0, { duration: 24, spawns: [[-30, -7], [-44, -7], [-44, 7.5], [-30, 7.5]] });
    k.anchor("library", 41, 0, { duration: 26, spawns: [[36.5, -8.5], [44.5, -8.5], [44.5, 8.5], [36.5, 8.5]] });
    k.anchor("roof", 0, -43, { duration: 28, spawns: [[-9, -37], [9, -37], [9, -47.5], [-9, -47.5]] });

    // Glitches already loose, a kind at a time: pencils in the south hall,
    // planes in the east and west halls, a backpack in the library,
    // planes on the roof.
    for (const [kind, x, z] of [
      ["pencil", -12, 21], ["pencil", -14, 21.5], ["pencil", 13, 20.8],
      ["plane", 21, -10], ["plane", -21, -12], ["plane", -21, 10],
      ["pencil", -32, -6], ["pencil", -33, 5],
      ["backpack", 36, 7.5], ["pencil", 30, 9],
      ["plane", -6, -44], ["plane", 6, -40], ["pencil", 5, -46],
    ]) k.foe(kind, x, z);

    k.start(0, 33, 0);
  },

  // ── The corridor: a square round the gym, lockers along its walls ──
  halls(k) {
    k.block(0, 0, 48.4, 48.4, -1.5, 0, FLOOR);
    // Foundations hanging under the school.
    k.block(0, 0, 44, 44, -4.5, -1.5, CONCRETE);
    k.block(1, -1, 30, 30, -8, -4.5, { side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(-1, 1, 14, 12, -12, -8, { side: 0x6e4c36, sideD: 0x3e2a1e });
    // Hall floor: a lino ribbon all the way round.
    for (const [x, z, w, d] of [[0, -21, 48, 6], [0, 21, 48, 6], [-21, 0, 6, 36], [21, 0, 6, 36]]) k.block(x, z, w, d, -0.2, 0.02, { flat: { top: 0xb8c8c8, side: 0x98a8a8 } });
    // Outer walls, a door in the middle of each side.
    wallRing(k, 24, 1.6, true);
    // The gym's walls: doors north and south only.
    for (const s of [-1, 1]) {
      k.block(-9.9, s * 18, 16.6, 0.4, 0, H, WALL);
      k.block(9.9, s * 18, 16.6, 0.4, 0, H, WALL);
      k.block(s * 18, 0, 0.4, 36.4, 0, H, WALL);
      for (const x of [-9.9, 9.9]) k.block(x, s * 18, 16.6, 0.5, H, H + 0.12, TRIM);
      k.block(s * 18, 0, 0.5, 36.4, H, H + 0.12, TRIM);
    }
    // Lockers along the outer walls (on the hall side).
    for (const [x, z, n, yaw] of [
      [-13, -23.55, 26, 0], [13, -23.55, 26, 0], [-13, 23.55, 26, Math.PI], [13, 23.55, 26, Math.PI],
      [-23.55, -13, 26, Math.PI / 2], [-23.55, 13, 26, Math.PI / 2], [23.55, -13, 26, -Math.PI / 2], [23.55, 13, 26, -Math.PI / 2],
    ]) k.prop("lockers", x, z, { yaw: yaw + Math.PI, opts: { n, seed: Math.round(x + z * 3), h: 2.06 }, collide: { w: n * 0.6, d: 0.5, h: 2.06 } });
    // Fountains, a trophy shelf, clocks on the gym walls.
    k.prop("fountain", -18.2, 9, { yaw: Math.PI / 2, collide: { w: 0.6, d: 0.5, h: 1.1 } });
    k.prop("fountain", 18.2, -9, { yaw: -Math.PI / 2, collide: { w: 0.6, d: 0.5, h: 1.1 } });
    for (const [x, z, yaw] of [[0, -18.25, 0], [-18.25, -6, Math.PI / 2], [18.25, 6, -Math.PI / 2], [6, 18.25, Math.PI]]) k.prop("wallClock", x, z, { y: 2.55, yaw });
    for (const [x, z] of [[-21, -21], [21, -21], [-21, 21], [21, 21]]) {
      k.prop("hangLamp", x, z, { y: 4.4, opts: { cord: 0.8 } });
      k.light(x, 3.4, z, 0xffe0b0, 5, 11);
    }
  },

  // ── The gym: the Red Pen's arena ──
  gym(k, rnd) {
    k.block(0, 0, 35.6, 35.6, -0.2, 0.03, { flat: { top: 0xd8a868, side: 0xb88848 } });
    // Court lines: the halfway line, a circle's worth of short strips, the keys.
    const LINE = { flat: { top: 0xf7f2e6, side: 0xf7f2e6 } };
    k.block(0, 0, 0.12, 26, -0.2, 0.045, LINE);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.block(Math.cos(a) * 3, Math.sin(a) * 3, 0.12, 1.2, -0.2, 0.045, LINE, -a); }
    for (const s of [-1, 1]) {
      k.block(s * 13.5, 0, 5, 0.12, -0.2, 0.045, LINE);
      k.block(s * 11, -2.4, 0.12, 4.8, -0.2, 0.045, LINE); k.block(s * 11, 2.4, 0.12, 4.8, -0.2, 0.045, LINE);
      k.block(s * 13.5, -2.4, 5, 0.12, -0.2, 0.045, LINE); k.block(s * 13.5, 2.4, 5, 0.12, -0.2, 0.045, LINE);
      k.prop("hoop", s * 17.75, 0, { yaw: s > 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
    // Bleachers along the north wall, either side of the door.
    for (const x of [-9, 9]) k.stairs(x, -12.6, 11, 3, 0.5, 1.5, 0, { side: 0x8a5a3a, sideD: 0x5a3a24, cap: 0xb07a4a, capD: 0x8a5a3a, bevel: 0.04 }, 0);
    // A pile of mats, a ball cart.
    k.block(13, 15, 3, 2, 0, 0.5, { side: 0x3a7fae, sideD: 0x2a5a80, cap: 0x4a90c0, bevel: 0.1 });
    k.block(13.3, 15.1, 2.6, 1.8, 0.5, 0.9, { side: 0xd84a48, sideD: 0xa03a38, cap: 0xe85a58, bevel: 0.1 });
    k.light(0, 5, 0, 0xfff0d8, 6, 22);
    void rnd;
  },

  // ── West: the classroom ──
  classroom(k, rnd) {
    k.block(-35.2, 0, 22, 20.4, -1.5, 0, FLOOR);
    k.block(-35.2, 0, 19, 17, -4, -1.5, CONCRETE);
    k.block(-35.2, 0, 21.6, 20, -0.2, 0.02, { flat: { top: 0xc89870, side: 0xa87850 } });
    for (const s of [-1, 1]) {
      k.block(-35.1, s * 10, 22.2, 0.4, 0, H, WALL);
      k.block(-35.1, s * 10, 22.4, 0.5, H, H + 0.12, TRIM);
    }
    k.block(-46.2, 0, 0.4, 20.4, 0, H, WALL);
    k.block(-46.2, 0, 0.5, 20.6, H, H + 0.12, TRIM);
    k.prop("chalkboard", -45.95, 0, { yaw: -Math.PI / 2, opts: { w: 6 } });
    k.prop("wallClock", -35, -9.75, { y: 2.6, yaw: Math.PI });
    k.prop("teacherDesk", -42.6, 6.4, { yaw: Math.PI / 2, collide: { w: 1.8, d: 0.9, h: 0.82 } });
    for (const x of [-43, -40, -33, -30]) for (const z of [-6, -2.5, 2.5, 6]) {
      if (x === -43 && z === 6) continue;
      k.prop("schoolDesk", x, z, { yaw: Math.PI / 2, opts: { seed: Math.round(x * 7 + z) }, collide: { w: 1.0, d: 0.6, h: 0.78 } });
    }
    k.light(-37, 3.8, 0, 0xffe8c8, 5, 12);
    void rnd;
  },

  // ── East: the library ──
  library(k, rnd) {
    k.block(35.2, 0, 22, 22.4, -1.5, 0, FLOOR);
    k.block(35.2, 0, 19, 19, -4, -1.5, CONCRETE);
    k.block(35.2, 0, 21.6, 22, -0.2, 0.02, { flat: { top: 0x7a4a5a, side: 0x5a3440 } });
    for (const s of [-1, 1]) {
      k.block(35.1, s * 11, 22.2, 0.4, 0, H + 0.6, WALL);
      k.block(35.1, s * 11, 22.4, 0.5, H + 0.6, H + 0.72, TRIM);
    }
    k.block(46.2, 0, 0.4, 22.4, 0, H + 0.6, WALL);
    k.block(46.2, 0, 0.5, 22.6, H + 0.6, H + 0.72, TRIM);
    // Shelves in rows, an aisle down the middle.
    for (const x of [29.5, 33]) for (const z of [-5.5, 5.5]) k.prop("bookshelf", x, z, { yaw: Math.PI / 2, opts: { seed: Math.round(x + z * 5), w: 4 }, collide: { w: 4, d: 0.8, h: 3.0 } });
    for (const z of [-9.7, 9.7]) k.prop("bookshelf", 41, z, { opts: { seed: Math.round(z + 40), w: 8 }, collide: { w: 8, d: 0.8, h: 3.0 } });
    for (const z of [-5.5, 5.5]) k.prop("readingTable", 41.5, z, { collide: { w: 2.4, d: 1.2, h: 0.82 } });
    k.light(41, 3.8, 0, 0xffe0b0, 5, 12);
    void rnd;
  },

  // ── North: the stairwell and the roof with the bell ──
  roof(k, rnd) {
    k.stairs(0, -24.4, 3.6, 15, 0.3, 0.6, 0, { ...FLOOR, bevel: 0.03 }, 0);
    for (const s of [-1, 1]) k.block(s * 2.1, -29.4, 0.4, 9.6, 0, 5.4, WALL);
    k.block(0, -41.5, 24, 16, 2.5, 4.5, { cap: 0x9a9a94, capD: 0x7a7a74, side: 0xc8bca4, sideD: 0x988c74 });
    k.block(0, -41.5, 20, 12, -0.5, 2.5, CONCRETE);
    k.block(0, -42, 10, 8, -4, -0.5, { side: 0x7e5a40, sideD: 0x4a3222 });
    // A parapet all round, open only where the stairs come up.
    k.block(0, -49.3, 24, 0.4, 4.5, 5.5, WALL);
    for (const s of [-1, 1]) k.block(s * 11.8, -42, 0.4, 15, 4.5, 5.5, WALL);
    for (const s of [-1, 1]) k.block(s * 6.95, -33.7, 10.1, 0.4, 4.5, 5.5, WALL);
    k.prop("bellTower", 0, -47, { y: 4.5, collide: { w: 2.4, d: 2.4, h: 0.3 } });
    for (const s of [-1, 1]) for (const z of [-1, 1]) k.world.box({ x: s, z: -47 + z, y0: 4.5, y1: 7.6, hx: 0.13, hz: 0.13 });
    for (const [x, z, seed] of [[-8, -45, 1], [8, -38, 2], [-8.2, -38.5, 3]]) k.prop("acUnit", x, z, { y: 4.5, opts: { seed }, collide: { w: 1.6, d: 1.2, h: 1.1 } });
    k.light(0, 7, -43, 0xffd8a0, 5, 12);
    void rnd;
  },

  // ── South: the front steps, the bus and the flag ──
  front(k, rnd) {
    k.block(0, 30.1, 48.4, 11.8, -1.5, 0, { cap: 0x9a9a94, capD: 0x82827c, side: 0x8a8278, sideD: 0x5e5850, lip: true });
    k.block(0, 30, 44, 10, -4, -1.5, CONCRETE);
    k.block(-1, 30, 16, 7, -7.5, -4, { side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(0, 26.5, 5, 4.4, -0.2, 0.02, { flat: { top: 0xb8b0a0, side: 0x9a9282 } });
    k.prop("bus", -9, 31.5);
    k.world.box({ x: -9.2, z: 31.5, y0: 0, y1: 2.75, hx: 5.4, hz: 1.28 });
    k.prop("flagpole", 7, 31, { collide: { r: 0.3, h: 7 } });
    for (const [x, z, s] of [[12, 27, 1], [13.5, 34, 0.9], [-18, 27, 1.1], [4, 34.5, 0.8], [21, 33, 1.2], [-21, 34, 1]]) k.prop("bush", x, z, { opts: { seed: Math.round(x * z), s }, collide: { r: 0.5 * s, h: 0.85 * s } });
    k.prop("bench", 10, 29, { yaw: -Math.PI / 2, collide: { w: 1.9, d: 0.6, h: 0.9 } });
    k.prop("sign", 3.5, 25.5, { opts: { color: 0x3a7fae }, collide: { r: 0.12, h: 1.75 } });
    for (const [x, z] of [[-3.5, 25.2], [3.5, 25.2]]) { k.prop("lamp", x, z + 1.4, { collide: { r: 0.2, h: 3.4 } }); k.light(x, 3.2, z + 1.4, 0xffd08a, 5, 10); }
    void rnd;
  },
};

// The square of outer walls at ±r, a door of half-width `door` in the
// middle of each side, a coloured trim along the top.
function wallRing(k, r, door) {
  const seg = r - door, mid = (r + door) / 2;
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    k.block(t * mid, s * r, seg + 0.4, 0.4, 0, H, WALL);
    k.block(s * r, t * mid, 0.4, seg + 0.4, 0, H, WALL);
    k.block(t * mid, s * r, seg + 0.4, 0.5, H, H + 0.12, TRIM);
    k.block(s * r, t * mid, 0.5, seg + 0.4, H, H + 0.12, TRIM);
  }
}
