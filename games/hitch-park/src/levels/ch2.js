import {
  PI, level, hrow, vrow, angledRow, park, fill, car, rect, road, paintBays, line, arrow, text, zebra, hatch,
  YELLOW, WHITE, building, tree, containers, scatter, range,
} from "./kit.js";

// ── Chapter 2 — A working day ────────────────────────────────────────────

// 6. Warehouse: reverse onto a free loading dock between two lorries.
function loadingDock() {
  const docks = range(0, 6).map((i) => 250 + 110 * i);
  const target = 3;
  const staff = hrow(120, 585, 20, -PI / 2);
  return level({
    id: "docks", name: "Warehouse", title: "Dock Three", trailer: "box", par: 60, sun: "deck",
    brief: "Back the trailer onto dock 3, between the two lorries. The yard is big — use it to line up square.",
    w: 1100, h: 620, base: "concrete", edge: "wall", backdrop: "industrial",
    surfaces: [rect("asphalt", 0, 230, 1100, 620), rect("concrete", 100, 110, 1000, 230)],
    paint: [
      paintBays(docks.map((x) => ({ x, y: 145, a: PI / 2, w: 44, l: 64 })), YELLOW),
      ...docks.map((x, i) => text(x, 196, `DOCK ${i + 1}`, { size: 12, color: YELLOW })),
      paintBays(staff), hatch(20, 120, 90, 230), arrow(300, 400, 0), arrow(800, 400, 0),
    ],
    parked: [
      ...docks.filter((_, i) => i !== target).map((x, i) => car(x, 165, PI / 2, "lorry", [0xf2f0e6, 0x3d6fb6, 0xd9342b, 0x2f6b4a, 0xd9a13a][i])),
      ...park(staff, fill(20, 0.7, 6), 61),
    ],
    statics: [
      building(550, 55, 900, 110, { height: 70, color: 0x9aa3ab, roof: 0x6b737c, doors: docks, sign: "NORTHWAY LOGISTICS", signColor: "#1f3a5a" }),
      ...containers(760, 1060, 440, 2, 6),
      { kind: "crates", x: 36, y: 300, w: 40, h: 40 }, { kind: "crates", x: 36, y: 350, w: 40, h: 30 },
      { kind: "block", x: 1050, y: 300, w: 40, h: 30, height: 26, color: 0xe8c547 },
      { kind: "lamp", x: 400, y: 300 }, { kind: "lamp", x: 750, y: 300 },
    ],
    cones: [{ x: 540, y: 250 }, { x: 620, y: 250 }],
    start: { x: 160, y: 340, a: 0 },
    bay: { x: docks[target], y: 145, a: PI / 2, w: 40, l: 64 },
  });
}

// 7. School car park: 90° into the middle row.
function school() {
  const top = hrow(230, 45, 23, PI / 2);
  const midT = hrow(290, 260, 19, -PI / 2);
  const midB = hrow(290, 320, 19, PI / 2);
  const bottom = hrow(230, 535, 23, -PI / 2);
  const target = 11;
  return level({
    id: "school", name: "Primary school", title: "School Run", trailer: "box", par: 55, sun: "noon",
    brief: "Drop-off time. Reverse into the free bay in the middle row, from the lower lane. Mind the planters.",
    w: 1000, h: 580, edge: "fence", backdrop: "town",
    surfaces: [rect("pavement", 180, 0, 200, 580), rect("grass", 200, 0, 220, 580)],
    paint: [
      paintBays(top), paintBays(midT), paintBays(midB), paintBays(bottom), paintBays([{ ...midB[target], w: 34 }], YELLOW),
      text(560, 290, "SCHOOL", { size: 18, color: YELLOW }), zebra(210, 430, 0, 36, 60), arrow(400, 430, 0), arrow(700, 160, PI),
    ],
    parked: [
      ...park(top, fill(23, 0.8, 71), 72), ...park(midT, fill(19, 0.85, 73), 74),
      ...park(midB, fill(19, 0.8, 75, [target]), 76), ...park(bottom, fill(23, 0.75, 77), 78),
    ],
    statics: [
      building(90, 290, 180, 460, { height: 44, color: 0xb8866a, roof: 0x5a4a44, sign: "OAKFIELD SCHOOL", signColor: "#7a3b2e", signSide: "e" }),
      { kind: "planter", x: 270, y: 290, w: 14, h: 110 }, { kind: "planter", x: 890, y: 290, w: 14, h: 110 },
      tree(270, 290, 14), tree(890, 290, 14),
      { kind: "lamp", x: 500, y: 150 }, { kind: "lamp", x: 500, y: 430 },
    ],
    cones: [{ x: 240, y: 400 }, { x: 240, y: 460 }],
    start: { x: 320, y: 430, a: 0 },
    bay: { ...midB[target], w: 34, l: 58 },
  });
}

