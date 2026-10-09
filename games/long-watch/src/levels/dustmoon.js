import { Kit } from "./kit.js";
import { rng } from "../rng.js";

// ── Dustnest Moon (Porfészek-hold) ───────────────────────────────────────
// A mining moon of rust-red dust under a ringed gas giant. 320 × 320 m,
// walled in by mountains:
//   south   the landing zone, a road north to the colony
//   centre  Dustnest colony: ops centre, generator shed, habitat modules,
//           a perimeter of barriers and fence panels, containers
//   west    a ridge with the comms relay, reached by a switchback trail
//   north   a narrow canyon (sentries) to the sealed med bunker
//   east    the open-pit mine, its nest vents and the Warden's floor
// Coordinates: x east, z south, y up; the colony square is at y = 0.

const S = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const segDist = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)) : 0;
  return [Math.hypot(x - ax - dx * t, z - az - dz * t), t];
};
const polyDist = (x, z, pts) => {
  let best = Infinity, at = 0, run = 0, total = 0;
  const lens = [];
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); lens.push(l); total += l; }
  for (let i = 0; i < pts.length - 1; i++) {
    const [d, t] = segDist(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < best) { best = d; at = (run + t * lens[i]) / total; }
    run += lens[i];
  }
  return [best, at];
};

export const PIT = { x: 98, z: 6, r: 44, floor: 16, depth: 13 };
export const RIDGE = { x: -112, z: -24, r: 27, h: 15 };
const TRAIL = [[-58, 14], [-78, 8], [-92, 18], [-100, 2], [-96, -6]];
const CANYON = [[0, -50], [-6, -66], [6, -82], [-4, -98], [-18, -112], [-22, -124]];
const ROAD = [[0, 122], [2, 96], [-2, 70], [0, 48]];
const EAST_ROAD = [[48, 2], [62, 4], [72, 6]];

function height(x, z) {
  // Rolling dust.
  let h = 1.6 * Math.sin(x * 0.031 + 1.3) * Math.cos(z * 0.027) + 0.9 * Math.sin((x + z) * 0.063) + 0.5 * Math.sin(x * 0.11 - z * 0.07) + 0.25 * Math.sin(x * 0.23 + z * 0.19);
  // Mountains all round: high enough to wall the area in, low enough to
  // leave the sky (and the gas giant) above them.
  const e = Math.max(Math.abs(x), Math.abs(z));
  h += S(126, 158, e) * (26 + 8 * Math.sin(x * 0.05 + z * 0.04) + 5 * Math.sin(x * 0.17 - z * 0.13));
  // The north: high ground with the canyon cut through it.
  const north = S(-46, -60, z);
  if (north > 0) {
    const [cd] = polyDist(x, z, CANYON);
    const wall = S(7, 12, cd);
    h += north * (wall * (13 + 2 * Math.sin(x * 0.2) + Math.sin(z * 0.31) * 1.5) - 1.2 * (1 - wall));
  }
  // The bunker's pad at the canyon's end: level ground under the building.
  const bd = Math.max(Math.abs(x + 22) - 7.5, Math.abs(z + 126) - 6);
  if (bd < 4) h += (-1.2 - h) * S(4, 0.5, bd);
  // The west ridge: a steep-sided plateau, a trail winding up.
  const rd = Math.hypot(x - RIDGE.x, z - RIDGE.z);
  const ridge = S(RIDGE.r + 4, RIDGE.r, rd) * RIDGE.h;
  h = Math.max(h, ridge + (ridge > 0 ? 0.4 * Math.sin(x * 0.4) * Math.sin(z * 0.3) * S(RIDGE.r, RIDGE.r - 6, rd) : 0));
  const [td, tt] = polyDist(x, z, TRAIL);
  if (td < 6) { const want = S(0.35, 1, tt) * RIDGE.h; h = h + (want - h) * S(6, 3, td); }
  // The pit: terraced, down to a flat floor.
  const pd = Math.hypot(x - PIT.x, z - PIT.z);
  if (pd < PIT.r + 6) {
    let k = S(PIT.r, PIT.floor, pd);
    k = k * 0.45 + 0.55 * (Math.round(k * 4) / 4 + (k * 4 - Math.round(k * 4)) * 0.4 / 4);
    const pit = -PIT.depth * k;
    h = h * (1 - S(PIT.r + 6, PIT.r, pd)) + pit;
  }
  // The colony pad and the landing zone are flat; the roads are smooth.
  const cd = Math.hypot(x, z);
  h *= S(50, 62, cd);
  const lz = Math.hypot(x, z - 122);
  h *= S(16, 26, lz);
  for (const road of [ROAD, EAST_ROAD]) {
    const [d] = polyDist(x, z, road);
    if (d < 7) h *= 0.15 + 0.85 * S(3.5, 7, d);
  }
  return h;
}

