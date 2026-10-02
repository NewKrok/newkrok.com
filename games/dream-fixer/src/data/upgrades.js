import { TOOLS } from "../sim/tools.js";

// ── Workbench upgrades ───────────────────────────────────────────────────
// Bought once each with dream dust; they change the tool numbers for every
// dream after.

export const UPGRADES = [
  { id: "stab_fins", tool: "stabilizer", cost: 40 },
  { id: "stab_charge", tool: "stabilizer", cost: 60 },
  { id: "vac_motor", tool: "vacuum", cost: 50 },
  { id: "vac_bang", tool: "vacuum", cost: 60 },
  { id: "wake_coffee", tool: null, cost: 50 },
  { id: "wake_magnet", tool: null, cost: 30 },
];

// A tool's numbers with the owned upgrades applied.
export function toolDef(id, owned = {}) {
  const d = structuredClone(TOOLS[id]);
  if (id === "stabilizer") {
    if (owned.stab_fins) { d.heat *= 0.75; d.charge.heat *= 0.75; d.cool *= 1.2; }
    if (owned.stab_charge) { d.charge.time *= 0.65; d.charge.damage *= 1.3; }
  } else if (id === "vacuum") {
    if (owned.vac_motor) { d.pull *= 1.35; d.range += 2; d.suckHeat *= 0.8; }
    if (owned.vac_bang) { d.launch.damage *= 1.3; d.launch.splash *= 1.4; }
  }
  return d;
}

export const maxHpFor = (owned = {}) => 75 + (owned.wake_coffee ? 20 : 0);
export const magnetFor = (owned = {}) => (owned.wake_magnet ? 9 : 4.5);