// 8. Container terminal: find the gap in the stacks.
function containerTerminal() {
  const bands = [120, 350, 580];
  const stacks = [];
  let seed = 11;
  for (const y of bands) {
    for (const [x0, x1] of [[300, 680], [820, 1180], [1320, 1560]]) {
      if (y === 350 && x0 === 820) {
        stacks.push(...containers(820, 960, y, 3, seed++, 68), ...containers(1040, 1180, y, 3, seed++, 68));
      } else stacks.push(...containers(x0, x1, y, 3, seed++));
    }
  }
  return level({
    id: "terminal", name: "Container port", title: "Stack Gap", trailer: "box", par: 100, sun: "noon",
    brief: "In through the gate, up the cross lane, then find the empty slot in the middle stack row and back into it.",
    w: 1600, h: 900, base: "concrete", edge: "rail", backdrop: "industrial",
    surfaces: [rect("asphalt", 0, 700, 1600, 900), rect("asphalt", 680, 0, 820, 700), rect("asphalt", 1180, 0, 1320, 700)],
    paint: [
      line([[0, 800], [1600, 800]], { dash: [24, 18] }), paintBays([{ x: 1000, y: 398, a: PI / 2, w: 44, l: 76 }], YELLOW),
      text(1000, 460, "SLOT B7", { size: 14, color: YELLOW }), arrow(750, 760, -PI / 2, YELLOW), arrow(900, 510, 0, YELLOW),
      hatch(40, 730, 160, 780), text(250, 860, "GATE 2", { size: 18 }),
    ],
    parked: [car(1100, 280, 0, "lorry", 0x3d6fb6), car(520, 510, PI, "lorry", 0xd9342b), car(1450, 740, 0, "lorry", 0xf2f0e6)],
    statics: [
      ...stacks,
      { kind: "wall", x: 1000, y: 353, w: 84, h: 6, height: 30 },
      { kind: "block", x: 180, y: 640, w: 60, h: 40, height: 30, color: 0xe8e0d0 },
      { kind: "block", x: 1450, y: 520, w: 36, h: 70, height: 36, color: 0xe8c547 },
      { kind: "barrier", x: 60, y: 740, w: 6, h: 70 },
      { kind: "lamp", x: 750, y: 300 }, { kind: "lamp", x: 1250, y: 300 }, { kind: "lamp", x: 400, y: 760 },
    ],
    decor: [{ kind: "crane", x: 1000, y: 520, span: 260, a: 0 }],
    cones: [{ x: 960, y: 470 }, { x: 1040, y: 470 }],
    start: { x: 100, y: 820, a: 0 },
    bay: { x: 1000, y: 398, a: PI / 2, w: 44, l: 76 },
  });
}

