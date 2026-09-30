import { ARMY_GREEN, ARMY_SAND, lcg } from "../config.js";
import {
  PI, level, car, rect, road, disc, paintBays, line, arrow, text, hatch,
  YELLOW, WHITE, building, tree, pine, scatter, wallLine, shed, range, distToLine, smooth, offsetLine, sample,
} from "./kit.js";

// ── Chapter 8 — On manoeuvres ────────────────────────────────────────────
// Army loads for drivers who have seen everything else: a field kitchen, an
// ammunition trailer, a field gun (axle ahead of the middle, so the barrel
// swings out behind it), a missile on a long twin-axle transporter and a
// tank on a low loader. Every job starts somewhere else and ends with a
// different hard manoeuvre: an alley, backing out of a shed first, a wired
// lane through a minefield, facing shelter rows, a long platform corridor
// and a curved dead end in the woods.

const OLIVE = ARMY_GREEN;
const mil = (x, y, a, color = OLIVE) => car(x, y, a, "mil", color);
const truck = (x, y, a, color = OLIVE) => car(x, y, a, "armytruck", color);
const tank = (x, y, a, o = {}) => ({ kind: "tank", x, y, a, ...o });
const parkedTrailer = (trailer, x, y, a) => ({ kind: "parkedtrailer", trailer, x, y, a });
const sandbags = (pts, o = {}) => wallLine(pts, { kind: "sandbags", thick: 8, maxLen: 60, ...o });
const armyTent = (x, y, w, h, a = 0) => ({ kind: "tent", x, y, w, h, a, color: 0x55643a });

const troops = (x, y, w, h) => ({ kind: "troops", x, y, w, h });
const wire = (pts) => wallLine(pts, { kind: "wire", thick: 3, maxLen: 50 });
const MINES = "rgba(200,60,50,0.9)";

// 43. Barracks: from the middle of the parade ground, between the
// companies on parade, then back the field kitchen up the alley beside
// the mess hall.
function barracks() {
  const bay = { x: 870, y: 100, a: PI / 2, w: 44, l: 48 };
  return level({
    id: "barracks", vehicle: "jeep", color: OLIVE, name: "Barracks", title: "Mess Call", trailer: "kitchen", par: 95, sun: "golden",
    brief: "Two companies are on parade and the cooks want the field kitchen at their door, up the alley beside the mess hall. Round the flagpole, don't scatter the troops, and back it up the alley.",
    w: 1300, h: 900, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      rect("asphalt", 200, 180, 1260, 280), rect("concrete", 330, 280, 970, 780, 6), rect("asphalt", 840, 40, 900, 180),
      rect("asphalt", 970, 280, 1260, 360),
    ],
    paint: [
      paintBays([bay], YELLOW), text(870, 150, "KITCHEN", { size: 10, color: YELLOW, a: -PI / 2 }),
      line([[360, 740], [940, 740]], { dash: [10, 10] }), line([[360, 320], [940, 320]], { dash: [10, 10] }),
      arrow(1100, 230, PI), arrow(400, 230, 0),
    ],
    parked: [
      // Jeeps along the road, a gap in front of the alley.
      ...[600, 650, 700, 750, 990, 1040, 1090].map((x) => mil(x, 306, PI / 2)),
      truck(1180, 322, PI / 2, ARMY_SAND), truck(260, 330, PI / 2),
    ],
    statics: [
      building(560, 110, 560, 140, { height: 34, color: 0xb8ad8c, roof: 0x4a5236, sign: "MESS HALL", signColor: "#2f3a1e" }),
      building(1080, 110, 360, 140, { height: 30, color: 0xa89c7a, roof: 0x4a5236, sign: "STORES", signColor: "#2f3a1e" }),
      { kind: "island", x: 650, y: 470, r: 24 }, { kind: "post", x: 650, y: 470, r: 2, flag: 0x55643a },
      troops(470, 520, 120, 150), troops(830, 520, 120, 150), troops(650, 360, 150, 40),
      ...range(0, 4).map((i) => building(260 + i * 260, 860, 210, 70, { height: 28, color: 0xb8ad8c, roof: 0x4a5236 })),
      armyTent(1180, 520, 50, 70), armyTent(1180, 640, 50, 70), armyTent(120, 520, 50, 70),
      { kind: "crates", x: 915, y: 200, w: 24, h: 14 },
      tree(1260, 120, 20), tree(60, 120, 22), tree(90, 700, 20), tree(1220, 780, 18),
    ],
    cones: [],
    start: { x: 650, y: 650, a: -PI / 2 },
    bay,
  });
}

