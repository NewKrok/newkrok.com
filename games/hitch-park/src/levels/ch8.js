import { ARMY_GREEN, ARMY_SAND } from "../config.js";
import {
  PI, level, car, rect, road, disc, paintBays, line, arrow, text, hatch,
  YELLOW, WHITE, building, tree, pine, scatter, wallLine, shed, range, distToLine, smooth,
} from "./kit.js";

// ── Chapter 8 — On manoeuvres ────────────────────────────────────────────
// Army loads behind an olive utility vehicle: a field kitchen and a plain
// ammunition trailer to start, then a field gun (axle ahead of the middle,
// so the barrel swings out behind it), a missile on a long twin-axle
// transporter, and a tank on a low loader behind a tractor unit.

const OLIVE = ARMY_GREEN;
const mil = (x, y, a, color = OLIVE) => car(x, y, a, "mil", color);
const truck = (x, y, a, color = OLIVE) => car(x, y, a, "armytruck", color);
const tank = (x, y, a, o = {}) => ({ kind: "tank", x, y, a, ...o });
const parkedTrailer = (trailer, x, y, a) => ({ kind: "parkedtrailer", trailer, x, y, a });
const sandbags = (pts, o = {}) => wallLine(pts, { kind: "sandbags", thick: 8, maxLen: 60, ...o });
const armyTent = (x, y, w, h, a = 0) => ({ kind: "tent", x, y, w, h, a, color: 0x55643a });

// 43. Barracks: the field kitchen up to the mess hall's kitchen door.
function barracks() {
  const bay = { x: 820, y: 214, a: PI / 2, w: 40, l: 46 };
  const loop = [[-40, 620], [1150, 620], [1150, 300], [200, 300]];
  return level({
    id: "barracks", vehicle: "army", color: OLIVE, name: "Barracks", title: "Mess Call", trailer: "kitchen", par: 85, sun: "noon",
    brief: "Welcome to the army. The cooks need the field kitchen at the mess hall: round the parade ground and reverse it up to the kitchen door, between the other two.",
    w: 1300, h: 800, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      road("asphalt", loop, 60), rect("concrete", 330, 380, 1010, 560, 6), rect("concrete", 380, 170, 1020, 270),
      rect("asphalt", 150, 180, 320, 270),
    ],
    paint: [
      paintBays([bay], YELLOW), text(bay.x, 252, "KITCHEN", { size: 11, color: YELLOW }),
      ...range(0, 5).map((i) => paintBays([{ x: 180 + i * 34, y: 225, a: PI / 2, w: 34, l: 70 }])),
      arrow(600, 620, 0), arrow(1150, 460, -PI / 2), arrow(700, 300, PI), line([[380, 470], [960, 470]], { color: WHITE, width: 2, dash: [10, 10] }),
    ],
    parked: [...range(0, 5).map((i) => mil(180 + i * 34, 222, PI / 2)), truck(1050, 205, PI / 2, ARMY_SAND)],
    statics: [
      building(700, 100, 640, 120, { height: 34, color: 0xb8ad8c, roof: 0x4a5236, sign: "MESS HALL", signColor: "#2f3a1e" }),
      parkedTrailer("kitchen", 760, 214, PI / 2), parkedTrailer("kitchen", 880, 214, PI / 2),
      { kind: "crates", x: 720, y: 184, w: 24, h: 12 }, { kind: "barrel", x: 930, y: 190 }, { kind: "barrel", x: 940, y: 204 },
      { kind: "post", x: 670, y: 470, r: 2, flag: 0x55643a },
      ...range(0, 4).map((i) => building(260 + i * 250, 720, 200, 70, { height: 28, color: 0xb8ad8c, roof: 0x4a5236 })),
      armyTent(1240, 420, 44, 60, PI / 2), armyTent(1240, 520, 44, 60, PI / 2),
      { kind: "kiosk", x: 60, y: 670, w: 28, h: 22 }, { kind: "barrier", x: 60, y: 574, w: 50, h: 5 },
      ...range(0, 6).map((i) => tree(380 + i * 120, 360, 16)),
      tree(1240, 140, 20), tree(60, 120, 22), tree(60, 420, 20),
    ],
    cones: [],
    start: { x: 120, y: 620, a: 0 },
    bay,
  });
}

