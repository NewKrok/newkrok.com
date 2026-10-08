import {
  PI, level, hrow, vrow, angledRow, car, rect, road, disc, paintBays, line, arrow, text, hatch, YELLOW,
  building, tree, scatter, wallLine, range, parkedSemi,
} from "./kit.js";
import { CAR_TYPES, M, PARKED_COLORS, lcg } from "../config.js";

// ── Season pack: Hitch-o'-Lantern (autumn · Halloween) ───────────────────
// Six jobs from a pumpkin farm on a golden afternoon to a fairground on
// Halloween night. Russet trees (`foliage: "autumn"`), fallen leaves on the
// ground (slightly slippery), pumpkins that glow once it is dark, lawns
// full of inflatables, and loose pumpkins and trolleys that count as bumps.

const HAY = 0xd9b95a;
const pumpkin = (x, y, r = 6, a = PI / 2, o = {}) => ({ kind: "pumpkin", x, y, r, a, ...o });
const loosePumpkin = (x, y, r = 5) => pumpkin(x, y, r, 0, { loose: true });
const grave = (x, y, a = 0, cross = false) => ({ kind: "grave", x, y, a, w: 10, h: 4, cross });
const stack = (x, y, w, h, height = 18, color = HAY) => ({ kind: "block", x, y, w, h, height, color });
const blowup = (x, y, v, r = 11, a = PI / 2) => ({ kind: "inflatable", x, y, v, r, a });
const skeleton = (x, y, a = PI / 2) => ({ kind: "skeleton", x, y, a });
const trolley = (x, y, a = 0) => ({ kind: "trolley", x, y, a, r: 4.5 });
// A heap of pumpkins round (x, y), seeded.
function pumpkinPile(x, y, n, spread, seed) {
  return scatter(seed, n, [x - spread, y - spread, x + spread, y + spread], (px, py, r) => pumpkin(px, py, 4 + r() * 3, r() * PI * 2));
}

// ── Sloppy parking ───────────────────────────────────────────────────────
// Oriented boxes and an overlap test, so cars can be dumped at odd angles,
// across the lines and half in the next bay without landing in each other.
const box = (x, y, a, hl, hw) => ({ x, y, a, hl, hw });
const carBox = (c, pad = 1.5) => box(c.x, c.y, c.a, CAR_TYPES[c.type].len * M / 2 + pad, CAR_TYPES[c.type].wid * M / 2 + pad);
function overlaps(p, q) {
  for (const o of [p, q]) for (const ax of [o.a, o.a + PI / 2]) {
    const ux = Math.cos(ax), uy = Math.sin(ax);
    const ext = (b) => Math.abs(b.hl * Math.cos(b.a - ax)) + Math.abs(b.hw * Math.sin(b.a - ax));
    if (Math.abs((q.x - p.x) * ux + (q.y - p.y) * uy) > ext(p) + ext(q)) return false;
  }
  return true;
}
const SHOPPERS = ["hatch", "sedan", "wagon", "suv", "sedan", "hatch", "van", "suv", "pickup", "wagon"];
// Cars in the bays of `rows` (most of them), each at an angle, off-centre,
// some straddling two bays; `keep` boxes stay clear. Returns parked cars.
function sloppy(rows, keep, seed, { fill = 0.88, tilt = 0.75, straddle = 0.16 } = {}) {
  const rnd = lcg(seed);
  const out = [], taken = [...keep];
  for (const bays of rows) {
    for (const b of bays) {
      if (rnd() > fill) continue;
      const type = SHOPPERS[Math.floor(rnd() * SHOPPERS.length)];
      const flip = rnd() < 0.55 ? PI : 0;
      const across = rnd() < straddle ? b.w / 2 : (rnd() - 0.5) * 9;
      const along = (rnd() - 0.5) * 14;
      let dev = (rnd() - 0.5) * tilt;
      const cx = Math.cos(b.a), cy = Math.sin(b.a);
      for (let k = 0; k < 4; k++, dev /= 2) {
        const c = car(b.x - cy * across + cx * along, b.y + cx * across + cy * along, b.a + flip + dev, type, PARKED_COLORS[Math.floor(rnd() * PARKED_COLORS.length)]);
        const cb = carBox(c);
        if (taken.some((t) => overlaps(cb, t))) continue;
        out.push(c); taken.push(cb);
        break;
      }
    }
  }
  return { cars: out, taken };
}
// Loose trolleys left wherever, clear of everything taken.
function strayTrolleys(seed, n, area, taken) {
  const rnd = lcg(seed);
  const out = [];
  for (let tries = 0; out.length < n && tries < n * 40; tries++) {
    const x = area[0] + rnd() * (area[2] - area[0]), y = area[1] + rnd() * (area[3] - area[1]);
    const tb = box(x, y, 0, 9, 9);
    if (taken.some((t) => overlaps(tb, t))) continue;
    out.push(trolley(x, y, rnd() * PI * 2));
    taken.push(tb);
  }
  return out;
}

