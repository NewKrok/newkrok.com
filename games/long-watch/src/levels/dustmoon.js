import { Kit } from "./kit.js";
import { rng } from "../rng.js";

// ── Dustnest Moon (Porfészek-hold) ───────────────────────────────────────
// A mining moon of rust-red dust under a ringed gas giant. 480 × 480 m,
// walled in by mountains. The colony sits in the middle; the land round
// it is a gently rolling plain with a few big, readable landmarks, far
// enough apart that one sitting does not show you all of them:
//   south        the landing zone, a road north to the colony
//   centre       Dustnest colony: ops centre, generator shed, habitats,
//                a perimeter of barriers and fence panels, containers
//   west         a ridge with the comms relay, a switchback trail up it
//   north        a canyon through high ground to the sealed bunker
//   east         the open-pit mine with its nest vents
//   north-east   a crater with the wreck of a dropship
//   south-east   a dry lake bed with an abandoned survey camp
//   south-west   dunes, a small crater, and mesas (two with a trail up)
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

export const SIZE = 480;
const WALL = [200, 236];                       // the mountains start rising here and are full height there
export const PIT = { x: 150, z: 10, r: 50, floor: 14, depth: 12 };
export const RIDGE = { x: -165, z: -34, r: 30, h: 15 };
const TRAIL = [[-111, 4], [-131, -2], [-145, 8], [-153, -8], [-149, -16]];
const CANYON = [[0, -60], [-8, -80], [6, -100], [-6, -122], [-22, -146], [-30, -170], [-32, -184]];
const BUNKER = { x: -32, z: -190 };
const LZ = { x: 0, z: 152 };
const ROAD = [[0, 152], [3, 120], [-2, 90], [0, 50]];
const EAST_ROAD = [[48, 2], [70, 4], [98, 8]];
// Flat-topped hills out on the dust (x, z, radius, height); two have a trail to the top.
export const MESAS = [[-90, 70, 15, 7], [65, 75, 13, 6], [-70, -95, 12, 6], [55, -80, 12, 6], [-30, 125, 10, 5], [125, -64, 11, 6], [-150, 60, 14, 7], [170, 70, 12, 6]];
const MESA_TRAILS = [{ pts: [[-66, 50], [-90, 70]], mesa: 0 }, { pts: [[44, 93], [65, 75]], mesa: 1 }];
// Craters (x, z, radius, depth, rim height) and the dry lake.
export const CRATERS = [[95, -125, 28, 5, 1.5], [-120, 120, 18, 3.2, 1.0]];
export const LAKE = { x: 115, z: 125, r: 45 };
const WRECK = { x: 97, z: -121 };
const CAMP = { x: 115, z: 125 };

// The plain under everything: long, soft swells (about 16° at the steepest).
function plain(x, z) {
  return 2.2 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.018) + 1.5 * Math.sin((x + z) * 0.037 + 0.4) * Math.cos((x - 2 * z) * 0.019)
    + 0.6 * Math.sin(x * 0.09 - z * 0.06) + 0.3 * Math.sin(x * 0.19 + z * 0.15) * Math.cos(x * 0.11 - z * 0.23);
}
// How much a point is in the dune field (south-west).
const dunes = (x, z) => S(-30, -70, x) * S(20, 60, z) * (1 - S(170, 200, Math.max(Math.abs(x), Math.abs(z))));

