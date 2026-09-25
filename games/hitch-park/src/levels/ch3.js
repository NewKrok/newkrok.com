import {
  PI, level, hrow, angledRow, park, fill, car, rect, road, paintBays, line, arrow, text, zebra,
  YELLOW, building, tree, scatter, sample, offsetLine, wallLine, range,
} from "./kit.js";

// ── Chapter 3 — Out of town ──────────────────────────────────────────────

// 11. Country lane between stone walls, then into a field gate.
function countryLane() {
  const lane = [[-40, 560], [250, 560], [450, 480], [700, 450], [900, 320], [1150, 300], [1400, 340], [1600, 260], [1840, 260]];
  const gate = (x) => x > 1112 && x < 1188;           // north wall gap
  const passing = (x) => x > 1070 && x < 1230;        // south wall steps out
  const north = wallLine(offsetLine(lane, 44), { style: "stone", height: 12, thick: 8, maxLen: 20, skip: (x) => gate(x) });
  const south = wallLine(offsetLine(lane, -44), { style: "stone", height: 12, thick: 8, maxLen: 20, skip: (x) => passing(x) });
  const bushes = [...sample(lane, 70, 100), ...sample(lane, 70, -100)]
    .filter((p) => !(p.x > 1040 && p.x < 1260))
    .map((p, i) => (i % 3 ? { kind: "bush", x: p.x, y: p.y, r: 12 } : tree(p.x, p.y, 20)));
  return level({
    id: "lane", vehicle: "pickup", name: "Country lane", title: "Field Gate", trailer: "box", par: 100, sun: "golden",
    brief: "Follow the lane between the stone walls. At the open field gate, use the passing place opposite to swing the trailer through the gateway.",
    w: 1800, h: 700, base: "grass", edge: "none", backdrop: "fields",
    surfaces: [road("asphalt", lane, 66), rect("asphalt", 1070, 296, 1230, 380, 16), rect("mud", 1112, 170, 1188, 262)],
    paint: [line(offsetLine(lane, 30), { width: 1.5, color: "rgba(236,236,230,0.5)" }), line(offsetLine(lane, -30), { width: 1.5, color: "rgba(236,236,230,0.5)" })],
    statics: [
      ...north, ...south,
      // The passing place's outer wall.
      ...wallLine([[1066, 346], [1066, 388], [1234, 388], [1234, 352]], { style: "stone", height: 12, thick: 8 }),
      { kind: "post", x: 1108, y: 258, r: 4 }, { kind: "post", x: 1192, y: 258, r: 4 },
      // The field is hedged round.
      ...wallLine([[1110, 256], [1040, 250], [1040, 90], [1260, 90], [1260, 250], [1190, 256]], { kind: "hedge", thick: 10, maxLen: 60 }),
      { kind: "hay", x: 1080, y: 130, r: 9 }, { kind: "hay", x: 1100, y: 146, r: 9 },
      building(260, 380, 150, 90, { height: 40, color: 0xe8e0d0, roof: 0x5a4a44 }),
      ...bushes,
    ],
    cones: [],
    start: { x: 110, y: 560, a: 0 },
    bay: { x: 1150, y: 205, a: PI / 2, w: 46, l: 74 },
  });
}

// 12. Ferry port: the long boat stalls by the check-in.
function ferryTerminal() {
  const stalls = angledRow(830, 640, 8, -PI / 4, { w: 44, l: 96 });
  const target = 4;
  const queue = [];
  for (let r = 0; r < 5; r++) for (let i = 0; i < 9; i++) if ((r * 9 + i) % 7 !== 3) queue.push(car(480 + i * 62, 232 + r * 44, PI, ["sedan", "wagon", "suv", "hatch", "van"][(r + i) % 5]));
  return level({
    id: "ferry", vehicle: "pickup", name: "Ferry port", title: "Boarding Soon", trailer: "boat", par: 95, sun: "marina",
    brief: "The ferry isn't loading yet. Park the boat in the slanted stall by the check-in — pass it, then reverse in.",
    w: 1400, h: 760, edge: "rail", backdrop: "town",
    surfaces: [rect("water", -500, -600, 1900, 130), rect("concrete", 0, 130, 1400, 180)],
    paint: [
      ...range(0, 6).map((r) => line([[440, 210 + r * 44], [1030, 210 + r * 44]], { color: YELLOW, width: 1.5 })),
      ...range(0, 5).map((r) => text(1060, 232 + r * 44, `LANE ${r + 1}`, { size: 11, color: YELLOW })),
      paintBays(stalls), paintBays([{ ...stalls[target], w: 46 }], YELLOW), text(1080, 540, "BOATS · CARAVANS", { size: 12, color: YELLOW }),
      arrow(300, 500, 0), arrow(800, 520, 0),
    ],
    parked: [...queue, ...park(stalls, [0, 2, 6], 121, ["van", "suv"])],
    statics: [
      { kind: "water", x: 700, y: 60, w: 1400, h: 128 },
      { kind: "quay", x: 700, y: 132, w: 1400, h: 8 },
      ...range(0, 13).map((i) => ({ kind: "bollard", x: 60 + i * 105, y: 146, r: 3.2 })),
      building(170, 330, 260, 200, { height: 48, color: 0xe8eef4, roof: 0x2f5f9a, sign: "FERRY TERMINAL", signColor: "#2f5f9a", signSide: "e" }),
      ...wallLine([[440, 210], [1030, 210], [1030, 430], [440, 430], [440, 210]], { kind: "kerb", thick: 6 }),
      ...[500, 620, 740].map((x) => ({ kind: "kiosk", x, y: 700, w: 30, h: 22 })),
      ...stalls.filter((_, i) => [1, 3, 5, 7].includes(i)).map((b) => ({ kind: "vancaravan", x: b.x, y: b.y, a: b.a })),
      { kind: "lamp", x: 360, y: 470 }, { kind: "lamp", x: 760, y: 470 },
      ...wallLine([[760, 694], [1330, 694]], { kind: "hedge", thick: 10, maxLen: 60 }),
    ],
    decor: [{ kind: "ferry", x: 700, y: 40, w: 640, h: 110 }],
    cones: [],
    start: { x: 140, y: 520, a: 0 },
    bay: { ...stalls[target], w: 46, l: 96 },
  });
}

