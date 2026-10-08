import { TOOLS } from "../sim/tools.js";
import { rankFor } from "./progression.js";

// ── The workbench ────────────────────────────────────────────────────────
// Four pages: the tools, you (the fixer), Cog and the kit. Upgrades are
// bought a level at a time with dream dust (`costs` holds one price per
// level) and last for every dream after; kit is bought by the piece, kept
// in your pockets and used up in a dream.
//
// progress.upgrades[id] is the level owned (an old save may say `true`:
// that is level 1). `ranks` holds the rank (see progression.js) each
// level needs; a piece of kit needs its `rank` once. `stat(l)` is what the upgrade changes at level l, for
// the bench's "now → next" line; `model` is what its preview shows.

export const TABS = ["tools", "me", "cog", "kit"];

const pct = (v) => `${Math.round(v * 100)}%`;
const num = (v, d = 1) => String(Math.round(v * 10 ** d) / 10 ** d);

// Five small steps rather than a few big ones, spread over the week: a
// level or so of each opens per night (park ≈ rank 4, one time through ≈
// 11), and the last levels wait for a second time through (12–15). A tool's
// upgrades open from about the rank you have when it arrives.
export const UPGRADES = [
  // ── The Stabilizer ──
  { id: "stab_fins", tab: "tools", group: "stabilizer", model: "stabilizer", costs: [10, 10, 15, 15, 20], ranks: [2, 5, 8, 11, 13], stat: (l) => pct(1 - 0.07 * l) },
  { id: "stab_lens", tab: "tools", group: "stabilizer", model: "stabilizer", costs: [10, 15, 20, 25, 30], ranks: [1, 5, 8, 11, 14], stat: (l) => pct(1 + 0.09 * l) },
  { id: "stab_trigger", tab: "tools", group: "stabilizer", model: "stabilizer", costs: [10, 10, 15, 15, 20], ranks: [3, 6, 9, 12, 15], stat: (l) => num(1 / (TOOLS.stabilizer.interval * (1 - 0.05 * l))) },
  { id: "stab_charge", tab: "tools", group: "stabilizer", model: "stabilizer", costs: [10, 15, 15, 20, 25], ranks: [2, 6, 9, 12, 14], stat: (l) => `${num(TOOLS.stabilizer.charge.time * (1 - 0.08 * l), 2)} s` },
  // ── The Fuzz Vacuum (once you have it) ──
  { id: "vac_motor", tab: "tools", group: "vacuum", model: "vacuum", needs: "vacuum", costs: [10, 15, 15, 20, 25], ranks: [1, 4, 7, 10, 13], stat: (l) => `${num(TOOLS.vacuum.range + 0.72 * l)} m` },
  { id: "vac_throat", tab: "tools", group: "vacuum", model: "vacuum", needs: "vacuum", costs: [5, 10, 15, 15, 15], ranks: [2, 5, 8, 11, 14], stat: (l) => pct(1 + 0.12 * l) },
  { id: "vac_tank", tab: "tools", group: "vacuum", model: "vacuum", needs: "vacuum", costs: [30, 55], ranks: [3, 12], stat: (l) => String(TOOLS.vacuum.tankSize + l) },
  { id: "vac_bang", tab: "tools", group: "vacuum", model: "vacuum", needs: "vacuum", costs: [10, 15, 15, 20, 25], ranks: [2, 6, 9, 12, 15], stat: (l) => `${num(TOOLS.vacuum.launch.splash * (1 + 0.12 * l))} m` },
  // ── The Foam Cannon (once you have it) ──
  { id: "foam_nozzle", tab: "tools", group: "foam", model: "foam", needs: "foam", costs: [10, 15, 15, 20, 25], ranks: [4, 5, 7, 11, 13], stat: (l) => pct(1 + 0.15 * l) },
  { id: "foam_mix", tab: "tools", group: "foam", model: "foam", needs: "foam", costs: [10, 15, 20, 25, 30], ranks: [4, 6, 8, 12, 14], stat: (l) => `${num(TOOLS.foam.hold + 0.42 * l)} s` },
  { id: "foam_set", tab: "tools", group: "foam", model: "foam", needs: "foam", costs: [10, 15, 15, 20, 25], ranks: [5, 6, 9, 12, 14], stat: (l) => `${TOOLS.foam.step.life + 3 * l} s` },
  { id: "foam_tank", tab: "tools", group: "foam", model: "foam", needs: "foam", costs: [30, 55], ranks: [6, 13], stat: (l) => String(TOOLS.foam.step.max + l) },
  // ── The Lullaby Bell (once you have it) ──
  { id: "bell_rim", tab: "tools", group: "bell", model: "bell", needs: "bell", costs: [10, 15, 15, 20, 25], ranks: [6, 7, 9, 12, 14], stat: (l) => `${num(TOOLS.bell.range + 0.9 * l)} m` },
  { id: "bell_clapper", tab: "tools", group: "bell", model: "bell", needs: "bell", costs: [10, 15, 20, 25, 30], ranks: [6, 8, 10, 13, 15], stat: (l) => pct(1 + 0.15 * l) },
  { id: "bell_lull", tab: "tools", group: "bell", model: "bell", needs: "bell", costs: [15, 15, 20, 25, 35], ranks: [7, 8, 10, 12, 14], stat: (l) => `${num(TOOLS.bell.lull.sleep + 0.9 * l)} s` },
  { id: "bell_box", tab: "tools", group: "bell", model: "bell", needs: "bell", costs: [5, 10, 15, 15, 15], ranks: [7, 9, 11, 13, 15], stat: (l) => `${num(TOOLS.bell.lull.r1 + 0.6 * l)} m` },
  // ── The Gust Umbrella (once you have it) ──
  { id: "umb_canopy", tab: "tools", group: "umbrella", model: "umbrella", needs: "umbrella", costs: [10, 15, 15, 20, 25], ranks: [7, 8, 10, 12, 14], stat: (l) => `${num(TOOLS.umbrella.glide.fall * (1 - 0.09 * l))} m/s` },
  { id: "umb_ribs", tab: "tools", group: "umbrella", model: "umbrella", needs: "umbrella", costs: [10, 15, 20, 25, 30], ranks: [7, 9, 11, 13, 15], stat: (l) => pct(1 + 0.12 * l) },
  { id: "umb_spring", tab: "tools", group: "umbrella", model: "umbrella", needs: "umbrella", costs: [5, 10, 15, 15, 15], ranks: [8, 9, 11, 13, 14], stat: (l) => num(1 / (TOOLS.umbrella.interval * (1 - 0.06 * l))) },
  { id: "umb_cloth", tab: "tools", group: "umbrella", model: "umbrella", needs: "umbrella", costs: [10, 15, 20, 25, 30], ranks: [8, 10, 11, 13, 15], stat: (l) => pct(TOOLS.umbrella.shield.guard - 0.042 * l) },
  // ── The Star Yo-Yo (once you have it) ──
  { id: "yoyo_string", tab: "tools", group: "yoyo", model: "yoyo", needs: "yoyo", costs: [10, 15, 15, 20, 25], ranks: [9, 10, 11, 13, 14], stat: (l) => `${num(TOOLS.yoyo.range + 1.2 * l)} m` },
  { id: "yoyo_weight", tab: "tools", group: "yoyo", model: "yoyo", needs: "yoyo", costs: [10, 15, 20, 25, 30], ranks: [9, 10, 12, 13, 15], stat: (l) => pct(1 + 0.15 * l) },
  { id: "yoyo_bearing", tab: "tools", group: "yoyo", model: "yoyo", needs: "yoyo", costs: [5, 10, 15, 15, 15], ranks: [9, 11, 12, 14, 15], stat: (l) => `${num(TOOLS.yoyo.speed * (1 + 0.06 * l))} m/s` },
  { id: "yoyo_knot", tab: "tools", group: "yoyo", model: "yoyo", needs: "yoyo", costs: [10, 15, 20, 25, 30], ranks: [10, 11, 12, 13, 15], stat: (l) => `${num(TOOLS.yoyo.lasso.tie + 0.6 * l)} s` },
  // ── The Dream Sand sack (once you have it) ──
  { id: "sand_fine", tab: "tools", group: "sand", model: "sand", needs: "sand", costs: [10, 15, 15, 20, 25], ranks: [10, 11, 12, 13, 14], stat: (l) => pct(1 + 0.15 * l) },
  { id: "sand_deep", tab: "tools", group: "sand", model: "sand", needs: "sand", costs: [10, 15, 20, 25, 30], ranks: [10, 11, 12, 14, 15], stat: (l) => `${num(TOOLS.sand.sleep + 0.9 * l)} s` },
  { id: "sand_reach", tab: "tools", group: "sand", model: "sand", needs: "sand", costs: [5, 10, 15, 15, 15], ranks: [10, 11, 13, 14, 15], stat: (l) => `${num(TOOLS.sand.path.len + 0.6 * l)} m` },
  { id: "sand_dune", tab: "tools", group: "sand", model: "sand", needs: "sand", costs: [10, 15, 20, 25, 30], ranks: [10, 12, 13, 14, 15], stat: (l) => `${num(TOOLS.sand.path.life + 1.8 * l)} s` },
  // ── You ──
  { id: "wake_coffee", tab: "me", model: "mugCoffee", costs: [10, 15, 15, 20, 25], ranks: [1, 4, 7, 10, 13], stat: (l) => String(maxHpFor({ wake_coffee: l })) },
  { id: "wake_pad", tab: "me", model: "vest", costs: [15, 15, 20, 30, 35], ranks: [3, 6, 9, 12, 14], stat: (l) => pct(1 - 0.06 * l) },
  { id: "wake_lungs", tab: "me", model: "balloon", costs: [10, 10, 15, 15, 20], ranks: [1, 3, 6, 9, 12], stat: (l) => `${num(perksFor({ wake_lungs: l }).stamina.run)} s` },
  { id: "wake_shoes", tab: "me", model: "slipper", costs: [15, 20, 30], ranks: [3, 8, 13], stat: (l) => `${num(6.4 * (1 + 0.04 * l))} m/s` },
  { id: "wake_magnet", tab: "me", model: "magnet", costs: [5, 5, 5, 10, 10], ranks: [1, 4, 7, 10, 13], stat: (l) => `${num(magnetFor({ wake_magnet: l }))} m` },
  { id: "wake_sieve", tab: "me", model: "sieve", costs: [15, 20, 30, 35], ranks: [5, 8, 11, 14], stat: (l) => pct(0.125 * l) },
  { id: "wake_pocket", tab: "me", model: "pouch", costs: [20, 40], ranks: [5, 13], stat: (l) => String(pocketFor({ wake_pocket: l })) },
  // ── Cog ──
  { id: "cog_fetch", tab: "cog", model: "csavar", glow: 0xffd27a, costs: [20, 45], ranks: [4, 12], stat: (l) => (l ? `${perksFor({ cog_fetch: l }).cog.fetch} m` : "—") },
  { id: "cog_heal", tab: "cog", model: "csavar", glow: 0xff7aa0, costs: [25, 45, 70], ranks: [5, 9, 14], stat: (l) => (l ? `${num(perksFor({ cog_heal: l }).cog.heal)}/s` : "—") },
  { id: "cog_zap", tab: "cog", model: "csavar", glow: 0x7ff5e0, costs: [30, 50, 75], ranks: [4, 8, 14], stat: (l) => (l ? `${num(perksFor({ cog_zap: l }).cog.zap.every)} s` : "—") },
  { id: "cog_scout", tab: "cog", model: "csavar", glow: 0xffe7a8, costs: [20], ranks: [3], stat: (l) => (l ? "✓" : "—") },
];