// 1. Pumpkin farm: in through the gate, round the hay, back up to the stand.
function pumpkinPatch() {
  const stand = hrow(380, 172, 5, PI / 2, { w: 40, l: 62, step: 80 });
  const target = 2;
  // The pick-your-own field west of the yard.
  const patch = range(0, 4).flatMap((r) => range(0, 8).map((i) => pumpkin(22 + r * 20 + (i % 2) * 6, 160 + i * 52, 5 + ((r + i) % 3))));
  // A wall of straw down the yard: you go round it, not through it.
  const strawWall = range(0, 9).map((i) => stack(150 + i * 66, 400, 60, 24, 20));
  const stalls = range(0, 4).map((i) => ({ kind: "stall", x: 260 + i * 120, y: 446, w: 66, h: 36, a: -PI / 2, color: [0xd9822b, 0x8a1f24, 0xd9a13a, 0x2f6b4a][i] }));
  // Visitors left their cars on the grass any old how.
  const lot = vrow(1030, 180, 9, PI, { w: 40 });
  const visitors = sloppy([lot], [], 507, { fill: 0.8, tilt: 1, straddle: 0.3 }).cars;
  return level({
    id: "patch", vehicle: "pickup", name: "Pumpkin farm", title: "Pumpkin Patch", trailer: "box", par: 75, sun: "golden", foliage: "autumn",
    brief: "Pick up the pumpkins for the village party. In through the farm gate, round the straw wall, then back the trailer up to the stand between the pumpkin heap and the pickup. Mind the loose pumpkins.",
    w: 1100, h: 700, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      rect("gravel", 110, 138, 960, 590, 20), rect("dirt", 0, 140, 108, 580), road("dirt", [[-40, 650], [1140, 650]], 60),
      rect("gravel", 330, 585, 420, 625), disc("leaves", 1060, 80, 90), disc("leaves", 40, 60, 80), rect("leaves", 0, 0, 1100, 26),
    ],
    paint: [
      paintBays(stand), paintBays([{ ...stand[target], w: 42 }], YELLOW), text(540, 228, "LOADING", { size: 12, color: YELLOW }),
      text(540, 520, "PICK YOUR OWN", { size: 18, color: "rgba(236,200,70,0.7)" }), arrow(560, 545, 0), arrow(860, 470, -PI / 2), arrow(700, 330, PI),
    ],
    parked: [car(stand[3].x, stand[3].y, PI / 2, "pickup", 0x2f6b4a), ...visitors],
    statics: [
      building(580, 80, 440, 100, { height: 36, color: 0xa0523d, roof: 0x5a3f1e, sign: "PUMPKIN PATCH", signColor: "#c8641e" }),
      ...pumpkinPile(stand[1].x, stand[1].y + 4, 9, 14, 503),
      stack(stand[0].x, stand[0].y, 36, 48), stack(stand[4].x, stand[4].y + 6, 34, 36, 12, 0x8a6238),
      // The prize pumpkin on its pallet by the shop.
      stack(860, 176, 40, 40, 4, 0x8a6238), pumpkin(860, 170, 16, PI / 2),
      ...strawWall, ...stalls,
      ...pumpkinPile(205, 445, 6, 16, 504), ...pumpkinPile(745, 450, 6, 16, 505),
      // Loose ones that rolled off the heaps.
      ...[[300, 520], [520, 560], [690, 505], [905, 360], [930, 300], [470, 330], [250, 300]].map(([x, y]) => loosePumpkin(x, y)),
      { kind: "hay", x: 160, y: 300, r: 9 }, { kind: "hay", x: 178, y: 318, r: 9 }, { kind: "hay", x: 940, y: 540, r: 9 },
      ...patch,
      { kind: "scarecrow", x: 70, y: 590, a: 0 }, { kind: "scarecrow", x: 1000, y: 120, a: PI },
      { kind: "tractor", x: 1040, y: 650, a: PI, color: 0xd9342b },
      ...wallLine([[0, 612], [330, 612]], { kind: "fence", thick: 3, maxLen: 40 }),
      ...wallLine([[420, 612], [1100, 612]], { kind: "fence", thick: 3, maxLen: 40 }),
      ...[[160, 40], [250, 46], [880, 36], [1060, 60], [40, 520], [1060, 600]].map(([x, y], i) => tree(x, y, 16 + (i % 3) * 3)),
    ],
    cones: [],
    start: { x: 160, y: 652, a: 0 },
    bay: { ...stand[target], w: 42, l: 62 },
  });
}