// Ground colours: dust, darker rock on slopes, pale road, scorched pad.
function ground(x, z, h, slope) {
  const n = Math.sin(x * 0.7 + z * 0.3) * 0.5 + Math.sin(x * 0.13 - z * 0.21) * 0.5;
  let c = n > 0.3 ? 0xa65a3a : n < -0.4 ? 0x8e4a31 : 0x9c5235;
  if (slope > 0.18) c = 0x6e3f2e;
  if (slope > 0.35) c = 0x5a3a30;
  if (h > 9) c = slope > 0.2 ? 0x6b4536 : 0xb06a48;
  const [rd] = polyDist(x, z, ROAD), [ed] = polyDist(x, z, EAST_ROAD);
  if (Math.min(rd, ed) < 3.2) c = 0x7b6658;
  if (Math.hypot(x, z) < 50) c = n > 0 ? 0x6f6460 : 0x675c58;
  const pd = Math.hypot(x - PIT.x, z - PIT.z);
  if (pd < PIT.r) c = slope > 0.2 ? 0x5e4a40 : pd < PIT.floor ? 0x4e3d36 : 0x705a4c;
  if (Math.hypot(x, z - 122) < 12) c = 0x55504c;
  return c;
}

export function buildDustmoon() {
  const k = new Kit({ size: 320, cell: 2, fn: height, ground });
  const R = rng(42);
  const conc = { top: 0x8d8a86, side: 0x76726e, bottom: 0x5a5652, bevel: 0.06 };
  const steel = { top: 0x5b6670, side: 0x4a535c, bevel: 0.05 };
  const wallLook = { top: 0x9aa0a4, side: 0xc4c6c4, bottom: 0x7b7f82, bevel: 0.08, stripe: 0xd8862e };
  const roofLook = { top: 0x5a6068, side: 0x4c5158, bevel: 0.1 };

  k.mark("start", 0, 116, { yaw: 0 });
  k.mark("lz", 0, 122);
  k.mark("gate", 0, 49);
  k.mark("rover", 8, 80);

  // ── The landing zone ──
  k.prop("pad", 0, 122, { flat: true });
  for (const [x, z] of [[-11, 116], [11, 116], [-11, 128], [11, 128]]) k.prop("padLight", x, z, { collide: { r: 0.25, h: 0.6 } });
  k.prop("crateStack", 14, 112, { yaw: 0.3, collide: { w: 2.4, d: 1.6, h: 1.25 }, flat: true });
  k.prop("crate", -15, 118, { yaw: 1.2, collide: { w: 1.2, d: 1.2, h: 1.1 } });

  // ── The road and the overturned rover ──
  k.prop("rover", 8, 80, { yaw: 2.2, collide: { w: 2.8, d: 5, h: 1.6 }, flat: true, opts: { flipped: true } });
  k.prop("barrier", -4, 70, { yaw: 0.2, collide: { w: 2.8, d: 0.6, h: 1.1 } });
  k.prop("barrier", 6, 64, { yaw: -0.3, collide: { w: 2.8, d: 0.6, h: 1.1 } });
  for (let i = 0; i < 6; i++) k.prop("roadLamp", (i % 2 ? 5 : -5), 108 - i * 11, { yaw: i % 2 ? Math.PI : 0, collide: { r: 0.2, h: 5 } });

  // ── Dustnest colony ──
  // Perimeter: an octagon of fence panels (high) and barriers (low), gates
  // at the four roads.
  const oct = [];
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; oct.push([Math.sin(a) * 48, Math.cos(a) * 48]); }
  for (let i = 0; i < 8; i++) {
    const [ax, az] = oct[i], [bx, bz] = oct[i + 1];
    const L = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax), n = Math.round(L / 3.4);
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      // Gates where the roads come in.
      if (Math.abs(x) < 6 && Math.abs(z) > 40) continue;
      if (Math.abs(z) < 6 && Math.abs(x) > 40) continue;
      if ((i + j) % 3 === 0) k.prop("barrier", x, z, { yaw, collide: { w: 3.0, d: 0.6, h: 1.1 } });
      else k.prop("fence", x, z, { yaw, collide: { w: 3.3, d: 0.25, h: 2.6 } });
    }
  }
  for (const [x, z, yaw] of [[-6, 48, 0], [6, 48, 0], [-6, -48, 0], [6, -48, 0], [48, -6, Math.PI / 2], [48, 6, Math.PI / 2], [-48, -6, Math.PI / 2], [-48, 6, Math.PI / 2]]) k.prop("gatePost", x, z, { yaw, collide: { w: 0.8, d: 0.8, h: 4 } });

  // Ops centre.
  k.building(-16, -14, 18, 12, 4.4, { look: wallLook, roof: roofLook, doors: [{ side: "s", at: -3, w: 2.6 }, { side: "e", at: 2, w: 2.2 }] });
  k.mark("terminal", -21, -17.6);
  k.prop("console", -21, -18.4, { y: 0.15, collide: { w: 2.6, d: 0.8, h: 1.1 } });
  k.prop("screenWall", -15, -19.6, { y: 0.15 });
  k.box(-11, -12, 4, 1.2, 0.95, steel);           // desk
  k.mark("armory", -9.6, -18.6);
  k.prop("rack", -9.6, -19.3, { y: 0.15, collide: { w: 2.2, d: 0.5, h: 2 }, opts: { gun: "launcher" } });
  k.mark("log1", -12, -12);
  k.light(-16, 3.6, -14, 0xbfe4ff, 12);

  // Generator shed: open to the south.
  k.building(21, -12, 12, 9, 4.6, { look: wallLook, roof: roofLook, doors: [{ side: "s", at: 0, w: 5, h: 3.8 }, { side: "w", at: 1.5, w: 2 }] });
  k.mark("generator", 21, -13.2);
  k.prop("generator", 21, -14.2, { y: 0.15, collide: { w: 5.4, d: 3.2, h: 2.6 } });
  k.mark("genLight", 21, -8);
  k.light(21, 3.8, -12, 0xffc27a, 12);

  // Habitat modules.
  for (const [x, z, yaw, door] of [[-30, 20, 0, "s"], [-12, 30, 0, "s"], [18, 26, 0, "s"], [34, 12, 0, "w"], [-34, 0, 0, "e"]]) {
    k.building(x, z, 9, 6.5, 3.2, { look: { ...wallLook, side: 0xb9bcba }, roof: { top: 0x6b7178, side: 0x5a6066, bevel: 0.1 }, doors: [{ side: door, at: 0, w: 1.8 }] });
    k.prop("hab", x, z, { y: k.h(x, z), opts: { door } });
  }
  k.mark("log2", -12, 30.5);
  k.mark("log3", 34.5, 12);

  // Containers and crates: the colony's cover.
  const cont = (x, z, yaw, c, stack = false) => {
    k.prop("container", x, z, { yaw, collide: { w: 6, d: 2.5, h: 2.6 }, opts: { c }, flat: true });
    if (stack) k.prop("container", x, z, { yaw: yaw + 0.04, y: k.h(x, z) + 2.6, collide: { w: 6, d: 2.5, h: 2.6, y0: 0 }, opts: { c: c === 0xb5562c ? 0x2f6b8a : 0xb5562c } });
  };
  cont(6, 8, 0.1, 0xb5562c, true); cont(-4, 16, 1.5, 0x2f6b8a); cont(10, -30, 0.4, 0x6f7a3a); cont(-30, -32, 1.2, 0xb5562c, true);
  cont(30, -32, -0.3, 0x2f6b8a); cont(-38, 30, 0.8, 0x6f7a3a); cont(36, 34, 2.4, 0xb5562c);
  for (let i = 0; i < 16; i++) {
    const a = R() * Math.PI * 2, r = 12 + R() * 30, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.hypot(x + 16, z + 14) < 12 || Math.hypot(x - 21, z + 12) < 9 || Math.abs(x) < 4) continue;
    k.prop(R() < 0.5 ? "crate" : "crateStack", x, z, { yaw: R() * 3, collide: R() < 0.5 ? { w: 1.2, d: 1.2, h: 1.1 } : { w: 2.4, d: 1.6, h: 1.25 }, flat: true });
  }
  for (const [x, z, yaw] of [[-6, 2, 0.1], [14, -2, 1.4], [-24, 10, 0.6], [4, -20, -0.4], [26, 4, 0.9], [-8, 38, 0.2], [8, 38, -0.2]]) k.prop("barrier", x, z, { yaw, collide: { w: 3.0, d: 0.6, h: 1.1 } });
  k.prop("truck", 28, 22, { yaw: 2.6, collide: { w: 3.4, d: 8, h: 3.2 }, flat: true });
  k.prop("waterTower", -36, -26, { collide: { r: 2.6, h: 9, y0: 4.5 } });
  for (const [x, z] of [[-34, -24], [-38, -24], [-34, -28], [-38, -28]]) k.world.cyl({ x, z, r: 0.25, y0: 0, y1: 4.6 });
  k.prop("dish", 0, -36, { collide: { r: 1.2, h: 3 } });
  for (const [x, z] of [[-8, 44], [8, -44], [-40, 8], [40, -8], [0, 0], [-20, -32], [24, 16], [-26, 30]]) { k.prop("lamp", x, z, { collide: { r: 0.18, h: 6 } }); }

  // ── West: the trail and the relay ridge ──
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1];
    k.prop("rock", (ax + bx) / 2 + 5, (az + bz) / 2 - 3, { s: 1.2 + R() * 0.6, yaw: R() * 6, collide: { r: 1.6, h: 2.2 } });
  }
  const rt = { x: RIDGE.x - 4, z: RIDGE.z - 6 };
  k.mark("relay", rt.x + 3, rt.z + 4);
  k.prop("relayTower", rt.x, rt.z, { collide: { w: 3, d: 3, h: 22 } });
  k.prop("console", rt.x + 3, rt.z + 3.2, { collide: { w: 2.6, d: 0.8, h: 1.1 }, yaw: 0 });
  k.mark("laser", RIDGE.x + 8, RIDGE.z - 10);
  k.prop("deepcoreCrate", RIDGE.x + 8, RIDGE.z - 10.8, { collide: { w: 2.4, d: 1.4, h: 1.2 }, yaw: 0.2, flat: true });
  k.mark("log4", RIDGE.x - 10, RIDGE.z + 6);
  k.prop("shelter", RIDGE.x - 10, RIDGE.z + 8, { collide: { w: 4, d: 3, h: 2.6 }, flat: true });
  for (const [x, z] of [[-106, -10], [-118, -12], [-100, -30], [-124, -26], [-112, -40]]) k.prop("barrier", x, z, { yaw: R() * 3, collide: { w: 3.0, d: 0.6, h: 1.1 } });
  k.light(rt.x, k.h(rt.x, rt.z) + 6, rt.z, 0xff5040, 10, 0.6);

  // ── North: the canyon and the bunker ──
  for (let i = 1; i < CANYON.length - 1; i++) {
    const [x, z] = CANYON[i];
    k.prop("rock", x + (i % 2 ? 4 : -4), z + 2, { s: 1.3 + R() * 0.7, yaw: R() * 6, collide: { r: 1.8, h: 2.4 } });
    k.prop("rockLow", x + (i % 2 ? -3 : 3), z - 4, { s: 1 + R() * 0.4, yaw: R() * 6, collide: { r: 1.4, h: 1.15 } });
  }
  for (const [x, z] of [[-2, -58], [3, -73], [-7, -90], [1, -104]]) k.prop("rockLow", x, z, { s: 1.1, yaw: R() * 6, collide: { r: 1.4, h: 1.15 } });
  for (const [x, z] of [[-9, -76], [10, -88], [-12, -104]]) k.prop("spire", x, z, { s: 1, yaw: R() * 6, collide: { r: 1.0, h: 3.0 } });
  const bx = -22, bz = -126;
  const by = k.building(bx, bz, 12, 9, 3.6, { look: { ...wallLook, side: 0xa7aaa8 }, roof: roofLook, doors: [{ side: "s", at: 0, w: 2.4 }] });
  k.mark("bunker", bx, bz + 5.6, { y: by });
  k.prop("bunkerDoor", bx, bz + 4.5, { y: by, opts: {} });
  k.light(bx, by + 3.2, bz + 5.5, 0x9fe0ff, 8, 0.7);
  k.mark("log5", bx + 7, bz + 8);

  // ── East: the road to the pit ──
  k.building(70, -30, 10, 7, 3.4, { look: wallLook, roof: roofLook, doors: [{ side: "s", at: 0, w: 2 }] });
  k.mark("ammoPit", 70, -25.5);
  k.prop("excavator", PIT.x + 30, PIT.z - 26, { yaw: 2.4, collide: { w: 5, d: 8, h: 5 }, flat: true });
  k.prop("conveyor", PIT.x - 36, PIT.z + 28, { yaw: 0.8, collide: { w: 2, d: 14, h: 3, y0: 1.8 } });
  for (const [x, z] of [[60, 14], [64, -8], [58, 24]]) k.prop("rock", x, z, { s: 1 + R() * 0.5, yaw: R() * 6, collide: { r: 1.6, h: 2.2 } });

  // The pit: three vents, cover on the terraces, the floor for the boss.
  const vents = [[PIT.x - 24, PIT.z - 14], [PIT.x + 22, PIT.z + 18], [PIT.x + 8, PIT.z - 26]];
  vents.forEach(([x, z], i) => { k.mark(`vent${i + 1}`, x, z); k.prop("vent", x, z, { collide: { r: 1.9, h: 1.0 } }); });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2, r = 22 + (i % 3) * 7, x = PIT.x + Math.sin(a) * r, z = PIT.z + Math.cos(a) * r;
    if (vents.some(([vx, vz]) => Math.hypot(vx - x, vz - z) < 5)) continue;
    if (i % 3 === 0) k.prop("rock", x, z, { s: 1 + R() * 0.4, yaw: R() * 6, collide: { r: 1.6, h: 2.2 } });
    else k.prop("rockLow", x, z, { s: 1, yaw: R() * 6, collide: { r: 1.4, h: 1.15 } });
  }
  k.mark("pit", PIT.x, PIT.z);
  for (const [x, z] of [[PIT.x - 8, PIT.z + 4], [PIT.x + 6, PIT.z - 6]]) k.prop("drillRig", x, z, { collide: { w: 2.4, d: 2.4, h: 4 }, yaw: R() * 3 });

  // Burrows: where waves come up.
  [[22, 12], [12, -24], [32, -20], [36, 0]].forEach(([x, z], i) => k.burrow(`col${i + 1}`, x, z));
  [[PIT.x - 12, PIT.z + 10], [PIT.x + 12, PIT.z + 8], [PIT.x - 4, PIT.z - 12], [PIT.x + 10, PIT.z - 10]].forEach(([x, z], i) => k.burrow(`pit${i + 1}`, x, z));
  [[-74, 14], [-96, -2]].forEach(([x, z], i) => k.burrow(`west${i + 1}`, x, z));
  [[-2, -84], [-10, -110]].forEach(([x, z], i) => k.burrow(`can${i + 1}`, x, z));

  // Scenery out on the dust.
  for (let i = 0; i < 140; i++) {
    const x = (R() - 0.5) * 300, z = (R() - 0.5) * 300;
    if (Math.hypot(x, z) < 56 || Math.hypot(x, z - 122) < 22 || Math.hypot(x - PIT.x, z - PIT.z) < PIT.r + 4) continue;
    const [rd] = polyDist(x, z, ROAD), [td] = polyDist(x, z, TRAIL), [cd] = polyDist(x, z, CANYON), [ed] = polyDist(x, z, EAST_ROAD);
    if (rd < 8 || td < 7 || ed < 7 || (z < -50 && cd < 9)) continue;
    const big = R() < 0.3;
    k.prop(big ? "rock" : "rockLow", x, z, { s: (big ? 1.2 : 0.8) + R() * 1.2, yaw: R() * 6, collide: big ? { r: 1.6, h: 2.2 } : { r: 1.4, h: 1.15 } });
  }
  for (let i = 0; i < 40; i++) {
    const x = (R() - 0.5) * 290, z = (R() - 0.5) * 290;
    if (Math.hypot(x, z) < 54) continue;
    k.prop("pebbles", x, z, { yaw: R() * 6, s: 0.7 + R() * 0.8 });
  }
  return k;
}
