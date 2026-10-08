import {
  PI, level, hrow, vrow, angledRow, park, fill, car, rect, road, disc, paintBays, line, arrow, text, YELLOW,
  building, tree, pine, shed, scatter, wallLine, range, smooth, sample, distToLine, parkedSemi,
} from "./kit.js";

// ── Season pack: Autumn · Halloween ──────────────────────────────────────
// Six jobs from a pumpkin farm on a golden afternoon to a fairground on
// Halloween night. Russet trees (`foliage: "autumn"`), fallen leaves on the
// ground (slightly slippery), pumpkins that glow once it is dark.

const HAY = 0xd9b95a;
const pumpkin = (x, y, r = 6, a = PI / 2) => ({ kind: "pumpkin", x, y, r, a });
const grave = (x, y, a = 0, cross = false) => ({ kind: "grave", x, y, a, w: 10, h: 4, cross });
const stack = (x, y, w, h, height = 18, color = HAY) => ({ kind: "block", x, y, w, h, height, color });
// A heap of pumpkins round (x, y), seeded.
function pumpkinPile(x, y, n, spread, seed) {
  return scatter(seed, n, [x - spread, y - spread, x + spread, y + spread], (px, py, r) => pumpkin(px, py, 4 + r() * 3, r() * PI * 2));
}

// 1. Pumpkin patch: back the trailer up to the farm stand.
function pumpkinPatch() {
  const stand = hrow(340, 172, 5, PI / 2, { w: 40, l: 62, step: 80 });
  const target = 2;
  const visitors = vrow(850, 262, 8, PI);
  // The patch itself: rows of pumpkins on the field west of the yard.
  const patch = range(0, 4).flatMap((r) => range(0, 6).map((i) => pumpkin(22 + r * 20 + (i % 2) * 6, 170 + i * 34, 5 + ((r + i) % 3))));
  return level({
    id: "patch", vehicle: "pickup", name: "Pumpkin farm", title: "Pumpkin Patch", trailer: "box", par: 55, sun: "golden", foliage: "autumn",
    brief: "Pick up the pumpkins for the village party. Swing round in the yard and back the trailer straight up to the farm stand, between the pumpkin heap and the pickup.",
    w: 1000, h: 600, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [rect("gravel", 110, 138, 900, 540, 20), rect("dirt", 0, 150, 108, 380), disc("leaves", 960, 560, 90), disc("leaves", 40, 560, 80), rect("leaves", 0, 0, 1000, 26)],
    paint: [
      paintBays(stand), paintBays([{ ...stand[target], w: 42 }], YELLOW), text(500, 228, "LOADING", { size: 12, color: YELLOW }),
      paintBays(visitors), arrow(300, 330, 0), arrow(640, 330, 0),
    ],
    parked: [car(stand[3].x, stand[3].y, PI / 2, "pickup", 0x2f6b4a), ...park(visitors, fill(8, 0.65, 501, [0, 7]), 502)],
    statics: [
      building(500, 80, 400, 100, { height: 36, color: 0xa0523d, roof: 0x5a3f1e, sign: "PUMPKIN PATCH", signColor: "#c8641e" }),
      ...pumpkinPile(stand[1].x, stand[1].y + 4, 9, 14, 503),
      stack(stand[0].x, stand[0].y, 36, 48), stack(stand[4].x, stand[4].y + 6, 34, 36, 12, 0x8a6238),
      ...patch,
      { kind: "scarecrow", x: 70, y: 420, a: 0 }, { kind: "scarecrow", x: 940, y: 110, a: PI },
      { kind: "hay", x: 250, y: 166, r: 9 }, { kind: "hay", x: 266, y: 184, r: 9 },
      ...[[150, 50], [230, 40], [780, 40], [860, 60], [940, 30], [960, 500], [920, 570], [40, 520], [90, 575]].map(([x, y], i) => tree(x, y, 16 + (i % 3) * 3)),
    ],
    cones: [],
    start: { x: 190, y: 460, a: 0 },
    bay: { ...stand[target], w: 42, l: 62 },
  });
}