// 44. Motor pool: the rig is parked nose-in in shed 2. Back it out, weave
// through the tanks lined up for inspection and reverse the ammunition
// into the bunker behind the HESCO chicane.
function motorPool() {
  const sheds = range(0, 6).map((i) => 330 + i * 110);
  const bay = { x: 1256, y: 440, a: PI, w: 44, l: 48 };
  return level({
    id: "motorpool", vehicle: "army", color: OLIVE, name: "Motor pool", title: "Ammo Run", trailer: "box", par: 120, sun: "deck",
    brief: "Someone parked your rig nose-first in shed 2. Back it out, weave through the tanks lined up for inspection and reverse the ammunition into the bunker — the HESCO wall in front of it only lets you in from the south.",
    w: 1400, h: 700, base: "concrete", edge: "wall", backdrop: "industrial",
    surfaces: [rect("asphalt", 180, 245, 1380, 640), rect("gravel", 1200, 380, 1340, 500)],
    paint: [
      paintBays([bay], YELLOW), text(1256, 372, "AMMO", { size: 12, color: YELLOW }),
      ...sheds.map((x, i) => text(x, 258, String(i + 1), { size: 12 })), hatch(1060, 560, 1360, 630),
    ],
    parked: sheds.flatMap((x, i) => (i === 1 ? [] : [truck(x, 170, PI / 2, i % 2 ? ARMY_SAND : OLIVE)])),
    statics: [
      ...sheds.flatMap((x) => shed(x, 160, PI / 2, 80, 150, { kind: "wall", style: "site", height: 32, thick: 8 }).slice(1)),
      { kind: "wall", x: 605, y: 81, a: 0, w: 660, h: 8, height: 32, style: "site" },
      // The inspection line: tanks standing across the yard, staggered.
      tank(620, 330, PI / 2), tank(620, 560, PI / 2), tank(820, 450, PI / 2), tank(1020, 330, PI / 2), tank(1020, 580, PI / 2, { turret: PI }),
      // Bunker: sandbag cheeks, HESCO back wall, and a chicane in front.
      ...sandbags([[1224, 414], [1290, 414]]), ...sandbags([[1224, 466], [1290, 466]]),
      { kind: "hesco", x: 1300, y: 440, w: 24, h: 90 },
      { kind: "hesco", x: 1150, y: 390, w: 20, h: 110 },
      { kind: "crates", x: 1340, y: 300, w: 30, h: 60 }, { kind: "crates", x: 230, y: 600, w: 30, h: 30 },
      { kind: "watchtower", x: 110, y: 600, s: 24 },
      ...[450, 850, 1250].map((x) => ({ kind: "lamp", x, y: 632, a: -PI / 2 })),
    ],
    cones: [{ x: 1200, y: 470 }, { x: 1200, y: 412 }],
    start: { x: 440, y: 118, a: -PI / 2 },
    bay,
  });
}

