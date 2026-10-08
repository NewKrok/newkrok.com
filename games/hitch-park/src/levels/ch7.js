import {
  PI, level, car, rect, road, paintBays, line, arrow, text, hatch, zebra,
  YELLOW, building, tree, pine, scatter, wallLine, range, distToLine,
} from "./kit.js";

// ── Chapter 7 — Special cargo ────────────────────────────────────────────
// A trailer of its own on every job: the teardrop is short from ball to
// axle and swings round twice as fast as the box, the horsebox is tall and
// heavy, the car transporter long and wide, and the pipes hang far out
// behind the axle, so the tail swings wide on every turn.

const SHOW_COLORS = [0xc0392b, 0xe8c547, 0x2e86c1, 0x1e8449, 0xf2f0e6, 0x8a1f24, 0x17a589, 0xd68910, 0x2b2d31, 0x7d3c98];

// 37. Forest campsite: the first teardrop, into a pitch between the trees.
function campsite() {
  const south = [[-40, 600], [1000, 600]], east = [[1000, 600], [1000, 170]], north = [[1000, 170], [150, 170]];
  const pitches = range(0, 9).map((k) => 250 + k * 90);
  const target = 4;
  const bay = { x: pitches[target], y: 100, a: PI / 2, w: 38, l: 44 };
  const lanes = [south, east, north];
  const woods = scatter(701, 70, [60, 215, 960, 560], (x, y, r) => (r() < 0.6 ? pine(x, y, 13 + r() * 6) : tree(x, y, 15 + r() * 6)))
    .filter((t) => lanes.every((l) => distToLine(l, t.x, t.y) > 50));
  const camp = pitches.flatMap((x, k) => {
    if (k === target) return [];
    if (k % 3 === 0) return [{ kind: "vancaravan", x, y: 96, a: PI / 2 }];
    return [{ kind: "tent", x: x - 12, y: 92, w: 30, h: 26, a: 0.1 * (k % 2 ? 1 : -1) }, { kind: "firepit", x: x + 22, y: 120 }];
  });
  return level({
    id: "campsite", name: "Forest campsite", title: "Tiny Trailer", trailer: "teardrop", par: 70, sun: "golden",
    brief: "Meet the teardrop: short from ball to axle, so it swings round fast. Take it easy round the site road and reverse into pitch 5 between the trees.",
    w: 1200, h: 720, base: "grass", edge: "fence", backdrop: "forest",
    surfaces: [
      road("gravel", south, 54), road("gravel", east, 54), road("gravel", north, 54),
      ...pitches.map((x) => rect("dirt", x - 36, 60, x + 36, 140, 10)),
    ],
    paint: [paintBays([bay], YELLOW), text(bay.x, 40, "5", { size: 14, color: YELLOW }), arrow(600, 600, 0), arrow(1000, 400, -PI / 2), arrow(800, 170, PI)],
    parked: pitches.flatMap((x, k) => (k === target || k % 3 === 0 ? [] : [car(x + 2, 40, PI / 2 + 0.05 * (k % 3), ["hatch", "wagon", "suv"][k % 3])])),
    statics: [
      ...camp,
      ...pitches.slice(0, -1).map((x) => tree(x + 45, 92, 14)), tree(205, 100, 16), tree(1015, 100, 16),
      building(1110, 330, 90, 70, { height: 26, color: 0x8a6238, roof: 0x3b3f45, sign: "SHOWERS", signColor: "#5a3f1e", signSide: "w" }),
      building(1100, 640, 110, 70, { height: 28, color: 0xe8e0d0, roof: 0x2f6b4a, sign: "RECEPTION", signColor: "#2f6b3a" }),
      { kind: "barrier", x: 60, y: 574, w: 50, h: 5 },
      ...woods,
      ...range(0, 10).map((i) => pine(40 + i * 120, 690, 14)),
    ],
    cones: [],
    start: { x: 120, y: 600, a: 0 },
    bay,
  });
}

