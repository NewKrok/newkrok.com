import { TOOLS } from "../sim/tools.js";

// ── The workbench ────────────────────────────────────────────────────────
// Four pages: the tools, you (the fixer), Cog and the kit. Upgrades are
// bought a level at a time with dream dust (`costs` holds one price per
// level) and last for every dream after; kit is bought by the piece, kept
// in your pockets and used up in a dream.
//
// progress.upgrades[id] is the level owned (an old save may say `true`:
// that is level 1). `stat(l)` is what the upgrade changes at level l, for
// the bench's "now → next" line; `model` is what its preview shows.

export const TABS = ["tools", "me", "cog", "kit"];

const pct = (v) => `${Math.round(v * 100)}%`;
const num = (v, d = 1) => String(Math.round(v * 10 ** d) / 10 ** d);

export const UPGRADES = [
  // ── The Stabilizer ──
  { id: "stab_fins", tab: "tools", group: "stabilizer", model: "stabilizer", costs: [35, 70, 120], stat: (l) => pct(1 - 0.12 * l) },
  { id: "stab_lens", tab: "tools", group: "stabilizer", model: "stabilizer", costs: [50, 100, 160], stat: (l) => pct(1 + 0.15 * l) },
  { id: "stab_trigger", tab: "tools", group: "stabilizer", model: "stabilizer", costs: [70, 140], stat: (l) => num(1 / (TOOLS.stabilizer.interval * (1 - 0.12 * l))) },
  { id: "stab_charge", tab: "tools", group: "stabilizer", model: "stabilizer", costs: [45, 90, 150], stat: (l) => `${num(TOOLS.stabilizer.charge.time * (1 - 0.13 * l), 2)} s` },
  // ── The Fuzz Vacuum (once you have it) ──
  { id: "vac_motor", tab: "tools", group: "vacuum", model: "vacuum", needs: "vacuum", costs: [40, 85, 140], stat: (l) => `${num(TOOLS.vacuum.range + 1.2 * l)} m` },
  { id: "vac_throat", tab: "tools", group: "vacuum", model: "vacuum", needs: "vacuum", costs: [50, 110], stat: (l) => pct(1 + 0.3 * l) },
  { id: "vac_tank", tab: "tools", group: "vacuum", model: "vacuum", needs: "vacuum", costs: [80, 160], stat: (l) => String(TOOLS.vacuum.tankSize + l) },
  { id: "vac_bang", tab: "tools", group: "vacuum", model: "vacuum", needs: "vacuum", costs: [45, 90, 150], stat: (l) => `${num(TOOLS.vacuum.launch.splash * (1 + 0.2 * l))} m` },
  // ── The Foam Cannon (once you have it) ──
  { id: "foam_nozzle", tab: "tools", group: "foam", model: "foam", needs: "foam", costs: [45, 90, 150], stat: (l) => pct(1 + 0.25 * l) },
  { id: "foam_mix", tab: "tools", group: "foam", model: "foam", needs: "foam", costs: [50, 100, 160], stat: (l) => `${num(TOOLS.foam.hold + 0.7 * l)} s` },
  { id: "foam_set", tab: "tools", group: "foam", model: "foam", needs: "foam", costs: [40, 85, 140], stat: (l) => `${TOOLS.foam.step.life + 5 * l} s` },
  { id: "foam_tank", tab: "tools", group: "foam", model: "foam", needs: "foam", costs: [80, 160], stat: (l) => String(TOOLS.foam.step.max + l) },
  // ── You ──
  { id: "wake_coffee", tab: "me", model: "mugCoffee", costs: [45, 90, 150], stat: (l) => String(maxHpFor({ wake_coffee: l })) },
  { id: "wake_pad", tab: "me", model: "vest", costs: [55, 110, 180], stat: (l) => pct(1 - 0.1 * l) },
  { id: "wake_lungs", tab: "me", model: "balloon", costs: [30, 65, 110], stat: (l) => `${num(perksFor({ wake_lungs: l }).stamina.run)} s` },
  { id: "wake_shoes", tab: "me", model: "slipper", costs: [50, 110], stat: (l) => `${num(6.4 * (1 + 0.06 * l))} m/s` },
  { id: "wake_magnet", tab: "me", model: "magnet", costs: [30, 70], stat: (l) => `${num(magnetFor({ wake_magnet: l }))} m` },
  { id: "wake_sieve", tab: "me", model: "sieve", costs: [90, 180], stat: (l) => pct(0.25 * l) },
  { id: "wake_pocket", tab: "me", model: "pouch", costs: [50, 110], stat: (l) => String(pocketFor({ wake_pocket: l })) },
  // ── Cog ──
  { id: "cog_fetch", tab: "cog", model: "csavar", glow: 0xffd27a, costs: [60, 130], stat: (l) => (l ? `${perksFor({ cog_fetch: l }).cog.fetch} m` : "—") },
  { id: "cog_heal", tab: "cog", model: "csavar", glow: 0xff7aa0, costs: [70, 130, 200], stat: (l) => (l ? `${num(perksFor({ cog_heal: l }).cog.heal)}/s` : "—") },
  { id: "cog_zap", tab: "cog", model: "csavar", glow: 0x7ff5e0, costs: [80, 150, 220], stat: (l) => (l ? `${num(perksFor({ cog_zap: l }).cog.zap.every)} s` : "—") },
  { id: "cog_scout", tab: "cog", model: "csavar", glow: 0xffe7a8, costs: [50], stat: (l) => (l ? "✓" : "—") },
];

