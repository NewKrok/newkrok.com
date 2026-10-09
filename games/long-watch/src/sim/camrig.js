import { CAMERA as C, lerp } from "../config.js";

// ── The over-the-shoulder camera, in the sim ─────────────────────────────
// Shots aim where the camera looks, so the camera's place is worked out
// here, not only in the renderer: a pivot over the ranger's shoulder, the
// camera pulled back along the view and pushed in front of any wall that
// would come between them.

const _h = {};

export function forward(yaw, pitch, out = [0, 0, 0]) {
  const cp = Math.cos(pitch);
  out[0] = -Math.sin(yaw) * cp; out[1] = Math.sin(pitch); out[2] = -Math.cos(yaw) * cp;
  return out;
}

// p: the ranger; k: 0 hip … 1 aiming (smoothed); side: −1 / +1 shoulder.
// Returns { x, y, z, dx, dy, dz } (position and unit view direction).
export function cameraRig(space, p, x, y, z, out = {}) {
  const k = p.aimK, side = p.shoulder;
  const crouchK = p.crouchK;
  const h = lerp(C.height, C.crouchHeight, crouchK) + (p.peekUp ?? 0);
  const dist = lerp(C.dist, C.aimDist, k), off = lerp(C.side, C.aimSide, k) * side;
  const yaw = p.yaw, pitch = p.pitch;
  const [dx, dy, dz] = forward(yaw, pitch);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  // Pivot: over the shoulder (checked against walls first, so it never
  // pokes through the one you lean on).
  const px = x + (p.peekX ?? 0), pz = z + (p.peekZ ?? 0), py = y + h;
  let sx = rx * off, sz = rz * off;
  const sl = Math.abs(off);
  if (sl > 0.01) {
    const hs = space.ray(px, py, pz, sx / sl, 0, sz / sl, sl + 0.25, _h);
    if (hs) { const f = Math.max(0, hs.t - 0.25) / sl; sx *= f; sz *= f; }
  }
  const qx = px + sx, qz = pz + sz;
  let t = dist;
  const hit = space.ray(qx, py, qz, -dx, -dy, -dz, dist + 0.3, _h);
  if (hit) t = Math.max(0.35, hit.t - 0.3);
  out.x = qx - dx * t; out.y = py - dy * t; out.z = qz - dz * t;
  // Never under the ground.
  const g = space.terrain.height(out.x, out.z) + 0.3;
  if (out.y < g) out.y = g;
  out.dx = dx; out.dy = dy; out.dz = dz;
  out.pivotX = qx; out.pivotY = py; out.pivotZ = qz;
  return out;
}