// 2. Supermarket the night before Halloween: everyone dumped their car and
// ran in for a costume. Find the one free bay and get the teardrop into it.
function costumeRush() {
  const rows = [
    hrow(260, 250, 30, -PI / 2), hrow(260, 450, 30, PI / 2), hrow(260, 510, 30, -PI / 2),
    hrow(260, 710, 30, PI / 2), hrow(260, 770, 30, -PI / 2),
  ];
  const tRow = 2, target = 17;
  const bay = { ...rows[tRow][target], a: PI / 2 };
  const keep = [box(bay.x, bay.y, bay.a, 33, 19)];
  // A few dropped off in the aisles, on the hatching, at the kerb.
  const dumped = [
    car(225, 340, 1.2, "suv", 0x8a1f24), car(1235, 600, -1.9, "hatch", 0xd9a13a), car(700, 200, 0.12, "van", 0x16161a),
    car(430, 860, 0.35, "sedan", 0x5b4a8a), car(1250, 250, 1.7, "wagon"), car(1000, 615, 2.9, "hatch", 0x2f6b4a),
  ];
  keep.push(...dumped.map((c) => carBox(c)));
  const { cars, taken } = sloppy(rows, keep, 571);
  const trolleys = [
    ...strayTrolleys(572, 9, [180, 285, 1280, 410], taken), ...strayTrolleys(573, 9, [180, 545, 1280, 670], taken),
    ...strayTrolleys(574, 6, [180, 805, 1280, 880], taken),
  ];
  return level({
    id: "mall", vehicle: "car", name: "Spookmart", title: "Costume Rush", trailer: "teardrop", par: 120, sun: "dusk", foliage: "autumn",
    brief: "The night before Halloween, and the whole town ran in for a costume: cars dumped at every angle, trolleys everywhere. Weave in from the street and back the teardrop into the one free bay.",
    w: 1500, h: 1000, base: "asphalt", edge: "none", backdrop: "town",
    surfaces: [rect("pavement", 120, 150, 1380, 195), rect("asphalt", 0, 900, 1500, 1000), rect("grass", 0, 880, 120, 900)],
    paint: [
      ...rows.map((r) => paintBays(r)), paintBays([bay], YELLOW),
      hatch(1185, 420, 1240, 540), hatch(185, 680, 240, 800), line([[0, 950], [1500, 950]], { dash: [18, 16] }),
      arrow(1050, 345, PI), arrow(450, 605, 0), arrow(1050, 845, PI), text(745, 172, "HALLOWEEN SALE", { size: 16, color: "#ff9a3a" }),
    ],
    parked: [...cars, ...dumped],
    statics: [
      building(750, 75, 1100, 150, { height: 46, color: 0x3d2a4a, roof: 0x24222a, sign: "SPOOKMART", signColor: "#ff8a2a", signBg: "rgba(20,14,28,0.95)", lit: true, doors: [600, 900] }),
      blowup(470, 172, "pumpkin", 13), blowup(1030, 172, "ghost", 11), blowup(230, 172, "cat", 10),
      ...pumpkinPile(700, 172, 7, 14, 575), ...pumpkinPile(800, 172, 7, 14, 576),
      { kind: "trolleys", x: 1330, y: 360, w: 18, h: 48 }, { kind: "trolleys", x: 140, y: 610, w: 18, h: 48 },
      ...trolleys,
      // Kerbed islands at the row ends, with a tree each.
      ...[480, 740].flatMap((y) => [{ kind: "planter", x: 220, y, w: 30, h: 110 }, { kind: "planter", x: 1210, y, w: 30, h: 110 }]),
      ...[480, 740].flatMap((y) => [tree(220, y, 13), tree(1210, y, 13)]),
      ...[480, 740].flatMap((y) => [{ kind: "lamp", x: 220, y: y - 48, a: 0 }, { kind: "lamp", x: 1210, y: y + 48, a: PI }]),
      ...range(0, 5).map((i) => ({ kind: "lamp", x: 300 + i * 220, y: 912, a: -PI / 2 })),
      // The lot is walled off from the street but for the way in at the west.
      ...wallLine([[130, 886], [1500, 886]], { kind: "hedge", thick: 10, maxLen: 60 }),
    ],
    cones: [{ x: bay.x - 22, y: 560 }],
    start: { x: 140, y: 950, a: 0 },
    bay,
  });
}