// Kit: used up in a dream. key / pad: the key and the pad button that use it.
export const ITEMS = [
  { id: "pillow", cost: 20, rank: 3, key: "G", pad: "B", model: "pillowBomb" },
  { id: "espresso", cost: 15, rank: 2, key: "C", pad: "↑", model: "espresso" },
  { id: "cocoa", cost: 15, rank: 1, key: "V", pad: "↓", model: "mugCocoa" },
];
// What each piece does.
export const ITEM = {
  pillow: { speed: 15, up: 3.5, damage: 7, splash: 4.2, sleep: 1.8 },
  espresso: { time: 12, speed: 1.3 },
  cocoa: { heal: 25 },
};

// Not on sale yet: a tool's upgrades wait until you have the tool, and
// every level (every piece of kit) for your rank. Why: { tool } or { rank }.
export function lockOf(u, progress) {
  if (u.needs && !progress.tools.includes(u.needs)) return { tool: u.needs };
  const need = u.ranks ? u.ranks[level(progress.upgrades, u.id)] : u.rank;
  return need && rankFor(progress.xp) < need ? { rank: need } : null;
}
export const isLocked = (u, progress) => !!lockOf(u, progress);

export const level = (owned = {}, id) => (owned[id] === true ? 1 : Number(owned[id]) || 0);
export const maxLevel = (u) => u.costs.length;
export const nextCost = (u, owned) => u.costs[level(owned, u.id)] ?? null;