// 38. Riding stables: the horsebox up to the stable door, between the hay.
function stables() {
  const bay = { x: 640, y: 206, a: PI / 2, w: 40, l: 58 };
  const arena = [[620, 570], [1160, 570], [1160, 740], [620, 740], [620, 570]];
  const jumps = [[720, 620], [880, 690], [1040, 620]].map(([x, y]) => ({ kind: "barrier", x, y, w: 50, h: 5 }));
  return level({
    id: "stables", vehicle: "suv", name: "Riding stables", title: "Stable Yard", trailer: "horsebox", par: 100, sun: "noon",
    brief: "Two horses for the show. Up the drive into the yard, then reverse the horsebox to the stable door. The hay bales are loose — nudge one and it counts.",
    w: 1300, h: 760, base: "grass", edge: "fence", backdrop: "fields",
    surfaces: [
      rect("cobble", 140, 130, 1180, 520, 20), road("gravel", [[200, 780], [200, 500]], 60), rect("sand", 624, 574, 1156, 736),
      rect("dirt", 180, 150, 300, 230, 16),
    ],
    paint: [paintBays([bay], YELLOW)],
    parked: [
      car(400, 214, PI / 2, "lorry", 0x2f4f3a), car(480, 214, PI / 2, "lorry", 0x8a1f24), car(820, 230, PI / 2, "van", 0xf2f0e6),
      car(1120, 470, PI, "suv"), car(1120, 430, PI, "wagon"),
      // Visitors' rigs parked down the middle of the yard: a lane, not a field.
      car(400, 392, 0, "lorry", 0x1f3a5a), car(560, 392, 0, "lorry", 0xf2f0e6), car(860, 392, PI, "lorry", 0x6b3b2a),
      car(1000, 396, PI, "pickup"),
    ],
    statics: [
      building(650, 80, 900, 100, { height: 36, color: 0xa0705a, roof: 0x3b3f45, doors: [320, 400, 480, 560, 640, 720, 800, 880, 960], doorW: 22, sign: "OAKFIELD STABLES", signColor: "#5a3f1e" }),
      building(1140, 290, 80, 250, { height: 36, color: 0xa0705a, roof: 0x3b3f45 }),
      { kind: "hay", x: 598, y: 190, r: 8 }, { kind: "hay", x: 598, y: 210, r: 8 }, { kind: "hay", x: 682, y: 196, r: 8 },
      { kind: "hay", x: 686, y: 216, r: 8 }, { kind: "hay", x: 590, y: 230, r: 7 },
      { kind: "vancaravan", x: 710, y: 392, a: 0 },
      { kind: "block", x: 700, y: 300, w: 40, h: 14, height: 10, color: 0x566573 },
      { kind: "tractor", x: 1050, y: 250, a: 0.4, color: 0xc0392b },
      { kind: "block", x: 240, y: 190, w: 80, h: 50, height: 16, color: 0x6b4a2a },
      ...wallLine(arena, { kind: "fence", thick: 3, maxLen: 50 }),
      ...jumps,
      ...[140, 1180].flatMap((x) => range(0, 4).map((i) => tree(x === 140 ? 90 : 1240, 170 + i * 110, 18))),
      tree(420, 640, 22), tree(300, 700, 18),
    ],
    cones: [],
    start: { x: 200, y: 640, a: -PI / 2 },
    bay,
  });
}

