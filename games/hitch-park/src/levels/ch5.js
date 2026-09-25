import {
  PI, level, hrow, vrow, angledRow, park, fill, car, rect, road, disc, paintBays, line, arrow, text, zebra, hatch,
  YELLOW, WHITE, building, tree, pine, shed, scatter, sample, offsetLine, wallLine, range,
} from "./kit.js";

// ── Chapter 5 — Master of the tow ────────────────────────────────────────

// 21. Mountain lodge: up the switchbacks in the snow.
function mountain() {
  const rd = [[-40, 850], [300, 820], [620, 760], [860, 640], [870, 560], [700, 480], [420, 440], [300, 360], [330, 270], [560, 220], [900, 230]];
  const nearBend = (x, y) => Math.hypot(x - 860, y - 600) < 150 || Math.hypot(x - 310, y - 320) < 150;
  const banks = [
    ...wallLine(offsetLine(rd, 50), { kind: "snowbank", thick: 12, maxLen: 50, skip: (x, y) => nearBend(x, y) || (x > 850 && y < 300) }),
    ...wallLine(offsetLine(rd, -50), { kind: "snowbank", thick: 12, maxLen: 50, skip: (x, y) => nearBend(x, y) || (x > 850 && y < 300) }),
  ];
  const bays = hrow(960, 380, 9, -PI / 2, { w: 46, l: 90 });
  const target = 6;
  const pines = scatter(211, 120, [0, 0, 1400, 900], (x, y, r) => pine(x, y, 14 + r() * 10),
    [[880, 100, 1400, 440], [-50, 760, 700, 900], [560, 560, 980, 800], [240, 180, 1000, 520], [200, 240, 420, 560], [1000, 0, 1400, 120]]);
  return level({
    id: "mountain", name: "Mountain lodge", title: "Switchbacks", trailer: "caravan", par: 130, sun: "noon",
    brief: "Tow the caravan up the snowy switchbacks to the lodge, then reverse it into the free bay at the far side of the car park.",
    w: 1400, h: 900, base: "snow", edge: "none", backdrop: "mountains",
    surfaces: [road("asphalt", rd, 84), disc("asphalt", 860, 600, 140), disc("asphalt", 320, 320, 140), rect("asphalt", 880, 120, 1380, 430, 20)],
    paint: [paintBays(bays), paintBays([{ ...bays[target], w: 48 }], YELLOW), line(rd, { dash: [18, 16], color: "rgba(236,200,70,0.8)" })],
    parked: [...park(bays, [0, 2, 3, 8], 212, ["suv", "wagon", "suv"]), car(1300, 170, PI, "suv"), car(1000, 160, 0, "pickup")],
    statics: [
      ...banks,
      building(1180, 65, 360, 90, { height: 60, color: 0x8a5a3c, roof: 0xf2f4f6, sign: "ALPINE LODGE", signColor: "#5a3f1e", lit: true }),
      ...bays.filter((_, i) => [1, 5, 7].includes(i)).map((b) => ({ kind: "vancaravan", x: b.x, y: b.y + 4, a: -PI / 2 })),
      ...wallLine([[880, 442], [1380, 442]], { kind: "snowbank", thick: 14, maxLen: 60 }),
      ...wallLine([[1382, 120], [1382, 430]], { kind: "snowbank", thick: 14, maxLen: 60 }),
      ...pines,
    ],
    cones: [],
    start: { x: 145, y: 843, a: -0.05 },
    bay: { ...bays[target], w: 48, l: 92 },
  });
}

