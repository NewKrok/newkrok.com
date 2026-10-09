import * as T from "three";

// ── Effects ──────────────────────────────────────────────────────────────
// Tracers, muzzle flashes, sparks, acid, blasts, dust, the laser beam, the
// Warden's shockwave. Particles are one Points cloud each for glowing
// (additive) and solid (dust, debris) bits, moved on the CPU; tracers and
// flashes come from small pools of stretched meshes.

const MAXP = 2400;

class Particles {
  constructor(scene, additive) {
    this.n = 0;
    this.pos = new Float32Array(MAXP * 3); this.col = new Float32Array(MAXP * 3); this.size = new Float32Array(MAXP);
    this.vel = new Float32Array(MAXP * 3); this.life = new Float32Array(MAXP); this.max = new Float32Array(MAXP); this.grav = new Float32Array(MAXP); this.s0 = new Float32Array(MAXP);
    this.base = new Float32Array(MAXP * 3);
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute("color", new T.BufferAttribute(this.col, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute("size", new T.BufferAttribute(this.size, 1).setUsage(T.DynamicDrawUsage));
    const m = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending, vertexColors: true,
      uniforms: { scale: { value: 600 } },
      vertexShader: `attribute float size; varying vec3 vC; uniform float scale; void main() { vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: additive
        ? `varying vec3 vC; void main() { vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard; gl_FragColor = vec4(vC * smoothstep(0.5, 0.0, d) * 1.6, 1.0); }`
        : `varying vec3 vC; void main() { vec2 q = gl_PointCoord - 0.5; float d = length(q); if (d > 0.5) discard; gl_FragColor = vec4(vC, smoothstep(0.5, 0.3, d) * 0.85); }`,
    });
    this.points = new T.Points(g, m);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  add(x, y, z, vx, vy, vz, life, size, color, grav = 0) {
    let i = this.n < MAXP ? this.n++ : Math.floor(Math.random() * MAXP);
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life; this.max[i] = life; this.s0[i] = size; this.grav[i] = grav;
    const c = _c.setHex(color);
    this.base[i * 3] = c.r; this.base[i * 3 + 1] = c.g; this.base[i * 3 + 2] = c.b;
  }
  update(dt) {
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      const l = this.life[i] - dt;
      if (l <= 0) continue;
      const k = l / this.max[i];
      if (w !== i) {
        for (let a = 0; a < 3; a++) { this.pos[w * 3 + a] = this.pos[i * 3 + a]; this.vel[w * 3 + a] = this.vel[i * 3 + a]; this.base[w * 3 + a] = this.base[i * 3 + a]; }
        this.max[w] = this.max[i]; this.s0[w] = this.s0[i]; this.grav[w] = this.grav[i];
      }
      this.life[w] = l;
      this.vel[w * 3 + 1] -= this.grav[w] * dt;
      const drag = Math.exp(-dt * 1.2);
      this.vel[w * 3] *= drag; this.vel[w * 3 + 2] *= drag;
      this.pos[w * 3] += this.vel[w * 3] * dt; this.pos[w * 3 + 1] += this.vel[w * 3 + 1] * dt; this.pos[w * 3 + 2] += this.vel[w * 3 + 2] * dt;
      this.col[w * 3] = this.base[w * 3] * k; this.col[w * 3 + 1] = this.base[w * 3 + 1] * k; this.col[w * 3 + 2] = this.base[w * 3 + 2] * k;
      this.size[w] = this.s0[w] * (0.4 + 0.6 * k);
      w++;
    }
    this.n = w;
    const g = this.points.geometry;
    g.setDrawRange(0, w);
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true;
  }
}
const _c = new T.Color();

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.glow = new Particles(scene, true);
    this.dust = new Particles(scene, false);
    // Tracers: thin glowing boxes, stretched between two points.
    this.tracers = [];
    const tg = new T.BoxGeometry(1, 1, 1); tg.translate(0, 0, -0.5);
    for (let i = 0; i < 48; i++) {
      const m = new T.Mesh(tg, new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      m.visible = false; m.userData.t = 0;
      scene.add(m); this.tracers.push(m);
    }
    this.ti = 0;
    // Muzzle flashes: a star of two crossed quads.
    this.flashes = [];
    const fg = new T.OctahedronGeometry(1, 0);
    for (let i = 0; i < 8; i++) {
      const m = new T.Mesh(fg, new T.MeshBasicMaterial({ color: 0xffd27a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      m.visible = false; m.userData.t = 0;
      scene.add(m); this.flashes.push(m);
    }
    this.fi = 0;
    this.flashLight = new T.PointLight(0xffc27a, 0, 9, 2);
    scene.add(this.flashLight);
    // Blast flashes: expanding glowing spheres with a light.
    this.blasts = [];
    const bg = new T.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 6; i++) {
      const m = new T.Mesh(bg, new T.MeshBasicMaterial({ color: 0xffa04a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      m.visible = false; m.userData.t = 9;
      scene.add(m); this.blasts.push(m);
    }
    this.bi = 0;
    this.blastLight = new T.PointLight(0xff9a4a, 0, 30, 2);
    scene.add(this.blastLight);
    // The laser beam.
    const lg = new T.CylinderGeometry(0.03, 0.03, 1, 6, 1, true); lg.rotateX(Math.PI / 2); lg.translate(0, 0, -0.5);
    this.beam = new T.Mesh(lg, new T.MeshBasicMaterial({ color: 0x7ef9ff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.beam.visible = false;
    const lg2 = lg.clone(); lg2.scale(3.5, 3.5, 1);
    this.beamGlow = new T.Mesh(lg2, new T.MeshBasicMaterial({ color: 0x1a8aa0, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.beam.add(this.beamGlow);
    scene.add(this.beam);
    // Projectiles in flight (grenades, acid) and acid puddles, by id.
    this.shotMeshes = new Map();
    this.puddleMeshes = new Map();
    this.gGeo = new T.SphereGeometry(0.09, 8, 6);
    this.aGeo = new T.IcosahedronGeometry(0.2, 1);
    this.pGeo = new T.CircleGeometry(1, 14); this.pGeo.rotateX(-Math.PI / 2);
    this.gMat = new T.MeshBasicMaterial({ color: 0xffb06a, toneMapped: false });
    this.aMat = new T.MeshBasicMaterial({ color: 0x9cff3a, toneMapped: false });
    this.pMat = new T.MeshBasicMaterial({ color: 0x6adf2a, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    // The shockwave ring.
    this.ring = new T.Mesh(new T.TorusGeometry(1, 0.25, 4, 48), new T.MeshBasicMaterial({ color: 0xffb06a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.ring.rotation.x = Math.PI / 2;
    this.ring.visible = false;
    scene.add(this.ring);
    this.shake = 0;
  }

  tracer(x0, y0, z0, x1, y1, z1, color) {
    const m = this.tracers[this.ti++ % this.tracers.length];
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.hypot(dx, dy, dz);
    if (L < 0.5) return;
    m.position.set(x0 + dx * 0.15, y0 + dy * 0.15, z0 + dz * 0.15);
    m.lookAt(x0 - dx, y0 - dy, z0 - dz);
    m.scale.set(0.025, 0.025, L * 0.85);
    m.material.color.setHex(color); m.material.opacity = 0.9;
    m.visible = true; m.userData.t = 0.06;
  }
  flash(x, y, z, dx, dy, dz, size = 1, color = 0xffd27a) {
    const m = this.flashes[this.fi++ % this.flashes.length];
    m.position.set(x + dx * 0.1, y + dy * 0.1, z + dz * 0.1);
    m.lookAt(x + dx, y + dy, z + dz);
    m.scale.set(0.12 * size, 0.12 * size, 0.32 * size);
    m.rotation.z = Math.random() * 3;
    m.material.color.setHex(color);
    m.visible = true; m.userData.t = 0.05;
    this.flashLight.position.set(x, y, z); this.flashLight.intensity = 6 * size; this.flashT = 0.05;
  }
  sparks(x, y, z, nx, ny, nz, n, color, speed = 4, life = 0.35, size = 0.06, grav = 9) {
    for (let i = 0; i < n; i++) {
      const vx = nx * speed + (Math.random() - 0.5) * speed * 1.4, vy = ny * speed + (Math.random() - 0.3) * speed * 1.2, vz = nz * speed + (Math.random() - 0.5) * speed * 1.4;
      this.glow.add(x, y, z, vx, vy, vz, life * (0.5 + Math.random() * 0.8), size, color, grav);
    }
  }
  puff(x, y, z, n, color = 0x9a6a50, size = 0.5, speed = 1.5, life = 0.9, up = 0.6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.dust.add(x + (Math.random() - 0.5) * 0.4, y + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.4, Math.sin(a) * speed * Math.random(), up * (0.5 + Math.random()), Math.cos(a) * speed * Math.random(), life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, -0.4);
    }
  }
  blast(x, y, z, r, color = 0xffa04a) {
    const m = this.blasts[this.bi++ % this.blasts.length];
    m.position.set(x, y, z); m.userData.t = 0; m.userData.r = r; m.material.color.setHex(color); m.visible = true;
    this.blastLight.position.set(x, y + 1, z); this.blastLight.intensity = 120; this.blastT = 0.4;
    this.sparks(x, y, z, 0, 1, 0, 40, 0xffb06a, 9, 0.6, 0.12, 12);
    this.puff(x, y, z, 26, 0x6a5040, 1.4, 5, 1.6, 2);
  }
  shockRing(x, y, z) { this.ring.position.set(x, y + 0.2, z); this.ring.userData.t = 0; this.ring.visible = true; }

  // Things the sim holds (in flight, on the ground, the beam).
  sync(run, muzzle = null) {
    const live = new Set();
    for (const s of run.shots) {
      live.add(s.id);
      let m = this.shotMeshes.get(s.id);
      if (!m) { m = new T.Mesh(s.kind === "grenade" ? this.gGeo : this.aGeo, s.kind === "grenade" ? this.gMat : this.aMat); m.scale.setScalar(s.size ?? 1); this.scene.add(m); this.shotMeshes.set(s.id, m); }
      m.position.set(s.x, s.y, s.z);
      if (Math.random() < 0.6) (s.kind === "grenade" ? this.dust : this.glow).add(s.x, s.y, s.z, 0, 0.3, 0, 0.4, s.kind === "grenade" ? 0.18 : 0.14 * (s.size ?? 1), s.kind === "grenade" ? 0x8a8a8a : 0x7adf2a, 0);
    }
    for (const [id, m] of this.shotMeshes) if (!live.has(id)) { this.scene.remove(m); this.shotMeshes.delete(id); }
    const pl = new Set();
    for (const p of run.puddles) {
      pl.add(p.id);
      let m = this.puddleMeshes.get(p.id);
      if (!m) { m = new T.Mesh(this.pGeo, this.pMat); m.position.set(p.x, p.y + 0.06, p.z); this.scene.add(m); this.puddleMeshes.set(p.id, m); }
      m.scale.setScalar(p.r * Math.min(1, p.t * 1.5));
      if (Math.random() < 0.05) this.glow.add(p.x + (Math.random() - 0.5) * p.r, p.y + 0.1, p.z + (Math.random() - 0.5) * p.r, 0, 0.6, 0, 0.6, 0.08, 0x9cff3a, 0);
    }
    for (const [id, m] of this.puddleMeshes) if (!pl.has(id)) { this.scene.remove(m); this.puddleMeshes.delete(id); }
    const b = run.player.beam;
    if (b) {
      // From the figure's muzzle when the renderer knows it.
      const x0 = muzzle ? muzzle[0] : b.x0, y0 = muzzle ? muzzle[1] : b.y0, z0 = muzzle ? muzzle[2] : b.z0;
      const dx = b.x1 - x0, dy = b.y1 - y0, dz = b.z1 - z0, L = Math.hypot(dx, dy, dz);
      this.beam.position.set(x0, y0, z0);
      this.beam.lookAt(x0 - dx, y0 - dy, z0 - dz);
      this.beam.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.4, L);
      this.beam.visible = true;
      if (b.hit && Math.random() < 0.7) this.sparks(b.x1, b.y1, b.z1, -dx / L, -dy / L, -dz / L, 2, 0x7ef9ff, 2.5, 0.25, 0.07, 4);
    } else this.beam.visible = false;
    const w = run.boss?.ring;
    if (w) { this.ring.visible = true; this.ring.position.set(w.x, run.space.terrain.height(w.x, w.z) + 0.3, w.z); this.ring.scale.set(w.r, w.r, 1 + w.t); this.ring.material.opacity = Math.max(0, 1 - w.r / 18); }
    else this.ring.visible = false;
  }

  update(dt) {
    this.glow.update(dt); this.dust.update(dt);
    for (const m of this.tracers) if (m.visible) { m.userData.t -= dt; m.material.opacity = Math.max(0, m.userData.t / 0.06); if (m.userData.t <= 0) m.visible = false; }
    for (const m of this.flashes) if (m.visible) { m.userData.t -= dt; if (m.userData.t <= 0) m.visible = false; }
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flashLight.intensity = 0; }
    for (const m of this.blasts) if (m.visible) {
      m.userData.t += dt;
      const k = m.userData.t / 0.45;
      m.scale.setScalar(m.userData.r * (0.3 + k * 0.9));
      m.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) m.visible = false;
    }
    if (this.blastT > 0) { this.blastT -= dt; this.blastLight.intensity = Math.max(0, this.blastT / 0.4) * 120; }
  }
}
