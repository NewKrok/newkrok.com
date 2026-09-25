import {
  PI, level, hrow, angledRow, park, fill, car, rect, road, paintBays, line, arrow, text, hatch,
  YELLOW, building, tree, shed, scatter, sample, wallLine, range,
} from "./kit.js";

// ── Chapter 4 — Tight spots ──────────────────────────────────────────────

// 16. Building site: between the columns of a new building.
function construction() {
  const cols = [700, 800, 900, 1000, 1100], rows = [200, 300, 400, 500];
  const pillars = cols.flatMap((x) => rows.map((y) => ({ kind: "pillar", x, y, s: 10, style: "site" })));
  return level({
    id: "site", vehicle: "van", name: "Building site", title: "Column Maze", trailer: "box", par: 90, sun: "deck",
    brief: "The bricks go up on the ground floor of the new block. Reverse up between the columns to the marked spot.",
    w: 1200, h: 720, base: "dirt", edge: "rail", backdrop: "town",
    surfaces: [rect("concrete", 680, 180, 1120, 520), rect("gravel", 0, 560, 1200, 700), rect("mud", 300, 560, 420, 620, 20)],
    paint: [paintBays([{ x: 850, y: 300, a: PI / 2, w: 44, l: 70 }], YELLOW), text(850, 350, "BRICKS", { size: 12, color: YELLOW })],
    parked: [car(160, 470, 0, "pickup", 0xf2f0e6), car(1110, 630, PI, "lorry", 0xd9a13a)],
    statics: [
      ...pillars,
      { kind: "wall", x: 900, y: 186, w: 440, h: 8, style: "site", height: 24 },
      { kind: "wall", x: 684, y: 360, a: PI / 2, w: 356, h: 8, style: "site", height: 24 },
      { kind: "wall", x: 1116, y: 360, a: PI / 2, w: 356, h: 8, style: "site", height: 24 },
      { kind: "cabin", x: 150, y: 110, w: 90, h: 30, color: 0x3d6fb6 }, { kind: "cabin", x: 150, y: 150, w: 90, h: 30, color: 0x3d6fb6 },
      { kind: "cabin", x: 280, y: 110, w: 60, h: 30, color: 0xf2f2ee },
      { kind: "skip", x: 480, y: 380, w: 44, h: 26, color: 0xe8c547 }, { kind: "skip", x: 560, y: 180, w: 44, h: 26, color: 0x2f6b4a },
      { kind: "digger", x: 360, y: 260, a: 0.6, color: 0xe8a33a },
      { kind: "rock", x: 1140, y: 120, r: 34 }, { kind: "rock", x: 600, y: 90, r: 26 },
      { kind: "crates", x: 470, y: 690, w: 50, h: 30 }, { kind: "crates", x: 530, y: 694, w: 40, h: 24 },
      { kind: "block", x: 60, y: 300, w: 16, h: 16, height: 26, color: 0x2e86c1 }, { kind: "block", x: 60, y: 330, w: 16, h: 16, height: 26, color: 0x2e86c1 },
    ],
    cones: [{ x: 250, y: 560 }, { x: 250, y: 700 }, { x: 600, y: 560 }, { x: 600, y: 700 }],
    start: { x: 110, y: 632, a: 0 },
    bay: { x: 850, y: 300, a: PI / 2, w: 44, l: 70 },
  });
}

// 17. Car dealer: into the workshop, past the shiny stock.
function dealer() {
  const display = [
    car(170, 230, 0.5, "suv", 0xd9342b), car(260, 230, 0.5, "sedan", 0x1f3a5a), car(350, 230, 0.5, "wagon", 0xf2f0e6),
    car(440, 230, 0.5, "hatch", 0xd9a13a), car(530, 230, 0.5, "suv", 0x2b2d31),
    car(170, 340, -0.5, "hatch", 0x3d6fb6), car(260, 340, -0.5, "sedan", 0x8a1f24), car(350, 340, -0.5, "pickup", 0x6b3b2a),
    car(440, 340, -0.5, "wagon", 0x2f6b4a), car(530, 340, -0.5, "sedan", 0xb8bcc2),
    car(662, 266, PI / 2 - 0.6, "sedan", 0xe8e8e4), car(965, 250, PI / 2 + 0.6, "suv", 0x5b4a8a),
  ];
  const flags = range(0, 8).map((i) => ({ kind: "post", x: 120 + i * 60, y: 160, r: 2, flag: [0xd9342b, 0xf2f2ee, 0x3d6fb6][i % 3] }));
  return level({
    id: "dealer", vehicle: "van", name: "Car dealer", title: "Showroom Shuffle", trailer: "box", par: 75, sun: "noon",
    brief: "Deliver the parts to the workshop at the end of the showroom. Every car out here is brand new — don't touch.",
    w: 1000, h: 620, edge: "wall", backdrop: "town",
    surfaces: [rect("pavement", 90, 140, 620, 165), rect("concrete", 740, 40, 860, 150)],
    paint: [paintBays([{ x: 800, y: 100, a: PI / 2, w: 44, l: 76 }], YELLOW), text(800, 175, "SERVICE", { size: 13, color: YELLOW }), arrow(300, 470, 0), arrow(700, 470, 0)],
    parked: [...display, car(960, 560, PI / 2, "van", 0xf2f0e6), car(60, 560, -PI / 2, "hatch")],
    statics: [
      building(350, 70, 500, 140, { height: 42, color: 0xe8eef4, roof: 0x9aa3ab, glass: true, sign: "AUTO CENTRE", signColor: "#1f3a5a" }),
      ...shed(800, 90, PI / 2, 64, 100, { style: "white", height: 38 }),
      building(930, 70, 130, 140, { height: 38, color: 0xf2f2ee, roof: 0x9aa3ab }),
      ...flags,
      { kind: "planter", x: 640, y: 200, w: 14, h: 60 },
    ],
    cones: [],
    start: { x: 200, y: 470, a: 0 },
    bay: { x: 800, y: 100, a: PI / 2, w: 44, l: 76 },
  });
}