// 9. Retail park: the long bays for trailers along the east fence.
function retailPark() {
  const rows = [
    [...angledRow(140, 230, 21, PI / 2 - 0.52)],
    [...angledRow(140, 372, 21, -PI / 2 - 0.52)],
    [...angledRow(170, 450, 21, PI / 2 - 0.52)],
    [...angledRow(170, 592, 21, -PI / 2 - 0.52)],
  ];
  const longBays = vrow(1235, 200, 10, PI, { w: 44, l: 90 });
  const target = 4;
  return level({
    id: "retail", name: "Retail park", title: "Long Stay", trailer: "boat", par: 85, sun: "noon",
    brief: "Round to the east fence, where the long bays for trailers are. Pass the free one and reverse the boat in.",
    w: 1300, h: 720, edge: "hedge", backdrop: "town",
    surfaces: [rect("pavement", 40, 120, 1200, 134)],
    paint: [
      ...rows.map((r) => paintBays(r)), paintBays(longBays), paintBays([{ ...longBays[target], w: 44 }], YELLOW),
      text(1235, 150, "TRAILERS", { size: 13, color: YELLOW }), arrow(1100, 500, -PI / 2), arrow(600, 670, 0), arrow(600, 300, PI),
    ],
    parked: [
      ...rows.flatMap((r, i) => park(r, fill(r.length, 0.75, 90 + i), 95 + i)),
      car(1235, 200, PI, "lorry", 0xf2f0e6),
    ],
    statics: [
      building(330, 60, 560, 120, { height: 50, color: 0x2f5f9a, roof: 0x3b3f45, sign: "MEGA DIY", signColor: "#ffffff" }),
      building(930, 60, 520, 120, { height: 46, color: 0xd9a13a, roof: 0x3b3f45, sign: "HOME & GARDEN", signColor: "#ffffff" }),
      ...longBays.filter((_, i) => i !== target && i !== 0 && i !== 7).map((b) => ({ kind: "vancaravan", x: b.x + 6, y: b.y, a: PI })),
      { kind: "trolleys", x: 1040, y: 300, w: 18, h: 50 }, { kind: "trolleys", x: 80, y: 420, w: 18, h: 50 },
      { kind: "lamp", x: 600, y: 300 }, { kind: "lamp", x: 600, y: 520 },
    ],
    cones: [],
    start: { x: 140, y: 668, a: 0 },
    bay: { ...longBays[target], w: 44, l: 90 },
  });
}

// 10. Sports club: the caravan among the others on the grass.
function sportsClub() {
  const plots = hrow(200, 560, 13, -PI / 2, { w: 64, l: 90 });
  const target = 6;
  const pitch = [80, 60, 600, 380];
  const fence = [];
  for (let x = pitch[0]; x <= pitch[2]; x += 40) fence.push({ kind: "fence", x: x + 20, y: pitch[3] + 8, w: 42, h: 3 });
  for (let y = pitch[1]; y < pitch[3]; y += 40) fence.push({ kind: "fence", x: pitch[2] + 8, y: y + 20, a: PI / 2, w: 42, h: 3 });
  return level({
    id: "club", name: "Sports club", title: "Tournament Day", trailer: "caravan", par: 90, sun: "golden",
    brief: "Your first caravan. The camping field is filling up: reverse into the free plot between the other vans.",
    w: 1150, h: 680, base: "grass", edge: "hedge",
    surfaces: [road("gravel", [[1190, 440], [900, 440], [150, 440]], 60), rect("gravel", 690, 150, 1000, 200)],
    paint: [
      line([[pitch[0] + 10, pitch[1] + 10], [pitch[2] - 10, pitch[1] + 10], [pitch[2] - 10, pitch[3] - 10], [pitch[0] + 10, pitch[3] - 10], [pitch[0] + 10, pitch[1] + 10]], { width: 3 }),
      line([[340, pitch[1] + 10], [340, pitch[3] - 10]], { width: 3 }),
      ...plots.map((p) => line([[p.x - 32, 515], [p.x - 32, 605]], { dash: [6, 6], width: 1.5 })),
      paintBays([{ ...plots[target], w: 46 }], YELLOW),
    ],
    parked: [car(1060, 560, -PI / 2, "suv"), car(160, 560, -PI / 2, "wagon")],
    statics: [
      ...fence,
      building(850, 90, 260, 120, { height: 36, color: 0xe8e0d0, roof: 0x2f5f9a, sign: "CLUBHOUSE", signColor: "#2f5f9a" }),
      { kind: "marquee", x: 1030, y: 260, w: 110, h: 80 },
      ...plots.filter((_, i) => i !== target && i % 4 !== 1).map((p) => ({ kind: "vancaravan", x: p.x, y: 566, a: -PI / 2 + ((p.x % 3) - 1) * 0.03 })),
      ...plots.filter((_, i) => i !== target && i % 4 === 1).map((p) => ({ kind: "tent", x: p.x, y: 575, w: 30, h: 36, a: 0.1 })),
      tree(40, 640, 20), tree(1110, 620, 18), tree(660, 60, 20),
    ],
    cones: [],
    start: { x: 1000, y: 440, a: PI },
    bay: { ...plots[target], w: 46, l: 92 },
  });
}

export const CHAPTER2 = [loadingDock(), school(), containerTerminal(), retailPark(), sportsClub()];