// A tool's numbers with the owned upgrades applied.
export function toolDef(id, owned = {}) {
  const d = structuredClone(TOOLS[id]);
  const L = (k) => level(owned, k);
  if (id === "stabilizer") {
    const f = L("stab_fins"), n = L("stab_lens"), r = L("stab_trigger"), c = L("stab_charge");
    d.heat *= 1 - 0.07 * f; d.charge.heat *= 1 - 0.07 * f; d.cool *= 1 + 0.06 * f;
    d.damage *= 1 + 0.09 * n; d.charge.damage *= 1 + 0.09 * n; d.spread *= 1 - 0.12 * n;
    d.interval *= 1 - 0.05 * r;
    d.charge.time *= 1 - 0.08 * c; d.charge.damage *= 1 + 0.07 * c;
  } else if (id === "vacuum") {
    const m = L("vac_motor"), w = L("vac_throat"), k = L("vac_tank"), b = L("vac_bang");
    d.pull *= 1 + 0.12 * m; d.range += 0.72 * m; d.suckHeat *= 1 - 0.06 * m;
    d.cone *= 1 + 0.05 * w; d.stream *= 1 + 0.12 * w;
    d.tankSize += k;
    d.launch.damage *= 1 + 0.12 * b; d.launch.splash *= 1 + 0.12 * b;
  } else if (id === "foam") {
    const n = L("foam_nozzle"), m = L("foam_mix"), s = L("foam_set"), k = L("foam_tank");
    d.soak *= 1 + 0.15 * n; d.heat *= 1 - 0.06 * n;
    d.hold += 0.42 * m;
    d.step.life += 3 * s;
    d.step.max += k;
  } else if (id === "bell") {
    const r = L("bell_rim"), c = L("bell_clapper"), s = L("bell_lull"), b = L("bell_box");
    d.range += 0.9 * r; d.cone *= 1 + 0.06 * r;
    d.damage *= 1 + 0.15 * c; d.push *= 1 + 0.09 * c;
    d.lull.sleep += 0.9 * s; d.lull.drowsy += 0.6 * s;
    d.lull.r1 += 0.6 * b; d.lull.r0 += 0.2 * b; d.lull.time *= 1 - 0.06 * b; d.lull.heat *= 1 - 0.04 * b;
  } else if (id === "yoyo") {
    const st = L("yoyo_string"), w = L("yoyo_weight"), br = L("yoyo_bearing"), kn = L("yoyo_knot");
    d.range += 1.2 * st; d.reel.speed *= 1 + 0.05 * st;
    d.damage *= 1 + 0.15 * w;
    d.speed *= 1 + 0.06 * br; d.back *= 1 + 0.06 * br; d.heat *= 1 - 0.05 * br;
    d.lasso.tie += 0.6 * kn; d.lasso.big += 0.24 * kn;
  } else if (id === "sand") {
    const f = L("sand_fine"), dp = L("sand_deep"), r = L("sand_reach"), du = L("sand_dune");
    d.drowse *= 1 + 0.15 * f; d.heat *= 1 - 0.06 * f;
    d.sleep += 0.9 * dp; d.drowsy += 0.6 * dp;
    d.range += 0.4 * r; d.path.len += 0.6 * r;
    d.path.life += 1.8 * du;
  } else if (id === "umbrella") {
    const c = L("umb_canopy"), r = L("umb_ribs"), s = L("umb_spring"), w = L("umb_cloth");
    d.glide.fall *= 1 - 0.09 * c; d.glide.air *= 1 + 0.06 * c; d.shield.cone *= 1 + 0.036 * c;
    d.damage *= 1 + 0.12 * r; d.range += 0.24 * r;
    d.interval *= 1 - 0.06 * s; d.heat *= 1 - 0.04 * s;
    d.shield.guard -= 0.042 * w; d.shield.heat *= 1 - 0.12 * w;
  }
  return d;
}