// 39. Classic car show: unload the car transporter on the display plot.
function carShow() {
  const rowA = range(0, 21).map((i) => 160 + i * 42), rowB = range(0, 26).map((i) => 160 + i * 42), rowC = range(0, 26).map((i) => 160 + i * 42);
  const show = (xs, y, a, seed) => xs.filter((_, i) => (i * 7 + seed) % 9 !== 4).map((x, i) => car(x, y, a, ["sedan", "hatch", "wagon", "sedan", "suv"][(i + seed) % 5], SHOW_COLORS[(i * 3 + seed) % SHOW_COLORS.length]));
  const bay = { x: 1150, y: 162, a: PI / 2, w: 44, l: 74 };
  const flags = range(0, 26).map((i) => ({ kind: "post", x: 140 + i * 46, y: 100, r: 2, flag: [0xd9342b, 0xf2f2ee, 0x3d6fb6][i % 3] }));
  return level({
    id: "carshow", vehicle: "pickup", name: "Classic car show", title: "Concours", trailer: "carhauler", par: 110, sun: "noon",
    brief: "The judges are waiting for the red saloon. Round the show field and reverse the car transporter onto the display plot between the two marquees.",
    w: 1400, h: 800, base: "grass", edge: "fence", backdrop: "trees",
    surfaces: [road("gravel", [[-40, 720], [1310, 720], [1310, 250]], 56), rect("gravel", 1110, 110, 1190, 205)],
    paint: [paintBays([bay], YELLOW), text(bay.x, 226, "DISPLAY", { size: 11, color: YELLOW }), arrow(700, 720, 0), arrow(1310, 450, -PI / 2)],
    parked: [
      ...show(rowA, 150, PI / 2, 1), ...show(rowB, 330, -PI / 2, 2), ...show(rowC, 500, PI / 2, 3),
      car(1368, 640, PI / 2, "van", 0xf2c230),
    ],
    statics: [
      { kind: "marquee", x: 1062, y: 150, w: 70, h: 64 }, { kind: "marquee", x: 1238, y: 150, w: 70, h: 64 },
      ...flags,
      { kind: "kiosk", x: 1360, y: 540, w: 30, h: 22 }, { kind: "table", x: 1320, y: 560 }, { kind: "table", x: 1320, y: 520 },
      building(90, 620, 120, 80, { height: 26, color: 0xf2f2ee, roof: 0x2f6b4a, sign: "ENTRY", signColor: "#2f6b3a" }),
      ...range(0, 7).map((i) => tree(200 + i * 170, 780, 20)),
    ],
    cones: [{ x: 1112, y: 206 }, { x: 1188, y: 206 }],
    start: { x: 250, y: 720, a: 0 },
    bay,
  });
}

// 40. Builders' merchant: the pipes into a rack lane, tail swinging wide.
function pipeYard() {
  const racks = range(0, 13).map((i) => 360 + i * 46);
  const lanes = racks.slice(0, -1).map((x) => x + 23);
  const target = 7;
  // The bay runs the full depth of the lane, back to the wall.
  const bay = { x: lanes[target], y: 146, a: PI / 2, w: 36, l: 188 };
  const stock = lanes.filter((_, i) => i !== target).map((x, i) => (i % 3 === 1
    ? { kind: "crates", x, y: 150, w: 26, h: 90 }
    : { kind: "logs", x, y: 150, w: 170, h: 26, a: PI / 2 }));
  return level({
    id: "pipeyard", vehicle: "van", name: "Builders' merchant", title: "Long Load", trailer: "pipes", par: 120, sun: "deck",
    brief: "Seven metres of drainpipe, and the axle sits near the front: the tail swings wide on every turn. Drop it in rack lane 8 without sweeping the pallets.",
    w: 1300, h: 760, base: "concrete", edge: "wall", backdrop: "industrial",
    surfaces: [rect("asphalt", 0, 560, 1300, 720), rect("concrete", 340, 40, 940, 250)],
    paint: [
      paintBays([bay], YELLOW), ...lanes.map((x, i) => text(x, 266, String(i + 1), { size: 12, color: i === target ? YELLOW : "rgba(236,236,230,0.8)" })),
      hatch(960, 380, 1080, 460), arrow(300, 640, 0), line([[0, 640], [1300, 640]], { dash: [20, 18] }),
    ],
    parked: [car(1180, 300, PI / 2, "lorry", 0x2e86c1), car(160, 330, 0, "pickup"), car(160, 380, 0, "hatch"), car(160, 430, 0, "van", 0xf2f0e6)],
    statics: [
      ...racks.map((x) => ({ kind: "wall", x, y: 150, a: PI / 2, w: 200, h: 6, height: 34, style: "site" })),
      ...stock,
      building(1120, 120, 280, 170, { height: 44, color: 0xd6c8b0, roof: 0x3b3f45, sign: "BUILD CENTRE", signColor: "#c0392b" }),
      { kind: "crates", x: 470, y: 320, w: 40, h: 34 }, { kind: "crates", x: 760, y: 330, w: 36, h: 36 },
      { kind: "block", x: 600, y: 440, w: 60, h: 40, height: 20, color: 0xa0523d },
      { kind: "digger", x: 1020, y: 420, a: PI, w: 50, h: 26, color: 0xe8c547 },
      { kind: "skip", x: 250, y: 90, w: 50, h: 30, color: 0x566573 }, { kind: "logs", x: 180, y: 180, w: 120, h: 40 },
      ...[200, 600, 1000].map((x) => ({ kind: "lamp", x, y: 548, a: -PI / 2 })),
    ],
    cones: [{ x: lanes[target] - 22, y: 290 }, { x: lanes[target] + 22, y: 290 }],
    start: { x: 180, y: 640, a: 0 },
    bay,
  });
}

