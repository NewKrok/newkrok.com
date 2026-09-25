import {
  PI, level, hrow, vrow, angledRow, park, fill, except, car, rect, road, paintBays, line, arrow, text, zebra, hatch,
  YELLOW, WHITE, building, tree, shed, sample, scatter,
} from "./kit.js";

// ── Chapter 1 — Learner plates ───────────────────────────────────────────

// 1. Garden centre: straight back to the loading bay by the shop door.
function gardenCentre() {
  const south = hrow(90, 455, 24, -PI / 2);
  const west = vrow(100, 190, 7, 0);
  const bay = { x: 450, y: 130, a: PI / 2, w: 36, l: 60 };
  return level({
    id: "garden", name: "Garden centre", title: "Loading Bay", trailer: "box", par: 35, sun: "noon",
    brief: "Pick up the compost at the loading bay by the shop door. Straight back, small corrections.",
    w: 900, h: 500, edge: "hedge",
    surfaces: [
      rect("grass", 0, 0, 900, 12), rect("grass", 0, 0, 40, 500), rect("grass", 860, 0, 900, 500),
      rect("pavement", 180, 88, 720, 102),
    ],
    paint: [
      paintBays(south), paintBays(west), paintBays([{ ...bay, w: 36 }], YELLOW),
      text(450, 176, "LOADING", { size: 13, color: YELLOW }),
      arrow(300, 300, 0), arrow(620, 300, PI), zebra(300, 110, PI / 2, 60, 20),
    ],
    parked: [...park(south, fill(24, 0.75, 3, [11, 12]), 31), ...park(west, fill(7, 0.7, 4), 32)],
    statics: [
      building(450, 48, 520, 80, { height: 46, color: 0xdde8cf, roof: 0x4d7a3a, sign: "GARDEN CENTRE", signColor: "#2f6b3a" }),
      { kind: "planter", x: 400, y: 128, w: 14, h: 56 }, { kind: "planter", x: 500, y: 128, w: 14, h: 56 },
      { kind: "crates", x: 320, y: 128, w: 44, h: 30 }, { kind: "crates", x: 580, y: 128, w: 44, h: 30 },
      { kind: "trolleys", x: 240, y: 150, w: 18, h: 48 },
      { kind: "lamp", x: 200, y: 310 }, { kind: "lamp", x: 700, y: 310 },
      { kind: "bin", x: 150, y: 110 }, { kind: "bin", x: 750, y: 110 },
      ...[60, 120, 780, 840].map((x) => tree(x, 20, 16)),
    ],
    cones: [{ x: 412, y: 210 }, { x: 492, y: 210 }],
    start: { x: 462, y: 332, a: PI / 2 - 0.05 },
    bay,
  });
}

// 2. Farm: into the barn.
function barn() {
  const bay = { x: 300, y: 90, a: PI / 2, w: 44, l: 76 };
  return level({
    id: "barn", name: "Hill farm", title: "Into the Barn", trailer: "box", par: 40, sun: "golden",
    brief: "The farmer wants the trailer inside the old barn. Line it up on the doorway and reverse straight in.",
    w: 900, h: 520, base: "grass", edge: "fence",
    surfaces: [
      rect("dirt", 120, 130, 830, 470, 30), rect("dirt", 250, 120, 350, 200), rect("mud", 380, 330, 470, 390, 20),
      road("gravel", [[460, 470], [460, 540]], 60),
    ],
    paint: [],
    statics: [
      ...shed(300, 85, PI / 2, 60, 90, { style: "barn", height: 42 }),
      building(720, 100, 200, 120, { height: 52, color: 0xefe6d2, roof: 0x9a3b2a }),
      { kind: "hay", x: 180, y: 230, r: 8 }, { kind: "hay", x: 197, y: 246, r: 8 }, { kind: "hay", x: 172, y: 262, r: 8 },
      { kind: "hay", x: 520, y: 190, r: 9 }, { kind: "hay", x: 540, y: 208, r: 9 },
      { kind: "tractor", x: 580, y: 330, a: 0.4, color: 0x2f7a3a },
      { kind: "block", x: 430, y: 250, w: 34, h: 12, height: 8, color: 0x8a9099 },
      tree(80, 80, 22), tree(90, 420, 20), tree(860, 300, 20), tree(850, 440, 18),
    ],
    cones: [],
    start: { x: 312, y: 345, a: PI / 2 - 0.1 },
    bay,
  });
}

