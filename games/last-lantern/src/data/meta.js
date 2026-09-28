// ── Heroes, arsenal, passives and the Hearth ─────────────────────────────
// Names and descriptions live in i18n; these are the numbers.

// Each hero starts with one weapon, has a stat twist and one active ability
// on Space (or the on-screen button).
export const HEROES = [
  { id: "wren",  weapon: "flail",    active: "flare",     hp: 100, speed: 175, armor: 0, might: 1,    area: 1.1,  color: 0x8a1e2a, trim: 0xffd166, unlock: null },
  { id: "mira",  weapon: "crossbow", active: "tumble",    hp: 85,  speed: 192, armor: 0, might: 1,    area: 1,    color: 0x2f5a3a, trim: 0xc9a35a, unlock: { stage: 0 } },
  { id: "oskar", weapon: "bell",     active: "sanctuary", hp: 135, speed: 164, armor: 1, might: 1.08,    area: 1,    color: 0x4a3a6a, trim: 0xe0c070, unlock: { stage: 1 } },
  { id: "sable", weapon: "spades",   active: "dig",       hp: 100, speed: 176, armor: 0, might: 1.12, area: 1,    color: 0x3a3230, trim: 0xa0b0c0, unlock: { stage: 2 } },
];

// Active abilities: cooldown in seconds.
export const ACTIVES = {
  flare:     { cd: 14 },
  tumble:    { cd: 4.5 },
  sanctuary: { cd: 24 },
  dig:       { cd: 11 },
};

// Weapons (fire logic in sim/weapons.js). `evo` names the passive that turns
// a max-level weapon into its evolved form when you open a chest.
export const WEAPON_IDS = ["flail", "crossbow", "knives", "bell", "spades", "storm", "water", "hook", "wisps", "sickle", "censer", "raven"];
export const WEAPON_META = {
  flail:    { color: "#ffd166", evo: "oil",    into: "sunflail" },
  crossbow: { color: "#79c0ff", evo: "tome",   into: "dawnbreaker" },
  knives:   { color: "#c9d1d9", evo: "boots",  into: "edges" },
  bell:     { color: "#e0c070", evo: "heart",  into: "toll" },
  spades:   { color: "#a0b0c0", evo: "plate",  into: "halo" },
  storm:    { color: "#ffe066", evo: "clover", into: "wrath", unlock: { stage: 0 } },
  water:    { color: "#7ad8ff", evo: "root",   into: "font",  unlock: { level: 25 } },
  hook:     { color: "#d2a8ff", evo: "fist",   into: "reaper", unlock: { kills: 2500 } },
  wisps:    { color: "#ffb86a", evo: "chrism", into: "choir" },
  sickle:   { color: "#d8e0e8", evo: "quiver", into: "harvest" },
  censer:   { color: "#c9a35a", evo: "magnet", into: "thurible", unlock: { stage: 0 } },
  raven:    { color: "#8a8aa8", evo: "feather", into: "unkindness", unlock: { level: 15 } },
  // Evolved forms.
  sunflail:    { color: "#ffb347", evolved: true },
  dawnbreaker: { color: "#bfe3ff", evolved: true },
  edges:       { color: "#ffffff", evolved: true },
  toll:        { color: "#ffe9a8", evolved: true },
  halo:        { color: "#dfe8f0", evolved: true },
  wrath:       { color: "#fff3a0", evolved: true },
  font:        { color: "#b8f0ff", evolved: true },
  reaper:      { color: "#e8c8ff", evolved: true },
  choir:       { color: "#ffd8a0", evolved: true },
  harvest:     { color: "#ffffff", evolved: true },
  thurible:    { color: "#ffe0a0", evolved: true },
  unkindness:  { color: "#b8b8e0", evolved: true },
};

export const PASSIVE_IDS = ["boots", "heart", "magnet", "tome", "fist", "plate", "root", "oil", "clover", "quiver", "chrism", "feather"];
export const PASSIVE_META = {
  boots:  { color: "#7ee787" },
  heart:  { color: "#ff7b72" },
  magnet: { color: "#79c0ff" },
  tome:   { color: "#d2a8ff" },
  fist:   { color: "#ffa657" },
  plate:  { color: "#8b949e" },
  root:   { color: "#3fb950" },
  oil:    { color: "#ffd166" },
  clover: { color: "#56d364" },
  quiver: { color: "#e3b341" },
  chrism: { color: "#f0c070" },
  feather: { color: "#8a8aa8" },
};

// Relics: one-off finds from elites' chests, at most two per run. Each has
// a single strong effect that bends a build; the numbers live in sim/run.js.
export const RELIC_IDS = ["martyr", "ravenskull", "bloodseal", "pilgrim", "hourglass", "saintsbone", "thorns", "mirror", "wick", "souljar", "clapper", "reliquary", "keys", "leechtooth", "stormglass", "ghostlamp"];
export const MAX_RELICS = 2;

// The Hearth: permanent upgrades bought with embers between runs.
export const HEARTH = [
  { id: "might",     max: 10, cost: 60 },    // +8 % damage
  { id: "vitality",  max: 10, cost: 50 },    // +15 max health
  { id: "armor",     max: 5,  cost: 120 },   // −1 damage taken
  { id: "recovery",  max: 8,  cost: 70 },    // +0.3 health / s
  { id: "swift",     max: 5,  cost: 80 },    // +6 % move speed
  { id: "radiance",  max: 5,  cost: 90 },    // +6 % area
  { id: "haste",     max: 6,  cost: 150 },   // −4 % cooldowns
  { id: "reach",     max: 5,  cost: 50 },    // +20 % pickup range
  { id: "growth",    max: 8,  cost: 90 },    // +5 % experience
  { id: "headstart", max: 3,  cost: 220 },   // +2 levels at the start of every run
  { id: "greed",     max: 8,  cost: 70 },    // +10 % embers
  { id: "luck",      max: 5,  cost: 100 },   // +8 % luck
  { id: "legion",    max: 1,  cost: 1200 },  // +1 projectile for every weapon
  { id: "reroll",    max: 5,  cost: 120 },   // +1 reroll per run
  { id: "banish",    max: 5,  cost: 120 },   // +1 banish per run
  { id: "revival",   max: 2,  cost: 600 },   // come back at half health
  // Mastery: each lantern-bearer's ability, three steps (sim/run.js).
  { id: "m_wren",    max: 3,  cost: 250, hero: "wren" },
  { id: "m_mira",    max: 3,  cost: 250, hero: "mira" },
  { id: "m_oskar",   max: 3,  cost: 250, hero: "oskar" },
  { id: "m_sable",   max: 3,  cost: 250, hero: "sable" },
];
export const hearthCost = (u, lvl) => Math.round(u.cost * (1 + lvl * 0.9));