// 45. Artillery range: down a wired lane through the minefield, then the
// field gun into the middle pit, which faces east. The minefields hold real
// mines (an easter egg more than an obstacle): the one by the gun park is
// open towards it, for whoever swings too wide there.
function artilleryRange() {
  const lane = smooth([[1440, 110], [1060, 110], [880, 230], [920, 420], [740, 560], [470, 560], [380, 640]]);
  const pits = [680, 760, 840];
  const target = 1;
  const bay = { x: 182, y: pits[target], a: 0, w: 42, l: 66 };
  const fields = [[620, 150, 820, 400], [980, 170, 1300, 340], [630, 620, 900, 790], [1000, 460, 1300, 720]];
  const rnd = lcg(4501);
  // Only beyond the wire (40 px from the lane's middle): the fields overlap
  // the lane on the bends.
  const mines = fields.flatMap(([x0, y0, x1, y1]) => range(0, 14).map(() => ({ x: x0 + 14 + rnd() * (x1 - x0 - 28), y: y0 + 14 + rnd() * (y1 - y0 - 28) })))
    .filter((m) => distToLine(lane, m.x, m.y) > 50);
  const woods = scatter(452, 30, [40, 40, 1380, 880], (x, y, r) => (r() < 0.5 ? pine(x, y, 12 + r() * 6) : tree(x, y, 13 + r() * 6)),
    [[100, 600, 600, 900], ...fields]).filter((t) => distToLine(lane, t.x, t.y) > 90);
  const inClearing = (x, y) => x < 560 && y > 590;
  return level({
    id: "range", vehicle: "cargo", color: OLIVE, name: "Artillery range", title: "Gun Line", trailer: "fieldgun", par: 130, sun: "golden",
    brief: "The only way to the gun park is the wired lane through the minefield. Keep the gun's barrel off the wire on the bends, then reverse it into the middle pit, barrel first.",
    w: 1400, h: 900, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      road("dirt", lane, 70), rect("dirt", 110, 600, 580, 890, 30),
      disc("mud", 460, 700, 30), disc("mud", 1000, 300, 24), disc("mud", 700, 520, 22),
      // Churned ground of the minefields either side of the lane.
      ...fields.map((f) => rect("dirt", ...f, 40)),
    ],
    paint: [
      paintBays([bay], YELLOW), ...pits.map((y, i) => text(236, y, String(i + 1), { size: 13, color: i === target ? YELLOW : WHITE })),
      text(720, 300, "MINES", { size: 22, color: MINES }), text(1140, 250, "MINES", { size: 22, color: MINES }),
      text(765, 705, "MINES", { size: 22, color: MINES }), text(1150, 600, "MINES", { size: 22, color: MINES }),
      arrow(1250, 110, PI),
    ],
    parked: [truck(520, 850, 0, ARMY_SAND), mil(520, 800, 0)],
    statics: [
      ...wire(offsetLine(lane, 40)).filter((w) => !inClearing(w.x, w.y)),
      ...wire(offsetLine(lane, -40)).filter((w) => !inClearing(w.x, w.y)),
      // Red warning flags outside the wire.
      ...[52, -52].flatMap((o) => sample(lane, 110, o, 60)).filter((q) => !inClearing(q.x, q.y) && q.x < 1380).map((q) => ({ kind: "post", x: q.x, y: q.y, r: 1.6, flag: 0xc62d2d })),
      ...pits.flatMap((y) => shed(182, y, 0, 42, 66, { kind: "sandbags", thick: 8 })),
      ...pits.filter((_, k) => k !== target).map((y) => parkedTrailer("fieldgun", 184, y, 0)),
      { kind: "crates", x: 330, y: 640, w: 26, h: 18 }, { kind: "crates", x: 300, y: 870, w: 40, h: 18 },
      armyTent(420, 860, 50, 40), { kind: "rock", x: 380, y: 760, r: 10 },
      { kind: "watchtower", x: 1340, y: 40, s: 24 },
      ...woods,
    ],
    mines,
    cones: [],
    start: { x: 1240, y: 110, a: PI },
    bay,
  });
}