// 44. Motor pool: the ammunition trailer between the sandbags at the bunker.
function motorPool() {
  const bay = { x: 1150, y: 196, a: PI / 2, w: 42, l: 46 };
  const sheds = range(0, 6).map((i) => 330 + i * 110);
  return level({
    id: "motorpool", vehicle: "army", color: OLIVE, name: "Motor pool", title: "Ammo Run", trailer: "box", par: 100, sun: "deck",
    brief: "An ordinary trailer, an unusual load. Through the checkpoint, past the tanks lined up for inspection, and reverse the ammunition between the sandbags at the bunker.",
    w: 1400, h: 820, base: "concrete", edge: "wall", backdrop: "industrial",
    surfaces: [rect("asphalt", 0, 600, 1400, 700), rect("asphalt", 260, 250, 1340, 600), rect("gravel", 1060, 60, 1260, 250)],
    paint: [
      paintBays([bay], YELLOW), hatch(1090, 110, 1210, 150), line([[0, 650], [1400, 650]], { dash: [20, 18] }),
      arrow(700, 650, 0), arrow(1300, 460, -PI / 2), text(1150, 238, "AMMO", { size: 12, color: YELLOW }),
      ...sheds.map((x, i) => text(x, 262, String(i + 1), { size: 12 })),
    ],
    parked: [...sheds.flatMap((x, i) => (i === 2 ? [] : [truck(x, 170, PI / 2, i % 2 ? ARMY_SAND : OLIVE)])), mil(70, 780, 0), mil(230, 780, 0)],
    statics: [
      ...sheds.flatMap((x) => shed(x, 160, PI / 2, 80, 150, { kind: "wall", style: "site", height: 32, thick: 8 }).slice(1)),
      { kind: "wall", x: 605, y: 81, a: 0, w: 660, h: 8, height: 32, style: "site" },
      { kind: "hesco", x: 1150, y: 90, w: 110, h: 30 },
      ...sandbags([[1121, 178], [1121, 222]]), ...sandbags([[1179, 178], [1179, 222]]),
      ...sandbags([[1070, 110], [1070, 196]]), ...sandbags([[1230, 110], [1230, 196]]),
      ...range(0, 6).map((i) => tank(410 + i * 110, 460, 0)),
      { kind: "crates", x: 1300, y: 150, w: 36, h: 30 }, { kind: "crates", x: 230, y: 300, w: 24, h: 24 },
      { kind: "kiosk", x: 225, y: 575, w: 30, h: 24 },
      ...wallLine([[190, 560], [190, 250]], { kind: "wall", thick: 8, style: "site" }),
      ...wallLine([[0, 720], [1400, 720]], { kind: "fence", thick: 3 }),
      { kind: "watchtower", x: 60, y: 540, s: 24 },
      ...[400, 800, 1200].map((x) => ({ kind: "lamp", x, y: 588, a: -PI / 2 })),
    ],
    cones: [],
    start: { x: 110, y: 650, a: 0 },
    bay,
  });
}

// 45. Artillery range: the field gun into the empty gun pit on the line.
function artilleryRange() {
  const pits = range(0, 5).map((k) => 380 + k * 170);
  const target = 3;
  const bay = { x: pits[target], y: 170, a: PI / 2, w: 40, l: 58 };
  const track = smooth([[-40, 660], [460, 660], [800, 620], [1080, 520], [1210, 400], [1200, 300]]);
  const line2 = [[1240, 300], [250, 300]];
  const woods = scatter(451, 26, [40, 380, 1360, 780], (x, y, r) => (r() < 0.5 ? pine(x, y, 13 + r() * 6) : tree(x, y, 14 + r() * 6)))
    .filter((t) => distToLine(track, t.x, t.y) > 60 && t.y > 360);
  return level({
    id: "range", vehicle: "army", color: OLIVE, name: "Artillery range", title: "Gun Line", trailer: "fieldgun", par: 105, sun: "golden",
    brief: "The field gun's wheels sit ahead of its middle, so the barrel swings out behind them. Down the range track to the gun line and reverse it into pit 4, barrel first.",
    w: 1400, h: 800, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      road("dirt", track, 60), road("dirt", line2, 64),
      ...pits.map((x) => rect("sand", x - 30, 132, x + 30, 210, 6)),
      disc("mud", 560, 470, 30), disc("mud", 900, 430, 24), disc("mud", 300, 520, 26), disc("mud", 1000, 700, 22), disc("mud", 700, 250, 20),
    ],
    paint: [paintBays([bay], YELLOW), ...pits.map((x, i) => text(x, 228, String(i + 1), { size: 13, color: i === target ? YELLOW : WHITE })), arrow(700, 300, PI), arrow(300, 660, 0)],
    parked: [mil(1300, 150, PI / 2), mil(1340, 150, PI / 2)],
    statics: [
      ...pits.flatMap((x) => shed(x, 170, PI / 2, 44, 60, { kind: "sandbags", thick: 8 })),
      ...pits.filter((_, k) => k !== target).map((x) => parkedTrailer("fieldgun", x, 172, PI / 2)),
      ...pits.map((x) => ({ kind: "crates", x: x + 50, y: 150, w: 18, h: 26 })),
      { kind: "watchtower", x: 1300, y: 60, s: 26 }, { kind: "block", x: 200, y: 150, w: 70, h: 44, height: 24, color: 0x6b5a3a },
      armyTent(160, 250, 40, 50), { kind: "post", x: 1260, y: 250, r: 2, flag: 0xc62d2d },
      ...woods,
    ],
    cones: [],
    start: { x: 120, y: 660, a: 0 },
    bay,
  });
}