function height(x, z) {
  const base = plain(x, z);
  let h = base;
  // Dunes: long soft ridges across the south-west.
  const dk = dunes(x, z);
  if (dk > 0) { const w = Math.sin((x * 0.8 + z * 0.6) * 0.14 + 0.6 * Math.sin(z * 0.045 + x * 0.02)); h += dk * 2.4 * Math.pow(Math.max(0, w), 1.4); }
  // Mesas: a steep side and a near-flat top.
  for (const [mx, mz, mr, mh] of MESAS) {
    const d = Math.hypot(x - mx, z - mz);
    if (d > mr + 10) continue;
    const top = mh + 0.3 * Math.sin(x * 0.5) * Math.cos(z * 0.45);
    h += S(mr + 7, mr - 2, d) * top;
  }
  // Trails up two of them: a ramp cut into the side.
  for (const t of MESA_TRAILS) {
    const [td, tt] = polyDist(x, z, t.pts);
    if (td < 7) { const want = base + S(0.05, 0.95, tt) * MESAS[t.mesa][3]; h += (want - h) * S(7, 3.5, td); }
  }
  // Craters: a bowl with a raised rim.
  for (const [cx, cz, cr, cd, rim] of CRATERS) {
    const d = Math.hypot(x - cx, z - cz);
    if (d > cr * 1.7) continue;
    const bowl = d < cr ? -cd * (1 - (d / cr) ** 2) : 0;
    h += bowl + rim * Math.exp(-(((d - cr) / (cr * 0.3)) ** 2));
  }
  // Mountains all round: high enough to wall the area in, low enough to
  // leave the sky (and the gas giant) above them.
  const e = Math.max(Math.abs(x), Math.abs(z));
  h += S(WALL[0], WALL[1], e) * (28 + 8 * Math.sin(x * 0.05 + z * 0.04) + 5 * Math.sin(x * 0.17 - z * 0.13));
  // The north: a massif of high ground round the canyon, which is cut
  // through it; the massif fades back into the plain to either side.
  const north = S(-56, -72, z);
  if (north > 0) {
    const [cd] = polyDist(x, z, CANYON);
    const wall = S(8, 16, cd), massif = S(68, 36, cd);
    h += north * massif * (wall * (13 + 2 * Math.sin(x * 0.2) + Math.sin(z * 0.31) * 1.5) - 1.2 * (1 - wall));
  }
  // The bunker's pad at the canyon's end: level ground under the building.
  const bd = Math.max(Math.abs(x - BUNKER.x) - 7.5, Math.abs(z - BUNKER.z) - 6);
  if (bd < 4) h += (-1.2 - h) * S(4, 0.5, bd);
  // The west ridge: a steep-sided plateau, a trail winding up.
  const rd = Math.hypot(x - RIDGE.x, z - RIDGE.z);
  const ridge = S(RIDGE.r + 5, RIDGE.r, rd) * RIDGE.h;
  h = Math.max(h, ridge + (ridge > 0 ? 0.4 * Math.sin(x * 0.4) * Math.sin(z * 0.3) * S(RIDGE.r, RIDGE.r - 6, rd) : 0));
  const [td, tt] = polyDist(x, z, TRAIL);
  if (td < 6) { const k = S(0.3, 1, tt), want = base * (1 - k) + RIDGE.h * k; h = h + (want - h) * S(6, 3, td); }
  // The pit: terraced (each riser a ramp a bug can climb), down to a flat floor.
  const pd = Math.hypot(x - PIT.x, z - PIT.z);
  if (pd < PIT.r + 6) {
    let k = S(PIT.r, PIT.floor, pd);
    const q = k * 4, qf = q - Math.floor(q);
    k = k * 0.8 + 0.2 * (Math.floor(q) / 4 + S(0.3, 1, qf) * 0.25);
    const pit = -PIT.depth * k;
    h = h * (1 - S(PIT.r + 6, PIT.r, pd)) + pit;
  }
  // The dry lake: flat, a little below the plain.
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (ld < LAKE.r + 12) { const k = S(LAKE.r + 12, LAKE.r - 6, ld); h = h * (1 - k) + (-1.4 + 0.08 * Math.sin(x * 0.3) * Math.cos(z * 0.27)) * k; }
  // The colony pad and the landing zone are flat; the roads are smooth.
  const cd = Math.hypot(x, z);
  h *= S(50, 62, cd);
  const lz = Math.hypot(x - LZ.x, z - LZ.z);
  h *= S(16, 26, lz);
  for (const road of [ROAD, EAST_ROAD]) {
    const [d] = polyDist(x, z, road);
    if (d < 7) h *= 0.15 + 0.85 * S(3.5, 7, d);
  }
  return h;
}