// 22. Harbour at night: parallel-park the caravan on the quay.
function harbourWall() {
  const quayCars = [car(90, 182, 0, "van", 0xf2f0e6), car(200, 182, 0, "sedan"), car(330, 182, 0, "hatch"), car(470, 182, 0, "van", 0x3d6fb6),
    car(820, 182, 0, "suv"), car(930, 182, 0, "van", 0xd9342b), car(1060, 182, 0, "wagon"), car(1190, 182, 0, "hatch")];
  return level({
    id: "harbour", name: "Fishing harbour", title: "Quayside", trailer: "caravan", par: 120, sun: "night",
    brief: "The last space on the quay, under the lamps. Parallel-park the caravan between the vans — the harbour wall is right there.",
    w: 1300, h: 600, base: "cobble", edge: "none", backdrop: "town",
    surfaces: [rect("water", -500, -600, 1800, 150), rect("asphalt", 0, 160, 1300, 390), rect("pavement", 0, 390, 1300, 410)],
    paint: [line([[0, 206], [1300, 206]], { dash: [10, 10], width: 1.5 }), line([[0, 300], [1300, 300]], { dash: [18, 16] })],
    parked: [...quayCars, car(260, 372, PI, "hatch"), car(700, 372, PI, "sedan"), car(1000, 372, PI, "van")],
    statics: [
      { kind: "water", x: 650, y: 72, w: 1300, h: 146 },
      { kind: "quay", x: 650, y: 154, w: 1300, h: 8 },
      ...range(0, 12).map((i) => ({ kind: "bollard", x: 50 + i * 110, y: 164, r: 3.2 })),
      ...range(0, 7).map((i) => ({ kind: "lamp", x: 90 + i * 190, y: 398 })),
      ...[120, 330, 560, 800, 1040, 1230].map((x, i) => building(x, 505, 190, 180, { height: 40 + (i % 3) * 10, color: [0x3d6fb6, 0xd9342b, 0xf2f0e6, 0x2f6b4a, 0xd9a13a, 0x8e9aa6][i], roof: 0x3b3f45, lit: true })),
      { kind: "crates", x: 640, y: 430, w: 50, h: 30 }, { kind: "barrel", x: 700, y: 428 },
      { kind: "barrier", x: 6, y: 280, w: 6, h: 220 }, { kind: "barrier", x: 1294, y: 280, w: 6, h: 220 },
    ],
    decor: [{ kind: "boat", x: 300, y: 90, a: 0.05, len: 90 }, { kind: "boat", x: 720, y: 80, a: -0.05, len: 110 }, { kind: "boat", x: 1100, y: 95, a: 3.1, len: 80 }],
    cones: [],
    start: { x: 145, y: 300, a: 0 },
    bay: { x: 620, y: 184, a: 0, w: 34, l: 76 },
  });
}

// 23. Night market: behind the stalls, between the food trucks.
function nightMarket() {
  const stallRow = (y, face, seed) => range(0, 13).map((i) => ({ kind: "stall", x: 150 + i * 72, y, w: 56, h: 36, a: face, color: [0xd33a2c, 0x2e86c1, 0xf2c230, 0x1e8449, 0xe67e22, 0x8e44ad][(i + seed) % 6] }));
  const vans = [320, 400, 480, 640, 720, 800, 880].map((x, i) => car(x, 440, -PI / 2, i % 2 ? "van" : "pickup", [0xf2f0e6, 0xd9a13a, 0x3d6fb6, 0xd9342b][i % 4]));
  return level({
    id: "market", name: "Night market", title: "Food Trucks", trailer: "box", par: 110, sun: "night",
    brief: "Deliver the ice to the market after dark. Reverse between the food trucks behind the second row of stalls.",
    w: 1200, h: 700, base: "cobble", edge: "none", backdrop: "town",
    surfaces: [rect("asphalt", 0, 600, 1200, 700), rect("pavement", 0, 580, 1200, 600)],
    paint: [paintBays([{ x: 560, y: 440, a: -PI / 2, w: 40, l: 62 }], YELLOW), line([[0, 650], [1200, 650]], { dash: [18, 16] })],
    parked: vans,
    statics: [
      ...stallRow(150, PI / 2, 0), ...stallRow(280, -PI / 2, 3), ...stallRow(540, -PI / 2, 1).filter((s) => s.x < 260 || s.x > 940),
      ...range(0, 8).map((i) => ({ kind: "lamp", x: 110 + i * 140, y: 215 })),
      ...range(0, 6).map((i) => ({ kind: "lamp", x: 140 + i * 190, y: 590 })),
      ...[100, 300, 520, 760, 980, 1140].map((x, i) => building(x, 35, 200, 70, { height: 54, color: [0xb8866a, 0xc9b79c, 0x8e9aa6, 0xd6c8b0, 0xa0705a, 0xd8c3a5][i], roof: 0x5a4a44, lit: true })),
      { kind: "barrier", x: 6, y: 650, w: 6, h: 100 }, { kind: "barrier", x: 1194, y: 650, w: 6, h: 100 },
      { kind: "wall", x: 600, y: 480, w: 640, h: 6, style: "brick", height: 10 },
      { kind: "table", x: 1100, y: 420 }, { kind: "table", x: 1130, y: 450 }, { kind: "table", x: 90, y: 430 },
    ],
    cones: [{ x: 530, y: 380 }, { x: 590, y: 380 }],
    start: { x: 118, y: 650, a: 0 },
    bay: { x: 560, y: 440, a: -PI / 2, w: 40, l: 62 },
  });
}