// 2. Corn maze: the ponies for the pony rides, between two horseboxes.
function cornMaze() {
  const bays = hrow(760, 200, 9, PI / 2, { w: 46, l: 74 });
  const target = 4;
  const rowA = hrow(720, 400, 17, -PI / 2), rowB = hrow(720, 462, 17, PI / 2);
  // Maze hedges of ripe maize west of the car park (scenery you can hit).
  const maze = [
    [40, 40, 560, 40], [40, 40, 40, 520], [40, 520, 400, 520], [480, 520, 560, 520], [560, 40, 560, 520],
    [120, 120, 480, 120], [120, 120, 120, 440], [200, 200, 480, 200], [480, 200, 480, 440], [200, 280, 400, 280],
    [200, 280, 200, 440], [280, 360, 400, 360], [400, 360, 400, 440], [120, 440, 320, 440],
  ].flatMap(([x0, y0, x1, y1]) => wallLine([[x0, y0], [x1, y1]], { kind: "corn", thick: 14, maxLen: 80 }));
  return level({
    id: "maze", vehicle: "suv", name: "Corn maze", title: "Pony Rides", trailer: "horsebox", par: 110, sun: "golden", foliage: "autumn",
    brief: "The ponies are late for the rides. Up the lane past the maze, along the paddock fence and past the free bay, then back the horsebox in between the other two.",
    w: 1300, h: 760, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      rect("dirt", 0, 0, 600, 560), road("gravel", [[-40, 660], [1340, 660]], 70), rect("gravel", 610, 160, 1260, 625, 16),
      rect("grass", 700, 0, 1300, 156), disc("leaves", 1240, 700, 90),
    ],
    paint: [
      paintBays(bays), paintBays([{ ...bays[target], w: 48 }], YELLOW), paintBays(rowA), paintBays(rowB),
      text(bays[target].x, 252, "PONIES", { size: 11, color: YELLOW }), arrow(650, 560, -PI / 2), arrow(900, 300, 0),
    ],
    parked: [
      car(bays[0].x, bays[0].y - 4, PI / 2, "suv", 0x6b3b2a), car(bays[6].x, bays[6].y - 6, PI / 2, "pickup", 0x1f3a5a),
      ...park(rowA, fill(17, 0.75, 521), 522), ...park(rowB, fill(17, 0.75, 523), 524),
    ],
    statics: [
      ...maze,
      { kind: "scarecrow", x: 300, y: 330, a: 0 }, { kind: "scarecrow", x: 520, y: 80, a: PI / 2 },
      ...[3, 5, 7].map((i) => ({ kind: "parkedtrailer", trailer: "horsebox", x: bays[i].x, y: bays[i].y - 4, a: PI / 2 })),
      ...wallLine([[700, 158], [1296, 158]], { kind: "fence", thick: 3, maxLen: 40 }),
      { kind: "tent", x: 1000, y: 70, w: 70, h: 50, color: 0xd9822b }, stack(860, 60, 40, 30), stack(1180, 80, 36, 36),
      ...pumpkinPile(585, 600, 5, 14, 525), ...pumpkinPile(1270, 300, 5, 14, 526),
      ...[[660, 30], [1260, 560], [1250, 420], [600, 600]].map(([x, y]) => tree(x, y, 18)),
    ],
    cones: [{ x: 640, y: 260 }],
    start: { x: 110, y: 660, a: 0 },
    bay: { ...bays[target], w: 48, l: 74 },
  });
}