// 42. Old town: through the archway, round the fountain, into the corner.
function courtyard() {
  const facade = [0xd8c3a5, 0xb8866a, 0xe8e0d0, 0xc9b79c, 0xa0705a, 0x8e9aa6, 0xd6c8b0];
  const row = (x0, x1, y, h, seed) => {
    const out = [];
    let x = x0, i = seed;
    while (x < x1 - 20) {
      const w = Math.min(x1 - x, 90 + ((i * 37) % 60));
      out.push(building(x + w / 2, y, w - 2, h, { height: 44 + (i % 4) * 10, color: facade[i % facade.length], roof: 0x7a3b2e }));
      x += w; i++;
    }
    return out;
  };
  const bay = { x: 670, y: 196, a: PI / 2, w: 36, l: 40 };
  return level({
    id: "courtyard", name: "Old town", title: "Through the Arch", trailer: "teardrop", par: 110, sun: "dusk",
    brief: "Your flat has a courtyard, and the only way in is the archway. Reverse the teardrop through it, round the fountain and into the space by the far wall.",
    w: 1300, h: 800, base: "cobble", edge: "none", backdrop: "town",
    surfaces: [rect("asphalt", 0, 560, 1300, 640), rect("pavement", 0, 548, 1300, 560), rect("pavement", 0, 640, 1300, 652), rect("pavement", 640, 440, 700, 548)],
    paint: [paintBays([bay], YELLOW), line([[0, 600], [1300, 600]], { dash: [18, 16] }), zebra(1000, 600, PI / 2, 80, 24)],
    parked: [
      ...[120, 240, 360, 900, 1040, 1180].map((x, i) => car(x, 624, 0, ["hatch", "sedan", "wagon", "hatch", "suv", "sedan"][i])),
      ...[150, 280, 440, 880, 1150].map((x, i) => car(x, 576, PI, ["sedan", "hatch", "suv", "wagon", "hatch"][i])),
      car(452, 250, 0, "hatch"), car(452, 330, 0, "sedan"), car(888, 240, PI, "wagon"), car(888, 350, PI, "hatch"),
    ],
    statics: [
      ...row(0, 640, 496, 104, 0), ...row(700, 1300, 496, 104, 3), ...row(0, 1300, 726, 148, 5),
      ...row(300, 1040, 100, 140, 2),
      building(360, 300, 120, 260, { height: 50, color: 0xc9b79c, roof: 0x7a3b2e }), building(980, 300, 120, 260, { height: 54, color: 0xb8866a, roof: 0x7a3b2e }),
      building(150, 300, 300, 260, { height: 48, color: 0xd6c8b0, roof: 0x5a4a44 }), building(1170, 300, 260, 260, { height: 50, color: 0xa0705a, roof: 0x5a4a44 }),
      { kind: "island", x: 670, y: 318, r: 28 },
      ...range(0, 4).map((i) => ({ kind: "post", x: 560 + i * 8, y: 180, r: 2 })),
      { kind: "planter", x: 780, y: 186, w: 40, h: 12 }, { kind: "bin", x: 560, y: 410 },
      ...[632, 708].map((x) => ({ kind: "bollard", x, y: 556, r: 3 })),
      ...[300, 900].map((x) => ({ kind: "lamp", x, y: 646, a: -PI / 2 })), { kind: "lamp", x: 800, y: 420, a: PI },
      { kind: "barrier", x: 6, y: 600, w: 6, h: 90 }, { kind: "barrier", x: 1294, y: 600, w: 6, h: 90 },
    ],
    cones: [],
    start: { x: 560, y: 600, a: 0 },
    bay,
  });
}