// 13. Old town: through the narrow streets, then parallel-park at the kerb.
function oldTown() {
  const kerbN = [
    car(90, 126, 0, "hatch"), car(170, 126, 0, "sedan"), car(420, 126, 0, "wagon"), car(520, 126, 0, "hatch"),
    car(760, 126, 0, "suv"), car(850, 126, 0, "sedan"), car(940, 126, 0, "hatch"), car(1128, 126, 0, "sedan"),
    car(1240, 126, 0, "van"), car(1330, 126, 0, "hatch"),
  ];
  const kerbS = [car(150, 626, 0, "sedan"), car(330, 626, 0, "hatch"), car(900, 626, 0, "van"), car(1100, 626, 0, "wagon")];
  const facades = (y0, y1, x0, x1, seed) => {
    const out = [];
    let x = x0, i = seed;
    while (x < x1 - 20) {
      const w = Math.min(x1 - x, 70 + ((i * 37) % 60));
      out.push(building(x + w / 2, (y0 + y1) / 2, w - 2, y1 - y0, { height: 50 + ((i * 13) % 30), color: [0xd8c3a5, 0xb8866a, 0xe8e0d0, 0xc9b79c, 0xa0705a, 0x8e9aa6][i % 6], roof: 0x7a3b2e, lit: true }));
      x += w; i++;
    }
    return out;
  };
  return level({
    id: "oldtown", name: "Old town", title: "Evening Kerb", trailer: "box", par: 90, sun: "dusk",
    brief: "Wind through the old town and parallel-park the trailer at the kerb on the upper street, in the gap by the lamp post.",
    w: 1400, h: 720, base: "cobble", edge: "none", backdrop: "town",
    surfaces: [
      rect("pavement", 0, 90, 1400, 110), rect("pavement", 0, 250, 555, 268), rect("pavement", 705, 250, 1400, 268),
      rect("pavement", 0, 522, 555, 540), rect("pavement", 705, 522, 1400, 540), rect("pavement", 0, 642, 1400, 660),
      rect("asphalt", 0, 110, 1400, 250), rect("asphalt", 0, 540, 1400, 642), rect("asphalt", 555, 250, 705, 540),
    ],
    paint: [
      line([[0, 185], [1400, 185]], { dash: [16, 14] }), line([[0, 591], [1400, 591]], { dash: [16, 14] }),
      arrow(630, 400, -PI / 2), arrow(300, 591, 0), zebra(630, 200, 0, 80, 24),
    ],
    parked: [...kerbN, ...kerbS],
    statics: [
      { kind: "kerb", x: 700, y: 108, w: 1400, h: 6 }, { kind: "kerb", x: 700, y: 644, w: 1400, h: 6 },
      { kind: "kerb", x: 277, y: 252, w: 555, h: 6 }, { kind: "kerb", x: 1052, y: 252, w: 695, h: 6 },
      { kind: "kerb", x: 277, y: 540, w: 555, h: 6 }, { kind: "kerb", x: 1052, y: 540, w: 695, h: 6 },
      { kind: "kerb", x: 557, y: 396, w: 6, h: 290 }, { kind: "kerb", x: 703, y: 396, w: 6, h: 290 },
      ...facades(0, 90, 0, 1400, 1), ...facades(660, 720, 0, 1400, 4),
      ...facades(268, 522, 0, 555, 7), ...facades(268, 522, 705, 1400, 11),
      ...[160, 460, 1060].map((x) => ({ kind: "lamp", x, y: 100 })), { kind: "lamp", x: 1000, y: 100 },
      ...[240, 700, 1200].map((x) => ({ kind: "lamp", x, y: 652 })),
      { kind: "barrier", x: 8, y: 180, w: 6, h: 136 }, { kind: "barrier", x: 1392, y: 180, w: 6, h: 136 },
      { kind: "barrier", x: 1392, y: 591, w: 6, h: 96 },
    ],
    cones: [],
    start: { x: 90, y: 590, a: 0 },
    bay: { x: 1000, y: 127, a: 0, w: 30, l: 52 },
  });
}

