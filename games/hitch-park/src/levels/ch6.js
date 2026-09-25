import {
  PI, level, hrow, vrow, angledRow, park, fill, car, rect, road, disc, paintBays, line, arrow, text, zebra, hatch,
  YELLOW, WHITE, building, tree, pine, shed, scatter, sample, offsetLine, wallLine, range, containers, parkedSemi,
} from "./kit.js";

// ── Chapter 6 — Big rigs ─────────────────────────────────────────────────
// A tractor unit with a 13.6 m semi-trailer: the fifth wheel sits over the
// driven rear axle, so the trailer answers much more slowly than a car's.

const SEMI_COLORS = [0x3d6fb6, 0xf2f0e6, 0x2f6b4a, 0xd9a13a, 0x8a1f24, 0x2b2d31, 0x5b4a8a, 0xb8bcc2];
const semiAt = (x, y, a, i) => parkedSemi(x, y, a, SEMI_COLORS[i % SEMI_COLORS.length]);

// 26. Distribution centre: onto a free dock.
function distribution() {
  const docks = range(0, 10).map((i) => 420 + i * 130);
  const target = 5;
  const staff = hrow(260, 1040, 30, -PI / 2);
  return level({
    id: "dc", name: "Distribution centre", title: "Door Six", vehicle: "truck", trailer: "semi", par: 110, sun: "noon",
    brief: "Your first articulated lorry. Swing wide across the yard and reverse the trailer onto dock 6. Big rig, slow trailer — patience.",
    w: 2000, h: 1100, base: "concrete", edge: "rail", backdrop: "industrial",
    surfaces: [rect("asphalt", 0, 380, 2000, 1000), rect("concrete", 200, 160, 1800, 380)],
    paint: [
      paintBays(docks.map((x) => ({ x, y: 252, a: PI / 2, w: 52, l: 184 })), YELLOW),
      ...docks.map((x, i) => text(x, 360, String(i + 1), { size: 18, color: YELLOW })), paintBays(staff),
      arrow(600, 700, 0), arrow(1400, 700, 0), line([[0, 700], [2000, 700]], { dash: [28, 22] }),
    ],
    parked: park(staff, fill(30, 0.7, 261), 262),
    statics: [
      building(1000, 80, 1600, 160, { height: 90, color: 0xb8bcc2, roof: 0x6b737c, doors: docks, doorW: 44, sign: "EUROFREIGHT DISTRIBUTION", signColor: "#1f3a5a" }),
      ...docks.filter((_, i) => i !== target && i !== 8).map((x, i) => semiAt(x, 244, PI / 2, i)),
      building(1900, 900, 140, 100, { height: 30, color: 0xe8e0d0, roof: 0x3b3f45, sign: "GATE", signColor: "#1f3a5a" }),
      { kind: "barrier", x: 1830, y: 820, w: 6, h: 80 },
      ...[300, 800, 1300, 1800].map((x) => ({ kind: "lamp", x, y: 560 })),
      ...containers(60, 360, 450, 2, 26),
    ],
    cones: [],
    start: { x: 260, y: 780, a: 0 },
    bay: { x: docks[target], y: 252, a: PI / 2, w: 52, l: 184 },
  });
}

// 27. Truck stop: an angled lorry bay between the sleepers.
function truckStop() {
  const a = -PI / 2 + 0.6;
  const bays = angledRow(360, 330, 12, a, { w: 56, l: 210 });
  const target = 7;
  return level({
    id: "truckstop", name: "Truck stop", title: "Night Shift", vehicle: "truck", trailer: "semi", par: 120, sun: "dusk",
    brief: "Park up for the night. The bays slant across the lorry park: drive past the free one and reverse in between the sleepers.",
    w: 2000, h: 1200, edge: "rail", backdrop: "fields",
    surfaces: [rect("concrete", 1500, 700, 1950, 1000), road("asphalt", [[-40, 1080], [600, 1080], [900, 900], [1400, 850]], 110)],
    paint: [paintBays(bays), paintBays([{ ...bays[target], w: 58 }], YELLOW), text(1100, 560, "HGV PARKING", { size: 22, color: YELLOW }), arrow(700, 640, 0), arrow(1300, 640, 0)],
    parked: [car(1650, 1060, 0, "sedan"), car(1720, 1060, 0, "hatch")],
    statics: [
      ...bays.filter((_, i) => i !== target && i !== 3 && i !== 10).map((b, i) => semiAt(b.x - Math.cos(a) * 18, b.y - Math.sin(a) * 18, a, i + 2)),
      building(1720, 820, 360, 180, { height: 40, color: 0xd33a2c, roof: 0xf2f2ee, sign: "JOE'S DINER", signColor: "#ffffff", lit: true }),
      ...[1560, 1660, 1760, 1860].map((x) => ({ kind: "pump", x, y: 620, w: 16, h: 70 })),
      ...[400, 800, 1200].map((x) => ({ kind: "lamp", x, y: 720 })), { kind: "lamp", x: 1600, y: 1000 },
      ...sample([[0, 1160], [2000, 1160]], 70, 0).map((p) => tree(p.x, p.y, 20)),
    ],
    cones: [],
    start: { x: 180, y: 1080, a: 0 },
    bay: { ...bays[target], w: 58, l: 210 },
  });
}