// 18. Motorway services: the caravan bays are angled against the flow.
function services() {
  const slip = [[-40, 780], [300, 770], [520, 700], [700, 640]];
  const vanBays = angledRow(1000, 800, 10, -PI / 4, { w: 46, l: 100 });
  const target = 5;
  const carRows = [hrow(420, 280, 18, -PI / 2), hrow(420, 340, 18, PI / 2), hrow(420, 480, 18, -PI / 2), hrow(420, 540, 18, PI / 2)];
  const lorryBays = angledRow(1340, 260, 6, -PI / 2 + 0.6, { w: 50, l: 200 });
  return level({
    id: "services", vehicle: "suv", name: "Motorway services", title: "Against the Flow", trailer: "caravan", par: 120, sun: "dusk",
    brief: "Off the motorway and round to the caravan bays at the back. They slant against the traffic: drive past, then reverse in.",
    w: 1800, h: 900, edge: "rail", backdrop: "fields",
    surfaces: [road("asphalt", slip, 80), rect("grass", 0, 0, 380, 640), rect("pavement", 700, 170, 1100, 190)],
    paint: [
      ...carRows.map((r) => paintBays(r)), paintBays(vanBays), paintBays(lorryBays), paintBays([{ ...vanBays[target], w: 48 }], YELLOW),
      text(1300, 880, "CARAVANS · COACHES", { size: 13, color: YELLOW }), arrow(900, 680, 0), arrow(1500, 680, 0), arrow(1200, 620, PI),
      text(1560, 90, "HGV", { size: 22, color: YELLOW }),
    ],
    parked: [
      ...carRows.flatMap((r, i) => park(r, fill(18, 0.8, 180 + i), 185 + i)),
      car(vanBays[1].x, vanBays[1].y, vanBays[1].a, "lorry", 0x2e86c1), car(vanBays[8].x, vanBays[8].y, vanBays[8].a, "lorry", 0xd9342b),
    ],
    statics: [
      building(900, 110, 400, 140, { height: 46, color: 0xe8e0d0, roof: 0x2f5f9a, sign: "SERVICES · FOOD · FUEL", signColor: "#2f5f9a", lit: true }),
      ...vanBays.filter((_, i) => [0, 3, 4, 6, 9].includes(i)).map((b) => ({ kind: "vancaravan", x: b.x, y: b.y, a: b.a })),
      ...lorryBays.filter((_, i) => i !== 2).map((b) => ({ kind: "parkedsemi", x: b.x - Math.cos(b.a) * 20, y: b.y - Math.sin(b.a) * 20, a: b.a, color: [0x3d6fb6, 0xf2f0e6, 0x2f6b4a, 0xd9a13a, 0x8a1f24, 0x2b2d31][Math.round(b.x) % 6] })),
      ...[500, 800, 1100].map((x) => ({ kind: "lamp", x, y: 410 })), { kind: "lamp", x: 1200, y: 700 }, { kind: "lamp", x: 1600, y: 700 },
      ...sample([[400, 640], [400, 20]], 60, 0).map((p) => tree(p.x - 40, p.y, 18)),
      { kind: "planter", x: 1180, y: 410, w: 14, h: 280 },
      ...wallLine([[930, 866], [1680, 866]], { kind: "hedge", thick: 10, maxLen: 60 }),
    ],
    cones: [],
    start: { x: 145, y: 774, a: -0.03 },
    bay: { ...vanBays[target], w: 48, l: 100 },
  });
}

