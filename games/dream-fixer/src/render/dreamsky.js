import * as T from "three";
import { Builder, compose } from "./modelkit.js";
import { cloud } from "./models/park.js";
import { rng } from "../rng.js";
import { C } from "./palette.js";
import { damp } from "../config.js";

// ── The dream's weather ──────────────────────────────────────────────────
// Clouds drifting round (and below) the floating islands, and what the
// nightmare does while the anchors are broken: a grey, bruised sky that
// clears a third with every anchor fixed, dark gloom on the ground round
// each broken anchor, and pink glitch shards hanging in the air.


export class DreamSky {
  constructor(group, def, kit, parts) {
    this.def = def;
    this.parts = parts;              // { sky (uniforms), fog, sun, hemi }
    this.clear = {
      top: new T.Color(def.sky.top), horizon: new T.Color(def.sky.horizon), bottom: new T.Color(def.sky.bottom),
      sunGlow: new T.Color(def.sky.sunGlow), fog: new T.Color(def.fog.color), sun: def.sun.intensity, hemi: def.sun.hemi,
    };
    const G = def.gloom;
    this.gloomy = G && {
      top: new T.Color(G.top), horizon: new T.Color(G.horizon), bottom: new T.Color(G.bottom),
      sunGlow: new T.Color(G.sunGlow), fog: new T.Color(G.fog), sun: G.sun, hemi: G.hemi,
    };
    this.g = G ? 1 : 0;
    // The islands' footprint, so the clouds stay clear of them.
    const box = new T.Box3();
    for (const c of kit.world.colliders) if (c.y1 > -1) box.expandByPoint(new T.Vector3(c.minX, 0, c.minZ)).expandByPoint(new T.Vector3(c.maxX, 0, c.maxZ));
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    const reach = Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    // Clouds: one merged mesh round the islands, the whole ring slowly turning.
    this.clouds = null;
    if (def.clouds) {
      const Cd = def.clouds, rnd = rng(17), b = new Builder();
      for (let i = 0; i < Cd.count; i++) {
        const a = (i / Cd.count) * Math.PI * 2 + rnd() * 0.3, r = reach + Cd.rMin + rnd() * (Cd.rMax - Cd.rMin);
        const y = Cd.yMin + rnd() * (Cd.yMax - Cd.yMin), s = 1.2 + rnd() * 2.2;
        const cb = new Builder();
        cloud(cb, { seed: i + 1, s });
        cb.flattenInto(b, compose([Math.cos(a) * r, y, Math.sin(a) * r], [0, rnd() * 6, 0], 1, new T.Matrix4()));
      }
      // A few smaller ones drifting well below the islands.
      for (let i = 0; i < 10; i++) {
        const cb = new Builder();
        cloud(cb, { seed: 100 + i, s: 1.5 + rnd() });
        cb.flattenInto(b, compose([(rnd() - 0.5) * reach * 1.6, -26 - rnd() * 14, (rnd() - 0.5) * reach * 1.6], [0, rnd() * 6, 0], 1, new T.Matrix4()));
      }
      this.clouds = new T.Group();
      this.clouds.position.set(cx, 0, cz);
      for (const m of b.buildChunks(1000, { shadows: false })) { m.castShadow = false; m.receiveShadow = false; this.clouds.add(m); }
      group.add(this.clouds);
    }
    // Gloom on the ground round each anchor.
    this.gloom = kit.anchors.map((a) => {
      const m = new T.Mesh(new T.CircleGeometry(1, 40), gloomMat());
      m.rotation.x = -Math.PI / 2;
      m.position.set(a.x, a.y + 0.04, a.z);
      m.scale.setScalar(9);
      m.renderOrder = 1;
      group.add(m);
      return { m, k: 1 };
    });
    // Glitch shards: little pink crystals hanging over the islands.
    this.shards = null;
    if (def.shards) {
      const n = def.shards, rnd = rng(23);
      this.shardData = Array.from({ length: n }, () => ({
        x: box.min.x + rnd() * (box.max.x - box.min.x), z: box.min.z + rnd() * (box.max.z - box.min.z),
        y: 1.5 + rnd() * 9, ph: rnd() * 6.28, s: 0.12 + rnd() * 0.18, cut: rnd(),
      }));
      this.shards = new T.InstancedMesh(new T.TetrahedronGeometry(1, 0), new T.MeshBasicMaterial({ color: new T.Color(C.dreamPink).multiplyScalar(1.6), toneMapped: false }), n);
      this.shards.frustumCulled = false;
      group.add(this.shards);
    }
    this._m = new T.Matrix4(); this._q = new T.Quaternion(); this._p = new T.Vector3(); this._s = new T.Vector3(); this._e = new T.Euler();
  }

