// ── The Pedlar's wares ───────────────────────────────────────────────────
// Consumables bought with embers between runs. Each one is used up when it
// is used (number key, the pad's X, or a tap on the satchel); what is left
// over goes with you into the next run. The effects live in sim/run.js.
//
// heal: share of max health · dur: seconds · cost: embers · color: HUD tint

export const ITEMS = [
  { id: "tonic_s",   cost: 40,  heal: 0.25, color: "#ff7b72" },
  { id: "tonic_m",   cost: 90,  heal: 0.5,  color: "#ff5a48" },
  { id: "tonic_l",   cost: 170, heal: 1,    color: "#e0302a" },
  { id: "ward",      cost: 120, dur: 5,     color: "#9fd8ff" },
  { id: "draught",   cost: 70,  dur: 8,     color: "#7ee787" },
  { id: "firebomb",  cost: 110,             color: "#ffb347" },
  { id: "lodestone", cost: 50,              color: "#79c0ff" },
];
export const ITEM_IDS = ITEMS.map((i) => i.id);
export const ITEM_MAX = 9;           // how many of one kind the satchel holds
export const ITEM_CD = 0.6;          // seconds between two uses
