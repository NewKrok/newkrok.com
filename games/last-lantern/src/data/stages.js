// ── The five beacons ─────────────────────────────────────────────────────
// A stage is a walled arena with its own roster. Regular spawns trickle in
// by weight (w0 at `from`, sliding to w1 by the time the boss comes);
// scripted events put rings, walls and elites on top. When the clock reaches
// bossAt the beacon's keeper arrives; killing it lights the beacon and wins
// the stage. The night keeps coming while you fight it, a little slower.
//
// ground: surface that changes movement — "mud" pools slow everyone,
// "ice" makes the hero slide. Text for every stage lives in i18n.

export const STAGES = [
  {
    id: "graveyard",
    world: [2600, 1800],
    bossAt: 300,
    boss: "colossus",
    hpMul: 1.4, dmgMul: 1.3, rate: 1.15,
    mix: [
      ["crow", 0, 5, 2], ["shambler", 0, 5, 4], ["gravebound", 40, 3, 5],
      ["archer", 90, 1.2, 1.6], ["digger", 130, 0.5, 1.1], ["banshee", 180, 0.8, 1.5],
    ],
    events: [
      [60, "ring", "crow", 36], [105, "elite", "headless", 1], [150, "ring", "shambler", 44],
      [210, "elite", "headless", 1], [240, "wall", "gravebound", 40], [275, "ring", "banshee", 24],
    ],
    look: "churchyard",
  },
  {
    id: "mill",
    world: [2800, 1900],
    bossAt: 330,
    boss: "bogmother",
    hpMul: 1.9, dmgMul: 1.55, rate: 1.2,
    mix: [
      ["leech", 0, 6, 3], ["drowned", 0, 5, 4], ["toad", 60, 1.2, 1.8],
      ["bogslime", 100, 1, 1.6], ["wisp", 150, 0.8, 1.4], ["mirebrute", 170, 0.5, 1.1], ["bogwitch", 70, 0.5, 0.9],
    ],
    events: [
      [55, "ring", "leech", 48], [110, "elite", "sentinel", 1], [160, "wall", "drowned", 40],
      [215, "elite", "sentinel", 1], [250, "ring", "bogslime", 20], [300, "ring", "wisp", 28],
    ],
    ground: "mud",
    look: "mill",
  },
  {
    id: "ashwood",
    world: [2800, 2000],
    bossAt: 360,
    boss: "stag",
    hpMul: 2.5, dmgMul: 1.75, rate: 1.25,
    mix: [
      ["imp", 0, 5, 3], ["ashwolf", 0, 3, 4], ["husk", 45, 2, 3],
      ["caller", 100, 1.2, 1.8], ["treant", 150, 0.5, 1.1], ["cinder", 200, 0.8, 1.5], ["ashshaman", 60, 0.5, 0.9],
    ],
    events: [
      [60, "ring", "imp", 40], [120, "elite", "alpha", 1], [170, "pack", "ashwolf", 16],
      [230, "elite", "alpha", 1], [270, "ring", "husk", 30], [320, "pack", "ashwolf", 24],
    ],
    ground: "ash",
    look: "ashwood",
  },
  {
    id: "pass",
    world: [2600, 2200],
    bossAt: 390,
    boss: "wormhead",
    hpMul: 3.1, dmgMul: 1.95, rate: 1.3,
    mix: [
      ["frostbat", 0, 5, 2], ["iceskel", 0, 5, 4], ["snowwolf", 50, 2, 3.5],
      ["shard", 100, 1, 1.6], ["yeti", 150, 0.5, 1.1], ["rime", 200, 0.8, 1.6], ["frostseer", 60, 0.6, 1],
    ],
    events: [
      [60, "ring", "frostbat", 44], [120, "elite", "frostknight", 1], [180, "wall", "iceskel", 44],
      [240, "elite", "frostknight", 1], [280, "pack", "snowwolf", 22], [340, "ring", "rime", 30],
    ],
    ground: "ice",
    look: "pass",
  },
  {
    id: "cathedral",
    world: [2400, 2400],
    bossAt: 450,
    boss: "king",
    hpMul: 3.8, dmgMul: 2.15, rate: 1.35,
    mix: [
      ["gargoyle", 0, 4, 3], ["hollow", 0, 5, 4], ["cultist", 60, 1.2, 1.8],
      ["specter", 120, 0.8, 1.6], ["bellgolem", 160, 0.5, 1.1], ["gravebound", 0, 2, 2], ["hollowpriest", 50, 0.6, 1.1],
    ],
    events: [
      [60, "ring", "gargoyle", 40], [110, "elite", "moonknight", 1], [170, "ring", "hollow", 50],
      [230, "elite", "headless", 2], [290, "wall", "hollow", 48], [340, "elite", "moonknight", 1],
      [390, "ring", "specter", 36],
    ],
    look: "cathedral",
  },
];

STAGES.forEach((s, i) => { s.index = i; });

// Blood Moon: the same stage, much angrier, for more embers.
export const BLOOD = { hp: 1.6, dmg: 1.25, rate: 1.35, embers: 1.75 };
