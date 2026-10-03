import * as T from "three";
import { GEO } from "./batch.js";
import { glowTexture } from "./textures.js";
import { gemTier } from "../sim/core.js";

// ── Effects in 3D ────────────────────────────────────────────────────────
// Gems, projectiles, pickups and particles are instanced; arcs, rings,
// lightning, chains and pools come from small pools of meshes. Everything
// bright is unlit and additive so the bloom pass picks it up.

const add = (o) => new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, ...o });
const GEM_COLORS = [0x58a6ff, 0x3fb950, 0xf85149, 0xffd166];
const PICK = { bread: 0xe0a060, magnet: 0x79c0ff, flare: 0xffd166, hourglass: 0x9fd8ff, chest: 0xffd166, ember: 0xffa040 };

function inst(scene, geo, mat, cap, color = true) {
  const m = new T.InstancedMesh(geo, mat, cap);
  m.frustumCulled = false;
  m.count = 0;
  if (color) { const c = new T.Color(1, 1, 1); for (let i = 0; i < cap; i++) m.setColorAt(i, c); }
  scene.add(m);
  return m;
}

// Arc sectors, cached by their width.
const _arcs = new Map();
function arcGeo(w) {
  const key = Math.round(w * 100);
  let g = _arcs.get(key);
  if (!g) { g = new T.RingGeometry(0.25, 1, 20, 1, -w, w * 2); _arcs.set(key, g); }
  return g;
}

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.d = new T.Object3D();
    this.c = new T.Color();
    const glow = glowTexture();
    this.gems = inst(scene, GEO.gem, new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3 }), 460);
    this.gemGlow = inst(scene, GEO.plane, add({ map: glow, opacity: 0.55 }), 460);
    this.bolts = inst(scene, GEO.box, add({ color: 0xcfe8ff }), 160, false);
    this.boltGlow = inst(scene, GEO.plane, add({ map: glow, color: 0x7ab8ff, opacity: 0.8 }), 160, false);
    this.knives = inst(scene, GEO.coneFwd, new T.MeshStandardMaterial({ color: 0xe6edf3, metalness: 0.9, roughness: 0.25, emissive: 0x404850 }), 200, false);
    this.spits = inst(scene, GEO.sph, add({}), 260);
    this.spitGlow = inst(scene, GEO.plane, add({ map: glow, opacity: 0.7 }), 260);
    this.arrows = inst(scene, GEO.box, new T.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.6 }), 120, false);
    this.arrowTips = inst(scene, GEO.coneFwd, new T.MeshStandardMaterial({ color: 0x9a9aa4, metalness: 0.7, roughness: 0.3 }), 120, false);
    this.spades = inst(scene, GEO.box, new T.MeshStandardMaterial({ color: 0xc9d4e0, metalness: 0.85, roughness: 0.3, emissive: 0x303a48 }), 12, false);
    this.spadeGlow = inst(scene, GEO.plane, add({ map: glow, color: 0xb0c8ff, opacity: 0.45 }), 12, false);
    this.parts = inst(scene, GEO.box, add({}), 640);
    // Wisps: a hot core in a soft flame glow.
    this.wisps = inst(scene, GEO.sph, add({ color: 0xfff0c0 }), 120, false);
    this.wispGlow = inst(scene, GEO.plane, add({ map: glow, color: 0xff9a40, opacity: 0.9 }), 120, false);
    // Sickles: a curved blade that spins.
    this.sickles = inst(scene, new T.TorusGeometry(1, 0.13, 3, 14, Math.PI * 1.25), new T.MeshStandardMaterial({ color: 0xd8e0e8, metalness: 0.85, roughness: 0.25, emissive: 0x303844, flatShading: true }), 40, false);
    this.sickleHafts = inst(scene, GEO.box, new T.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.7 }), 40, false);
    // The censer and its chain.
    const brass = new T.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.8, roughness: 0.3, flatShading: true });
    this.censers = inst(scene, new T.IcosahedronGeometry(1, 1), brass, 4, false);
    this.censerCaps = inst(scene, GEO.cone, brass, 4, false);
    this.censerGlow = inst(scene, GEO.plane, add({ map: glow, color: 0xffa050, opacity: 0.7 }), 4, false);
    this.links = inst(scene, GEO.torus, new T.MeshStandardMaterial({ color: 0x6a6070, metalness: 0.8, roughness: 0.4 }), 80, false);
    // Ravens: body, head, beak and two flapping wings.
    const black = new T.MeshLambertMaterial({ color: 0x1a1a24, flatShading: true });
    this.ravenBody = inst(scene, new T.IcosahedronGeometry(1, 0), black, 6, false);
    this.ravenWing = inst(scene, new T.BoxGeometry(1, 1, 1).translate(0.5, 0, 0), black, 12, false);
    this.ravenBeak = inst(scene, GEO.coneFwd, new T.MeshLambertMaterial({ color: 0x8a8070 }), 6, false);
    this.ravenEye = inst(scene, GEO.sph, new T.MeshBasicMaterial({ color: 0xffd060 }), 12, false);
    this.globs = inst(scene, GEO.sph, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), 40);
    this.pools = inst(scene, GEO.disc, add({ opacity: 0.35 }), 80);
    this.poolRings = inst(scene, GEO.thinRing, add({ opacity: 0.6 }), 80);
    this.scythes = inst(scene, new T.TorusGeometry(1, 0.12, 4, 12, Math.PI * 1.2), add({ color: 0xd0d8ff }), 6, false);
    this.pick = {};
    const pg = {
      bread: [new T.SphereGeometry(1, 8, 6).scale(1.2, 0.8, 0.6), new T.MeshStandardMaterial({ color: 0xc8904a, roughness: 0.7 })],
      magnet: [new T.TorusGeometry(1, 0.35, 6, 12, Math.PI), new T.MeshStandardMaterial({ color: 0xd84a4a, metalness: 0.6, roughness: 0.3 })],
      flare: [new T.OctahedronGeometry(1, 0), new T.MeshBasicMaterial({ color: 0xfff0a0 })],
      hourglass: [new T.CylinderGeometry(1, 0.2, 1, 8).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: 0x9fd8ff, metalness: 0.5, roughness: 0.2 })],
      chest: [new T.BoxGeometry(1.4, 1, 1), new T.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.6, emissive: 0x3a2008 })],
      ember: [new T.CylinderGeometry(1, 1, 0.3, 10).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: 0xffb040 })],
    };
    for (const [k, [g, m]] of Object.entries(pg)) this.pick[k] = inst(scene, g, m, k === "ember" ? 120 : 30, false);
    this.pickGlow = inst(scene, GEO.plane, add({ map: glow, opacity: 0.6 }), 240);
    // Pools of one-off meshes.
    this.arcPool = []; this.ringPool = []; this.linePool = []; this.warnPool = [];
    // Hero effects.
    this.aura = new T.Mesh(GEO.ring, add({ color: 0xe0c070, opacity: 0.5, side: T.DoubleSide }));
    this.auraFill = new T.Mesh(GEO.disc, add({ color: 0xe0c070, opacity: 0.06 }));
    this.dome = new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), add({ color: 0xffe9a8, opacity: 0.18, side: T.DoubleSide }));
    // The Pedlar's ward: a pale blue bubble.
    this.ward = new T.Mesh(new T.SphereGeometry(1, 20, 12), add({ color: 0x9fd8ff, opacity: 0.16, side: T.DoubleSide }));
    for (const m of [this.aura, this.auraFill, this.dome, this.ward]) { m.visible = false; scene.add(m); }
    // A soft gold ring under the hero, so they never get lost in the crowd.
    this.heroRing = new T.Mesh(GEO.thinRing, add({ color: 0xffc861, opacity: 0.55 }));
    scene.add(this.heroRing);
    this.flashLight = new T.PointLight(0xfff2b0, 0, 900, 1.5);
    scene.add(this.flashLight);
    this.bossLight = new T.PointLight(0xc0c8ff, 0, 520, 2);
    scene.add(this.bossLight);
  }

  set(im, i, x, y, z, rz, sx, sy, sz, rx = 0) {
    this.d.position.set(x, -y, z);
    this.d.rotation.set(rx, 0, rz);
    this.d.scale.set(sx, sy, sz);
    this.d.updateMatrix();
    im.setMatrixAt(i, this.d.matrix);
  }
  // Camera-facing glow quad (the camera only pitches, so a fixed tilt works).
  glow(im, i, x, y, z, s) {
    this.d.position.set(x, -y, z);
    this.d.rotation.set(this.camPitch, 0, 0);
    this.d.scale.set(s, s, s);
    this.d.updateMatrix();
    im.setMatrixAt(i, this.d.matrix);
  }
  color(im, i, hex) { this.c.setHex(hex); im.setColorAt(i, this.c); }
  done(im, n) { im.count = n; im.visible = n > 0; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }

  sync(R, time, camPitch, view, calm = false) {
    this.camPitch = camPitch;
    this.calm = calm;
    const inV = (x, y, pad = 60) => x > view.x0 - pad && x < view.x1 + pad && y > view.y0 - pad && y < view.y1 + pad;
    // Gems.
    let n = 0;
    for (const g of R.gems) {
      if (n >= 460) break;
      if (!inV(g.x, g.y)) continue;
      const tier = gemTier(g.xp), s = 4 + tier * 1.6;
      const z = 7 + Math.sin(g.bob + time * 5) * 2;
      this.set(this.gems, n, g.x, g.y, z, time * 2 + g.bob, s * 0.7, s * 0.7, s);
      this.color(this.gems, n, GEM_COLORS[tier]);
      this.glow(this.gemGlow, n, g.x, g.y, z, s * 5);
      this.color(this.gemGlow, n, GEM_COLORS[tier]);
      n++;
    }
    this.done(this.gems, n); this.done(this.gemGlow, n);
    // Pickups.
    const cnt = {};
    let ng = 0;
    for (const p of R.pickups) {
      if (!inV(p.x, p.y)) continue;
      const im = this.pick[p.kind];
      const i = cnt[p.kind] = (cnt[p.kind] ?? -1) + 1;
      if (i >= im.instanceMatrix.count) continue;
      const bob = Math.sin(p.t * 0.08) * 3;
      const z = (p.kind === "chest" ? 10 : 12) + bob;
      const s = p.kind === "chest" ? 14 : p.kind === "ember" ? 5 + Math.min(4, (p.v || 1) * 0.3) : 8;
      const rz = p.kind === "chest" ? 0.3 : time * 2 + p.x;
      this.set(im, i, p.x, p.y, z, rz, s, s, s, p.kind === "ember" ? Math.PI / 2 : p.kind === "magnet" ? -Math.PI / 2 : 0);
      if (ng < 240) { this.glow(this.pickGlow, ng, p.x, p.y, z, p.kind === "chest" ? (p.relic ? 130 : 90) : p.kind === "ember" ? 26 : 44); this.color(this.pickGlow, ng, p.relic ? 0xb07aff : PICK[p.kind]); ng++; }
    }
    for (const k of Object.keys(this.pick)) this.done(this.pick[k], (cnt[k] ?? -1) + 1);
    this.done(this.pickGlow, ng);
    // Bolts and knives.
    let nb = 0, nk = 0, nb2 = 0, ns2 = 0;
    for (const s of R.shots) {
      if (!s.body) continue;
      const p = s.body.position;
      if (s.kind === "wisp") {
        if (nb2 >= 120) continue;
        const f = 1 + Math.sin(time * 30 + nb2) * 0.15;
        this.set(this.wisps, nb2, p.x, p.y, 18, 0, 3.4 * f, 3.4 * f, 4.2 * f);
        this.glow(this.wispGlow, nb2, p.x, p.y, 18, 34 * f);
        nb2++;
        continue;
      }
      if (s.kind === "sickle") {
        if (ns2 >= 40) continue;
        const spin = -time * 16 - ns2, sc = s.r * 1.25;
        this.set(this.sickles, ns2, p.x, p.y, 16, spin, sc, sc, sc);
        this.set(this.sickleHafts, ns2, p.x - Math.cos(-spin) * sc * 0.2, p.y + Math.sin(-spin) * sc * 0.2, 16, spin + Math.PI / 2, 2.4, sc * 0.9, 2.4);
        ns2++;
        continue;
      }
      if (s.kind === "bolt") {
        if (nb >= 160) continue;
        const big = s.blast ? 1.5 : 1;
        this.set(this.bolts, nb, p.x, p.y, 16, -s.angle, 22 * big, 3 * big, 3 * big);
        this.glow(this.boltGlow, nb, p.x, p.y, 16, 30 * big);
        nb++;
      } else if (nk < 200) {
        this.set(this.knives, nk, p.x, p.y, 14, -s.angle - Math.PI / 2, 2.4, 12, 1.4);
        nk++;
      }
    }
    this.done(this.bolts, nb); this.done(this.boltGlow, nb); this.done(this.knives, nk);
    this.done(this.wisps, nb2); this.done(this.wispGlow, nb2); this.done(this.sickles, ns2); this.done(this.sickleHafts, ns2);
    // The censer on its chain.
    let nc = 0, nk2 = 0;
    const hp = R.hero.body.position;
    for (const c of R.censers) {
      if (c.hidden || nc >= 4) continue;
      const p = c.body.position;
      const swing = Math.sin(time * 9 + nc) * 0.3;
      this.set(this.censers, nc, p.x, p.y, 20, time * 3, 10, 10, 9);
      this.set(this.censerCaps, nc, p.x, p.y, 30, 0, 7, 7, 7);
      this.glow(this.censerGlow, nc, p.x, p.y, 22, 46);
      const L = Math.hypot(p.x - hp.x, p.y - hp.y), n = Math.min(18, Math.max(4, Math.round(L / 9)));
      for (let k = 1; k < n && nk2 < 80; k++) {
        const t = k / n, x = hp.x + (p.x - hp.x) * t, y = hp.y + (p.y - hp.y) * t, z = 26 - Math.sin(t * Math.PI) * 4;
        this.set(this.links, nk2, x, y, z, -Math.atan2(p.y - hp.y, p.x - hp.x), 3.2, 3.2, 3.2, k % 2 ? Math.PI / 2 + swing : swing);
        nk2++;
      }
      nc++;
    }
    this.done(this.censers, nc); this.done(this.censerCaps, nc); this.done(this.censerGlow, nc); this.done(this.links, nk2);
    // Ravens.
    let nr = 0;
    for (const rv of R.ravens) {
      if (nr >= 6) break;
      const f = rv.face ?? 0, flap = rv.state === "dive" ? -0.9 : Math.sin(rv.fp) * 0.8, z = rv.z;
      this.d.position.set(rv.x, -rv.y, z); this.d.rotation.set(0, 0, -f); this.d.scale.set(9, 5, 4.5); this.d.updateMatrix(); this.ravenBody.setMatrixAt(nr, this.d.matrix);
      const fx = Math.cos(f), fy = Math.sin(f);
      this.d.position.set(rv.x + fx * 9, -(rv.y + fy * 9), z + 2); this.d.rotation.set(0, 0, -f - Math.PI / 2); this.d.scale.set(1.6, 6, 1.6); this.d.updateMatrix(); this.ravenBeak.setMatrixAt(nr, this.d.matrix);
      for (const side of [-1, 1]) {
        this.d.position.set(rv.x, -rv.y, z + 1);
        this.d.rotation.set(0, 0, 0);
        this.d.quaternion.setFromEuler(new T.Euler(side * flap, 0, -f - Math.PI / 2 + (side < 0 ? Math.PI : 0), "ZYX"));
        this.d.scale.set(14, 6, 0.8); this.d.updateMatrix();
        this.ravenWing.setMatrixAt(nr * 2 + (side > 0 ? 1 : 0), this.d.matrix);
        this.d.quaternion.identity();
        this.d.position.set(rv.x + fx * 6 - fy * side * 2.2, -(rv.y + fy * 6 + fx * side * 2.2), z + 3.2); this.d.scale.set(1.1, 1.1, 1.1); this.d.updateMatrix();
        this.ravenEye.setMatrixAt(nr * 2 + (side > 0 ? 1 : 0), this.d.matrix);
      }
      nr++;
    }
    this.done(this.ravenBody, nr); this.done(this.ravenBeak, nr); this.done(this.ravenWing, nr * 2); this.done(this.ravenEye, nr * 2);
    // Monster spit.
    let ns = 0, na = 0;
    for (const sp of R.spits) {
      if (!sp.body || ns >= 260) continue;
      const p = sp.body.position, r = sp.r * (sp.big ? 1.3 : 1);
      if (sp.arrow && na < 120) {
        this.set(this.arrows, na, p.x, p.y, 16, -sp.angle, 20, 1.4, 1.4);
        this.set(this.arrowTips, na, p.x + Math.cos(sp.angle) * 11, p.y + Math.sin(sp.angle) * 11, 16, -sp.angle - Math.PI / 2, 2.2, 5, 2.2);
        na++;
        continue;
      }
      this.set(this.spits, ns, p.x, p.y, 14, 0, r, r, r);
      this.color(this.spits, ns, sp.color);
      this.glow(this.spitGlow, ns, p.x, p.y, 14, r * 7);
      this.color(this.spitGlow, ns, sp.color);
      ns++;
    }
    this.done(this.spits, ns); this.done(this.spitGlow, ns); this.done(this.arrows, na); this.done(this.arrowTips, na);
    // Spades.
    let no = 0;
    for (const o of R.orbs) {
      if (o.hidden) continue;
      const p = o.body.position;
      const big = o.w?.id === "halo" ? 1.3 : 1;
      this.set(this.spades, no, p.x, p.y, 16, -o.a - time * 8, 12 * big, 3 * big, 16 * big, 0.5);
      this.glow(this.spadeGlow, no, p.x, p.y, 16, 40 * big);
      no++;
    }
    this.done(this.spades, no); this.done(this.spadeGlow, no);
    // Particles.
    let np = 0;
    for (const q of R.particles) {
      if (np >= 640) break;
      if (!inV(q.x, q.y, 20)) continue;
      const k = q.life / q.T, s = q.size * (0.4 + k);
      this.set(this.parts, np, q.x, q.y, 4 + q.z, time * 3 + np, s, s, s);
      this.c.setHex(q.color).multiplyScalar(0.5 + k * 0.8);
      this.parts.setColorAt(np, this.c);
      np++;
    }
    this.done(this.parts, np);
    // Lobbed things.
    let nl = 0;
    for (const g of R.globs) {
      if (g.t < 0) continue;
      const k = g.t / g.T;
      const x = g.x0 + (g.x1 - g.x0) * k, y = g.y0 + (g.y1 - g.y0) * k, z = 10 + Math.sin(k * Math.PI) * 120;
      this.set(this.globs, nl, x, y, z, k * 8, g.friendly ? 5 : 9, g.friendly ? 5 : 9, g.friendly ? 7 : 9);
      this.color(this.globs, nl, g.color);
      nl++;
    }
    this.done(this.globs, nl);
    // Pools (holy water, burning ground, boss mud).
    let nz = 0;
    for (const z of R.zones) {
      if (z.life === undefined || nz >= 80) continue;
      const fade = Math.min(1, z.life / 30, ((z.T ?? z.life) - z.life + 1) / 10);
      const col = z.sun ? 0xffb040 : z.earth ? 0x6a4a2a : z.kind === "holy" ? 0x3aa8e0 : z.kind === "fire" ? 0xff6a20 : z.kind === "smoke" ? 0x8a7a9a : 0x3a5a2a;
      const r = z.r * (z.kind === "holy" ? 0.9 + 0.1 * Math.sin(time * 6 + z.x) : 1);
      this.set(this.pools, nz, z.x, z.y, 1.2 + nz * 0.01, 0, r, r, 1);
      this.c.setHex(col).multiplyScalar(fade * (z.kind === "mud" ? 0.6 : z.kind === "smoke" ? 0.28 : 1));
      this.pools.setColorAt(nz, this.c);
      this.set(this.poolRings, nz, z.x, z.y, 1.4, 0, r, r, 1);
      this.c.setHex(z.sun ? 0xfff0b0 : z.earth ? 0x3a2a18 : z.kind === "holy" ? 0xb8f0ff : z.kind === "fire" ? 0xffc070 : z.kind === "smoke" ? 0x2a2432 : 0x5a7a3a).multiplyScalar(fade);
      this.poolRings.setColorAt(nz, this.c);
      nz++;
    }
    this.done(this.pools, nz); this.done(this.poolRings, nz);
    // Scythes.
    let nh = 0;
    for (const z of R.hazards) { this.set(this.scythes, nh++, z.x, z.y, 20, -z.a - time * 10, 20, 20, 20); }
    this.done(this.scythes, nh);

    this.syncOneOffs(R, time);
    this.syncHeroFx(R, time);
  }

  take(pool, make, i) {
    if (!pool[i]) { pool[i] = make(); this.scene.add(pool[i]); }
    pool[i].visible = true;
    return pool[i];
  }
  park(pool, from) { for (let i = from; i < pool.length; i++) pool[i].visible = false; }

  syncOneOffs(R) {
    // Flail arcs.
    let i = 0;
    for (const a of R.arcs) {
      const m = this.take(this.arcPool, () => new T.Mesh(GEO.disc, add({ side: T.DoubleSide })), i++);
      const k = a.t / a.T;
      m.geometry = arcGeo(a.arc);
      m.position.set(a.x, -a.y, 14);
      m.rotation.set(0, 0, -a.a);
      m.scale.set(a.r * (0.7 + k * 0.3), a.r * (0.7 + k * 0.3), 1);
      m.material.color.setHex(a.color);
      // Ease in and out, so a swing is a sweep of light rather than a blink.
      m.material.opacity = Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5 + (k > 0.6 ? 0 : 0)) * (1 - k) * (this.calm ? 0.28 : 0.55);
    }
    this.park(this.arcPool, i);
    // Shock rings.
    i = 0;
    for (const r of R.rings) {
      const m = this.take(this.ringPool, () => new T.Mesh(GEO.ring, add({ side: T.DoubleSide })), i++);
      m.position.set(r.x, -r.y, 3);
      m.scale.set(r.r, r.r, 1);
      m.material.color.setHex(r.color);
      m.material.opacity = (1 - r.t / r.T) * (this.calm ? 0.35 : 0.7);
    }
    this.park(this.ringPool, i);
    // Lightning and hook chains: polylines of thin additive boxes.
    i = 0;
    const seg = (x0, y0, z0, x1, y1, z1, w, col, op) => {
      const m = this.take(this.linePool, () => new T.Mesh(GEO.box, add({})), i++);
      const dx = x1 - x0, dy = -(y1 - y0), dz = z1 - z0;
      const L = Math.hypot(dx, dy, dz) || 1;
      m.position.set((x0 + x1) / 2, -(y0 + y1) / 2, (z0 + z1) / 2);
      m.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), new T.Vector3(dx / L, dy / L, dz / L));
      m.scale.set(L, w, w);
      m.material.color.setHex(col);
      m.material.opacity = op;
    };
    for (const b of R.bolts) {
      const op = (1 - b.t / b.T) * (this.calm ? 0.4 : 0.85);
      for (let k = 1; k < b.pts.length; k++) {
        const p0 = b.pts[k - 1], p1 = b.pts[k];
        seg(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, 3.2, b.color, op);
        seg(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, 9, 0x8a7aff, op * 0.35);
      }
    }
    for (const b of R.beams) {
      const op = 1 - b.t / b.T;
      seg(b.x0, b.y0, 20, b.x1, b.y1, 12, 2.4, b.color, op);
    }
    this.park(this.linePool, i);
    // Wind-up warnings under chargers and slams.
    i = 0;
    for (const m of R.monsters) {
      if (!m.alive || m.wind <= 0 || !(m.def.elite || m.def.boss)) continue;
      const w = this.take(this.warnPool, () => new T.Mesh(GEO.disc, add({ color: 0xff3a2a })), i++);
      const p = m.body.position;
      const slam = m.windKind === "slam" || m.windKind === "sweep";
      w.position.set(p.x, -p.y, 1.6);
      const r = slam ? (m.def.ai === "stag" ? 170 : 240) : m.def.r * 1.8;
      w.scale.set(r, r, 1);
      w.material.opacity = 0.15 + 0.12 * Math.sin(R.frame * 0.5);
    }
    this.park(this.warnPool, i);
  }

  syncHeroFx(R, time) {
    const h = R.hero, p = h.body.position;
    const bell = h.weapons.find((w) => w.id === "bell" || w.id === "toll");
    if (bell && bell.radius && h.dig <= 0) {
      this.aura.visible = this.auraFill.visible = true;
      const r = bell.radius;
      this.aura.position.set(p.x, -p.y, 2.2); this.aura.scale.set(r, r, 1);
      this.auraFill.position.set(p.x, -p.y, 2); this.auraFill.scale.set(r, r, 1);
      this.aura.material.opacity = 0.25 + bell.pulse * 0.6;
      this.auraFill.material.opacity = 0.04 + bell.pulse * 0.12;
    } else this.aura.visible = this.auraFill.visible = false;
    this.heroRing.position.set(p.x, -p.y, 1.8);
    this.heroRing.scale.set(20, 20, 1);
    this.heroRing.visible = h.dig <= 0 && R.phase !== "dead" && !R.title;
    this.dome.visible = h.sanct > 0;
    if (h.sanct > 0) {
      this.dome.position.set(p.x, -p.y, 0);
      const s = 46 + Math.sin(time * 8) * 2;
      this.dome.scale.set(s, s, s);
      this.dome.material.opacity = 0.14 + Math.min(1, h.sanct / 30) * 0.1;
    }
    this.ward.visible = h.ward > 0 && h.dig <= 0;
    if (this.ward.visible) {
      this.ward.position.set(p.x, -p.y, 16);
      const s = 30 + Math.sin(time * 6) * 1.5;
      this.ward.scale.set(s, s, s);
      // Flickers out over its last second.
      this.ward.material.opacity = h.ward < 60 && Math.floor(time * 12) % 2 ? 0.05 : 0.16;
    }
    this.flashLight.position.set(p.x, -p.y, 120);
    this.flashLight.intensity = R.flash * (this.calm ? 15000 : 140000);
    const b = R.boss;
    if (b?.alive && b.def.ai === "king") {
      this.bossLight.position.set(b.body.position.x, -b.body.position.y, 90);
      this.bossLight.intensity = 30000 + Math.sin(time * 3) * 8000;
    } else this.bossLight.intensity = 0;
  }
}
