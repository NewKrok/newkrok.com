// ── Deterministic trigonometry ───────────────────────────────────────────
// Math.sin, cos & co. are "implementation-approximated" in JavaScript: two
// engines (even two V8 versions: Node 22 and Chrome 141) return different
// last bits, and the physics then drifts apart within a second. The
// leaderboard replays a run on the server and needs the very same result
// everywhere, so the functions the sim and nape-js use are replaced here
// by ones built only from + − × ÷ and sqrt, which IEEE 754 fixes to the
// bit on every engine. Coefficients and structure follow musl / fdlibm.
//
// Installed globally (nape-js calls Math.sin itself) before any level is
// built: config.js imports this module first. Accurate to about 1 ulp.

const PIO2_1 = 1.5707963267341256;  // first 33 bits of π/2
const PIO2_2 = 6.077100506303966e-11;  // next 33 bits
const PIO2_2T = 2.0222662487959506e-21; // π/2 − (PIO2_1 + PIO2_2)
const INV_PIO2 = 0.6366197723675814;
const PI = 3.141592653589793, PI_LO = 1.2246467991473532e-16;
const PIO2_HI = 1.5707963267948966;

const S1 = -0.16666666666666632, S2 = 0.00833333333332249, S3 = -0.0001984126982985795,
  S4 = 0.0000027557313707070068, S5 = -2.5050760253406863e-8, S6 = 1.58969099521155e-10;
const C1 = 0.0416666666666666, C2 = -0.001388888888887411, C3 = 0.00002480158728947673,
  C4 = -2.7557314351390663e-7, C5 = 2.087572321298175e-9, C6 = -1.1359647557788195e-11;

// sin / cos of x + y on [−π/4, π/4] (y: the tail of the reduced argument).
function kSin(x, y) {
  const z = x * x, w = z * z, v = z * x;
  const r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6);
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}
function kCos(x, y) {
  const z = x * x, w = z * z;
  const r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
  const hz = 0.5 * z, u = 1 - hz;
  return u + (((1 - u) - hz) + (z * r - x * y));
}

// x = n·π/2 + (y0 + y1), |y0 + y1| ≤ π/4. n·PIO2_1 is exact while |n| < 2^20;
// beyond that (a rig spun a million radians) it stays deterministic, only
// less precise.
let y0 = 0, y1 = 0;
function reduce(x) {
  const n = Math.round(x * INV_PIO2);
  const r = x - n * PIO2_1;
  const w = n * PIO2_2;
  const t = r - w;
  const tail = n * PIO2_2T - ((r - t) - w);
  y0 = t - tail;
  y1 = (t - y0) - tail;
  return n;
}

export function sin(x) {
  if (!(x === x) || x === Infinity || x === -Infinity) return NaN;
  if (Math.abs(x) <= 0.7853981633974483) return Math.abs(x) < 7.450580596923828e-9 ? x : kSin(x, 0);
  const n = reduce(x) & 3;
  return n === 0 ? kSin(y0, y1) : n === 1 ? kCos(y0, y1) : n === 2 ? -kSin(y0, y1) : -kCos(y0, y1);
}
export function cos(x) {
  if (!(x === x) || x === Infinity || x === -Infinity) return NaN;
  if (Math.abs(x) <= 0.7853981633974483) return Math.abs(x) < 7.450580596923828e-9 ? 1 : kCos(x, 0);
  const n = reduce(x) & 3;
  return n === 0 ? kCos(y0, y1) : n === 1 ? -kSin(y0, y1) : n === 2 ? -kCos(y0, y1) : kSin(y0, y1);
}
export const tan = (x) => sin(x) / cos(x);

const ATAN_HI = [0.4636476090008061, 0.7853981633974483, 0.982793723247329, 1.5707963267948966];
const ATAN_LO = [2.2698777452961687e-17, 3.061616997868383e-17, 1.3903311031230998e-17, 6.123233995736766e-17];
const AT = [0.3333333333333293, -0.19999999999876483, 0.14285714272503466, -0.11111110405462356,
  0.09090887133436507, -0.0769187620504483, 0.06661073137387531, -0.058335701337905735,
  0.049768779946159324, -0.036531572744216916, 0.016285820115365782];

export function atan(x) {
  if (!(x === x)) return NaN;
  const neg = x < 0;
  let ax = neg ? -x : x;
  if (ax >= 7.378697629483821e19) return neg ? -PIO2_HI - ATAN_LO[3] : PIO2_HI + ATAN_LO[3];
  let id = -1;
  if (ax < 0.4375) {
    if (ax < 3.725290298461914e-9) return x;
  } else if (ax < 1.1875) {
    if (ax < 0.6875) { id = 0; ax = (2 * ax - 1) / (2 + ax); } else { id = 1; ax = (ax - 1) / (ax + 1); }
  } else if (ax < 2.4375) { id = 2; ax = (ax - 1.5) / (1 + 1.5 * ax); } else { id = 3; ax = -1 / ax; }
  const z = ax * ax, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return neg ? -(ax - ax * (s1 + s2)) : ax - ax * (s1 + s2);
  const r = ATAN_HI[id] - ((ax * (s1 + s2) - ATAN_LO[id]) - ax);
  return neg ? -r : r;
}

const negative = (v) => v < 0 || (v === 0 && 1 / v < 0);
export function atan2(y, x) {
  if (!(x === x) || !(y === y)) return NaN;
  if (x === 1) return atan(y);
  const m = (negative(y) ? 1 : 0) | (negative(x) ? 2 : 0);
  if (y === 0) return m === 0 || m === 1 ? y : m === 2 ? PI : -PI;
  if (x === 0) return m & 1 ? -PIO2_HI : PIO2_HI;
  if (x === Infinity || x === -Infinity) {
    if (y === Infinity || y === -Infinity) {
      const q = [PI / 4, -PI / 4, 3 * PI / 4, -3 * PI / 4];
      return q[m];
    }
    return [0, -0, PI, -PI][m];
  }
  if (y === Infinity || y === -Infinity) return m & 1 ? -PIO2_HI : PIO2_HI;
  const q = Math.abs(y / x);
  let z;
  if (q > 1.8446744073709552e19) z = PIO2_HI + 0.5 * PI_LO;
  else if (m & 2 && q < 5.421010862427522e-20) z = 0;
  else z = atan(q);
  return m === 0 ? z : m === 1 ? -z : m === 2 ? PI - (z - PI_LO) : (z - PI_LO) - PI;
}

export const asin = (x) => (x === 0 ? x : atan2(x, Math.sqrt((1 - x) * (1 + x))));
export const acos = (x) => 2 * atan2(Math.sqrt(1 - x), Math.sqrt(1 + x));

export function hypot(...a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const v = +a[i];
    if (v === Infinity || v === -Infinity) return Infinity;
    s += v * v;
  }
  return Math.sqrt(s);
}

// A two-argument hypot is by far the most common call; keep it cheap.
function hypot2(x, y) {
  if (arguments.length !== 2) return hypot(...arguments);
  return x === Infinity || x === -Infinity || y === Infinity || y === -Infinity ? Infinity : Math.sqrt(x * x + y * y);
}

if (!Math.__det) {
  Object.assign(Math, { sin, cos, tan, atan, atan2, asin, acos, hypot: hypot2 });
  Object.defineProperty(Math, "__det", { value: true });
}