// 3. Fuel station: first slanted bay.
function fuelStop() {
  const a = -PI / 2 + 0.52;
  const bays = angledRow(120, 468, 21, a);
  const target = 12;
  return level({
    id: "fuel", name: "Fuel station", title: "Slant Bay", trailer: "box", par: 55, sun: "noon",
    brief: "Top up, then park in the slanted bays along the back. Drive past the free one and reverse in at an angle.",
    w: 1000, h: 560, edge: "wall", backdrop: "town",
    surfaces: [rect("concrete", 380, 160, 600, 320), rect("pavement", 740, 40, 980, 230), rect("grass", 0, 0, 1000, 20)],
    paint: [
      paintBays(bays), paintBays([{ ...bays[target], w: 34 }], YELLOW),
      line([[300, 240], [680, 240]], { dash: [12, 10] }), arrow(250, 390, 0), arrow(760, 390, 0),
      text(860, 250, "AIR · WATER", { size: 12 }),
    ],
    parked: [...park(bays, fill(21, 0.8, 5, [target]), 51), car(860, 300, 0.05, "hatch")],
    statics: [
      { kind: "pump", x: 480, y: 190, w: 110, h: 14 }, { kind: "pump", x: 480, y: 290, w: 110, h: 14 },
      ...[[410, 190], [550, 190], [410, 290], [550, 290]].map(([x, y]) => ({ kind: "pillar", x, y, s: 8 })),
      building(860, 130, 200, 160, { height: 36, color: 0xf2f2ee, roof: 0xd33a2c, sign: "FUEL · SHOP", signColor: "#c0392b" }),
      building(150, 100, 170, 90, { height: 40, color: 0x6fa0d0, sign: "CAR WASH", signColor: "#1f4f8a" }),
      { kind: "post", x: 820, y: 250, r: 3 }, { kind: "bin", x: 750, y: 250 },
      { kind: "lamp", x: 300, y: 330 }, { kind: "lamp", x: 700, y: 330 },
    ],
    decor: [{ kind: "canopy", x: 480, y: 240, w: 200, h: 170, height: 44 }],
    cones: [],
    start: { x: 160, y: 385, a: 0 },
    bay: { ...bays[target], w: 34, l: 58 },
  });
}

// 4. Lake: the first slipway, after a short drive along the shore road.
function lakeside() {
  const roadPts = [[-40, 560], [260, 560], [480, 470], [700, 430], [1000, 430], [1200, 450], [1440, 450]];
  const trees = sample(roadPts, 64, 78).concat(sample(roadPts, 64, -78))
    .filter((p) => p.y > 290 && !(p.x > 760 && p.x < 1090 && p.y < 520))
    .map((p, i) => tree(p.x, p.y, 15 + (i * 7) % 8));
  return level({
    id: "lake", name: "Lakeside", title: "First Launch", trailer: "boat", par: 75, sun: "marina",
    brief: "Follow the shore road to the slipway, then back the boat straight down the ramp. Long trailer — steer early and gently.",
    w: 1400, h: 720, base: "grass", edge: "fence",
    surfaces: [
      rect("water", 560, -500, 2000, 250), rect("sand", 560, 250, 1400, 272),
      road("asphalt", roadPts, 70), rect("concrete", 820, 272, 1040, 470, 10), rect("ramp", 880, 140, 940, 300),
    ],
    paint: [line([[880, 250], [940, 250]], { color: YELLOW, width: 3 })],
    parked: [car(1010, 305, PI / 2, "suv"), car(1044, 305, PI / 2, "wagon"), car(640, 330, 0.2, "hatch")],
    statics: [
      { kind: "water", x: 719, y: 125, w: 318, h: 250 }, { kind: "water", x: 1171, y: 125, w: 458, h: 250 },
      { kind: "water", x: 910, y: 64, w: 64, h: 128 },
      { kind: "bollard", x: 874, y: 262, r: 3 }, { kind: "bollard", x: 946, y: 262, r: 3 },
      { kind: "table", x: 360, y: 330 }, { kind: "table", x: 430, y: 300 },
      building(160, 360, 120, 80, { height: 30, color: 0x8b5a3c, roof: 0x3b3f45, sign: "BOAT HIRE", signColor: "#8b5a3c" }),
      ...trees,
    ],
    decor: [
      { kind: "pontoon", x: 1120, y: 215, w: 220, h: 10 },
      { kind: "boat", x: 1080, y: 190, a: 0.1, len: 60 }, { kind: "boat", x: 1180, y: 188, a: -0.1, len: 52 },
      { kind: "boat", x: 700, y: 120, a: 2.9, len: 70 },
    ],
    cones: [{ x: 865, y: 330 }, { x: 955, y: 330 }],
    start: { x: 120, y: 560, a: 0 },
    bay: { x: 910, y: 238, a: PI / 2, w: 44, l: 86 },
  });
}