// 24. Farm track: a long way to the machinery shed.
function farmTrack() {
  const track = [[-40, 820], [300, 800], [600, 700], [800, 540], [1000, 450], [1300, 430], [1420, 380]];
  const gaps = (x) => (x > 580 && x < 660) || (x > 1080 && x < 1160);
  const hedges = [
    ...wallLine(offsetLine(track, 48), { kind: "hedge", thick: 10, maxLen: 60, skip: (x) => gaps(x) || x > 1260 }),
    ...wallLine(offsetLine(track, -48), { kind: "hedge", thick: 10, maxLen: 60, skip: (x) => x > 1260 }),
  ];
  const bales = [[500, 560], [520, 580], [700, 380], [720, 400], [1150, 620], [200, 650]].map(([x, y]) => ({ kind: "hay", x, y, r: 9 }));
  return level({
    id: "farm", name: "Farm track", title: "Harvest Home", trailer: "boat", par: 140, sun: "dusk",
    brief: "Down the long farm track to the yard, then reverse the boat into the machinery shed beside the tractor.",
    w: 1800, h: 900, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      rect("dirt", 100, 100, 560, 520, 20), rect("dirt", 900, 560, 1500, 860, 20),
      road("gravel", track, 64), rect("dirt", 1280, 230, 1780, 470, 30), rect("concrete", 1515, 55, 1685, 205),
    ],
    paint: [paintBays([{ x: 1640, y: 140, a: PI / 2, w: 44, l: 86 }], "rgba(236,200,70,0.6)")],
    statics: [
      ...hedges,
      ...shed(1600, 130, PI / 2, 170, 150, { style: "barn", height: 52, thick: 8 }),
      { kind: "tractor", x: 1550, y: 130, a: PI / 2, color: 0xd9342b },
      building(1400, 120, 160, 120, { height: 50, color: 0xefe6d2, roof: 0x7a3b2e, lit: true }),
      ...bales,
      { kind: "block", x: 1320, y: 300, w: 40, h: 14, height: 8, color: 0x8a9099 },
      tree(1260, 180, 22), tree(1720, 520, 20), tree(900, 300, 22), tree(300, 560, 20),
    ],
    cones: [],
    start: { x: 140, y: 814, a: -0.03 },
    bay: { x: 1640, y: 140, a: PI / 2, w: 44, l: 86 },
  });
}

// 25. Festival: the last pitch in the caravan field, at night.
function festival() {
  const track = [[-40, 700], [300, 690], [500, 630], [650, 650], [1560, 650]];
  const north = hrow(700, 540, 13, PI / 2, { w: 64, l: 92 });
  const south = hrow(700, 770, 13, -PI / 2, { w: 64, l: 92 });
  const target = 8;
  const fence = range(0, 22).map((i) => ({ kind: "fence", x: 700 + i * 40, y: 486, w: 42, h: 3 }));
  const arena = scatter(251, 26, [60, 200, 1550, 470], (x, y, r) => (r() < 0.5 ? { kind: "tent", x, y, w: 26 + r() * 8, h: 30, a: r() * 3 } : { kind: "marquee", x, y, w: 60 + r() * 30, h: 50 }), [[560, 20, 1060, 190]]);
  return level({
    id: "festival", name: "Music festival", title: "Last Pitch", trailer: "caravan", par: 150, sun: "night",
    brief: "The headliner is on. Crawl along the festival track and reverse the caravan into the last free pitch in the north row.",
    w: 1600, h: 900, base: "grass", edge: "fence", backdrop: "forest",
    surfaces: [road("gravel", track, 70), rect("mud", 800, 600, 900, 700, 30), rect("grass", 680, 490, 1540, 590)],
    paint: [...north.map((p) => line([[p.x - 32, 494], [p.x - 32, 586]], { dash: [6, 6], width: 1.5 })), ...south.map((p) => line([[p.x - 32, 724], [p.x - 32, 816]], { dash: [6, 6], width: 1.5 })), paintBays([{ ...north[target], w: 46 }], YELLOW)],
    parked: [car(1500, 540, PI / 2, "suv"), car(640, 770, -PI / 2, "wagon")],
    statics: [
      { kind: "block", x: 810, y: 100, w: 400, h: 120, height: 60, color: 0x2b2d31, stage: true },
      ...fence,
      ...north.filter((_, i) => i !== target && i !== 12).map((p) => ({ kind: "vancaravan", x: p.x, y: p.y - 4, a: PI / 2 })),
      ...south.filter((_, i) => i % 3 !== 1).map((p) => ({ kind: "vancaravan", x: p.x, y: p.y + 4, a: -PI / 2 })),
      ...south.filter((_, i) => i % 3 === 1).map((p) => ({ kind: "tent", x: p.x, y: p.y + 10, w: 30, h: 34, a: 0.2 })),
      ...range(0, 9).map((i) => ({ kind: "lamp", x: 300 + i * 150, y: 605 })),
      ...arena,
    ],
    cones: [],
    start: { x: 145, y: 698, a: 0 },
    bay: { ...north[target], w: 46, l: 94 },
  });
}

export const CHAPTER5 = [mountain(), harbourWall(), nightMarket(), farmTrack(), festival()];