  update(run, dt, t) {
    const n = run.anchors.length, fixed = run.fixedCount;
    const won = run.won || (run.boss && !run.boss.alive);
    // The sky clears a third per anchor (and all the way once the nightmare is gone).
    if (this.gloomy) {
      const target = won ? 0 : n ? (1 - fixed / n) * (run.boss?.alive ? 0.6 : 1) : 0;
      this.g = damp(this.g, target, 0.8, dt);
      const P = this.parts, g = this.g, Cl = this.clear, Gl = this.gloomy;
      const u = P.sky.material.uniforms;
      u.top.value.copy(Cl.top).lerp(Gl.top, g);
      u.horizon.value.copy(Cl.horizon).lerp(Gl.horizon, g);
      u.bottom.value.copy(Cl.bottom).lerp(Gl.bottom, g);
      u.sunGlow.value.copy(Cl.sunGlow).lerp(Gl.sunGlow, g);
      P.fog.color.copy(Cl.fog).lerp(Gl.fog, g);
      P.sun.light.intensity = Cl.sun + (Gl.sun - Cl.sun) * g;
      P.sun.hemi.intensity = Cl.hemi + (Gl.hemi - Cl.hemi) * g;
    }
    if (this.clouds) this.clouds.rotation.y = t * 0.004;
    run.anchors.forEach((a, i) => {
      const G = this.gloom[i];
      G.k = damp(G.k, a.state === "fixed" ? 0 : a.state === "tuning" ? 1 - a.progress * 0.7 : 1, 1.5, dt);
      G.m.material.uniforms.k.value = G.k;
      G.m.material.uniforms.time.value = t;
      G.m.visible = G.k > 0.01;
    });
    if (this.shards) {
      const left = n ? (n - fixed) / n : 0;
      let i = 0;
      const { _m, _q, _p, _s, _e } = this;
      for (const d of this.shardData) {
        if (d.cut >= left || won) continue;
        _p.set(d.x + Math.sin(t * 0.3 + d.ph) * 0.6, d.y + Math.sin(t * 0.8 + d.ph) * 0.3, d.z + Math.cos(t * 0.25 + d.ph) * 0.6);
        _q.setFromEuler(_e.set(t * 0.7 + d.ph, t * 1.1 + d.ph, 0));
        const f = 1 + Math.sin(t * 5 + d.ph * 3) * 0.2;
        _s.set(d.s * f, d.s * 2.2 * f, d.s * f);
        this.shards.setMatrixAt(i++, _m.compose(_p, _q, _s));
      }
      this.shards.count = i;
      this.shards.instanceMatrix.needsUpdate = true;
    }
  }
}

// A bruise on the ground: dark violet, blotchy at the edge, breathing.
function gloomMat() {
  return new T.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    uniforms: { k: { value: 1 }, time: { value: 0 } },
    vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float k, time; varying vec2 vP;
      void main() {
        float a = atan(vP.y, vP.x);
        float r = length(vP) + 0.08 * sin(a * 7.0 + time * 0.6) + 0.05 * sin(a * 13.0 - time);
        float edge = 1.0 - smoothstep(0.55, 1.0, r);
        float blot = 0.75 + 0.25 * sin(vP.x * 9.0 + time) * sin(vP.y * 7.0 - time * 0.7);
        gl_FragColor = vec4(0.16, 0.08, 0.2, edge * blot * 0.55 * k);
      }`,
  });
}