// Ground colours: dust, darker rock on slopes, pale road, scorched pad,
// ash in the craters, cracked clay on the lake bed, lighter dune crests.
function ground(x, z, h, slope) {
  const n = Math.sin(x * 0.7 + z * 0.3) * 0.5 + Math.sin(x * 0.13 - z * 0.21) * 0.5;
  let c = n > 0.3 ? 0xa65a3a : n < -0.4 ? 0x8e4a31 : 0x9c5235;
  if (dunes(x, z) > 0.5 && slope < 0.1) c = n > 0 ? 0xb3653f : 0xa85c38;
  if (slope > 0.18) c = 0x6e3f2e;
  if (slope > 0.35) c = 0x5a3a30;
  if (h > 9) c = slope > 0.2 ? 0x6b4536 : 0xb06a48;
  for (const [cx, cz, cr] of CRATERS) {
    const d = Math.hypot(x - cx, z - cz);
    if (d < cr * 1.15) c = d < cr * 0.95 ? (slope > 0.2 ? 0x4e3a34 : 0x5a4238) : 0x6b4a3a;
  }
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (ld < LAKE.r) c = Math.sin(x * 0.9 + Math.sin(z * 0.4)) * Math.sin(z * 0.8 + Math.sin(x * 0.35)) > 0.55 ? 0x9e8e74 : 0xb3a386;
  const [rd] = polyDist(x, z, ROAD), [ed] = polyDist(x, z, EAST_ROAD);
  if (Math.min(rd, ed) < 3.2) c = 0x7b6658;
  if (Math.hypot(x, z) < 50) c = n > 0 ? 0x6f6460 : 0x675c58;
  const pd = Math.hypot(x - PIT.x, z - PIT.z);
  if (pd < PIT.r) c = slope > 0.2 ? 0x5e4a40 : pd < PIT.floor ? 0x4e3d36 : 0x705a4c;
  if (Math.hypot(x - LZ.x, z - LZ.z) < 12) c = 0x55504c;
  return c;
}

// The stations round the colony, each a use point in the siege script:
// where you stand (the mark), which way the prop faces, its model and
// collider, and the colour of its beacon (the HUD uses the same colours).
export const STATION_SPOTS = [
  { name: "medbay", x: -22, z: 29, yaw: Math.PI, model: "medbay", collide: { w: 1.6, d: 1.2, h: 2.3 }, c: 0x5af07a },
  { name: "ammoShop", x: 31, z: -14, yaw: Math.PI / 2, model: "ammoBox", collide: { w: 0.9, d: 0.5, h: 0.5 }, c: 0xf0b860 },
  { name: "armoury", x: -31, z: -12, yaw: -Math.PI / 2, model: "armoury", collide: { w: 1.8, d: 0.8, h: 2.2 }, c: 0xff8a5a },
  { name: "workshop", x: 26, z: 35, yaw: Math.PI, model: "workshop", collide: { w: 2.2, d: 1.0, h: 1.0 }, c: 0x7ef9ff },
  { name: "droneBay", x: 4, z: 27, yaw: 0, model: "droneBay", collide: { w: 2.4, d: 1.4, h: 2.2 }, c: 0xb89cff },
  { name: "command", x: 0, z: -10, yaw: 0, model: "commandPost", collide: { r: 1.0, h: 1.1 }, c: 0xffd84a },
];