// 3. Your own street on Halloween: the neighbours have outdone each other.
// Back the caravan up your drive between their lawns.
function trickOrTreat() {
  const xs = range(0, 6).map((i) => 155 + i * 190);
  const mine = 4, drive = xs[mine] + 50;
  const northCars = [[90, "sedan"], [250, "hatch"], [430, "wagon"], [610, "van"], [690, "hatch"], [1060, "suv"], [1150, "sedan"]]
    .map(([x, t]) => car(x, 386, 0, t));
  const southCars = [[40, "hatch"], [190, "suv"], [380, "sedan"], [570, "wagon"], [750, "hatch"], [1130, "van"], [1200, "sedan"]]
    .map(([x, t]) => car(x, 494, PI, t));
  // What each lawn has (north side west to east, then south side).
  const lawnsN = [
    (x) => [blowup(x - 40, 270, "ghost", 13), ...range(0, 6).map((i) => grave(x - 70 + (i % 3) * 28, 300 + Math.floor(i / 3) * 26, PI / 2, i % 2 === 0))],
    (x) => [skeleton(x - 60, 290), skeleton(x - 30, 300, 1.2), skeleton(x - 4, 284, 2), ...pumpkinPile(x - 40, 330, 6, 16, 581)],
    (x) => [blowup(x - 30, 280, "cat", 14), pumpkin(x - 70, 330, 7), pumpkin(x + 14, 336, 6)],
    (x) => [...range(0, 9).map((i) => grave(x - 74 + (i % 3) * 26, 240 + Math.floor(i / 3) * 34, PI / 2, i % 3 === 1)), skeleton(x + 20, 336, 0.6), blowup(x + 22, 270, "ghost", 10)],
    (x) => [skeleton(x - 40, 300, 0.3), pumpkin(x - 70, 340, 6), pumpkin(x - 20, 340, 6), pumpkin(x + 25, 340, 5)],
    (x) => [blowup(x - 52, 312, "pumpkin", 17), blowup(x + 10, 260, "ghost", 12), skeleton(x - 10, 334, 1)],
  ];
  const lawnsS = [
    (x) => [blowup(x + 30, 590, "pumpkin", 13)],
    (x) => [...range(0, 6).map((i) => grave(x + 10 + (i % 3) * 26, 570 + Math.floor(i / 3) * 30, -PI / 2, i === 4)), skeleton(x + 80, 600, -1.4)],
    (x) => [blowup(x + 40, 600, "ghost", 14), blowup(x + 90, 590, "cat", 9)],
    (x) => [skeleton(x + 30, 580, -1.2), skeleton(x + 60, 586, -2), ...pumpkinPile(x + 60, 620, 5, 14, 582)],
    (x) => [blowup(x + 50, 595, "pumpkin", 15), { kind: "scarecrow", x: x + 100, y: 580, a: -PI / 2 }],
    (x) => [blowup(x + 40, 590, "ghost", 13), ...range(0, 3).map((i) => grave(x + 80, 560 + i * 26, -PI / 2, i === 1))],
  ];
  const lot = (x0) => [...wallLine([[x0, 190], [x0, 352]], { kind: "fence", thick: 3, maxLen: 40 })];
  return level({
    id: "street", vehicle: "suv", name: "Elm Street", title: "Trick or Treat", trailer: "caravan", par: 150, sun: "spooky", foliage: "autumn",
    brief: "Home with the caravan on Halloween night, and the neighbours have filled every lawn: inflatables, graves, skeletons, pumpkins on the kerb. Drive past your house, turn in the cul-de-sac if you must, and back the caravan up your drive.",
    w: 1500, h: 820, base: "grass", edge: "none", backdrop: "town",
    surfaces: [
      rect("pavement", 0, 350, 1260, 370), rect("pavement", 0, 510, 1260, 530), rect("asphalt", 0, 370, 1300, 510), disc("asphalt", 1330, 440, 140),
      ...xs.map((x) => rect("concrete", x + 27, 175, x + 73, 352)), ...xs.map((x) => rect("concrete", x - 73, 528, x - 27, 660)),
      rect("leaves", 0, 0, 1500, 30), rect("leaves", 0, 790, 1500, 820),
    ],
    paint: [paintBays([{ x: drive, y: 262, a: PI / 2, w: 44, l: 84 }], "rgba(236,200,70,0.6)"), line([[0, 440], [1190, 440]], { dash: [16, 14] })],
    parked: [...northCars, ...southCars],
    statics: [
      ...xs.map((x, i) => building(x - 20, 95, 150, 150, { height: 40 + (i % 3) * 8, color: [0x6a5a7a, 0x8e6a4a, 0x3d4a5a, 0x5a4a44, 0xa0705a, 0x4a5a4a][i], roof: 0x2a2830, lit: true, doors: [x + 50], doorW: 40 })),
      ...xs.map((x, i) => building(x + 20, 745, 150, 150, { height: 40 + ((i + 1) % 3) * 8, color: [0x8a5a3c, 0x4a5a6a, 0x7a6a5a, 0x5a4a6a, 0x6a7a5a, 0x8e6a4a][i], roof: 0x2a2830, lit: true, doors: [x - 50], doorW: 40, signSide: "n" })),
      ...xs.flatMap((x) => lot(x - 95)), ...lot(xs[5] + 95),
      // Your drive: hedged on the west, the neighbour's fence on the east.
      ...wallLine([[drive - 26, 180], [drive - 26, 340]], { kind: "hedge", thick: 8, maxLen: 60 }),
      ...lawnsN.flatMap((f, i) => f(xs[i])), ...lawnsS.flatMap((f, i) => f(xs[i])),
      // Pumpkins set out on the kerb either side of your drive.
      loosePumpkin(drive - 36, 361, 5), loosePumpkin(drive + 34, 361, 5), loosePumpkin(drive - 140, 361, 4), loosePumpkin(drive + 120, 361, 6),
      ...[60, 520, 1220].map((x) => ({ kind: "lamp", x, y: 360, a: PI / 2 })), ...[300, 700, 1000].map((x) => ({ kind: "lamp", x, y: 520, a: -PI / 2 })),
      ...[[1390, 220], [1460, 330], [1460, 560], [1390, 680], [1250, 210], [1250, 700]].map(([x, y]) => tree(x, y, 22)),
    ],
    decor: [
      { kind: "ghost", x: xs[0] - 30, y: 230, a: 0.4, s: 1.4 }, { kind: "ghost", x: xs[3] - 40, y: 300, a: 2, s: 1.6, z: 24 },
      { kind: "ghost", x: xs[2] + 40, y: 640, a: -1, s: 1.3 }, { kind: "ghost", x: 1330, y: 440, a: 1.5, s: 1.5, z: 50 },
    ],
    cones: [],
    start: { x: 170, y: 460, a: 0 },
    bay: { x: drive, y: 262, a: PI / 2, w: 44, l: 84 },
  });
}

