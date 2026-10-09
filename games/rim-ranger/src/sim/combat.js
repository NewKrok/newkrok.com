// ── Shots, beams and blasts ──────────────────────────────────────────────
// Shared by the ranger and the ally. Hitscan bullets test the bugs' hit
// spheres and the solid world and stop at whichever comes first. Every
// shot leaves an event for the renderer and the sound (tracer, spark,
// splat).

const _h = {};

// Ray against a sphere: the entry distance or -1.
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r, maxT) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tc = lx * dx + ly * dy + lz * dz;
  if (tc < 0) return -1;
  const d2 = lx * lx + ly * ly + lz * lz - tc * tc;
  if (d2 > r * r) return -1;
  const t = tc - Math.sqrt(r * r - d2);
  return t >= 0 && t <= maxT ? t : t < 0 && tc <= maxT ? 0 : -1;
}

// The first bug along the ray: { bug, part, t } or null.
export function rayBugs(run, ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT, hit = null, part = null;
  for (const b of run.bugs) {
    if (!b.alive || b.hidden) continue;
    const s = b.spheres();
    // Cheap reject: the bug's bounding sphere.
    if (raySphere(ox, oy, oz, dx, dy, dz, b.x, b.y + b.def.height * 0.5, b.z, b.boundR, best) < 0) continue;
    for (let i = 0; i < s.length; i += 5) {
      const t = raySphere(ox, oy, oz, dx, dy, dz, s[i], s[i + 1], s[i + 2], s[i + 3], best);
      if (t >= 0 && t < best) { best = t; hit = b; part = s[i + 4]; }
    }
  }
  return hit ? { bug: hit, part, t: best } : null;
}

// What a ray from o along d meets first: { t, bug?, part?, nx, ny, nz }.
export function trace(run, ox, oy, oz, dx, dy, dz, maxT) {
  const w = run.space.ray(ox, oy, oz, dx, dy, dz, maxT, _h);
  const wt = w ? w.t : maxT;
  const b = rayBugs(run, ox, oy, oz, dx, dy, dz, wt);
  if (b) return { t: b.t, bug: b.bug, part: b.part, nx: -dx, ny: -dy, nz: -dz };
  if (w) return { t: w.t, bug: null, nx: w.nx, ny: w.ny, nz: w.nz, solid: true };
  return { t: maxT, bug: null, nx: 0, ny: 1, nz: 0, solid: false };
}

// A bullet: damage the first thing hit, leave a tracer and an impact.
export function bullet(run, src, ox, oy, oz, dx, dy, dz, range, dmg, color) {
  const h = trace(run, ox, oy, oz, dx, dy, dz, range);
  const ex = ox + dx * h.t, ey = oy + dy * h.t, ez = oz + dz * h.t;
  let kind = h.solid ? "spark" : null;
  if (h.bug) { kind = h.bug.damage(run, dmg, src, h.part, dx, dz) ? "armor" : "splat"; if (src.kind === "player") src.lastHit = h.bug; }
  run.fx({ type: "tracer", x0: ox, y0: oy, z0: oz, x1: ex, y1: ey, z1: ez, color, hit: kind, nx: h.nx, ny: h.ny, nz: h.nz, src: src.kind });
  return h;
}

// A blast: damage falls off with distance and needs a clear line to the
// centre (cover protects). Hurts the ranger a little too.
export function blast(run, src, x, y, z, radius, dmg, noise = 40) {
  for (const b of run.bugs) {
    if (!b.alive || b.hidden) continue;
    const d = Math.hypot(b.x - x, b.y + b.def.height * 0.5 - y, b.z - z) - b.def.radius;
    if (d > radius) continue;
    if (!run.space.clear(x, y + 0.2, z, b.x, b.y + b.def.height * 0.6, b.z)) continue;
    const k = 1 - Math.max(0, d) / radius;
    b.damage(run, dmg * (0.35 + 0.65 * k), src, "blast", b.x - x, b.z - z);
  }
  const p = run.player;
  const dp = Math.hypot(p.body.x - x, p.body.y + 0.9 - y, p.body.z - z);
  if (dp < radius * 0.8 && run.space.clear(x, y + 0.2, z, p.body.x, p.body.y + 0.9, p.body.z)) p.hurt(run, 26 * (1 - dp / (radius * 0.8)), x, z, "blast");
  run.fx({ type: "blast", x, y, z, r: radius });
  run.noise(x, z, noise, src, true);
}
