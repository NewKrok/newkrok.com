// ── Bestiary ─────────────────────────────────────────────────────────────
// r: physics radius (px), hp, speed (px/s), dmg on contact, xp gem value,
// mass: material density (a brute at 4 barely notices a bat-sized shove).
// ai picks the behaviour in sim/monsters.js; rig picks the 3D figure in
// render/rigs.js, tinted by the colours given here.
//
// Every stage has its own roster; the numbers are the stage-one baseline and
// the stage's hpMul / dmgMul scale them.

export const MON = {
  // ── Hollowmere churchyard ──
  crow:       { r: 8,  hp: 6,    speed: 138, dmg: 3,  xp: 1,  mass: 0.6, ai: "swoop",  rig: "crow",      c: 0x1e1c26, c2: 0x3a3650, fly: 26 },
  shambler:   { r: 12, hp: 18,   speed: 60,  dmg: 5,  xp: 1,  mass: 1,   ai: "chase",  rig: "shambler",  c: 0x7a8a6a, c2: 0x4a3a2e },
  gravebound: { r: 11, hp: 28,   speed: 92,  dmg: 6,  xp: 1,  mass: 1.1, ai: "chase",  rig: "gravebound", c: 0xc8bea6, c2: 0x6a5a48, heavy: false, shield: true },
  archer:     { r: 11, hp: 30,   speed: 74,  dmg: 4,  xp: 3,  mass: 1,   ai: "ranged", rig: "archer",    c: 0xc0b69e, c2: 0x3a4a2a, spit: { dmg: 6, speed: 240, color: 0xe8e0c8, arrow: true } , cap: 16 },
  digger:     { r: 22, hp: 170,  speed: 48,  dmg: 13, xp: 4,  mass: 4,   ai: "chase",  rig: "digger",    c: 0x8a7a6a, c2: 0x3a2e28, heavy: true, cap: 9 },
  banshee:    { r: 10, hp: 40,   speed: 116, dmg: 7,  xp: 3,  mass: 0.8, ai: "chase",  rig: "banshee",   c: 0xcfe6f0, c2: 0x6a8aa8, ghost: true, fly: 10 },
  headless:   { r: 20, hp: 1000,  speed: 88,  dmg: 15, xp: 12, mass: 6,   ai: "charger", rig: "headless", c: 0x4a4e5e, c2: 0x2a2a34, c3: 0xff7a2a, elite: true },
  colossus:   { r: 42, hp: 8500, speed: 56,  dmg: 24, xp: 40, mass: 40,  ai: "colossus", rig: "colossus", c: 0xb8ac94, c2: 0x8a7a5a, boss: true },

  // ── The drowned mill ──
  leech:    { r: 7,  hp: 7,    speed: 128, dmg: 3,  xp: 1,  mass: 0.5, ai: "wiggle", rig: "leech",    c: 0x6b3a4a, c2: 0x3a1c28 },
  drowned:  { r: 12, hp: 24,   speed: 64,  dmg: 5,  xp: 1,  mass: 1.1, ai: "chase",  rig: "ghoul",    c: 0x6f8f8a, c2: 0x3f5a58 },
  toad:     { r: 13, hp: 38,   speed: 70,  dmg: 5,  xp: 3,  mass: 1.3, ai: "ranged", rig: "toad",     c: 0x7a9a3a, c2: 0x4a6a1e, spit: { dmg: 7, speed: 205, color: 0x9fcf4a, home: 0.009, life: 120 } , cap: 16 },
  bogslime: { r: 15, hp: 60,   speed: 58,  dmg: 6,  xp: 2,  mass: 1.6, ai: "chase",  rig: "slime",    c: 0x4f8a5a, c2: 0x2f5a3a, split: "bogling" },
  bogling:  { r: 8,  hp: 14,   speed: 96,  dmg: 3,  xp: 1,  mass: 0.7, ai: "chase",  rig: "slime",    c: 0x6faa7a, c2: 0x3f7a4a },
  wisp:     { r: 9,  hp: 36,   speed: 120, dmg: 6,  xp: 3,  mass: 0.7, ai: "swoop",  rig: "wisp",     c: 0x9ff0c0, c2: 0x3fb080, ghost: true, fly: 14 },
  mirebrute:{ r: 23, hp: 190,  speed: 46,  dmg: 14, xp: 4,  mass: 4.5, ai: "chase",  rig: "brute",    c: 0x5a6a4a, c2: 0x3a4a2a, heavy: true, cap: 7 },
  bogwitch: { r: 12, hp: 35,   speed: 64,  dmg: 5,  xp: 4,  mass: 1.2, ai: "healer", rig: "witch",    c: 0x3a4a32, c2: 0x5a6a3a, c3: 0x9aff7a, heal: 0.07, healCd: 300, healR: 130 , cap: 4 },
  sentinel: { r: 20, hp: 950,  speed: 86,  dmg: 16, xp: 12, mass: 6,   ai: "charger", rig: "knight",  c: 0x5f8a86, c2: 0x3a5a58, c3: 0x9fcf4a, elite: true },
  bogmother:{ r: 46, hp: 6400, speed: 58,  dmg: 24, xp: 40, mass: 45,  ai: "bogmother", rig: "bogmother", c: 0x4f6a3a, c2: 0x6b3a4a, boss: true },

  // ── Ashwood ──
  imp:      { r: 8,  hp: 10,   speed: 140, dmg: 4,  xp: 1,  mass: 0.6, ai: "swoop",  rig: "imp",      c: 0xff7a3a, c2: 0x8a2a10, fly: 20 },
  ashwolf:  { r: 12, hp: 28,   speed: 92,  dmg: 6,  xp: 2,  mass: 1.2, ai: "lunge",  rig: "wolf",     c: 0x5a5250, c2: 0xff8a3a },
  husk:     { r: 12, hp: 28,   speed: 70,  dmg: 5,  xp: 2,  mass: 1,   ai: "chase",  rig: "husk",     c: 0x5a4238, c2: 0xff6a20, explode: { r: 70, dmg: 14 } },
  caller:   { r: 12, hp: 44,   speed: 70,  dmg: 5,  xp: 3,  mass: 1.2, ai: "ranged", rig: "cultist",  c: 0x6a2a20, c2: 0xffb04a, spit: { dmg: 9, speed: 212, color: 0xff8a3a, home: 0.026 } , cap: 16 },
  treant:   { r: 25, hp: 300,  speed: 40,  dmg: 15, xp: 5,  mass: 5,   ai: "chase",  rig: "treant",   c: 0x5a4030, c2: 0xff6a20, heavy: true, cap: 7 },
  cinder:   { r: 9,  hp: 40,   speed: 124, dmg: 7,  xp: 3,  mass: 0.7, ai: "chase",  rig: "wisp",     c: 0xffb04a, c2: 0xff5a20, ghost: true, fly: 12 },
  ashshaman:{ r: 12, hp: 45,   speed: 66,  dmg: 6,  xp: 4,  mass: 1.2, ai: "healer", rig: "witch",    c: 0x4a2a20, c2: 0x7a3a1a, c3: 0xffb04a, heal: 0.07, healCd: 300, healR: 130, cap: 4 },
  alpha:    { r: 19, hp: 1200, speed: 104, dmg: 17, xp: 12, mass: 5,   ai: "lunge",  rig: "wolf",     c: 0x2a2220, c2: 0xff5a20, elite: true, scale: 1.6 },
  stag:     { r: 40, hp: 9000, speed: 70,  dmg: 26, xp: 40, mass: 40,  ai: "stag",   rig: "stag",     c: 0x4a3428, c2: 0xff6a20, boss: true },

  // ── Frostfang pass ──
  frostbat: { r: 8,  hp: 12,   speed: 140, dmg: 4,  xp: 1,  mass: 0.6, ai: "swoop",  rig: "bat",      c: 0x9fd8ff, c2: 0x3a6a9a, fly: 24 },
  iceskel:  { r: 11, hp: 36,   speed: 90,  dmg: 7,  xp: 1,  mass: 1.1, ai: "chase",  rig: "skeleton", c: 0xcfeaff, c2: 0x8ab8d8 },
  snowwolf: { r: 12, hp: 40,   speed: 96,  dmg: 7,  xp: 2,  mass: 1.2, ai: "lunge",  rig: "wolf",     c: 0xdfe8f0, c2: 0x7ab8ff },
  shard:    { r: 15, hp: 80,   speed: 56,  dmg: 7,  xp: 2,  mass: 1.8, ai: "chase",  rig: "slime",    c: 0x8ac8f0, c2: 0x4a8ac0, split: "shardling" },
  shardling:{ r: 8,  hp: 18,   speed: 100, dmg: 4,  xp: 1,  mass: 0.7, ai: "chase",  rig: "slime",    c: 0xaadcff, c2: 0x6aa8e0 },
  yeti:     { r: 24, hp: 360,  speed: 50,  dmg: 16, xp: 5,  mass: 5,   ai: "chase",  rig: "yeti",     c: 0xe8eef4, c2: 0x6a8aa8, heavy: true, cap: 7 },
  rime:     { r: 10, hp: 52,   speed: 120, dmg: 8,  xp: 3,  mass: 0.8, ai: "chase",  rig: "ghost",    c: 0xc0e8ff, c2: 0x5a9ad0, ghost: true, fly: 8 },
  frostseer:{ r: 12, hp: 110,  speed: 64,  dmg: 7,  xp: 4,  mass: 1.2, ai: "healer", rig: "witch",    c: 0x4a5a78, c2: 0x8aa8c8, c3: 0x9fe0ff, heal: 0.25 , cap: 4 },
  frostknight: { r: 20, hp: 1500, speed: 84, dmg: 18, xp: 12, mass: 6, ai: "charger", rig: "knight",  c: 0xa8c8e8, c2: 0x5a7a9a, c3: 0x7ad8ff, elite: true },
  wormhead: { r: 30, hp: 12000, speed: 150, dmg: 26, xp: 40, mass: 12, ai: "worm",  rig: "wormhead", c: 0x8ab0d0, c2: 0x2a4a6a, boss: true },

  // ── The moon cathedral ──
  gargoyle: { r: 10, hp: 30,   speed: 120, dmg: 6,  xp: 2,  mass: 1,   ai: "diver",  rig: "gargoyle", c: 0x6a6f7a, c2: 0x3a3f4a, fly: 30 },
  hollow:   { r: 12, hp: 50,   speed: 80,  dmg: 7,  xp: 1,  mass: 1.3, ai: "chase",  rig: "hollow",   c: 0x5a5a78, c2: 0xc0c8ff },
  cultist:  { r: 12, hp: 60,   speed: 72,  dmg: 6,  xp: 3,  mass: 1.2, ai: "ranged", rig: "cultist",  c: 0x5a3a8a, c2: 0xc0a8ff, spit: { dmg: 10, speed: 240, color: 0xc0a8ff, home: 0.03 } , cap: 16 },
  bellgolem:{ r: 25, hp: 460,  speed: 44,  dmg: 18, xp: 5,  mass: 6,   ai: "chase",  rig: "brute",    c: 0x8a7a5a, c2: 0x5a4a3a, heavy: true, cap: 7 },
  specter:  { r: 10, hp: 64,   speed: 124, dmg: 9,  xp: 3,  mass: 0.8, ai: "chase",  rig: "ghost",    c: 0xd8c8ff, c2: 0x7a6ac0, ghost: true, fly: 8 },
  hollowpriest: { r: 12, hp: 120, speed: 66, dmg: 7, xp: 4, mass: 1.2, ai: "healer", rig: "witch",   c: 0x3a2a4a, c2: 0x6a4a8a, c3: 0xd8b8ff, heal: 0.25 , cap: 4 },
  moonknight: { r: 21, hp: 2000, speed: 90, dmg: 20, xp: 12, mass: 7,  ai: "charger", rig: "knight",  c: 0x3a3a5a, c2: 0x2a2a3a, c3: 0xc0c8ff, elite: true },
  king:     { r: 36, hp: 11000, speed: 64, dmg: 28, xp: 50, mass: 40,  ai: "king",   rig: "king",     c: 0x3a3a58, c2: 0xc0c8ff, boss: true },
};

// Not spawned by the director: the worm's body and the breakable candles.
MON.wormseg = { r: 22, hp: 1, speed: 0, dmg: 18, xp: 0, mass: 5, ai: "segment", rig: "wormseg", c: 0x7a9ec0, c2: 0x2a4a6a, part: true };
MON.candle = { r: 10, hp: 12, speed: 0, dmg: 0, xp: 0, mass: 1, ai: "prop", rig: "candle", c: 0xffd28a, c2: 0x3a3230, prop: true };

for (const [id, d] of Object.entries(MON)) d.id = id;

// Worm body segments are not spawned on their own: the head brings them.
export const WORM_SEGMENTS = 14;
export const WORM_SEG_R = 22;