// 28. Container port: drop the trailer in the stack lane.
function port() {
  const stacks = [
    ...containers(200, 1160, 100, 6, 281), ...containers(1240, 2000, 100, 6, 282),
    ...containers(200, 900, 620, 5, 283), ...containers(1100, 2000, 620, 5, 284),
  ];
  return level({
    id: "port", name: "Deep-sea port", title: "Stack Lane", vehicle: "truck", trailer: "semi", par: 130, sun: "noon",
    brief: "Drop the trailer in lane 12, the narrow gap in the north stacks. Line up across the quay first — the lane is barely wider than you.",
    w: 2200, h: 1200, base: "concrete", edge: "rail", backdrop: "industrial",
    surfaces: [rect("water", -600, 1100, 2800, 1800), rect("asphalt", 0, 290, 2200, 620), rect("asphalt", 900, 620, 1100, 1100)],
    paint: [paintBays([{ x: 1200, y: 195, a: PI / 2, w: 52, l: 186 }], YELLOW), text(1200, 310, "12", { size: 26, color: YELLOW }), line([[0, 455], [2200, 455]], { dash: [28, 22] }), arrow(1000, 900, -PI / 2, YELLOW)],
    parked: [car(1600, 1000, 0, "lorry", 0x3d6fb6), car(400, 1000, 0.1, "lorry", 0xd9342b)],
    statics: [
      ...stacks,
      { kind: "water", x: 1100, y: 1150, w: 2200, h: 100 },
      { kind: "quay", x: 1100, y: 1100, w: 2200, h: 8 },
      ...range(0, 16).map((i) => ({ kind: "bollard", x: 80 + i * 140, y: 1090, r: 4 })),
      ...[400, 1600].map((x) => ({ kind: "block", x, y: 880, w: 50, h: 90, height: 40, color: 0xe8c547 })),
      ...[300, 900, 1500, 2000].map((x) => ({ kind: "lamp", x, y: 600 })),
    ],
    decor: [{ kind: "crane", x: 700, y: 455, span: 300, a: 0 }, { kind: "crane", x: 1650, y: 455, span: 300, a: 0 }, { kind: "ferry", x: 1100, y: 1260, w: 900, h: 140, color: 0x1f3a5a }],
    cones: [{ x: 1165, y: 300 }, { x: 1235, y: 300 }],
    start: { x: 200, y: 900, a: 0 },
    bay: { x: 1200, y: 195, a: PI / 2, w: 52, l: 186 },
  });
}