// 19. Riverside campsite: between the trees on the bank.
function riverside() {
  const path = [[1440, 700], [1150, 680], [900, 580], [650, 530], [400, 490], [200, 400], [140, 300]];
  const pitches = range(0, 9).map((i) => ({ x: 300 + i * 100, y: 250, a: PI / 2, w: 46, l: 90 }));
  const target = 4;
  const meadow = scatter(191, 16, [100, 330, 1350, 780], (x, y, r) => tree(x, y, 16 + r() * 8), [[560, 290, 840, 580], [0, 440, 1440, 740], [120, 300, 280, 480]]);
  return level({
    id: "river", vehicle: "suv", name: "Riverside camp", title: "River View", trailer: "caravan", par: 120, sun: "golden",
    brief: "Along the winding path to the river bank. Reverse the caravan into pitch 5, between the old oaks, back to the water.",
    w: 1400, h: 800, base: "grass", edge: "hedge", backdrop: "forest",
    surfaces: [rect("water", -500, -600, 1900, 172), rect("sand", 0, 170, 1400, 192), road("gravel", path, 60), ...pitches.map((p) => rect("gravel", p.x - 26, 205, p.x + 26, 296, 8))],
    paint: pitches.map((p, i) => text(p.x, 312, String(i + 1), { size: 12 })),
    parked: [car(1010, 330, 0.2, "suv"), car(500, 330, -0.1, "wagon")],
    statics: [
      { kind: "water", x: 700, y: 85, w: 1400, h: 170 },
      ...pitches.slice(0, -1).map((p) => tree(p.x + 50, 244, 20)),
      tree(250, 244, 20),
      ...pitches.filter((_, i) => [0, 2, 3, 5, 6, 8].includes(i)).map((p) => ({ kind: "vancaravan", x: p.x, y: 248, a: PI / 2 + ((p.x / 100) % 2 ? 0.03 : -0.03) })),
      ...pitches.filter((_, i) => [1, 7].includes(i)).map((p) => ({ kind: "tent", x: p.x, y: 250, w: 30, h: 36, a: 0.1 })),
      { kind: "firepit", x: 700, y: 360 }, { kind: "table", x: 780, y: 330 },
      building(1250, 560, 140, 90, { height: 30, color: 0x8a6a45, roof: 0x3b3f45, sign: "RECEPTION", signColor: "#5a3f1e" }),
      ...meadow,
    ],
    decor: [{ kind: "boat", x: 400, y: 100, a: 0.2, len: 44 }, { kind: "boat", x: 1100, y: 110, a: 3, len: 40 }],
    cones: [],
    start: { x: 1250, y: 696, a: PI + 0.05 },
    bay: { ...pitches[target] },
  });
}

// 20. Airfield: into the hangar, next to the parked plane.
function hangar() {
  const hangars = [350, 750, 1150];
  return level({
    id: "hangar", vehicle: "pickup", name: "Airfield", title: "Wing Tip", trailer: "boat", par: 110, sun: "noon",
    brief: "Store the boat in hangar 2 for the winter. The little plane stays where it is — mind its wing.",
    w: 1500, h: 800, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [rect("asphalt", 0, 560, 1500, 660), rect("concrete", 200, 255, 1300, 560), ...hangars.map((x) => rect("concrete", x - 75, 85, x + 75, 255))],
    paint: [
      line([[0, 610], [1500, 610]], { color: YELLOW, width: 3 }), ...hangars.map((x, i) => text(x, 280, `HANGAR ${i + 1}`, { size: 14, color: YELLOW })),
      paintBays([{ x: 795, y: 170, a: PI / 2, w: 40, l: 86 }], YELLOW), hatch(1380, 300, 1480, 400),
    ],
    parked: [car(1420, 480, PI, "lorry", 0xd33a2c), car(260, 470, 0.3, "suv")],
    statics: [
      ...hangars.flatMap((x) => shed(x, 170, PI / 2, 150, 170, { style: "hangar", height: 64, thick: 8 })),
      { kind: "plane", x: 720, y: 160, a: PI / 2, s: 0.8, color: 0xf2f2ee },
      { kind: "plane", x: 350, y: 170, a: PI / 2, s: 0.8, color: 0xd9342b },
      { kind: "plane", x: 1000, y: 430, a: 0.4, color: 0x3d6fb6 }, { kind: "plane", x: 520, y: 420, a: -0.3, color: 0xe8c547 },
      { kind: "post", x: 1300, y: 720, r: 3, flag: 0xff7a1a },
      building(1400, 150, 150, 120, { height: 40, color: 0xe8eef4, roof: 0x9aa3ab, sign: "AERO CLUB", signColor: "#2f5f9a" }),
    ],
    cones: [{ x: 700, y: 300 }, { x: 890, y: 300 }],
    start: { x: 140, y: 610, a: 0 },
    bay: { x: 795, y: 170, a: PI / 2, w: 40, l: 86 },
  });
}

export const CHAPTER4 = [construction(), dealer(), services(), riverside(), hangar()];