export function buildDustmoon() {
  const k = new Kit({ size: SIZE, cell: 1, fn: height, ground });
  const R = rng(42);
  const steel = { top: 0x5b6670, side: 0x4a535c, bevel: 0.05 };
  const wallLook = { top: 0x9aa0a4, side: 0xc4c6c4, bottom: 0x7b7f82, bevel: 0.08, stripe: 0xd8862e };
  const roofLook = { top: 0x5a6068, side: 0x4c5158, bevel: 0.1 };
  // Rocks: the collider is the blob's girth at ground level, not its
  // widest ring up at its middle, so nothing stops you short of the stone.
  const rock = (x, z, s, kind, o = {}) => {
    if (kind === "spire") k.prop("spire", x, z, { s, yaw: R() * 6, collide: { r: 0.95 * s, h: 3.0 * s }, ...o });
    else if (kind === "rock") k.prop("rock", x, z, { s, yaw: R() * 6, collide: { r: 1.25 * s, h: 2.2 * s }, ...o });
    else k.prop("rockLow", x, z, { s, yaw: R() * 6, collide: { r: 1.3 * s, h: 1.15 * s }, ...o });
  };

  k.mark("start", 2, 4, { yaw: Math.PI });      // by the reactor, facing south
  k.mark("lz", LZ.x, LZ.z);
  k.mark("gate", 0, 49);
  k.mark("rover", 8, 95);

  // ── The landing zone ──
  k.prop("pad", LZ.x, LZ.z, { flat: true });
  for (const [x, z] of [[-11, -6], [11, -6], [-11, 6], [11, 6]]) k.prop("padLight", LZ.x + x, LZ.z + z, { collide: { r: 0.25, h: 0.6 } });
  k.prop("crateStack", LZ.x + 14, LZ.z - 10, { yaw: 0.3, collide: { w: 2.4, d: 1.6, h: 1.25 }, flat: true });
  k.prop("crate", LZ.x - 15, LZ.z - 4, { yaw: 1.2, collide: { w: 1.2, d: 1.2, h: 1.1 } });
  k.mark("ammo1", LZ.x - 13, LZ.z - 2);

  // ── The road and the overturned rover ──
  k.prop("rover", 8, 95, { yaw: 2.2, collide: { w: 2.8, d: 5, h: 1.6 }, flat: true, opts: { flipped: true } });
  k.prop("barrier", -4, 72, { yaw: 0.2, collide: { w: 2.8, d: 0.6, h: 1.1 } });
  k.prop("barrier", 6, 64, { yaw: -0.3, collide: { w: 2.8, d: 0.6, h: 1.1 } });
  for (let i = 0; i < 8; i++) k.prop("roadLamp", (i % 2 ? 5 : -5), 136 - i * 11, { yaw: i % 2 ? Math.PI : 0, collide: { r: 0.2, h: 5 } });

  // ── Dustnest colony ──
  // Perimeter: an octagon of fence panels (high) and barriers (low, and a
  // swarmer hops them), gates at the four roads.
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
  k.prop("console", -21, -18.4, { y: 0.15, collide: { w: 2.6, d: 0.8, h: 1.1 } });
  k.prop("screenWall", -15, -19.6, { y: 0.15 });
  k.box(-11, -12, 4, 1.2, 0.95, steel);           // desk
  k.prop("rack", -9.6, -19.3, { y: 0.15, collide: { w: 2.2, d: 0.5, h: 2 }, opts: { gun: "launcher" } });
  k.light(-16, 3.6, -14, 0xbfe4ff, 12);

  // Generator shed: open to the south.
  k.building(21, -12, 12, 9, 4.6, { look: wallLook, roof: roofLook, doors: [{ side: "s", at: 0, w: 5, h: 3.8 }, { side: "w", at: 1.5, w: 2 }] });
  k.mark("generator", 21, -13.2);
  k.prop("generator", 21, -14.2, { y: 0.15, collide: { w: 5.4, d: 3.2, h: 2.6 } });
  k.light(21, 3.8, -12, 0xffc27a, 12);

  // Habitat modules.
  for (const [x, z, door] of [[-30, 20, "s"], [-12, 30, "s"], [18, 26, "s"], [34, 12, "w"], [-34, 0, "e"]]) {
    k.building(x, z, 9, 6.5, 3.2, { look: { ...wallLook, side: 0xb9bcba }, roof: { top: 0x6b7178, side: 0x5a6066, bevel: 0.1 }, doors: [{ side: door, at: 0, w: 1.8 }] });
    k.prop("hab", x, z, { y: k.h(x, z), opts: { door } });
  }

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
    if (STATION_SPOTS.some((st) => Math.hypot(st.x - x, st.z - z) < 6)) continue;
    k.prop(R() < 0.5 ? "crate" : "crateStack", x, z, { yaw: R() * 3, collide: R() < 0.5 ? { w: 1.2, d: 1.2, h: 1.1 } : { w: 2.4, d: 1.6, h: 1.25 }, flat: true });
  }
  for (const [x, z, yaw] of [[-6, 2, 0.1], [14, -2, 1.4], [-24, 10, 0.6], [4, -20, -0.4], [26, 4, 0.9], [-8, 38, 0.2], [8, 38, -0.2]]) k.prop("barrier", x, z, { yaw, collide: { w: 3.0, d: 0.6, h: 1.1 } });
  k.prop("truck", 28, 22, { yaw: 2.6, collide: { w: 3.4, d: 8, h: 3.2 }, flat: true });
  k.prop("waterTower", -36, -26, { collide: { r: 2.6, h: 9, y0: 4.5 } });
  for (const [x, z] of [[-34, -24], [-38, -24], [-34, -28], [-38, -28]]) k.world.cyl({ x, z, r: 0.25, y0: 0, y1: 4.6 });
  k.prop("dish", 0, -36, { collide: { r: 1.2, h: 3 } });
  for (const [x, z] of [[-8, 44], [8, -44], [-40, 8], [40, -8], [8, 8], [-20, -32], [24, 16], [-26, 30]]) { k.prop("lamp", x, z, { collide: { r: 0.18, h: 6 } }); }

  // ── The base: the reactor in the square, the defenders' posts, the stations spread round the colony ──
  k.mark("reactor", 0, -2);
  k.prop("reactor", 0, -2, { collide: { r: 2.4, h: 3.4 } });
  k.light(0, 4.2, -2, 0x8fe8ff, 16, 0.9);
  // Each station: the prop a step behind the mark facing it, a beacon pole
  // beside it in the station's colour, and a light under the beacon.
  for (const st of STATION_SPOTS) {
    k.mark(st.name, st.x, st.z);
    const bx = Math.sin(st.yaw), bz = Math.cos(st.yaw), rx = Math.cos(st.yaw), rz = -Math.sin(st.yaw);
    k.prop(st.model, st.x + bx * 1.3, st.z + bz * 1.3, { collide: st.collide, yaw: st.yaw });
    const px = st.x + bx * 1.3 + rx * 2.2, pz = st.z + bz * 1.3 + rz * 2.2;
    k.prop("beacon", px, pz, { collide: { r: 0.12, h: 6.3 }, opts: { c: st.c } });
    k.light(px, k.h(px, pz) + 5.4, pz, st.c, 9, 0.6);
  }
  k.mark("postKessler", -5, 10);
  k.mark("postRuiz", 12, -11);
  k.mark("postOkafor", -13, -11);
  k.mark("postExtra1", 12, 10);
  k.mark("postExtra2", -14, -2);
  [[16, -16], [-16, 16], [16, 16], [-16, -16]].forEach(([x, z], i) => k.mark(`turret${i + 1}`, x, z));
  for (const [x, z, yaw] of [[-5, 13, 0.1], [15, -8, 1.5], [-16, -6, 1.2], [5, 11, 0.2], [14, 6, 1.4]]) k.prop("barrier", x, z, { yaw, collide: { w: 3.0, d: 0.6, h: 1.1 } });

  // ── West: the trail and the relay ridge ──
  for (let i = 0; i < TRAIL.length - 1; i++) {
    // A boulder beside each leg of the trail (off to the side, never on it).
    const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1], L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L, side = i % 2 ? 1 : -1;
    rock((ax + bx) / 2 + nx * 7.5 * side, (az + bz) / 2 + nz * 7.5 * side, 1.2 + R() * 0.6, "rock");
  }
  const rt = { x: RIDGE.x - 4, z: RIDGE.z - 6 };
  k.mark("relay", rt.x + 3, rt.z + 4);
  k.prop("relayTower", rt.x, rt.z, { collide: { w: 3, d: 3, h: 22 } });
  k.prop("console", rt.x + 3, rt.z + 3.2, { collide: { w: 2.6, d: 0.8, h: 1.1 }, yaw: 0 });
  k.mark("ammo2", rt.x + 1, rt.z + 7);
  k.mark("laser", RIDGE.x + 8, RIDGE.z - 10);
  k.prop("deepcoreCrate", RIDGE.x + 8, RIDGE.z - 10.8, { collide: { w: 2.4, d: 1.4, h: 1.2 }, yaw: 0.2, flat: true });
  k.prop("shelter", RIDGE.x - 10, RIDGE.z + 8, { collide: { w: 4, d: 3, h: 2.6 }, flat: true });
  for (const [x, z] of [[6, 14], [-6, 12], [12, -6], [-12, -2], [0, -16]]) k.prop("barrier", RIDGE.x + x, RIDGE.z + z, { yaw: R() * 3, collide: { w: 3.0, d: 0.6, h: 1.1 } });
  k.light(rt.x, k.h(rt.x, rt.z) + 6, rt.z, 0xff5040, 10, 0.6);

  // ── North: the canyon and the bunker ──
  for (let i = 1; i < CANYON.length - 1; i++) {
    const [x, z] = CANYON[i];
    rock(x + (i % 2 ? 5 : -5), z + 2, 1.3 + R() * 0.7, "rock");
    rock(x + (i % 2 ? -4 : 4), z - 4, 1 + R() * 0.4, "low");
  }
  for (const [x, z] of [[-2, -68], [3, -86], [-6, -106], [-14, -132], [-26, -158]]) rock(x, z, 1.1, "low");
  for (const [x, z] of [[-9, -90], [10, -104], [-14, -126], [-36, -164]]) rock(x, z, 1, "spire");
  k.mark("ammo3", 2, -66);
  const by = k.building(BUNKER.x, BUNKER.z, 12, 9, 3.6, { look: { ...wallLook, side: 0xa7aaa8 }, roof: roofLook, doors: [{ side: "s", at: 0, w: 2.4 }] });
  k.mark("bunker", BUNKER.x, BUNKER.z + 5.6, { y: by });
  k.prop("bunkerDoor", BUNKER.x, BUNKER.z + 4.5, { y: by, opts: {} });
  k.light(BUNKER.x, by + 3.2, BUNKER.z + 5.5, 0x9fe0ff, 8, 0.7);
  k.mark("ammo4", BUNKER.x + 6, BUNKER.z + 8);

  // ── East: the road to the pit ──
  k.building(112, -28, 10, 7, 3.4, { look: wallLook, roof: roofLook, doors: [{ side: "s", at: 0, w: 2 }] });
  k.mark("ammo5", 112, -23.5);
  k.prop("excavator", PIT.x + 30, PIT.z - 26, { yaw: 2.4, collide: { w: 5, d: 8, h: 5 }, flat: true });
  k.prop("conveyor", PIT.x - 36, PIT.z + 28, { yaw: 0.8, collide: { w: 2, d: 14, h: 3, y0: 1.8 } });
  for (const [x, z] of [[90, 14], [96, -8], [86, 24]]) rock(x, z, 1 + R() * 0.5, "rock");

  // The pit: three vents, cover on the terraces, the floor for the boss.
  const vents = [[PIT.x - 24, PIT.z - 14], [PIT.x + 22, PIT.z + 18], [PIT.x + 8, PIT.z - 26]];
  vents.forEach(([x, z], i) => { k.mark(`vent${i + 1}`, x, z); k.prop("vent", x, z, { collide: { r: 1.9, h: 1.0 } }); });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2, r = 22 + (i % 3) * 7, x = PIT.x + Math.sin(a) * r, z = PIT.z + Math.cos(a) * r;
    if (vents.some(([vx, vz]) => Math.hypot(vx - x, vz - z) < 5)) continue;
    rock(x, z, 1 + R() * 0.4, i % 3 === 0 ? "rock" : "low");
  }
  k.mark("pit", PIT.x, PIT.z);
  for (const [x, z] of [[PIT.x - 8, PIT.z + 4], [PIT.x + 6, PIT.z - 6]]) k.prop("drillRig", x, z, { collide: { w: 2.4, d: 2.4, h: 4 }, yaw: R() * 3 });

  // ── North-east: the crater and the dropship wreck (a launcher in the wreckage) ──
  k.prop("dropship", WRECK.x, WRECK.z, { yaw: 0.7, collide: { w: 9.6, d: 11, h: 3.6 }, flat: true });
  k.prop("container", WRECK.x - 11, WRECK.z - 11, { yaw: 1.1, collide: { w: 6, d: 2.5, h: 2.6 }, opts: { c: 0x2f6b8a }, flat: true });
  k.prop("crateStack", WRECK.x + 9, WRECK.z + 6, { yaw: 2.1, collide: { w: 2.4, d: 1.6, h: 1.25 }, flat: true });
  k.mark("launcher", WRECK.x - 8, WRECK.z - 1);
  k.mark("ammo6", WRECK.x + 6, WRECK.z + 9);
  k.light(WRECK.x, k.h(WRECK.x, WRECK.z) + 3.5, WRECK.z, 0xff6a3a, 10, 0.5);

  // ── South-east: the dry lake and the abandoned survey camp on it ──
  k.prop("drillRig", CAMP.x, CAMP.z, { collide: { w: 2.4, d: 2.4, h: 4 }, yaw: 0.4 });
  k.prop("truck", CAMP.x + 8, CAMP.z + 3, { yaw: 0.4, collide: { w: 3.4, d: 8, h: 3.2 }, flat: true });
  k.prop("container", CAMP.x - 7, CAMP.z + 7, { yaw: 2.0, collide: { w: 6, d: 2.5, h: 2.6 }, opts: { c: 0x6f7a3a }, flat: true });
  k.prop("container", CAMP.x + 5, CAMP.z - 8, { yaw: 1.0, collide: { w: 6, d: 2.5, h: 2.6 }, opts: { c: 0xb5562c }, flat: true });
  k.prop("crateStack", CAMP.x - 4, CAMP.z - 5, { yaw: 0.6, collide: { w: 2.4, d: 1.6, h: 1.25 }, flat: true });
  k.prop("shelter", CAMP.x - 12, CAMP.z - 2, { collide: { w: 4, d: 3, h: 2.6 }, flat: true });
  k.prop("lamp", CAMP.x + 3, CAMP.z - 3, { collide: { r: 0.18, h: 6 } });
  k.mark("ammo7", CAMP.x, CAMP.z + 5);
  for (const [x, z] of [[-6, -11], [10, -3], [4, 10]]) k.prop("barrier", CAMP.x + x, CAMP.z + z, { yaw: R() * 3, collide: { w: 3.0, d: 0.6, h: 1.1 } });

  // ── South-west: the dunes, a small crater with a rover in it, a shelter ──
  const sc = CRATERS[1];
  k.prop("rover", sc[0] + 2, sc[1] - 2, { yaw: 1.1, collide: { w: 2.8, d: 5, h: 1.6 }, flat: true, opts: { flipped: true } });
  k.mark("ammo8", sc[0] - 4, sc[1] + 6);
  k.prop("shelter", -96, 100, { collide: { w: 4, d: 3, h: 2.6 }, flat: true });
  k.prop("crate", -93, 103, { yaw: 0.4, collide: { w: 1.2, d: 1.2, h: 1.1 } });
  // Caches elsewhere: by the east road, west of the colony, and on the two mesas with a trail.
  k.mark("ammo9", 60, 32);
  k.mark("ammo10", -60, -40);
  k.mark("ammo11", MESAS[0][0], MESAS[0][1]);
  k.mark("ammo12", MESAS[1][0], MESAS[1][1]);

  // Burrows: the ring round the base is where the waves come up; the far ones feed the patrols.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3, r = 74 + (i % 2) * 8;
    let x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.abs(x) < 8 && z > 60) x += 12;                     // not on the south road
    k.burrow(`ring${i + 1}`, x, z);
  }
  [[PIT.x - 12, PIT.z + 10], [PIT.x + 12, PIT.z + 8], [PIT.x - 4, PIT.z - 12], [PIT.x + 10, PIT.z - 10]].forEach(([x, z], i) => k.burrow(`pit${i + 1}`, x, z));
  [[-118, 14], [-140, -6]].forEach(([x, z], i) => k.burrow(`west${i + 1}`, x, z));
  [[-4, -92], [-24, -150]].forEach(([x, z], i) => k.burrow(`can${i + 1}`, x, z));
  [[78, -108], [112, -142]].forEach(([x, z], i) => k.burrow(`crater${i + 1}`, x, z));
  [[92, 108], [138, 142]].forEach(([x, z], i) => k.burrow(`lake${i + 1}`, x, z));
  [[-110, 92], [-62, 142]].forEach(([x, z], i) => k.burrow(`dune${i + 1}`, x, z));
  [[62, 142], [-120, -110], [150, -140]].forEach(([x, z], i) => k.burrow(`far${i + 1}`, x, z));

  // Scenery out on the dust: rock clusters, lines of boulders, monoliths, pebbles.
  const clear = (x, z, m = 0) => {
    if (Math.abs(x) > 196 || Math.abs(z) > 196) return false;
    if (Math.hypot(x, z) < 54 + m || Math.hypot(x - LZ.x, z - LZ.z) < 24 || Math.hypot(x - PIT.x, z - PIT.z) < PIT.r + 4) return false;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r - 3 || Math.hypot(x - WRECK.x, z - WRECK.z) < 14 || Math.hypot(x - BUNKER.x, z - BUNKER.z) < 12) return false;
    if (Math.hypot(x - CRATERS[1][0], z - CRATERS[1][1]) < 8) return false;
    const [rd] = polyDist(x, z, ROAD), [td] = polyDist(x, z, TRAIL), [cd] = polyDist(x, z, CANYON), [ed] = polyDist(x, z, EAST_ROAD);
    if (rd < 8 || td < 7 || ed < 7 || (z < -56 && cd < 10)) return false;
    for (const t of MESA_TRAILS) { const [d] = polyDist(x, z, t.pts); if (d < 6) return false; }
    for (const m2 of k.marks ? Object.values(k.marks) : []) if (m2.x !== undefined && Math.hypot(m2.x - x, m2.z - z) < 3) return false;
    for (const h of k.burrows) if (Math.hypot(h.x - x, h.z - z) < 4) return false;
    return true;
  };
  const scatter = (x, z, s, kind) => { if (clear(x, z)) rock(x, z, s, kind); };
  const SP = 430;
  for (let i = 0; i < 150; i++) {                      // clusters
    const cx = (R() - 0.5) * SP, cz = (R() - 0.5) * SP, n = 3 + Math.floor(R() * 5), big = R() < 0.35;
    if (!clear(cx, cz, 6)) continue;
    for (let j = 0; j < n; j++) {
      const a = R() * Math.PI * 2, r = 1.5 + R() * 6;
      scatter(cx + Math.sin(a) * r, cz + Math.cos(a) * r, (big ? 1.3 : 0.7) + R() * 1.3, big && R() < 0.5 ? "rock" : "low");
    }
    if (big && R() < 0.5) scatter(cx, cz, 1.6 + R() * 1.4, "spire");
  }
  for (let i = 0; i < 36; i++) {                       // walls: a line of boulders
    const cx = (R() - 0.5) * SP, cz = (R() - 0.5) * SP, a = R() * Math.PI, len = 10 + R() * 18;
    if (!clear(cx, cz, 8)) continue;
    for (let t = -len / 2; t <= len / 2; t += 2.6) scatter(cx + Math.sin(a) * t + (R() - 0.5), cz + Math.cos(a) * t + (R() - 0.5), 1.1 + R() * 0.8, R() < 0.6 ? "rock" : "low");
  }
  for (let i = 0; i < 28; i++) scatter((R() - 0.5) * SP, (R() - 0.5) * SP, 2.2 + R() * 1.6, "spire");   // monoliths
  for (let i = 0; i < 260; i++) scatter((R() - 0.5) * (SP + 20), (R() - 0.5) * (SP + 20), 0.6 + R() * 1.2, R() < 0.25 ? "rock" : "low");
  // Boulders on the mesas' rims (not on the trails) and on the craters' rims.
  for (const [mx, mz, mr] of MESAS) for (let i = 0; i < 7; i++) { const a = R() * Math.PI * 2; scatter(mx + Math.sin(a) * (mr - 1), mz + Math.cos(a) * (mr - 1), 0.9 + R() * 1.1, "low"); }
  for (const [cx, cz, cr] of CRATERS) for (let i = 0; i < 10; i++) { const a = R() * Math.PI * 2, r = cr * (0.95 + R() * 0.25); scatter(cx + Math.sin(a) * r, cz + Math.cos(a) * r, 0.9 + R() * 1.4, R() < 0.3 ? "rock" : "low"); }
  for (let i = 0; i < 100; i++) {
    const x = (R() - 0.5) * SP, z = (R() - 0.5) * SP;
    if (Math.hypot(x, z) < 54 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r) continue;
    k.prop("pebbles", x, z, { yaw: R() * 6, s: 0.7 + R() * 0.8 });
  }
  return k;
}