export const maxHpFor = (owned = {}) => 50 + 7 * level(owned, "wake_coffee");
export const magnetFor = (owned = {}) => [4.5, 5.5, 6.5, 7.5, 8.5, 9.5][level(owned, "wake_magnet")];
// How many of each kit piece fit in your pockets.
export const pocketFor = (owned = {}) => 2 + level(owned, "wake_pocket");

// Everything else the upgrades change in a dream.
export function perksFor(owned = {}) {
  const L = (k) => level(owned, k);
  const lungs = L("wake_lungs"), heal = L("cog_heal"), zap = L("cog_zap");
  return {
    hurt: 1 - 0.06 * L("wake_pad"),
    speed: 1 + 0.04 * L("wake_shoes"),
    stamina: { run: 1 + 0.24 * lungs, refill: 2.5 * (1 - 0.09 * lungs) },
    sieve: 0.125 * L("wake_sieve"),          // chance of half as much dust again from a glitch
    cog: {
      fetch: [0, 11, 17][L("cog_fetch")],   // metres round you Cog goes to fetch dust from
      heal: [0, 0.6, 1, 1.5][heal],         // wakefulness a second, after a quiet while
      zap: zap ? { every: [0, 3.2, 2.5, 1.8][zap], damage: [0, 1, 1.3, 1.6][zap], range: 11 } : null,
      scout: L("cog_scout") > 0,
    },
  };
}