// 46. Missile base at night: in at the north gate, down the avenue, and the
// missile into shelter C on the far side of a narrow apron, blast walls
// sticking out between the doors on both sides.
function missileBase() {
  const north = [350, 550, 950, 1150], south = [350, 550, 750, 950, 1150];
  const target = 3;
  const bay = { x: south[target], y: 700, a: -PI / 2, w: 44, l: 110 };
  const apron = [230, 420, 1270, 650];
  return level({
    id: "missilebase", vehicle: "army", color: ARMY_SAND, name: "Missile base", title: "Launch Window", trailer: "missile", par: 150, sun: "night",
    brief: "In through the north gate and down the avenue. Shelter D is across a narrow apron with missiles on both sides and blast walls sticking out between the doors: find the room to swing eight metres of missile round.",
    w: 1500, h: 900, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      rect("concrete", ...apron), rect("asphalt", 700, 0, 800, 420),
      ...north.map((x) => rect("concrete", x - 30, 300, x + 30, 420)), ...south.map((x) => rect("concrete", x - 30, 650, x + 30, 770)),
    ],
    paint: [
      paintBays([bay], YELLOW), ...south.map((x, i) => text(x, 628, "ABCDE"[i], { size: 16, color: i === target ? YELLOW : WHITE })),
      line([[250, 535], [1250, 535]], { dash: [16, 14], color: "rgba(236,200,70,0.7)" }), arrow(750, 330, PI / 2),
    ],
    parked: [mil(1400, 260, PI / 2), mil(1440, 260, PI / 2), truck(100, 520, -PI / 2)],
    statics: [
      ...north.flatMap((x) => shed(x, 358, PI / 2, 48, 114, { kind: "wall", style: "site", height: 36, thick: 10 })),
      ...south.flatMap((x) => shed(x, 712, -PI / 2, 48, 114, { kind: "wall", style: "site", height: 36, thick: 10 })),
      ...north.map((x) => parkedTrailer("missile", x, 360, PI / 2)),
      ...south.filter((_, k) => k !== target).map((x) => parkedTrailer("missile", x, 710, -PI / 2)),
      ...[450, 1050].map((x) => ({ kind: "hesco", x, y: 450, w: 16, h: 60 })),
      ...[450, 650, 850, 1050].map((x) => ({ kind: "hesco", x, y: 620, w: 16, h: 60 })),
      { kind: "radar", x: 1380, y: 360, r: 14 }, building(1390, 500, 110, 70, { height: 26, color: 0x8e9aa6, roof: 0x4a5236 }),
      { kind: "kiosk", x: 830, y: 60, w: 30, h: 24 }, { kind: "barrier", x: 750, y: 20, w: 90, h: 5 },
      { kind: "watchtower", x: 640, y: 40, s: 24 },
      ...wallLine([[0, 200], [690, 200]], { kind: "fence", thick: 3 }), ...wallLine([[810, 200], [1500, 200]], { kind: "fence", thick: 3 }),
      ...[250, 650, 850, 1250].map((x) => ({ kind: "lamp", x, y: 426, a: PI / 2 })),
      ...range(0, 4).map((i) => tree(120 + i * 150, 110, 20)), ...range(0, 4).map((i) => tree(900 + i * 150, 110, 20)),
      ...range(0, 8).map((i) => tree(120 + i * 180, 860, 18)),
    ],
    cones: [],
    start: { x: 750, y: 190, a: PI / 2 },
    bay,
  });
}

// 47. Railhead: in at the south gate, round the depot, then the tank on the
// low loader backed all the way down the platform corridor between the
// train and the warehouse, to the end ramp.
function railhead() {
  const bay = { x: 300, y: 182, a: 0, w: 50, l: 170 };
  return level({
    id: "railhead", vehicle: "truck", color: OLIVE, name: "Railhead", title: "Tank Train", trailer: "lowloader", par: 200, sun: "deck",
    brief: "The train loads from the end. Round the depot and back the low loader all the way down the platform, between the wagons and the warehouse wall, to the ramp. Forty tonnes of tank, a gap barely twice as wide.",
    w: 2100, h: 1200, base: "concrete", edge: "rail", backdrop: "industrial",
    surfaces: [
      rect("gravel", 0, 60, 2100, 140), rect("asphalt", 200, 145, 2000, 420), rect("asphalt", 200, 420, 2000, 920), rect("asphalt", 1000, 920, 1100, 1200),
    ],
    paint: [
      paintBays([bay], YELLOW), text(236, 182, "RAMP", { size: 12, color: YELLOW, a: PI / 2 }),
      line([[0, 88], [2100, 88]], { color: "rgba(90,90,90,0.95)", width: 3 }), line([[0, 112], [2100, 112]], { color: "rgba(90,90,90,0.95)", width: 3 }),
      arrow(1050, 1000, -PI / 2), line([[720, 182], [1900, 182]], { dash: [24, 20] }),
    ],
    parked: [
      ...range(0, 6).map((i) => truck(300 + i * 100, 860, -PI / 2, i % 3 === 1 ? ARMY_SAND : OLIVE)),
      ...range(0, 6).map((i) => truck(1250 + i * 100, 860, -PI / 2, i % 2 ? ARMY_SAND : OLIVE)),
    ],
    statics: [
      // The train: flat wagons with tanks on them.
      ...range(0, 12).map((i) => ({ kind: "block", x: 280 + i * 140, y: 110, w: 132, h: 60, height: 12, color: 0x3b3f45 })),
      ...range(0, 12).map((i) => tank(280 + i * 140, 110, 0, { turret: i % 2 ? PI : 0 })),
      { kind: "block", x: 196, y: 182, w: 12, h: 60, height: 14, color: 0xc0392b },
      building(450, 312, 500, 170, { height: 48, color: 0x9aa3ab, roof: 0x4a5236, sign: "RAILHEAD 7", signColor: "#2f3a1e" }),
      ...range(0, 3).map((i) => parkedTrailer("lowloader", 1100 + i * 250, 330, 0)),
      { kind: "block", x: 1700, y: 600, w: 160, h: 90, height: 24, color: 0x566573 },
      ...range(0, 4).map((i) => tank(500 + i * 170, 560, PI / 2)),
      ...wallLine([[0, 920], [990, 920]], { kind: "wall", thick: 8, style: "site" }), ...wallLine([[1110, 920], [2100, 920]], { kind: "wall", thick: 8, style: "site" }),
      { kind: "kiosk", x: 1150, y: 980, w: 30, h: 24 },
      ...[500, 900, 1300, 1700].map((x) => ({ kind: "lamp", x, y: 432, a: -PI / 2 })),
      { kind: "watchtower", x: 1950, y: 1050, s: 26 },
    ],
    cones: [],
    start: { x: 1050, y: 1010, a: -PI / 2 },
    bay,
  });
}

