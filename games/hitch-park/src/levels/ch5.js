import {
  PI, level, hrow, park, car, rect, road, disc, paintBays, line, YELLOW, building, tree,
  pine, shed, scatter, offsetLine, wallLine, range, smooth,
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
    id: "mountain", vehicle: "suv", name: "Mountain lodge", title: "Switchbacks", trailer: "caravan", par: 130, sun: "noon",
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

// 22. Harbour at night: up the alley from the back street, then
// parallel-park the caravan in the one tight gap on the quay.
function harbourWall() {
  const quayCars = [
    car(90, 182, 0, "van", 0xf2f0e6), car(200, 182, 0, "sedan"), car(310, 182, 0, "hatch"), car(420, 182, 0, "wagon"), car(535, 182, 0, "van", 0x3d6fb6),
    car(772, 182, 0, "suv"), car(880, 182, 0, "van", 0xd9342b), car(985, 182, 0, "sedan"), car(1090, 182, 0, "wagon"), car(1200, 182, 0, "hatch"),
  ];
  const kerbCars = [[120, "sedan"], [230, "hatch"], [330, "wagon"], [560, "van"], [680, "sedan"], [790, "hatch"], [1000, "van"], [1110, "suv"], [1220, "hatch"]]
    .map(([x, t]) => car(x, 372, PI, t));
  const backCars = [[300, "sedan"], [620, "van"], [900, "wagon"], [1150, "hatch"]].map(([x, t]) => car(x, 728, 0, t));
  const houses = [[120, 190], [310, 180], [570, 180], [800, 190], [1040, 190], [1230, 190]];
  return level({
    id: "harbour", vehicle: "suv", name: "Fishing harbour", title: "Quayside", trailer: "caravan", par: 150, sun: "night",
    brief: "Up the narrow alley from the back street to the quay. The last space is a tight gap under the lamps: parallel-park the caravan between the vans — the harbour wall is right there.",
    w: 1300, h: 760, base: "cobble", edge: "none", backdrop: "town",
    surfaces: [
      rect("water", -500, -600, 1800, 150), rect("asphalt", 0, 160, 1300, 390), rect("pavement", 0, 390, 1300, 410),
      rect("pavement", 0, 598, 1300, 612), rect("asphalt", 0, 612, 1300, 760),
    ],
    paint: [line([[0, 206], [1300, 206]], { dash: [10, 10], width: 1.5 }), line([[0, 300], [1300, 300]], { dash: [18, 16] }), line([[0, 686], [1300, 686]], { dash: [18, 16] })],
    parked: [...quayCars, ...kerbCars, ...backCars],
    statics: [
      { kind: "water", x: 650, y: 72, w: 1300, h: 146 },
      { kind: "quay", x: 650, y: 154, w: 1300, h: 8 },
      ...range(0, 12).map((i) => ({ kind: "bollard", x: 50 + i * 110, y: 164, r: 3.2 })),
      ...[90, 300, 520, 740, 950, 1150].map((x) => ({ kind: "lamp", x, y: 398, a: -PI / 2 })),
      ...houses.map(([x, w], i) => building(x, 505, w, 180, { height: 40 + (i % 3) * 10, color: [0x3d6fb6, 0xd9342b, 0xf2f0e6, 0x2f6b4a, 0xd9a13a, 0x8e9aa6][i], roof: 0x3b3f45, lit: true })),
      { kind: "barrel", x: 410, y: 470 }, { kind: "bin", x: 470, y: 560 },
      { kind: "barrier", x: 6, y: 280, w: 6, h: 220 }, { kind: "barrier", x: 1294, y: 280, w: 6, h: 220 },
    ],
    decor: [{ kind: "boat", x: 300, y: 90, a: 0.05, len: 90 }, { kind: "boat", x: 720, y: 80, a: -0.05, len: 110 }, { kind: "boat", x: 1100, y: 95, a: 3.1, len: 80 }],
    cones: [],
    start: { x: 170, y: 686, a: 0 },
    bay: { x: 620, y: 184, a: 0, w: 34, l: 76 },
  });
}

// 23. Night market: behind the stalls, between the food trucks.
function nightMarket() {
  const stallRow = (y, face, seed) => range(0, 13).map((i) => ({ kind: "stall", x: 150 + i * 72, y, w: 56, h: 36, a: face, color: [0xd33a2c, 0x2e86c1, 0xf2c230, 0x1e8449, 0xe67e22, 0x8e44ad][(i + seed) % 6] }));
  const vans = [320, 400, 480, 640, 720, 800, 880].map((x, i) => car(x, 440, -PI / 2, i % 2 ? "van" : "pickup", [0xf2f0e6, 0xd9a13a, 0x3d6fb6, 0xd9342b][i % 4]));
  return level({
    id: "market", vehicle: "van", name: "Night market", title: "Food Trucks", trailer: "box", par: 110, sun: "night",
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
  const track = [[-40, 820], [300, 800], [600, 700], [800, 540], [1000, 450], [1300, 430], [1420, 400]];
  const gaps = (x) => (x > 580 && x < 660) || (x > 1080 && x < 1160);
  const hedges = [
    ...wallLine(offsetLine(track, 48), { kind: "hedge", thick: 10, maxLen: 60, skip: (x) => gaps(x) || x > 1260 }),
    ...wallLine(offsetLine(track, -48), { kind: "hedge", thick: 10, maxLen: 60, skip: (x) => x > 1260 }),
  ];
  // Loose bales: in the fields, and two knocked onto the verge of the track.
  const bales = [[500, 560], [520, 580], [700, 380], [720, 400], [1150, 620], [200, 650], [964, 440], [412, 786]].map(([x, y]) => ({ kind: "hay", x, y, r: 9 }));
  // The yard is fenced; the only way in is the gate at the end of the track.
  const yardFence = [
    ...wallLine([[1285, 225], [1285, 392]], { kind: "fence", thick: 3, maxLen: 40 }),
    ...wallLine([[1285, 470], [1785, 470]], { kind: "fence", thick: 3, maxLen: 40 }),
  ];
  const stack = (x, y, w, h) => ({ kind: "block", x, y, w, h, height: 22, color: 0xd9b95a });
  return level({
    id: "farm", vehicle: "pickup", name: "Farm track", title: "Harvest Home", trailer: "boat", par: 170, sun: "dusk",
    brief: "Down the long farm track, past the tractor in the hedge gap and through the gate. The yard is full of harvest: reverse the boat into the machinery shed beside the tractor.",
    w: 1800, h: 900, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      rect("dirt", 100, 100, 560, 520, 20), rect("dirt", 900, 560, 1500, 860, 20),
      road("gravel", track, 64), rect("dirt", 1280, 225, 1785, 470, 30), rect("concrete", 1515, 55, 1685, 205),
      rect("mud", 770, 500, 880, 600, 20), rect("mud", 1560, 215, 1700, 300, 24),
    ],
    paint: [paintBays([{ x: 1640, y: 140, a: PI / 2, w: 44, l: 86 }], "rgba(236,200,70,0.6)")],
    parked: [car(1352, 290, 1.25, "pickup", 0x6b3b2a)],
    statics: [
      ...hedges, ...yardFence,
      ...shed(1600, 130, PI / 2, 170, 150, { style: "barn", height: 52, thick: 8 }),
      { kind: "tractor", x: 1550, y: 130, a: PI / 2, color: 0xd9342b },
      // A second tractor pulled into the hedge gap, its nose out on the track.
      { kind: "tractor", x: 600, y: 656, a: -0.68, color: 0x2f7a3a },
      { kind: "tractor", x: 1735, y: 340, a: PI / 2, color: 0x3d6fb6 },
      building(1400, 120, 160, 120, { height: 50, color: 0xefe6d2, roof: 0x7a3b2e, lit: true }),
      ...bales,
      stack(1468, 262, 40, 50), stack(1560, 440, 70, 26), stack(1750, 430, 40, 40),
      { kind: "block", x: 1306, y: 246, w: 14, h: 36, height: 8, color: 0x8a9099 },
      tree(1260, 180, 22), tree(1720, 520, 20), tree(900, 300, 22), tree(300, 560, 20),
    ],
    cones: [],
    start: { x: 140, y: 814, a: -0.03 },
    bay: { x: 1640, y: 140, a: PI / 2, w: 44, l: 86 },
  });
}

// 25. Festival: the back row of the caravan field, at night.
function festival() {
  const track = [[-40, 800], [300, 790], [480, 745], [640, 790], [1560, 790]];
  const lane = smooth([[560, 776], [590, 660], [660, 600], [1570, 600]]);
  const back = hrow(700, 500, 13, PI / 2, { w: 64, l: 92 });    // behind the lane, the target row
  const mid = hrow(700, 700, 13, PI / 2, { w: 64, l: 92 });     // between the lane and the track
  const south = hrow(700, 880, 13, -PI / 2, { w: 64, l: 92 });
  const target = 8;
  const fence = range(0, 22).map((i) => ({ kind: "fence", x: 700 + i * 40, y: 446, w: 42, h: 3 }));
  const arena = scatter(251, 24, [60, 190, 1550, 420], (x, y, r) => (r() < 0.5 ? { kind: "tent", x, y, w: 26 + r() * 8, h: 30, a: r() * 3 } : { kind: "marquee", x, y, w: 60 + r() * 30, h: 50 }), [[560, 20, 1060, 190]]);
  const divider = (row, y0, y1) => row.map((p) => line([[p.x - 32, y0], [p.x - 32, y1]], { dash: [6, 6], width: 1.5 }));
  return level({
    id: "festival", vehicle: "suv", name: "Music festival", title: "Last Pitch", trailer: "caravan", par: 180, sun: "night",
    brief: "The headliner is on. Leave the festival track for the narrow back lane and reverse the caravan into the last free pitch in the back row.",
    w: 1600, h: 960, base: "grass", edge: "fence", backdrop: "forest",
    surfaces: [
      road("gravel", track, 70), road("gravel", lane, 64), rect("grass", 680, 450, 1540, 548), rect("grass", 680, 652, 1540, 748),
      rect("mud", 960, 566, 1060, 634, 24), rect("mud", 800, 755, 900, 825, 30),
    ],
    paint: [...divider(back, 454, 546), ...divider(mid, 654, 746), ...divider(south, 834, 926), paintBays([{ ...back[target], w: 46 }], YELLOW)],
    parked: [car(1500, 706, PI / 2, "suv"), car(640, 880, -PI / 2, "wagon")],
    statics: [
      { kind: "block", x: 810, y: 100, w: 400, h: 120, height: 60, color: 0x2b2d31, stage: true },
      ...fence,
      ...back.filter((_, i) => i !== target).map((p) => ({ kind: "vancaravan", x: p.x, y: p.y - 4, a: PI / 2 })),
      ...mid.filter((_, i) => i % 4 !== 2 && ![8, 9, 12].includes(i)).map((p) => ({ kind: "vancaravan", x: p.x, y: p.y - 4, a: PI / 2 })),
      ...mid.filter((_, i) => i % 4 === 2).map((p) => ({ kind: "tent", x: p.x, y: p.y - 10, w: 30, h: 34, a: 0.2 })),
      ...south.filter((_, i) => i % 3 !== 1).map((p) => ({ kind: "vancaravan", x: p.x, y: p.y + 4, a: -PI / 2 })),
      ...south.filter((_, i) => i % 3 === 1).map((p) => ({ kind: "tent", x: p.x, y: p.y + 10, w: 30, h: 34, a: 0.2 })),
      { kind: "firepit", x: 1468, y: 690 }, { kind: "table", x: 1440, y: 720 },
      // Lamps behind the back-row fence and between the mid-row caravans, arms over the lane.
      ...range(0, 7).map((i) => ({ kind: "lamp", x: 732 + i * 128, y: 436, a: PI / 2 })),
      ...[1, 4, 7, 10].map((i) => ({ kind: "lamp", x: 700 + i * 64 + 32, y: 644, a: -PI / 2 })),
      { kind: "lamp", x: 300, y: 740, a: PI / 2 }, { kind: "lamp", x: 470, y: 840, a: -PI / 2 },
      ...arena,
    ],
    cones: [],
    start: { x: 145, y: 798, a: 0 },
    bay: { ...back[target], w: 46, l: 94 },
  });
}

export const CHAPTER5 = [mountain(), harbourWall(), nightMarket(), farmTrack(), festival()];