// Kit: used up in a dream. key / pad: the key and the pad button that use it.
export const ITEMS = [
  { id: "pillow", cost: 20, key: "G", pad: "B", model: "pillowBomb" },
  { id: "espresso", cost: 15, key: "C", pad: "↑", model: "espresso" },
  { id: "cocoa", cost: 15, key: "V", pad: "↓", model: "mugCocoa" },
];
// What each piece does.
export const ITEM = {
  pillow: { speed: 15, up: 3.5, damage: 7, splash: 4.2, sleep: 1.8 },
  espresso: { time: 12, speed: 1.3 },
  cocoa: { heal: 25 },
};

// Not on sale yet: a tool's upgrades wait until you have the tool.
export const isLocked = (u, progress) => !!u.needs && !progress.tools.includes(u.needs);

export const level = (owned = {}, id) => (owned[id] === true ? 1 : Number(owned[id]) || 0);
export const maxLevel = (u) => u.costs.length;
export const nextCost = (u, owned) => u.costs[level(owned, u.id)] ?? null;

// A tool's numbers with the owned upgrades applied.
export function toolDef(id, owned = {}) {
  const d = structuredClone(TOOLS[id]);
  const L = (k) => level(owned, k);
  if (id === "stabilizer") {
    const f = L("stab_fins"), n = L("stab_lens"), r = L("stab_trigger"), c = L("stab_charge");
    d.heat *= 1 - 0.12 * f; d.charge.heat *= 1 - 0.12 * f; d.cool *= 1 + 0.1 * f;
    d.damage *= 1 + 0.15 * n; d.charge.damage *= 1 + 0.15 * n; d.spread *= 1 - 0.2 * n;
    d.interval *= 1 - 0.12 * r;
    d.charge.time *= 1 - 0.13 * c; d.charge.damage *= 1 + 0.12 * c;
  } else if (id === "vacuum") {
    const m = L("vac_motor"), w = L("vac_throat"), k = L("vac_tank"), b = L("vac_bang");
    d.pull *= 1 + 0.2 * m; d.range += 1.2 * m; d.suckHeat *= 1 - 0.1 * m;
    d.cone *= 1 + 0.12 * w; d.stream *= 1 + 0.3 * w;
    d.tankSize += k;
    d.launch.damage *= 1 + 0.2 * b; d.launch.splash *= 1 + 0.2 * b;
  } else if (id === "foam") {
    const n = L("foam_nozzle"), m = L("foam_mix"), s = L("foam_set"), k = L("foam_tank");
    d.soak *= 1 + 0.25 * n; d.heat *= 1 - 0.1 * n;
    d.hold += 0.7 * m;
    d.step.life += 5 * s;
    d.step.max += k;
  }
  return d;
}

export const maxHpFor = (owned = {}) => 50 + 12 * level(owned, "wake_coffee");
export const magnetFor = (owned = {}) => [4.5, 7, 9.5][level(owned, "wake_magnet")];
// How many of each kit piece fit in your pockets.
export const pocketFor = (owned = {}) => 2 + level(owned, "wake_pocket");

// Everything else the upgrades change in a dream.
export function perksFor(owned = {}) {
  const L = (k) => level(owned, k);
  const lungs = L("wake_lungs"), heal = L("cog_heal"), zap = L("cog_zap");
  return {
    hurt: 1 - 0.1 * L("wake_pad"),
    speed: 1 + 0.06 * L("wake_shoes"),
    stamina: { run: 1 + 0.4 * lungs, refill: 2.5 * (1 - 0.15 * lungs) },
    sieve: 0.25 * L("wake_sieve"),          // chance of half as much dust again from a glitch
    cog: {
      fetch: [0, 11, 17][L("cog_fetch")],   // metres round you Cog goes to fetch dust from
      heal: [0, 0.6, 1, 1.5][heal],         // wakefulness a second, after a quiet while
      zap: zap ? { every: [0, 3.2, 2.5, 1.8][zap], damage: [0, 1, 1.3, 1.6][zap], range: 11 } : null,
      scout: L("cog_scout") > 0,
    },
  };
}