// 41. County show at night: the horsebox back into the lorry line, across
// the mud churned up in front of it.
function showground() {
  const plots = range(0, 14).map((k) => 300 + k * 70);
  const target = 6;
  const bay = { x: plots[target], y: 196, a: PI / 2, w: 44, l: 60 };
  const rigs = plots.flatMap((x, k) => {
    if (k === target) return [];
    if (k === target - 1 || k === target + 1 || k % 3 === 0) return [car(x, 196, PI / 2, "lorry", [0x2f4f3a, 0x8a1f24, 0x1f3a5a, 0xf2f0e6, 0x6b3b2a][k % 5])];
    return k % 3 === 1 ? [car(x, 180, PI / 2, "pickup")] : [];
  });
  const vans = plots.filter((_, k) => k !== target && Math.abs(k - target) > 1 && k % 3 === 2).map((x) => ({ kind: "vancaravan", x, y: 190, a: PI / 2 }));
  const ring = [[200, 440], [600, 440], [600, 610], [200, 610], [200, 440]];
  return level({
    id: "showground", vehicle: "suv", name: "County show", title: "Midnight Muck", trailer: "horsebox", par: 130, sun: "night",
    brief: "The show is over and the field is churned to mud. Round the ring to the lorry line and reverse the horsebox into the gap — the mud in front of it slides and drags.",
    w: 1400, h: 820, base: "grass", edge: "hedge", backdrop: "fields",
    surfaces: [
      road("gravel", [[-40, 720], [1300, 720], [1300, 300]], 56),
      rect("mud", 640, 250, 810, 340, 30), rect("mud", 1040, 300, 1200, 380, 30), rect("mud", 330, 280, 460, 350, 24),
      rect("sand", 204, 444, 596, 606),
    ],
    paint: [paintBays([bay], YELLOW)],
    parked: [...rigs, car(1360, 520, PI / 2, "van", 0xf2f0e6)],
    statics: [
      ...vans,
      ...wallLine(ring, { kind: "fence", thick: 3, maxLen: 50 }),
      ...[[300, 500], [420, 560], [520, 480]].map(([x, y]) => ({ kind: "barrier", x, y, w: 44, h: 5 })),
      { kind: "marquee", x: 1000, y: 500, w: 110, h: 80 }, { kind: "marquee", x: 1150, y: 520, w: 80, h: 70 },
      { kind: "stall", x: 820, y: 520, w: 50, h: 34, color: 0x2e86c1 },
      ...range(0, 6).map((i) => ({ kind: "lamp", x: 300 + i * 180, y: 404, a: -PI / 2 })),
      { kind: "hay", x: 900, y: 420, r: 8 }, { kind: "hay", x: 916, y: 432, r: 8 },
      ...range(0, 8).map((i) => tree(80 + i * 170, 800, 20)),
    ],
    cones: [],
    start: { x: 180, y: 720, a: 0 },
    bay,
  });
}

export const CHAPTER7 = [campsite(), stables(), carShow(), pipeYard(), showground(), courtyard()];