// 3. Cider press: a short, twitchy teardrop into the press shed.
function ciderPress() {
  const rows = [80, 190, 300, 410, 520];
  const orchard = rows.flatMap((y, r) => range(0, 15).map((i) => tree(60 + i * 56 + (r % 2) * 28, y, 14 + ((i + r) % 3) * 2)));
  return level({
    id: "cider", vehicle: "car", name: "Apple orchard", title: "Cider Press", trailer: "teardrop", par: 80, sun: "dusk", foliage: "autumn",
    brief: "The press runs all night. Along the orchard track to the yard, past the shed, then back the little teardrop into the press shed between the apple crates — it swings quickly, keep the wheel calm.",
    w: 1240, h: 760, base: "grass", edge: "hedge", backdrop: "trees",
    surfaces: [
      rect("leaves", 0, 30, 920, 560), road("dirt", [[-40, 660], [1280, 660]], 64), rect("gravel", 930, 190, 1236, 700, 24),
    ],
    paint: [paintBays([{ x: 1180, y: 330, a: PI, w: 34, l: 50 }], "rgba(236,200,70,0.6)"), arrow(1010, 560, -PI / 2), arrow(1010, 300, -PI / 2)],
    parked: [car(1170, 676, PI, "van", 0x8a1f24)],
    statics: [
      ...orchard,
      building(1100, 110, 240, 140, { height: 46, color: 0xd8c3a5, roof: 0x6b3b2a, sign: "OLD MILL CIDER", signColor: "#8a1f24", lit: true }),
      ...shed(1180, 330, PI, 40, 56, { style: "barn", height: 40, thick: 6 }),
      stack(1120, 280, 30, 24, 14, 0xa83a2a), stack(1120, 380, 30, 24, 14, 0xa83a2a), stack(1210, 450, 40, 30, 20, 0xa83a2a),
      { kind: "tractor", x: 1180, y: 560, a: PI, color: 0xd9342b },
      { kind: "lamp", x: 1226, y: 250, a: PI },
      pumpkin(1040, 196, 6, PI / 2), pumpkin(1160, 196, 6, PI / 2), pumpkin(960, 240, 5, 0),
      ...range(0, 6).map((i) => stack(80 + i * 140, 600, 22, 16, 10, 0xa83a2a)),
    ],
    cones: [],
    start: { x: 90, y: 660, a: 0 },
    bay: { x: 1180, y: 330, a: PI, w: 34, l: 50 },
  });
}

