import { rng } from "../rng.js";

// ── Grandpa Joe's garden (chapter 4) ─────────────────────────────────────
// Joe was the station master at the old Millbrook station. Tomorrow he
// moves out of the house whose garden he and May kept for fifty years,
// and in his dream the garden has broken into islands drifting apart in
// a pink dawn sky. You come in on the garden path at the south end of
// the big garden island (vegetable beds, the shed, roses).
//
//  West, over stepping stones: the greenhouse island, the first anchor
//  inside the greenhouse.
//  East, ten metres off and three down: the orchard, the second anchor
//  under the apple trees. Only a glide gets you there; an updraft at its
//  west edge takes you back up over the garden.
//  North-west, high up: the old signal box, the third anchor. A pinwheel
//  in the garden's corner sets an updraft blowing; ride it, glide over.
//  A little rock below it holds a memory, and from there you glide down
//  to the greenhouse.
//  North, over the railway viaduct: the station. Its platform is paved
//  with slabs the Big Alarm Clock can drop out from under you; two
//  updrafts at its sides take you up to its winding key.
//
// Joe's umbrella comes down after the first anchor; the orchard and the
// signal box wait for it.

const LAWN = { cap: 0x6ab854, capD: 0x50a044, side: 0x9a6a44, sideD: 0x5e3c28, lip: true };
const SOIL = { side: 0x7e5a40, sideD: 0x4a3222 };
const STONE = { side: 0xb9ad98, sideD: 0x857a68, cap: 0xd8cdb5, capD: 0xc0b49a, bevel: 0.08 };
const SLAB = { side: 0xa8a090, sideD: 0x787060, cap: 0xd0c8b4, capD: 0xb8b09c, bevel: 0.06 };
const PATH = { flat: { top: 0xd9bf8a, side: 0xb89a68 } };

// The station platform: a grid of slabs (x0, z0: the first one's centre).
const PLAT = { x0: -6.5, z0: -50.5, nx: 6, nz: 4, s: 5, top: 0 };