// 29. Town delivery: blind-side into the supermarket's service yard.
function delivery() {
  const kerbCars = [300, 420, 560, 700, 1480, 1620, 1760].map((x, i) => car(x, 792, 0, ["sedan", "hatch", "wagon", "suv", "van", "sedan", "hatch"][i]));
  const shops = [];
  let x = 0, i = 0;
  while (x < 2000) {
    const w = 120 + ((i * 53) % 90);
    if (!(x + w > 1060 && x < 1380)) shops.push(building(x + w / 2, 430, w - 3, 260, { height: 50 + (i % 4) * 12, color: [0xd8c3a5, 0xb8866a, 0xe8e0d0, 0xc9b79c, 0xa0705a, 0x8e9aa6][i % 6], roof: 0x5a4a44 }));
    x += w; i++;
  }
  const south = [];
  x = 0; i = 3;
  while (x < 2000) { const w = 130 + ((i * 41) % 80); south.push(building(x + w / 2, 960, w - 3, 160, { height: 44 + (i % 3) * 14, color: [0xc9b79c, 0x8e9aa6, 0xd6c8b0, 0xb8866a][i % 4], roof: 0x5a4a44 })); x += w; i++; }
  return level({
    id: "delivery", name: "High street", title: "Service Yard", vehicle: "truck", trailer: "semi", par: 140, sun: "deck",
    brief: "Morning delivery. Reverse the trailer off the high street, through the narrow gate, into the supermarket's service yard.",
    w: 2000, h: 1100, base: "asphalt", edge: "none", backdrop: "town",
    surfaces: [rect("pavement", 0, 560, 2000, 600), rect("pavement", 0, 820, 2000, 860), rect("concrete", 1110, 280, 1330, 560)],
    paint: [line([[0, 710], [2000, 710]], { dash: [24, 20] }), paintBays([{ x: 1220, y: 440, a: PI / 2, w: 54, l: 190 }], YELLOW), text(1220, 580, "DELIVERIES ONLY", { size: 12, color: YELLOW }), zebra(900, 700, 0, 220, 26)],
    parked: kerbCars,
    statics: [
      ...shops, ...south,
      building(1220, 150, 440, 260, { height: 60, color: 0x2e86c1, roof: 0x3b3f45, sign: "FRESHMART", signColor: "#ffffff" }),
      { kind: "wall", x: 1095, y: 420, a: PI / 2, w: 290, h: 10, style: "brick", height: 26 },
      { kind: "wall", x: 1345, y: 420, a: PI / 2, w: 290, h: 10, style: "brick", height: 26 },
      { kind: "kerb", x: 540, y: 598, w: 1080, h: 6 }, { kind: "kerb", x: 1690, y: 598, w: 620, h: 6 },
      { kind: "kerb", x: 1000, y: 820, w: 2000, h: 6 },
      ...[200, 600, 1000, 1500, 1900].map((x) => ({ kind: "lamp", x, y: 575 })),
      { kind: "barrier", x: 6, y: 710, w: 6, h: 210 }, { kind: "barrier", x: 1994, y: 710, w: 6, h: 210 },
    ],
    cones: [],
    start: { x: 180, y: 690, a: 0 },
    bay: { x: 1220, y: 440, a: PI / 2, w: 54, l: 190 },
  });
}

// 30. Ferry: reverse up the ramp onto the car deck.
function ferryDeck() {
  const hull = [[700, 380], [700, 60], [1300, 60], [1300, 380]];
  return level({
    id: "ferrydeck", name: "Ferry terminal", title: "Last Aboard", vehicle: "truck", trailer: "semi", par: 150, sun: "night",
    brief: "The night ferry is waiting for you. Reverse the trailer up the stern ramp and onto the lorry deck, between the other trailers.",
    w: 2000, h: 1000, base: "concrete", edge: "rail", backdrop: "town",
    surfaces: [rect("water", -600, -800, 2600, 470), rect("deck", 700, 60, 1300, 380), rect("ramp", 940, 380, 1060, 470)],
    paint: [
      paintBays([{ x: 1000, y: 230, a: PI / 2, w: 58, l: 192 }], YELLOW), line([[0, 720], [2000, 720]], { dash: [28, 22] }),
      ...range(0, 6).map((r) => line([[200 + r * 280, 520], [200 + r * 280, 640]], { color: YELLOW })), text(1600, 900, "FREIGHT CHECK-IN", { size: 16, color: YELLOW }),
    ],
    parked: [car(1500, 580, 0, "lorry", 0xf2f0e6), car(400, 580, 0, "lorry", 0x2f6b4a)],
    statics: [
      ...wallLine(hull, { kind: "wall", style: "hull", thick: 12, height: 46, skip: (x, y) => y > 370 && x > 930 && x < 1070 }),
      { kind: "wall", x: 820, y: 382, w: 240, h: 12, style: "hull", height: 46 }, { kind: "wall", x: 1180, y: 382, w: 240, h: 12, style: "hull", height: 46 },
      semiAt(820, 225, PI / 2, 1), semiAt(1180, 225, PI / 2, 3),
      { kind: "water", x: 350, y: 235, w: 700, h: 470 }, { kind: "water", x: 1650, y: 235, w: 700, h: 470 },
      { kind: "water", x: 1000, y: 28, w: 600, h: 56 },
      { kind: "water", x: 820, y: 425, w: 240, h: 90 }, { kind: "water", x: 1180, y: 425, w: 240, h: 90 },
      { kind: "quay", x: 350, y: 474, w: 700, h: 8 }, { kind: "quay", x: 1650, y: 474, w: 700, h: 8 },
      ...[1600, 1700, 1800].map((x) => ({ kind: "kiosk", x, y: 850, w: 34, h: 24 })),
      ...[300, 700, 1300, 1700].map((x) => ({ kind: "lamp", x, y: 500 })),
    ],
    decor: [{ kind: "ferryhull", x: 1000, y: 220, w: 640, h: 360 }],
    cones: [{ x: 930, y: 520 }, { x: 1070, y: 520 }],
    start: { x: 250, y: 800, a: 0 },
    bay: { x: 1000, y: 230, a: PI / 2, w: 58, l: 192 },
  });
}

export const CHAPTER6 = [distribution(), truckStop(), port(), delivery(), ferryDeck()];