// 4. Churchyard: the vintage hearse for the Halloween parade, parked at
// the kerb by the lych gate.
function churchyard() {
  const kerbN = [[70, "hatch"], [160, "sedan"], [255, "wagon"], [350, "hatch"], [482, "sedan"], [748, "suv"], [890, "hatch"], [990, "sedan"], [1090, "wagon"], [1190, "hatch"]]
    .map(([x, t]) => car(x, 344, 0, t));
  const kerbS = [[110, "sedan"], [330, "van"], [520, "hatch"], [760, "wagon"], [980, "sedan"], [1180, "suv"]].map(([x, t]) => car(x, 456, PI, t));
  const graves = range(0, 4).flatMap((r) => range(0, 9).map((i) => {
    const x = 120 + i * 120 + (r % 2) * 40, y = 120 + r * 44;
    return (Math.abs(x - 640) < 120 && y < 200) || Math.abs(x - 640) < 60 ? null : grave(x, y, PI / 2 + ((i * 7 + r * 3) % 5 - 2) * 0.05, (i + r) % 4 === 0);
  })).filter(Boolean);
  const houses = [[90, 160], [260, 160], [430, 150], [600, 170], [780, 160], [950, 150], [1120, 170]];
  return level({
    id: "churchyard", vehicle: "suv", name: "Village church", title: "The Last Ride", trailer: "carhauler", par: 120, sun: "spooky", foliage: "autumn", cargo: 0x16161a,
    brief: "The vintage hearse leads the Halloween parade. Drive past the lych gate and parallel-park the transporter in the long gap at the churchyard wall.",
    w: 1300, h: 700, base: "cobble", edge: "none", backdrop: "town",
    surfaces: [
      rect("leaves", 0, 0, 1300, 296), rect("pavement", 0, 300, 1300, 320), rect("asphalt", 0, 320, 1300, 480), rect("pavement", 0, 480, 1300, 500),
      rect("pavement", 600, 230, 680, 300),
    ],
    paint: [
      line([[0, 400], [1300, 400]], { dash: [16, 14] }), paintBays([{ x: 618, y: 344, a: 0, w: 32, l: 84 }], YELLOW),
      arrow(200, 425, 0), arrow(1000, 375, PI),
    ],
    parked: [...kerbN, ...kerbS],
    statics: [
      { kind: "church", x: 640, y: 100, a: PI / 2, w: 170, h: 84 },
      ...wallLine([[0, 296], [600, 296]], { kind: "wall", style: "stone", thick: 8, height: 12, maxLen: 80 }),
      ...wallLine([[680, 296], [1300, 296]], { kind: "wall", style: "stone", thick: 8, height: 12, maxLen: 80 }),
      { kind: "post", x: 600, y: 296, r: 4 }, { kind: "post", x: 680, y: 296, r: 4 },
      { kind: "kerb", x: 650, y: 322, w: 1300, h: 4 }, { kind: "kerb", x: 650, y: 478, w: 1300, h: 4 },
      ...graves,
      ...[[60, 60], [260, 40], [1060, 50], [1240, 70], [40, 250], [1260, 240]].map(([x, y]) => tree(x, y, 20)),
      ...[180, 420, 860, 1120].map((x) => ({ kind: "lamp", x, y: 310, a: PI / 2 })),
      ...[300, 700, 1050].map((x) => ({ kind: "lamp", x, y: 490, a: -PI / 2 })),
      ...houses.map(([x, w], i) => building(x, 575, w, 130, { height: 40 + (i % 3) * 8, color: [0x5a4a44, 0x8e6a4a, 0x3d4a5a, 0x6a5a7a, 0x8a5a3c, 0x4a5a4a, 0x7a6a5a][i], roof: 0x2a2830, lit: true })),
      ...houses.map(([x], i) => pumpkin(x + (i % 2 ? 30 : -30), 504, 5, -PI / 2)),
      pumpkin(590, 286, 6, -PI / 2), pumpkin(690, 286, 6, -PI / 2),
    ],
    decor: [{ kind: "ghost", x: 300, y: 150, a: 0.4, s: 1.5 }, { kind: "ghost", x: 960, y: 190, a: 2.6, s: 1.7 }, { kind: "ghost", x: 470, y: 60, a: -0.3, s: 1.2, z: 30 }],
    cones: [],
    start: { x: 280, y: 426, a: 0 },
    bay: { x: 618, y: 344, a: 0, w: 32, l: 84 },
  });
}