// 14. Timber yard: between the log piles.
function timberYard() {
  const road1 = [[-40, 640], [200, 620], [420, 560], [640, 520]];
  const forest = scatter(141, 90, [0, 0, 1300, 720], (x, y, r) => (r() < 0.7 ? { kind: "pine", x, y, r: 14 + r() * 8 } : tree(x, y, 16 + r() * 6)),
    [[560, 120, 1300, 700], [-10, 560, 700, 700], [300, 460, 700, 600], [140, 560, 680, 690]]);
  return level({
    id: "timber", vehicle: "pickup", name: "Timber yard", title: "Log Jam", trailer: "box", par: 85, sun: "golden",
    brief: "Up the forest track into the timber yard, then reverse into the loading slot between the two log piles.",
    w: 1300, h: 720, base: "grass", edge: "fence", backdrop: "forest",
    surfaces: [road("dirt", road1, 70), rect("gravel", 600, 140, 1260, 660, 30)],
    paint: [],
    statics: [
      { kind: "logs", x: 1150, y: 245, w: 150, h: 50 }, { kind: "logs", x: 1150, y: 355, w: 150, h: 50 },
      { kind: "logs", x: 900, y: 200, w: 130, h: 44 }, { kind: "logs", x: 900, y: 560, w: 160, h: 50 },
      { kind: "logs", x: 1120, y: 560, w: 140, h: 44 },
      building(760, 200, 180, 110, { height: 48, color: 0x8a6a45, roof: 0x3b3f45, sign: "SAWMILL", signColor: "#5a3f1e" }),
      { kind: "block", x: 980, y: 420, w: 28, h: 46, height: 30, color: 0xe8c547 },
      { kind: "hay", x: 700, y: 620, r: 6 },
      ...forest,
    ],
    cones: [{ x: 1060, y: 285 }, { x: 1060, y: 315 }],
    start: { x: 115, y: 630, a: -0.05 },
    bay: { x: 1150, y: 300, a: PI, w: 40, l: 70 },
  });
}

// 15. Beach: the ramp down to the sea.
function beach() {
  const rows = [hrow(160, 200, 12, PI / 2), hrow(160, 330, 12, -PI / 2), hrow(900, 200, 12, PI / 2), hrow(900, 330, 12, -PI / 2)];
  const posts = rows.flatMap((r) => r.map((b) => ({ kind: "post", x: b.x - 15, y: b.y + Math.sin(b.a) * 28, r: 2 })));
  return level({
    id: "beach", vehicle: "suv", name: "Beach", title: "Low Tide", trailer: "boat", par: 95, sun: "noon",
    brief: "From the coast road through the sandy car park to the beach ramp. Reverse the boat down between the groynes.",
    w: 1400, h: 760, base: "sand", edge: "none", backdrop: "dunes",
    surfaces: [
      rect("water", -500, 610, 1900, 1300), rect("asphalt", 0, 40, 1400, 110), rect("ramp", 680, 440, 760, 690),
      rect("sand", 0, 520, 1400, 612),
    ],
    paint: [line([[0, 75], [1400, 75]], { dash: [20, 16] }), ...rows.map((r) => paintBays(r, "rgba(120,90,50,0.35)"))],
    parked: rows.flatMap((r, i) => park(r, fill(12, 0.65, 150 + i), 155 + i)),
    statics: [
      { kind: "water", x: 350, y: 700, w: 700, h: 180 }, { kind: "water", x: 1080, y: 700, w: 640, h: 180 },
      { kind: "water", x: 720, y: 736, w: 80, h: 64 },
      { kind: "wall", x: 672, y: 600, w: 180, h: 8, a: PI / 2, style: "stone", height: 10 },
      { kind: "wall", x: 768, y: 600, w: 180, h: 8, a: PI / 2, style: "stone", height: 10 },
      ...posts,
      ...[[200, 470], [320, 480], [1100, 470], [1220, 480], [40, 300], [1360, 300]].map(([x, y]) => ({ kind: "bush", x, y, r: 16 })),
      ...[[260, 560], [1000, 560], [1150, 555]].map(([x, y]) => ({ kind: "rock", x, y, r: 10 })),
      ...[380, 440, 500, 900, 960, 1020].map((x, i) => building(x, 490, 44, 34, { height: 22, color: [0xd33a2c, 0x2e86c1, 0xf2c230, 0x1e8449, 0xe67e22, 0x8e44ad][i], roof: 0xf2f2ee })),
      { kind: "lamp", x: 640, y: 150 }, { kind: "lamp", x: 800, y: 150 },
    ],
    cones: [],
    start: { x: 1250, y: 75, a: PI },
    bay: { x: 720, y: 560, a: -PI / 2, w: 44, l: 86 },
  });
}

export const CHAPTER3 = [countryLane(), ferryTerminal(), oldTown(), timberYard(), beach()];