// 48. Forest camp at dusk: in from the east along the forest road, then the
// missile reversed round the bend of a dead-end track, under the net.
function forestCamp() {
  const road1 = smooth([[1540, 520], [1200, 520], [1000, 420], [760, 440], [560, 560], [380, 580]]);
  const spur = smooth([[250, 520], [250, 330], [300, 220], [400, 170], [470, 166], [620, 166]], 2);
  const clearing = [120, 460, 440, 740];
  const bay = { x: 540, y: 166, a: PI, w: 44, l: 110 };
  const woods = scatter(482, 170, [20, 20, 1480, 980], (x, y, r) => (r() < 0.65 ? pine(x, y, 13 + r() * 7) : tree(x, y, 15 + r() * 6)),
    [[clearing[0] - 20, clearing[1] - 20, clearing[2] + 20, clearing[3] + 20]])
    .filter((t) => distToLine(road1, t.x, t.y) > 58 && distToLine(spur, t.x, t.y) > 52);
  return level({
    id: "forestcamp", vehicle: "cargo", color: OLIVE, name: "Forest camp", title: "Under the Trees", trailer: "missile", par: 180, sun: "dusk",
    brief: "Hide the missile before dark. The net is at the end of a dead-end track that bends through the trees: from the clearing you have to reverse eight metres of missile round the bend and under it.",
    w: 1500, h: 1000, base: "grass", edge: "none", backdrop: "forest",
    surfaces: [
      rect("dirt", ...clearing, 40), road("dirt", road1, 64), road("dirt", spur, 70),
      disc("mud", 1100, 470, 36), disc("mud", 700, 470, 40), disc("mud", 300, 600, 44), disc("mud", 280, 330, 26),
    ],
    paint: [paintBays([bay], YELLOW)],
    parked: [truck(380, 700, PI), mil(160, 700, -PI / 2)],
    statics: [
      parkedTrailer("missile", 200, 620, -PI / 2),
      armyTent(390, 500, 50, 50), { kind: "crates", x: 170, y: 490, w: 30, h: 20 },
      { kind: "firepit", x: 300, y: 680 },
      ...[[486, 140], [594, 140], [486, 192], [594, 192]].map(([x, y]) => ({ kind: "post", x, y, r: 2 })),
      // Thicket along the track and round its end: the only way in is
      // backwards from the clearing.
      ...[62, -62].flatMap((o) => sample(offsetLine(spur, o), 22)).filter((q) => q.y < 470).map((q) => pine(q.x, q.y, 12)),
      ...range(0, 7).map((i) => pine(650, 100 + i * 22, 13)),
      ...woods,
    ],
    decor: [{ kind: "camonet", x: 540, y: 166, w: 130, h: 64, height: 40 }],
    cones: [],
    start: { x: 1320, y: 520, a: PI },
    bay,
  });
}

export const CHAPTER8 = [barracks(), motorPool(), artilleryRange(), missileBase(), railhead(), forestCamp()];
