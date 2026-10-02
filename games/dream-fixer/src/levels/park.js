import { rng } from "../rng.js";

// ── Biscuit's park (chapter 1) ────────────────────────────────────────────
// Islands of lawn floating in an evening sky gone grey with the
// nightmare: the big lawn in the middle (where the nightmare will come
// up), a terrace with Biscuit's doghouse, a dog run with an agility course
// over the west bridge, a pond garden over the east bridge, and a little
// island up a staircase of giant bones. The three anchors are in the pond,
// on the dog run and on the little island; the sky clears as they are
// fixed.

const LAWN = { cap: 0x62b04e, capD: 0x4a9440, side: 0x9a6a44, sideD: 0x5e3c28 };
const STONE = { side: 0xb9ad98, sideD: 0x857a68, cap: 0xd8cdb5, capD: 0xc0b49a, bevel: 0.08 };
const PATH = { top: 0xd9bf8a, side: 0xb89a68 };

export const park = {
  id: "park",
  killY: -25,
  // Loose glitches leave you be this close to where you arrive.
  calm: 10,
  unlockAfterFirst: "vacuum",
  // The nightmare comes up in the middle of the lawn.
  boss: { x: 0, z: 5, arena: { minX: -17, maxX: 17, minZ: -2, maxZ: 19 } },
  sky: { top: 0x3f7fd8, horizon: 0xffc9a0, bottom: 0xe8a8c8, sunDir: [-0.5, 0.35, -0.7], sunGlow: 0xffe0b0 },
  fog: { color: 0xf0c4a8, near: 90, far: 320 },
  sun: { color: 0xffe2c0, intensity: 2.4, dir: [-0.5, 0.75, -0.6], sky: 0xb0c8f0, ground: 0x5a6a3a, hemi: 0.85 },
  // What the nightmare does to it while the anchors are broken.
  gloom: { top: 0x2e2c5a, horizon: 0x9a7a9a, bottom: 0x5a4a70, sunGlow: 0x8a7aa0, fog: 0x7a6a88, sun: 1.3, hemi: 0.6 },
  clouds: { count: 34, rMin: 18, rMax: 90, yMin: -20, yMax: 40 },
  shards: 90,

  // The waves an anchor shakes loose depend on how far along you are, not
  // on which anchor it is: the first one tuned is gentle (bunnies and a
  // couple of squirrels), the second brings the bathtub and buzzers, the
  // last one everything, knot included. [progress, [kind, n], …]
  tiers: [
    [[0, ["bunny", 3]], [0.35, ["fuzz", 2]], [0.65, ["bunny", 4], ["fuzz", 1]]],
    [[0, ["fuzz", 2], ["bunny", 3]], [0.3, ["tub", 1]], [0.55, ["buzzer", 1], ["fuzz", 2]], [0.8, ["bunny", 4], ["buzzer", 1]]],
    [[0, ["buzzer", 2], ["fuzz", 2]], [0.3, ["knot", 1]], [0.55, ["tub", 1], ["bunny", 4]], [0.8, ["fuzz", 3], ["buzzer", 1]]],
  ],

  // Routes for the headless bot: waypoints to each anchor ([x, z, jump]).
  botRoutes: {
    pond: [[6, 12], [20, 12], [34, 12], [41, 12], [43.5, 12.5]],
    run: [[-6, 8], [-20, 6], [-34, 6], [-44, 2], [-48.5, -0.5]],
    island: [[-20, 6], [6, -7.5], [8, -10, 1], [10, -13.5, 1], [12, -17, 1], [14, -20.5, 1], [16, -26, 1], [16.5, -25.8]],
  },

  build(k) {
    const rnd = rng(7);

    // ── Main island ──
    k.block(0, 0, 48, 44, -5, 0, { ...LAWN, lip: true });
    // Rocky underside, hanging in steps.
    k.block(0, 0, 40, 36, -9, -5, { side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(-2, 2, 26, 22, -13, -9, { side: 0x6e4c36, sideD: 0x3e2a1e });
    k.block(1, -1, 12, 10, -17, -13, { side: 0x5e4030, sideD: 0x33231a });
    // The path: a flat ribbon just above the lawn (walked over, not into).
    for (const [x, z, w, d, yaw] of [[0, 12, 3, 20, 0], [3.5, -1, 3, 10, -0.7], [-0.5, 8.5, 3, 12, 0.75]])
      k.block(x, z, w, d, -0.2, 0.03, { flat: PATH }, yaw);

    // ── Terrace (north-west) with stone walls ──
    k.block(-13, -10, 14, 12, -1, 1.5, { ...STONE });
    k.block(-13, -10, 13.6, 11.6, 1.3, 1.52, { flat: { top: 0x86c870, side: 0x6aa85a } });
    // Stairs up its east side, a grassy ramp up the south.
    k.stairs(-3.2, -10, 3, 5, 0.3, 0.55, 0, { ...STONE, bevel: 0.04 }, Math.PI / 2);
    k.ramp(-16, -1.4, 5.2, 3.4, 0, 1.52, { ...LAWN }, Math.PI / 2, -0.2);
    k.prop("doghouse", -14.5, -13, { y: 1.52, yaw: 0.25, collide: { w: 2.1, d: 1.9, h: 2.2 } });
    k.prop("bench", -8.4, -14.2, { y: 1.52, yaw: 0, collide: { w: 1.9, d: 0.6, h: 0.9 } });
    k.prop("lamp", -7, -5, { y: 1.52, collide: { r: 0.2, h: 3.4 } });
    k.light(-7, 1.52 + 3.2, -5, 0xffd08a, 5, 10);
    bush(k, -18.5, -6, 4, 1.1, 1.52);
    bush(k, -18, -14.5, 9, 0.9, 1.52);
    k.prop("flowers", -11, -7, { y: 1.52, opts: { seed: 3, n: 9, r: 1 } });

    // ── Staircase of floating bones to the little island (north-east) ──
    // Laid along the way up, so each hop is short.
    const BONE = { w: 3.2, d: 1.1, h: 0.62 };
    for (const [x, z, y] of [[8, -10, 0], [10, -13.5, 0.95], [12, -17, 1.95], [14, -20.5, 2.3]])
      k.prop("bone", x, z, { y, yaw: 1.05, collide: BONE });
    k.block(16.5, -28, 11, 10, 0.2, 3.0, { ...LAWN, lip: true });
    k.block(16.5, -28, 8, 7, -2.5, 0.2, { side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(17, -28.5, 4, 3.5, -5, -2.5, { side: 0x6e4c36, sideD: 0x3e2a1e });
    k.prop("tree", 19.5, -31, { y: 3, opts: { seed: 12, h: 5 }, collide: { r: 0.45, h: 4 } });
    k.prop("flowers", 13.5, -25.5, { y: 3, opts: { seed: 5, n: 8 } });

    // ── On the lawn ──
    k.prop("hydrant", -6, 9, { s: 1.4, collide: { r: 0.42, h: 1.5 } });
    k.prop("tennisBall", 8, 7, { opts: { r: 1.3 }, collide: { r: 1.25, h: 2.4 } });
    k.prop("tennisBall", 11.5, 4.5, { opts: { r: 0.6 }, yaw: 1, collide: { r: 0.58, h: 1.1 } });
    k.prop("bench", 4.2, 15, { yaw: -Math.PI / 2, collide: { w: 1.9, d: 0.6, h: 0.9 } });
    k.prop("bench", -4.2, 6, { yaw: Math.PI / 2, collide: { w: 1.9, d: 0.6, h: 0.9 } });
    for (const [x, z] of [[3, 20], [-3, 3], [6.5, -1.5]]) {
      k.prop("lamp", x, z, { collide: { r: 0.2, h: 3.4 } });
      k.light(x, 3.2, z, 0xffd08a, 5, 10);
    }
    fence(k, -12, 21.4, 16, 2);
    fence(k, 14, 21.4, 12, 5);
    k.prop("rock", 15, 16.5, { opts: { seed: 3, s: 1.6 }, collide: { r: 0.9, h: 0.7 } });
    k.prop("rock", -19, 14, { opts: { seed: 8, s: 1.2 }, collide: { r: 0.7, h: 0.5 } });

    // Trees round the edge of the lawn.
    for (const [x, z, h] of [[-20, 17, 4.6], [-15, 19, 4], [19, 17, 5], [21, 8, 4.4], [-21, 4, 4.8], [20, -3, 4.2], [-6, 19.5, 3.8], [9, 19, 4.2]]) {
      k.prop("tree", x, z, { opts: { seed: Math.round(x * 7 + z), h }, collide: { r: 0.4 * h / 4.2, h: 4 } });
    }
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2, r = 17 + rnd() * 3;
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
      if (x < -5 && z < -3) continue;   // not on the terrace
      const yaw = rnd() * 6;
      bush(k, x, z, i + 20, 0.8 + rnd() * 0.5, 0, yaw);
    }
    // Grass tufts and flowers scattered over the lawn (not on the path).
    for (let i = 0; i < 90; i++) {
      const x = (rnd() - 0.5) * 44, z = (rnd() - 0.5) * 40;
      if (Math.abs(x) < 2.5 && z > 1) continue;
      if (x < -5 && z < -3) continue;
      k.prop(rnd() < 0.8 ? "grass" : "flowers", x, z, { yaw: rnd() * 6, opts: { seed: i + 100, n: rnd() < 0.8 ? 5 : 4 } });
    }

    this.dogRun(k, rnd);
    this.pond(k, rnd);
    this.nightmare(k);

    // ── Anchors ──
    k.anchor("pond", 44, 14, {
      duration: 24,
      waves: [[0, ["fuzz", 2]], [0.3, ["bunny", 4]], [0.55, ["tub", 1], ["fuzz", 2]], [0.8, ["bunny", 4], ["buzzer", 1]]],
      spawns: [[36, 4], [52, 4], [53, 25], [35.5, 25]],
    });
    k.anchor("run", -48, -2, {
      duration: 26,
      waves: [[0, ["bunny", 4]], [0.3, ["knot", 1]], [0.55, ["fuzz", 2], ["bunny", 3]], [0.8, ["tub", 1], ["buzzer", 1]]],
      spawns: [[-38, -8], [-56, -8], [-56, 12], [-38, 13]],
    });
    k.anchor("island", 16.5, -28, {
      duration: 28,
      waves: [[0, ["buzzer", 2]], [0.3, ["fuzz", 3]], [0.55, ["knot", 1], ["buzzer", 1]], [0.8, ["bunny", 6]]],
      spawns: [[12, -24], [21, -24.5], [20.5, -32], [12.5, -31.5]],
    });

    // Biscuit's memories, tucked away.
    k.memory("hedgehog", -16.5, -15.2);
    k.memory("leash", 8.6, -13.2);
    k.memory("photo", 20.3, -25.4);
    k.memory("slipper", -56, 16);
    k.memory("cord", 51.5, 23.5);

    // Glitches already loose in the dream, minding their own business
    // until you come near. Met a kind at a time: only dust bunnies on the
    // big lawn, squirrels waiting over either bridge, a bathtub deeper in
    // the dog run and the pond garden, buzzers on the little island.
    for (const [kind, x, z] of [
      ["bunny", -1.5, 1], ["bunny", 1.8, -1.5], ["bunny", 2.6, 0.4], ["bunny", -14, 8], ["bunny", -13, 9.2], ["bunny", -15, 9.5],
      ["bunny", -12, -8],
      ["fuzz", -36, 6], ["fuzz", -37.5, 5], ["tub", -46, 13], ["bunny", -53, 14], ["bunny", -54, 13],
      ["fuzz", 37, 8], ["fuzz", 37.5, 6.5], ["bunny", 49, 4], ["bunny", 50, 5], ["tub", 46, 24],
      ["buzzer", 13, -27], ["buzzer", 20, -30], ["fuzz", 18, -25],
    ]) k.foe(kind, x, z);

    k.start(0, 18, 0);
  },

  // ── West: the bridge and the dog run ──
  dogRun(k, rnd) {
    bridge(k, -28.5, 6, 9, 0);
    k.block(-46, 4, 26, 30, -4, 0, { ...LAWN, lip: true });
    k.block(-46, 4, 21, 25, -8, -4, { side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(-45, 3, 12, 14, -12, -8, { side: 0x6e4c36, sideD: 0x3e2a1e });
    // Sandy course track.
    k.block(-46, 4, 20, 6, -0.2, 0.03, { flat: { top: 0xe0c89a, side: 0xc0a878 } }, 0.2);
    // Hurdles across the track, a tunnel, weave poles, a tyre.
    for (const [x, z] of [[-38, 2.2], [-42, 3.1], [-46, 3.9]]) {
      const yaw = Math.PI / 2 + 0.2;
      k.prop("hurdle", x, z, { yaw, opts: { h: 0.5 } });
      k.world.box({ x, z, y0: 0.35, y1: 0.55, hx: 0.06, hz: 1.2, yaw: 0.2 });
      for (const s of [-1, 1]) k.world.cyl({ x: x + Math.cos(yaw) * 1.2 * s, z: z - Math.sin(yaw) * 1.2 * s, r: 0.09, y0: 0, y1: 0.85 });
    }
    k.prop("tunnel", -52, 5.6, { yaw: Math.PI / 2 + 0.2 });
    for (const s of [-1, 1]) k.world.box({ x: -52 - Math.sin(0.2) * 1.15 * s, z: 5.6 + Math.cos(0.2) * 1.15 * s, y0: 0, y1: 1.15, hx: 2.05, hz: 0.12, yaw: 0.2 });
    k.world.box({ x: -52, z: 5.6, y0: 1.12, y1: 1.3, hx: 2.05, hz: 1.2, yaw: 0.2 });
    for (let i = 0; i < 6; i++) k.prop("pole", -40 + i * 0.9, 12.5, { collide: { r: 0.05, h: 1.2 } });
    k.prop("tyre", -36, -6, { yaw: 0.4, collide: { w: 2.5, d: 0.2, h: 2.7, y0: 2.4 } });
    for (const s of [-1, 1]) k.world.cyl({ x: -36 + Math.cos(0.4) * 1.1 * s, z: -6 - Math.sin(0.4) * 1.1 * s, r: 0.08, y0: 0, y1: 2.6 });
    // A raised stand with ramps both ways.
    k.block(-54, -5, 5, 3, -0.5, 1.2, { ...STONE });
    k.ramp(-58.3, -5, 3.6, 2.6, 0, 1.2, { ...LAWN }, 0, -0.2);
    k.ramp(-49.7, -5, 3.6, 2.6, 0, 1.2, { ...LAWN }, Math.PI, -0.2);
    k.prop("sign", -34, 0, { yaw: -Math.PI / 2 - 0.3, opts: { color: 0xffe08a }, collide: { r: 0.12, h: 1.75 } });
    fence(k, -46, 18.6, 22, 7);
    fence(k, -46, -10.6, 22, 8, Math.PI);
    for (const [x, z, h] of [[-57, 15, 4.4], [-35, 16, 4], [-57, -9, 4.8], [-34, -9, 4.2]]) k.prop("tree", x, z, { opts: { seed: Math.round(-x * 3 + z), h }, collide: { r: 0.4 * h / 4.2, h: 4 } });
    for (let i = 0; i < 40; i++) {
      const x = -46 + (rnd() - 0.5) * 24, z = 4 + (rnd() - 0.5) * 28;
      if (Math.abs(z - 4 - (x + 46) * 0.2) < 3.5) continue;
      k.prop(rnd() < 0.8 ? "grass" : "flowers", x, z, { yaw: rnd() * 6, opts: { seed: i + 300, n: 5 } });
    }
    bush(k, -58, 3, 31, 1.1);
    bush(k, -35, 9, 32, 0.9);
  },

  // ── East: the bridge and the pond garden ──
  pond(k, rnd) {
    bridge(k, 28, 12, 8, 0);
    // Land round the pond (the pond itself is a shallow dip in the middle).
    const G = { ...LAWN, lip: true };
    k.block(44, 3, 24, 6, -4, 0, G);
    k.block(44, 25, 24, 6, -4, 0, G);
    k.block(35, 14, 6, 16, -4, 0, G);
    k.block(53, 14, 6, 16, -4, 0, G);
    k.block(44, 14, 12, 16, -4, -0.4, { cap: 0x8a7a50, capD: 0x6a5a3a, side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(44, 14, 20, 24, -8, -4, { side: 0x7e5a40, sideD: 0x4a3222 });
    k.block(45, 13, 10, 12, -12, -8, { side: 0x6e4c36, sideD: 0x3e2a1e });
    k.water(44, 14, 11.9, 15.9, -0.12);
    // The anchor's rock in the middle of the pond.
    k.block(44, 14, 3.4, 3.4, -0.6, 0.0, { ...STONE });
    // Lily pads to hop along, reeds at the edges, a jetty.
    // (Pads hold you up: hop from one to the next over the water.)
    for (const [x, z, s] of [[40, 11, 1], [41.5, 17.5, 0.9], [47.5, 10, 1.1], [48, 18, 0.9], [44, 20, 1], [44, 8.5, 1]]) {
      k.prop("lilypad", x, z, { y: -0.08, opts: { seed: Math.round(x + z), s } });
      k.world.cyl({ x, z, r: 0.55 * s, y0: -0.4, y1: -0.055 });
    }
    for (const [x, z] of [[38.6, 7], [49.5, 7.2], [38.6, 21], [49.4, 21.2], [38.6, 14.5], [49.4, 13]]) k.prop("reeds", x, z, { opts: { seed: Math.round(x * z) } });
    k.prop("jetty", 44, 22.2, { y: -0.1, opts: { len: 3.6 } });
    k.world.box({ x: 44, z: 20.6, y0: -0.4, y1: 0.14, hx: 0.8, hz: 1.8 });
    k.prop("gazebo", 51, 24, { collide: { r: 0.3, h: 0.3 } });
    for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI * 2; k.world.cyl({ x: 51 + Math.cos(a) * 2.2, z: 24 + Math.sin(a) * 2.2, r: 0.1, y0: 0, y1: 2.7 }); }
    k.world.box({ x: 51, z: 24, y0: 0, y1: 0.3, hx: 2.5, hz: 2.5 });
    k.prop("bench", 36, 20, { yaw: Math.PI / 2, collide: { w: 1.9, d: 0.6, h: 0.9 } });
    k.prop("lamp", 36.5, 8, { collide: { r: 0.2, h: 3.4 } });
    k.light(36.5, 3.2, 8, 0xffd08a, 5, 10);
    for (const [x, z, h] of [[55, 2, 4.6], [55, 26, 4.2], [33.5, 2.5, 4]]) k.prop("tree", x, z, { opts: { seed: Math.round(x * 5 + z), h }, collide: { r: 0.4 * h / 4.2, h: 4 } });
    for (let i = 0; i < 30; i++) {
      const x = 44 + (rnd() - 0.5) * 23, z = 14 + (rnd() - 0.5) * 27;
      if (x > 37.5 && x < 50.5 && z > 5.5 && z < 22.5) continue;
      k.prop(rnd() < 0.7 ? "grass" : "flowers", x, z, { yaw: rnd() * 6, opts: { seed: i + 400, n: 5 } });
    }
    bush(k, 54.5, 14, 41, 1.2);
    k.prop("rock", 34, 26, { opts: { seed: 5, s: 1.3 }, collide: { r: 0.8, h: 0.6 } });
  },

  // Signs of the nightmare: its power cords snake over the lawn from where
  // it sleeps, out towards every anchor.
  nightmare(k) {
    for (const pts of [
      [[0, 5], [3, 7.5], [7, 7.8], [12, 10.5], [17, 11.5], [22, 12.6]],
      [[0, 5], [-3.5, 4], [-8, 5.5], [-13, 4.8], [-18, 6.4], [-22.5, 5.6]],
      [[0, 5], [1, 1.5], [4.5, -2], [6, -6.8]],
      [[0, 5], [-2.5, 9], [-1.5, 13.5]],
    ]) k.prop("cable", 0, 0, { y: 0.03, opts: { pts } });
    k.nightmare = { x: 0, z: 5 };
  },
};

// A white picket fence along x; solid, so you cannot walk through it.
function fence(k, x, z, len, seed, yaw = 0) {
  k.prop("fence", x, z, { yaw, opts: { len, seed }, collide: { w: len, d: 0.2, h: 1.1 } });
}

// A bush you bump into (its leaves are soft at the edge: the collider is
// a little smaller than the foliage).
function bush(k, x, z, seed, s = 1, y = 0, yaw = 0) {
  k.prop("bush", x, z, { y, yaw, opts: { seed, s }, collide: { r: 0.5 * s, h: 0.85 * s } });
}

// A plank bridge between two islands, along x, with posts and ropes.
function bridge(k, x, z, len, yaw) {
  k.block(x, z, len, 3, -0.5, 0.05, null, yaw);
  const n = Math.round(len / 0.5);
  for (let i = 0; i < n; i++) k.block(x - len / 2 + (i + 0.5) * len / n, z, len / n - 0.04, 3, -0.25, 0.05, { flat: { top: [0xa8703f, 0x9a6436][i % 2], side: 0x7a4a2a } });
  for (const s of [-1, 1]) {
    k.block(x, z + s * 1.55, len, 0.12, 0, 0.9, null);
    for (let i = 0; i <= 3; i++) k.prop("pole", x - len / 2 + i * len / 3, z + s * 1.55, { opts: { h: 1.1 } });
    k.block(x, z + s * 1.55, len, 0.06, 0.85, 0.92, { flat: { top: 0xd8c8a0, side: 0xb8a878 } });
  }
}