// 5. Haunted manor: up the dark drive, round the fountain, and the caravan
// into the coach house.
function hauntedManor() {
  const drive = smooth([[-40, 860], [280, 850], [500, 780], [620, 640], [700, 480], [820, 400]]);
  const woods = scatter(551, 150, [0, 0, 1500, 950], (x, y, r) => (r() < 0.35 ? pine(x, y, 14 + r() * 8) : tree(x, y, 16 + r() * 8)),
    [[740, 120, 1500, 600], [0, 780, 560, 950], [380, 560, 760, 950]]).filter((t) => distToLine(drive, t.x, t.y) > 70);
  // Gate piers either side of the drive, a way up it.
  const [gate] = sample(drive, 1e4, 0, 560);
  const pier = (sd) => ({ kind: "pillar", x: gate.x + Math.sin(gate.a) * 50 * sd, y: gate.y - Math.cos(gate.a) * 50 * sd, s: 14, h3: 30, style: "site" });
  const plot = range(0, 3).flatMap((r) => range(0, 4).map((i) => grave(1250 + i * 26, 690 + r * 34, -PI / 2 + ((i + r) % 3 - 1) * 0.08, (i + r) % 3 === 0)));
  return level({
    id: "manor", vehicle: "suv", name: "Ravenhill Manor", title: "Coach House", trailer: "caravan", par: 160, sun: "night", foliage: "autumn",
    brief: "The fortune teller's caravan is booked for the manor's Halloween ball. Up the drive through the dark woods, round the fountain, and back the caravan into the coach house.",
    w: 1500, h: 950, base: "grass", edge: "rail", backdrop: "forest",
    surfaces: [
      rect("leaves", 0, 0, 1500, 950), road("gravel", drive, 74), rect("gravel", 760, 170, 1460, 620, 30), disc("grass", 1040, 400, 66),
      rect("grass", 1150, 640, 1400, 810, 10),
    ],
    paint: [paintBays([{ x: 1397, y: 400, a: PI, w: 40, l: 80 }], "rgba(236,200,70,0.6)")],
    parked: [car(880, 230, PI / 2, "sedan", 0x16161a), car(940, 230, PI / 2, "sedan", 0x5b4a8a)],
    statics: [
      ...woods,
      building(1100, 90, 560, 150, { height: 72, color: 0x5a5560, roof: 0x24222a, lit: true }),
      { kind: "island", x: 1040, y: 400, r: 52 },
      ...shed(1395, 400, PI, 46, 86, { style: "stone", height: 42, thick: 8 }),
      ...wallLine([[1140, 640], [1140, 810], [1410, 810], [1410, 640]], { kind: "fence", thick: 3, maxLen: 40 }),
      ...plot,
      pier(1), pier(-1),
      ...[[880, 186], [1000, 186], [1200, 186], [1320, 186]].map(([x, y]) => pumpkin(x, y, 7, PI / 2)),
      ...sample(drive, 120, 52, 60).map((p) => pumpkin(p.x, p.y, 5, p.a - PI / 2)),
      { kind: "lamp", x: 1180, y: 632, a: -PI / 2 }, { kind: "lamp", x: 790, y: 186, a: PI / 2 },
    ],
    decor: [{ kind: "ghost", x: 1290, y: 720, a: PI, s: 1.1 }, { kind: "ghost", x: 520, y: 400, a: 0.5 }, { kind: "ghost", x: 1040, y: 400, a: 1.5, z: 30, s: 1.2 }],
    cones: [],
    start: { x: 120, y: 852, a: 0 },
    bay: { x: 1397, y: 400, a: PI, w: 40, l: 80 },
  });
}