// 4. Corn maze: the pony rides are in the clearing in the middle, and the
// only way there is through the maze.
function cornMaze() {
  const C = 150, X0 = 100, Y0 = 70, COLS = 8, ROWS = 6, T = 14;
  const k = (c, r) => `${c},${r}`;
  const ek = (a, b) => [k(...a), k(...b)].sort().join("|");
  const used = new Set(), open = new Set();
  const path = (cells) => cells.forEach((p, i) => { used.add(k(...p)); if (i) open.add(ek(cells[i - 1], p)); });
  path([[6, 5], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [3, 1]]);
  // Dead ends.
  path([[6, 4], [7, 4], [7, 3], [7, 2], [6, 2], [6, 1]]);
  path([[2, 4], [2, 5], [1, 5], [0, 5]]);
  path([[4, 4], [4, 5], [5, 5]]);
  path([[3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [7, 1]]);
  path([[0, 2], [1, 2], [1, 3], [2, 3], [3, 3]]);
  // The clearing: six cells, all open to each other.
  const clear = [[2, 1], [3, 1], [4, 1], [2, 2], [3, 2], [4, 2]];
  for (const a of clear) for (const b of clear) if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1) { used.add(k(...a)); open.add(ek(a, b)); }
  const corn = [];
  const wall = (x, y, w, h) => corn.push({ kind: "corn", x, y, w, h });
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cx = X0 + c * C + C / 2, cy = Y0 + r * C + C / 2;
    if (!used.has(k(c, r))) { wall(cx, cy, C + T, C + T); continue; }
    // East and south edges of each cell (west / north come from the neighbour).
    const east = [c + 1, r], south = [c, r + 1];
    if (c === COLS - 1 || (used.has(k(...east)) && !open.has(ek([c, r], east)))) wall(cx + C / 2, cy, T, C + T);
    if ((r === ROWS - 1 && c !== 6) || (r < ROWS - 1 && used.has(k(...south)) && !open.has(ek([c, r], south)))) wall(cx, cy + C / 2, C + T, T);
    if (c === 0) wall(cx - C / 2, cy, T, C + T);
    if (r === 0) wall(cx, cy - C / 2, C + T, T);
  }
  const bayX = X0 + 3.5 * C, bayY = Y0 + 3 * C - T / 2 - 42;
  return level({
    id: "maze", vehicle: "suv", name: "Corn maze", title: "Pony Rides", trailer: "horsebox", par: 200, sun: "golden", foliage: "autumn",
    brief: "The ponies are late for the rides, and the paddock is in the clearing in the middle of the corn maze. Find the way through with the horsebox, then back it in between the other two. Dead ends are no place to turn round.",
    w: 1400, h: 1110, base: "dirt", edge: "fence", backdrop: "fields",
    surfaces: [
      rect("grass", 0, Y0 + ROWS * C + T / 2, 1400, 1110), road("gravel", [[-40, 1060], [1440, 1060]], 70),
      rect("gravel", X0 + 6 * C + 7, Y0 + ROWS * C - 10, X0 + 7 * C - 7, 1030), rect("grass", X0 + 2 * C + 8, Y0 + C + 8, X0 + 5 * C - 8, Y0 + 3 * C - 8, 16),
      rect("grass", X0 + COLS * C + 8, 0, 1400, 1000),
    ],
    paint: [paintBays([{ x: bayX, y: bayY, a: -PI / 2, w: 48, l: 78 }], YELLOW), arrow(X0 + 6.5 * C, 1000, -PI / 2, "rgba(236,200,70,0.8)")],
    parked: [],
    statics: [
      ...corn,
      ...[-1, 1].map((sd) => ({ kind: "parkedtrailer", trailer: "horsebox", x: bayX + sd * 100, y: bayY + 2, a: -PI / 2 })),
      { kind: "tent", x: X0 + 2 * C + 60, y: Y0 + C + 45, w: 70, h: 50, color: 0xd9822b },
      { kind: "hay", x: X0 + 4 * C + 90, y: Y0 + C + 40, r: 9 }, { kind: "hay", x: X0 + 4 * C + 108, y: Y0 + C + 56, r: 9 },
      // Something waits in every dead end.
      { kind: "scarecrow", x: X0 + 6.5 * C, y: Y0 + 1.5 * C, a: PI / 2 }, { kind: "scarecrow", x: X0 + 7.5 * C, y: Y0 + 1.5 * C, a: PI },
      skeleton(X0 + 0.5 * C, Y0 + 5.5 * C, 0), ...pumpkinPile(X0 + 5.5 * C, Y0 + 5.5 * C, 6, 20, 591),
      ...pumpkinPile(X0 + 3.5 * C, Y0 + 3.5 * C, 5, 20, 592), skeleton(X0 + 3.6 * C, Y0 + 3.3 * C, -PI / 2),
      ...[[1340, 100], [1350, 400], [1330, 700], [1360, 900], [40, 1100]].map(([x, y]) => tree(x, y, 20)),
      { kind: "tractor", x: 1250, y: 1010, a: PI, color: 0x2f7a3a },
    ],
    decor: [{ kind: "ghost", x: X0 + 0.5 * C, y: Y0 + 5.5 * C, a: 0, s: 1.3, z: 26 }],
    cones: [],
    start: { x: 170, y: 1060, a: 0 },
    bay: { x: bayX, y: bayY, a: -PI / 2, w: 48, l: 78 },
  });
}

// 5. Churchyard: the vintage hearse for the Halloween parade, parked at
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
      skeleton(220, 214, PI / 2), skeleton(1010, 170, 2.2), skeleton(380, 250, 1),
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

export const AUTUMN = [pumpkinPatch(), costumeRush(), trickOrTreat(), cornMaze(), churchyard(), halloweenFair()];