// 5. Village square: 45° bays round the green.
function villageGreen() {
  const bays = angledRow(120, 126, 18, PI / 4);
  const target = 9;
  const green = [360, 270, 640, 430];
  const posts = [];
  for (let x = green[0]; x <= green[2]; x += 28) posts.push({ kind: "post", x, y: green[1] - 3 }, { kind: "post", x, y: green[3] + 3 });
  for (let y = green[1] + 28; y < green[3]; y += 28) posts.push({ kind: "post", x: green[0] - 3, y }, { kind: "post", x: green[2] + 3, y });
  const houses = [
    [0, 200, 0xd8c3a5], [200, 190, 0xb8866a], [390, 220, 0xe8e0d0], [610, 200, 0xc9b79c], [810, 190, 0xa0705a],
  ];
  return level({
    id: "village", name: "Village square", title: "Market Day", trailer: "box", par: 60, sun: "noon",
    brief: "Drive round the green and reverse into the free slanted bay outside the bakery. Pass it first, then swing back.",
    w: 1000, h: 600, base: "cobble", edge: "none", backdrop: "town",
    surfaces: [rect("grass", ...green, 14), rect("pavement", 0, 80, 1000, 92), rect("pavement", 0, 508, 1000, 520)],
    paint: [paintBays(bays), paintBays([{ ...bays[target], w: 34 }], YELLOW), arrow(200, 470, 0), arrow(800, 220, 0), zebra(300, 470, PI / 2, 70, 24)],
    parked: [...park(bays, fill(18, 0.85, 8, [target]), 81), car(620, 490, PI, "hatch"), car(780, 490, PI, "sedan")],
    statics: [
      ...houses.map(([x, w, c]) => building(x + w / 2, 40, w - 4, 80, { height: 50 + (x % 3) * 8, color: c, roof: 0x7a3b2e })),
      ...houses.map(([x, w, c], i) => building(x + w / 2, 560, w - 4, 80, { height: 44 + (i % 2) * 10, color: c, roof: 0x5a4a44 })),
      building(965, 300, 70, 416, { height: 48, color: 0xd6c8b0, roof: 0x7a3b2e }),
      building(35, 170, 70, 156, { height: 46, color: 0xc9b79c, roof: 0x7a3b2e }),
      building(35, 445, 70, 126, { height: 46, color: 0xb8866a, roof: 0x7a3b2e }),
      { kind: "barrier", x: 8, y: 315, w: 6, h: 128 },
      ...posts,
      { kind: "block", x: 500, y: 350, w: 26, h: 26, height: 34, color: 0x9a968c },
      tree(420, 305, 18), tree(585, 400, 18), tree(430, 400, 14),
      { kind: "lamp", x: 360, y: 450 }, { kind: "lamp", x: 640, y: 250 },
    ],
    cones: [],
    start: { x: 100, y: 315, a: 0 },
    bay: { ...bays[target], w: 34, l: 58 },
  });
}

export const CHAPTER1 = [gardenCentre(), barn(), fuelStop(), lakeside(), villageGreen()];