// 6. Halloween fair: the ghost train's semi-trailer, backed in between the
// rides' lorries behind the fairground.
function halloweenFair() {
  // Slanted slots off the service road, cab out towards it (as at the truck stop).
  const A = -PI / 2 - 0.55;
  const slots = angledRow(796, 470, 7, A, { w: 58, l: 210 });
  const target = 3;
  const rides = [
    { kind: "tent", x: 980, y: 745, w: 120, h: 70, color: 0x6a2a8a }, { kind: "marquee", x: 1230, y: 740, w: 180, h: 80 },
    { kind: "tent", x: 1490, y: 745, w: 110, h: 70, color: 0xd9822b }, { kind: "block", x: 720, y: 760, w: 110, h: 30, height: 4, color: 0x3b3f45 },
    ...range(0, 7).map((i) => ({ kind: "stall", x: 640 + i * 130, y: 860, w: 70, h: 40, a: -PI / 2, color: [0xd9822b, 0x6a2a8a, 0x1e8449, 0xd33a2c, 0xf2c230, 0x2e86c1, 0x16161a][i] })),
  ];
  const lorries = slots.map((b, i) => ({ b, i })).filter(({ i }) => i !== target && i !== 6)
    .map(({ b }, k) => parkedSemi(b.x - Math.cos(A) * 18, b.y - Math.sin(A) * 18, A, [0x6a2a8a, 0xd9822b, 0x16161a, 0x1e8449, 0x8a1f24][k], ["HAUNTED HOUSE", "WALTZER", "DODGEMS", "HELTER SKELTER", "BIG WHEEL"][k]));
  return level({
    id: "fair", vehicle: "truck", name: "Halloween fair", title: "Ghost Train", trailer: "semi", par: 180, sun: "night", foliage: "autumn", livery: "GHOST TRAIN",
    brief: "The ghost train opens at midnight and its trailer is still on the road. Round the fairground on the service road, then back the semi into the free slot between the rides' lorries.",
    w: 1900, h: 1100, base: "grass", edge: "rail", backdrop: "trees",
    surfaces: [
      rect("leaves", 0, 0, 1900, 1100), road("asphalt", [[-40, 1010], [1780, 1010], [1780, 130], [400, 130]], 140),
      rect("gravel", 580, 200, 1420, 615), rect("grass", 540, 660, 1640, 905, 20),
    ],
    paint: [
      paintBays(slots), paintBays([{ ...slots[target], w: 60 }], YELLOW),
      text(slots[target].x + 60, 595, "GHOST TRAIN", { size: 14, color: YELLOW }), arrow(1000, 1010, 0), arrow(1780, 600, -PI / 2), arrow(1450, 130, PI),
    ],
    parked: [car(1660, 230, PI / 2, "van", 0x16161a), car(1660, 300, PI / 2, "van", 0x6a2a8a)],
    statics: [
      ...lorries,
      ...wallLine([[520, 632], [1640, 632]], { kind: "fence", thick: 3, maxLen: 40 }),
      ...wallLine([[450, 210], [450, 940]], { kind: "hedge", thick: 10, maxLen: 60 }),
      ...wallLine([[450, 940], [1700, 940]], { kind: "hedge", thick: 10, maxLen: 60, skip: (x) => x > 1080 && x < 1240 }),
      ...wallLine([[1700, 220], [1700, 940]], { kind: "hedge", thick: 10, maxLen: 60, skip: (x, y) => y < 340 }),
      ...rides,
      ...[[1120, 940], [1200, 940]].map(([x, y]) => ({ kind: "pillar", x, y, s: 12, h3: 40, style: "site" })),
      ...range(0, 9).map((i) => ({ kind: "lamp", x: 300 + i * 180, y: 1080, a: -PI / 2 })),
      ...range(0, 5).map((i) => ({ kind: "lamp", x: 1850, y: 260 + i * 170, a: PI })),
      ...range(0, 6).map((i) => ({ kind: "lamp", x: 560 + i * 200, y: 16, a: PI / 2 })),
      ...pumpkinPile(1160, 905, 4, 12, 561),
      pumpkin(1090, 900, 12, PI / 2), pumpkin(1230, 900, 12, PI / 2),
      ...scatter(562, 40, [0, 0, 400, 900], (x, y, r) => tree(x, y, 18 + r() * 8), [[300, 30, 420, 230]]),
    ],
    decor: [
      { kind: "ferris", x: 720, y: 760, r: 72, a: 0 },
      { kind: "ghost", x: 980, y: 745, a: 1.6, z: 44, s: 1.8 }, { kind: "ghost", x: 1490, y: 745, a: -2, z: 40, s: 1.6 },
      { kind: "ghost", x: 1230, y: 735, a: 2.4, z: 46, s: 1.8 }, { kind: "ghost", x: 580, y: 300, a: 0.3, z: 30, s: 1.4 },
    ],
    cones: [],
    start: { x: 220, y: 1010, a: 0 },
    bay: { ...slots[target], w: 60, l: 210 },
  });
}

export const AUTUMN = [pumpkinPatch(), cornMaze(), ciderPress(), churchyard(), hauntedManor(), halloweenFair()];