// 46. Missile base at night: the missile into its hardened shelter.
function missileBase() {
  const shelters = [440, 700, 960, 1220];
  const target = 2;
  const bay = { x: shelters[target], y: 150, a: PI / 2, w: 42, l: 108 };
  return level({
    id: "missilebase", vehicle: "army", color: OLIVE, name: "Missile base", title: "Launch Window", trailer: "missile", par: 140, sun: "night",
    brief: "Eight metres of missile, twin axles well back. Past the guard post, round the base road and reverse it into shelter C — the blast walls stick out between the doors.",
    w: 1600, h: 900, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      road("asphalt", [[-40, 760], [1420, 760], [1420, 400], [260, 400]], 64),
      rect("concrete", 300, 204, 1360, 370), ...shelters.map((x) => rect("concrete", x - 30, 90, x + 30, 204)),
    ],
    paint: [
      paintBays([bay], YELLOW), ...shelters.map((x, i) => text(x, 226, "ABCD"[i], { size: 16, color: i === target ? YELLOW : WHITE })),
      arrow(700, 760, 0), arrow(1420, 580, -PI / 2), arrow(900, 400, PI), line([[0, 760], [1400, 760]], { dash: [20, 18] }),
    ],
    parked: [mil(120, 690, 0), mil(120, 830, 0), truck(1520, 560, -PI / 2)],
    statics: [
      ...shelters.flatMap((x) => shed(x, 148, PI / 2, 48, 114, { kind: "wall", style: "site", height: 36, thick: 10 })),
      ...shelters.filter((_, k) => k !== target).map((x) => parkedTrailer("missile", x, 150, PI / 2)),
      ...[570, 830, 1090].map((x) => ({ kind: "hesco", x, y: 236, w: 16, h: 64 })),
      { kind: "radar", x: 1480, y: 180, r: 14 }, { kind: "building", x: 1480, y: 300, w: 90, h: 60, height: 26, color: 0x8e9aa6, roof: 0x4a5236 },
      { kind: "kiosk", x: 200, y: 710, w: 30, h: 24 }, { kind: "watchtower", x: 200, y: 840, s: 24 },
      ...wallLine([[240, 0], [240, 680]], { kind: "fence", thick: 3 }), ...wallLine([[240, 840], [240, 900]], { kind: "fence", thick: 3 }),
      ...range(0, 5).map((i) => ({ kind: "lamp", x: 400 + i * 200, y: 440, a: -PI / 2 })),
      ...range(0, 5).map((i) => ({ kind: "lamp", x: 400 + i * 200, y: 800, a: -PI / 2 })),
      ...range(0, 6).map((i) => tree(380 + i * 180, 580, 20)), ...range(0, 7).map((i) => tree(300 + i * 180, 870, 18)),
    ],
    cones: [],
    start: { x: 180, y: 760, a: 0 },
    bay,
  });
}