export const garden = {
  id: "garden",
  killY: -25,
  calm: 9,
  song: "garden",
  lamps: 4,
  unlockTool: { id: "umbrella", anchors: 1 },
  boss: { kind: "bigclock", x: 6, z: -43, arena: { minX: -4, maxX: 16, minZ: -49.5, maxZ: -36.5 }, seal: { minX: -9, maxX: 21, minZ: -53, maxZ: -33 } },
  skins: {},
  // [id, x, z, y]: on the shed roof (up a stack of crates), on the potting bench in
  // the greenhouse, under an apple tree at the back of the orchard, by the
  // signal box, on the little rock under it.
  memories: [["watch", 13, -9.2, 3.3], ["seeds", -36.5, -1.6, 1], ["hat", 46.5, 14.5, -3], ["ticket", -28.2, -24.6, 9], ["cutting", -34, -16, 4]],
  sky: { top: 0x5a7ad8, horizon: 0xffd0a8, bottom: 0xf4b8c8, sunDir: [0.6, 0.18, -0.75], sunGlow: 0xffe0b0 },
  fog: { color: 0xf6d2c0, near: 100, far: 340 },
  sun: { color: 0xffe8c8, intensity: 2.4, dir: [0.6, 0.6, -0.6], sky: 0xc0d0f8, ground: 0x6a7a3a, hemi: 0.9 },
  gloom: { top: 0x2e2c5a, horizon: 0x9a7a9a, bottom: 0x5a4a70, sunGlow: 0x8a7aa0, fog: 0x7a6a88, sun: 1.3, hemi: 0.6 },
  clouds: { count: 40, rMin: 20, rMax: 95, yMin: -35, yMax: 40 },
  shards: 90,

  // Waves by how far along you are: gnomes and watering cans first, then
  // the lawnmower, the last one with a sunflower.
  tiers: [
    [[0, ["gnome", 2]], [0.35, ["can", 1]], [0.65, ["gnome", 2], ["can", 1]]],
    [[0, ["gnome", 2], ["can", 1]], [0.3, ["mower", 1]], [0.55, ["gnome", 2]], [0.8, ["can", 2], ["gnome", 1]]],
    [[0, ["can", 2], ["gnome", 1]], [0.3, ["sunflower", 1]], [0.55, ["gnome", 3]], [0.8, ["can", 1], ["gnome", 2]]],
  ],

  // Routes for the headless bot, from the garden path. ("glide", x, z):
  // a run-up and a jump with the umbrella open, gliding there;
  // ("gust", id): a gust at that pinwheel; ("draft", id): up that
  // updraft with the umbrella open. botBack: the way back to the middle.
  botRoutes: {
    greenhouse: [[0, 12], [-8, 7], [-18, 2], [-26, 2], [-31, 2], [-33.5, 3]],
    orchard: [[0, 12], [10, 8], [17, 7], ["glide", 34, 7], [38, 6], [39.5, 6]],
    signal: [[0, 12], [-8, 5], [-12, -4], [-11, -7.5], ["gust", "pw"], [-17, -13], ["draft", "nw"], ["glide", -23.5, -25], [-23.5, -27.5]],
  },
  botBack: {
    orchard: [[34, 12], [32, 13], ["draft", "back"], ["glide", 12, 9], [0, 10]],
    signal: [[-23, -24], ["glide", -14, -10], [-6, 2], [0, 10]],
  },
  botBoss: [[6, -10], [6, -30], [6, -34.5]],

  build(k) {
    const rnd = rng(41);
    this.home(k, rnd);
    this.greenhouse(k, rnd);
    this.orchard(k, rnd);
    this.signal(k, rnd);
    this.station(k, rnd);

    // ── Anchors ──
    k.anchor("greenhouse", -34, 3, { duration: 24, ring: 4.6, spawns: [[-38, 0], [-30, 0], [-38, 5.5], [-30, 5.5]] });
    k.anchor("orchard", 40, 6, { duration: 26, ring: 6, spawns: [[33, 0], [47, 0], [47, 13], [33, 13]] });
    k.anchor("signal", -23, -28, { y: 9, duration: 28, ring: 4.6, spawns: [[-28, -24.5], [-19.5, -24.5], [-19.5, -33], [-28, -33]] });

    // Glitches already loose, a kind at a time: gnomes in the beds,
    // watering cans out east, a gnome and a can at the greenhouse, the
    // lawnmower, gnomes and a sunflower in the orchard, a can up by the
    // signal box.
    for (const [kind, x, z] of [
      ["gnome", -6, -6], ["gnome", -10, -1], ["gnome", -3, 3],
      ["can", 10, 1], ["can", 15, -5],
      ["gnome", -39, 9], ["can", -30, -4],
      ["mower", 44, 2], ["gnome", 36, 12], ["gnome", 44, 11], ["sunflower", 47, -1.5],
      ["can", -20, -31],
    ]) k.foe(kind, x, z);

    k.start(0, 13, 0);
  },

  // ── The big garden island ──
  home(k, rnd) {
    island(k, 0, 0, 40, 34, 0);
    // The garden path from the south edge up to the viaduct.
    for (const [x, z, w, d] of [[0, 9, 2.6, 16], [3, 0.5, 8, 2.6], [6, -9, 2.6, 17]]) deco(k, x, z, w, d, -0.2, 0.04, PATH);
    // Vegetable beds (low enough to step onto).
    for (const [x, z, seed] of [[-9, -5, 1], [-9, 1, 2], [-9, 7, 3], [-3, -5, 4], [-3, -11, 5]]) k.prop("raisedBed", x, z, { opts: { seed }, collide: { w: 4, d: 2.4, h: 0.4 } });
    // The shed, its roof up a stack of crates (a memory waits there).
    k.prop("shed", 13, -9, { yaw: -Math.PI / 2, collide: { w: 4, d: 3.4, h: 3.2 } });
    const CR = { w: 1.08, d: 1.08, h: 1.08 };
    k.prop("crate", 9.5, -11.1, { yaw: 0.1, opts: { seed: 7, s: 1.35 }, collide: CR });
    k.prop("crate", 10.6, -10.0, { yaw: -0.05, opts: { seed: 8, s: 1.35 }, collide: CR });
    k.prop("crate", 10.6, -10.0, { y: 1.08, yaw: 0.2, opts: { seed: 9, s: 1.35 }, collide: CR });
    k.prop("wateringPot", 10.4, -7.2, {});
    // Roses along the south edge, a bench, a lamp or two.
    for (const [x, z, seed] of [[-6, 15, 1], [-10, 14, 2], [6, 15, 3], [10, 14.5, 4], [-16, 11, 5], [16, 11, 6]]) k.prop("roseBush", x, z, { opts: { seed }, collide: { r: 0.6, h: 1 } });
    k.prop("bench", 4, 5, { yaw: Math.PI, collide: { w: 1.7, d: 0.6, h: 0.5 } });
    for (const [x, z] of [[-1.5, 2], [8, -14]]) k.prop("lamp", x, z, { collide: { r: 0.2, h: 3.4 } });
    for (const [x, z, h] of [[-15, -12, 4.6], [16, 4, 4.2]]) k.prop("tree", x, z, { opts: { seed: Math.round(x * 3 + z), h }, collide: { r: 0.4 * h / 4.2, h: 4 } });
    for (let i = 0; i < 14; i++) { const x = -18 + rnd() * 36, z = -15 + rnd() * 30; if (Math.abs(x - 2) > 4) k.prop("flowers", x, z, { opts: { seed: i + 3, n: 8, r: 0.8 } }); }
    // The pinwheel in the north-west corner and the updraft it drives.
    k.pinwheel("pw", -12, -9, { yaw: -0.6 });
    k.updraft("nw", -17, -13, { r: 1.4, top: 14, pinwheel: "pw" });
    // Stepping stones over to the greenhouse.
    for (const x of [-20.9, -22.75, -24.6]) k.block(x, 2, 1.8, 1.8, -0.9, -0.02, STONE);
    k.light(13, 3.4, -6.5, 0xffd08a, 5, 10);
  },

  // ── West: the greenhouse island ──
  greenhouse(k, rnd) {
    island(k, -34, 2, 18, 18, 0);
    // Glass walls on a low brick base (a doorway on the east side).
    const W = (x, z, w, d) => k.block(x, z, w, d, 0, 3.2, null);
    W(-34, -3, 12, 0.3); W(-34, 7, 12, 0.3); W(-40, 2, 0.3, 10);
    W(-28, -1.25, 0.3, 3.5); W(-28, 5.25, 0.3, 3.5);
    k.prop("greenhouse", -34, 2, { opts: { w: 12, d: 10, h: 4.4 } });
    // The potting bench along the back wall, pots on it.
    k.block(-34, -2, 7, 1.2, 0, 1, { flat: { top: 0xa8703f, side: 0x7a4a2a } });
    for (let i = 0; i < 4; i++) k.prop("flowerPot", -36.8 + i * 1.6, -2.1, { y: 1, opts: { seed: i + 1 } });
    for (const [x, z] of [[-38.5, 4], [-29.5, 6.2]]) k.prop("flowerPot", x, z, { opts: { seed: x | 0, big: true } });
    k.light(-34, 3.6, 2, 0xfff0c8, 5, 11);
    void rnd;
  },

  // ── East: the orchard, down a level ──
  orchard(k, rnd) {
    island(k, 40, 6, 20, 22, -3);
    for (const [x, z, seed] of [[34, -1, 1], [45, 3, 2], [35, 10, 3], [46, 13.5, 4], [41, 15, 5], [48, 8, 6]])
      k.prop("appleTree", x, z, { y: -3, opts: { seed }, collide: { r: 0.45, h: 4 } });
    for (let i = 0; i < 8; i++) k.prop("grass", 32 + rnd() * 16, -3 + rnd() * 18, { y: -3, opts: { seed: i + 20, n: 8, r: 0.6 } });
    k.prop("crate", 43, 0, { y: -3, opts: { seed: 9 }, collide: { w: 0.9, d: 0.9, h: 0.9 } });
    // The way back: an updraft at the west edge, up over the garden.
    k.updraft("back", 32.5, 13, { r: 1.4, top: 7 });
    k.light(40, 0, 6, 0xffe0a0, 5, 12);
  },

  // ── North-west, high: the signal box, and the little rock below ──
  signal(k, rnd) {
    island(k, -24, -29, 12, 12, 9);
    k.prop("signalBox", -27.5, -32.5, { y: 9, collide: { w: 3.4, d: 3, h: 4.6 } });
    k.prop("lamp", -19.5, -24.5, { y: 9, collide: { r: 0.2, h: 3.4 } });
    island(k, -34, -16, 6, 6, 4);
    k.prop("roseBush", -35.5, -17.5, { y: 4, opts: { seed: 9 }, collide: { r: 0.6, h: 1 } });
    k.light(-24, 12, -28, 0xffd08a, 5, 11);
    void rnd;
  },

  // ── North: the viaduct and the station ──
  station(k, rnd) {
    // The viaduct, rails and sleepers on top, a low parapet each side.
    k.block(6, -24, 4.6, 14.4, -1.6, 0, STONE);
    k.block(6, -24, 3, 12, -5, -1.6, SOIL);
    for (const s of [-1, 1]) k.block(6 + s * 2.15, -24, 0.3, 14.4, 0, 0.7, STONE);
    for (let z = -30.5; z < -17; z += 1.2) deco(k, 6, z, 2.6, 0.4, -0.2, 0.08, { flat: { top: 0x6a4a32, side: 0x4a3222 } });
    for (const s of [-0.75, 0.75]) deco(k, 6 + s, -24, 0.12, 14.4, 0.05, 0.16, { flat: { top: 0x9aa4ad, side: 0x5a6068 } });
    // The platform: border strips round a grid of slabs.
    const P = PLAT, x1 = P.x0 + (P.nx - 1) * P.s, z1 = P.z0 + (P.nz - 1) * P.s;
    const W = P.x0 - P.s / 2, E = x1 + P.s / 2, N = P.z0 - P.s / 2, S = z1 + P.s / 2;
    k.block((W + E) / 2, N - 3.5, E - W + 4, 7, -1.5, 0, SLAB);
    k.block(W - 1, (N + S) / 2, 2, S - N, -1.5, 0, SLAB);
    k.block(E + 1, (N + S) / 2, 2, S - N, -1.5, 0, SLAB);
    k.block((W + E) / 2, S + 1, E - W + 4, 2, -1.5, 0, SLAB);
    for (const [x, z, w, d] of [[(W + E) / 2, N - 3.5, E - W + 4, 7], [W - 1, (N + S) / 2, 2, S - N], [E + 1, (N + S) / 2, 2, S - N], [(W + E) / 2, S + 1, E - W + 4, 2]])
      k.block(x, z, w * 0.8, d * 0.8, -4.5, -1.5, SOIL);
    // The slabs that can fall: the two with an updraft on them stay.
    const draft = [[0, 1], [5, 2]];
    for (let i = 0; i < P.nx; i++) for (let j = 0; j < P.nz; j++) {
      const x = P.x0 + i * P.s, z = P.z0 + j * P.s;
      k.tile(`t${i}_${j}`, x, z, P.s - 0.06, P.s - 0.06, { y1: P.top, y0: P.top - 1.5, look: (i + j) % 2 ? SLAB : { ...SLAB, cap: 0xc8c0aa, capD: 0xb0a890 }, fixed: draft.some(([a, b]) => a === i && b === j) });
    }
    for (const [i, j] of draft) k.updraft(`plat${i}`, P.x0 + i * P.s, P.z0 + j * P.s, { r: 1.4, top: 10.5, y: P.top });
    // The station house along the north side, benches and lamps.
    k.prop("stationHouse", 6, N - 4.6, { collide: { w: 22, d: 4.4, h: 6 } });
    for (const x of [-3, 15]) k.prop("bench", x, N - 1.8, { collide: { w: 1.7, d: 0.6, h: 0.5 } });
    for (const [x, z] of [[W - 1, N + 2], [E + 1, N + 2], [W - 1, S - 2], [E + 1, S - 2]]) k.prop("lamp", x, z, { collide: { r: 0.2, h: 3.4 } });
    k.light(6, 5, N - 1, 0xffd8a0, 6, 16);
    k.light(6, 4, S + 1, 0xffd08a, 5, 12);
    void rnd;
  },
};

// An island: lawn on top at `top`, tapering down in rings of soil.
function island(k, x, z, w, d, top) {
  k.block(x, z, w, d, top - 2, top, LAWN);
  k.block(x, z, w * 0.82, d * 0.82, top - 4.5, top - 2, SOIL);
  k.block(x, z, w * 0.55, d * 0.55, top - 7, top - 4.5, SOIL);
  k.block(x, z, w * 0.25, d * 0.25, top - 9.5, top - 7, SOIL);
}

// Drawn, not solid (paths, sleepers, rails).
function deco(k, x, z, w, d, y0, y1, look) { k.draw.push({ kind: "block", x, z, w, d, y0, y1, yaw: 0, look }); }