// 47. Railhead: a tank on the low loader, into the loading line.
function railhead() {
  const bays = range(0, 7).map((i) => ({ x: 460 + i * 110, y: 330, a: PI / 2, w: 54, l: 172 }));
  const target = 3;
  return level({
    id: "railhead", vehicle: "truck", color: OLIVE, name: "Railhead", title: "Tank Train", trailer: "lowloader", par: 180, sun: "deck",
    brief: "Forty tonnes of tank behind a tractor unit. Round the depot to the loading line and reverse the low loader into bay 4, between the other transporters, ready for the train.",
    w: 2100, h: 1100, base: "concrete", edge: "rail", backdrop: "industrial",
    surfaces: [rect("asphalt", 0, 890, 2100, 1010), rect("asphalt", 240, 416, 1900, 890), rect("gravel", 0, 60, 2100, 140)],
    paint: [
      paintBays(bays), paintBays([bays[target]], YELLOW), ...bays.map((b, i) => text(b.x, 432, String(i + 1), { size: 16, color: i === target ? YELLOW : WHITE })),
      line([[0, 88], [2100, 88]], { color: "rgba(90,90,90,0.95)", width: 3 }), line([[0, 112], [2100, 112]], { color: "rgba(90,90,90,0.95)", width: 3 }),
      arrow(1200, 950, PI), arrow(300, 700, -PI / 2), arrow(800, 540, 0), line([[0, 950], [2100, 950]], { dash: [26, 20] }),
    ],
    parked: range(0, 11).map((i) => truck(520 + i * 110, 790, PI / 2, i % 3 === 1 ? ARMY_SAND : OLIVE)),
    statics: [
      ...bays.filter((_, i) => i !== target && i !== 6).map((b) => parkedTrailer("lowloader", b.x, b.y - 4, PI / 2)),
      ...range(0, 7).map((i) => tank(470 + i * 150, 190, 0)),
      ...wallLine([[420, 870], [2000, 870]], { kind: "wall", thick: 8, style: "site" }),
      building(1700, 250, 300, 180, { height: 50, color: 0x9aa3ab, roof: 0x4a5236, sign: "RAILHEAD 7", signColor: "#2f3a1e" }),
      { kind: "block", x: 1300, y: 330, w: 120, h: 60, height: 20, color: 0x566573 },
      ...[500, 900, 1300, 1700].map((x) => ({ kind: "lamp", x, y: 1030, a: -PI / 2 })),
      { kind: "watchtower", x: 2000, y: 700, s: 26 }, { kind: "kiosk", x: 2040, y: 860, w: 30, h: 24 },
    ],
    cones: [],
    start: { x: 1900, y: 950, a: PI },
    bay: bays[target],
  });
}

// 48. Forest camp at dusk: the missile down a muddy track into the woods.
function forestCamp() {
  const track = smooth([[-40, 720], [300, 720], [520, 640], [760, 660], [960, 580], [1120, 470], [1060, 390], [900, 360]]);
  const spots = [400, 590, 780];
  const target = 1;
  const bay = { x: spots[target], y: 110, a: PI / 2, w: 42, l: 110 };
  const clearing = [240, 40, 960, 420];
  const woods = scatter(481, 130, [20, 20, 1380, 880], (x, y, r) => (r() < 0.65 ? pine(x, y, 13 + r() * 7) : tree(x, y, 15 + r() * 6)),
    [[clearing[0] - 20, clearing[1] - 30, clearing[2] + 20, clearing[3] + 20]])
    .filter((t) => distToLine(track, t.x, t.y) > 58);
  return level({
    id: "forestcamp", vehicle: "army", color: OLIVE, name: "Forest camp", title: "Under the Trees", trailer: "missile", par: 160, sun: "dusk",
    brief: "Hide the missile before dark. Along the muddy forest track to the camp in the clearing, then reverse it into the middle spot between the other two launchers.",
    w: 1400, h: 900, base: "grass", edge: "none", backdrop: "forest",
    surfaces: [
      rect("dirt", ...clearing, 40), road("dirt", track, 64),
      disc("mud", 420, 690, 40), disc("mud", 860, 620, 38), disc("mud", 1090, 450, 34), disc("mud", 640, 300, 50), disc("mud", 780, 230, 30),
    ],
    paint: [paintBays([bay], YELLOW)],
    parked: [mil(900, 90, PI / 2), truck(930, 250, PI)],
    statics: [
      ...spots.filter((_, k) => k !== target).map((x) => parkedTrailer("missile", x, 110, PI / 2)),
      armyTent(300, 280, 50, 60), armyTent(300, 370, 50, 60), armyTent(300, 190, 50, 60),
      { kind: "crates", x: 690, y: 60, w: 30, h: 20 }, { kind: "crates", x: 495, y: 60, w: 30, h: 20 },
      { kind: "firepit", x: 420, y: 330 }, { kind: "barrel", x: 870, y: 170 }, { kind: "barrel", x: 882, y: 182 },
      ...woods,
    ],
    cones: [],
    start: { x: 180, y: 720, a: 0 },
    bay,
  });
}

export const CHAPTER8 = [barracks(), motorPool(), artilleryRange(), missileBase(), railhead(), forestCamp()];
