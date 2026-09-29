import * as T from "three";
import { make, MAT } from "./modelkit.js";
import { anchor } from "./models/dream.js";
import { C } from "./palette.js";
import { damp } from "../config.js";

// ── Anchors on screen ────────────────────────────────────────────────────
// Broken: the crystal flickers pink, the rings wobble and pink wisps rise
// (so you can spot them from afar). Tuning: a ring of light on the ground
// shows the reach and fills as the tuning runs; the rings spin up and the
// crystal turns mint. Fixed: calm, bright, and a soft beam into the sky.

const PINK = new T.Color(C.dreamPink), MINT = new T.Color(C.dream);

const arcMat = () => new T.ShaderMaterial({
  transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
  uniforms: { progress: { value: 0 }, inside: { value: 1 }, time: { value: 0 } },
  vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float progress, inside, time; varying vec2 vP;
    void main() {
      float a = atan(vP.x, vP.y) / 6.2831853 + 0.5;
      float r = length(vP);
      float band = smoothstep(0.9, 0.93, r) * (1.0 - smoothstep(0.97, 1.0, r));
      float filled = a < progress ? 1.0 : 0.0;
      float dash = step(0.5, fract(a * 48.0 - time * 0.5));
      vec3 base = mix(vec3(1.0, 0.56, 0.82), vec3(0.5, 0.96, 0.88), inside);
      vec3 c = base * (filled * 1.6 + (1.0 - filled) * 0.35 * dash);
      gl_FragColor = vec4(c * band, band);
    }`,
});

const beamMat = () => new T.ShaderMaterial({
  transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide,
  uniforms: { strength: { value: 0 }, time: { value: 0 } },
  vertexShader: `varying float vY; varying vec2 vUv; void main() { vY = position.y; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float strength, time; varying float vY; varying vec2 vUv;
    void main() {
      float f = (1.0 - smoothstep(0.0, 60.0, vY)) * (0.7 + 0.3 * sin(vUv.x * 18.0 + time * 2.0 - vY * 0.2));
      gl_FragColor = vec4(vec3(0.45, 0.95, 0.85) * f * strength, 1.0);
    }`,
});

export class AnchorView {
  constructor(group, kitAnchors) {
    this.items = kitAnchors.map((a) => {
      const o = make(anchor);
      o.position.set(a.x, a.y, a.z);
      o.rotation.y = a.x * 0.37;
      const glow = MAT.glow.clone();
      o.traverse((m) => { if (m.isMesh && m.material === MAT.glow) m.material = glow; });
      // Flat on the ground; the shader works in the circle's own xy.
      const arc = new T.Mesh(new T.CircleGeometry(1, 64), arcMat());
      arc.rotation.x = -Math.PI / 2;
      arc.position.set(a.x, a.y + 0.06, a.z);
      arc.scale.setScalar(a.ring ?? 6.5);
      arc.visible = false;
      const beam = new T.Mesh(new T.CylinderGeometry(0.5, 0.9, 60, 16, 1, true).translate(0, 30, 0), beamMat());
      beam.position.set(a.x, a.y + 1.6, a.z);
      beam.visible = false;
      group.add(o, arc, beam);
      return { a, o, glow, arc, beam, spin1: 0, spin2: 0, mint: 0, wisp: 0 };
    });
  }

  update(run, dt, t, fx) {
    run.anchors.forEach((A, i) => {
      const it = this.items[i], N = it.o.userData.nodes;
      const tuning = A.state === "tuning", fixed = A.state === "fixed";
      const p = A.progress;
      // Ring speed: sluggish and jerky while broken, spinning up while tuned, calm when done.
      const s1 = fixed ? 0.5 : tuning ? 0.6 + p * 3 : 0.25 + Math.max(0, Math.sin(t * 1.7 + i)) * 0.6;
      it.spin1 += dt * s1; it.spin2 += dt * s1 * 1.6;
      N.ring1.rotation.set(fixed ? 0 : Math.sin(t * 2.3 + i) * 0.12 * (1 - p), it.spin1, 0);
      N.ring2.rotation.set(it.spin2, 0, fixed ? 0 : Math.sin(t * 1.9 + i) * 0.2 * (1 - p));
      N.crystal.rotation.y = -t * (fixed ? 0.5 : 0.8 + p * 2);
      N.crystal.position.y = 1.75 + Math.sin(t * 1.6 + i) * (fixed ? 0.08 : 0.04) + (tuning ? Math.sin(t * 30) * 0.01 * p : 0);
      it.mint = damp(it.mint, fixed ? 1 : tuning ? p * 0.8 : 0, 4, dt);
      const flicker = fixed ? 1.15 : tuning ? 0.9 + p * 0.4 : 0.55 + Math.max(0, Math.sin(t * 13 + i * 2)) * 0.25 + (Math.sin(t * 37 + i) > 0.9 ? 0.4 : 0);
      it.glow.color.copy(PINK).lerp(MINT, it.mint).multiplyScalar(flicker);
      // Ground ring.
      it.arc.visible = tuning;
      if (tuning) {
        const u = it.arc.material.uniforms;
        u.progress.value = p; u.time.value = t;
        u.inside.value = damp(u.inside.value, A.inside ? 1 : 0, 8, dt);
      }
      // Beam once fixed.
      it.beam.visible = fixed;
      if (fixed) {
        const u = it.beam.material.uniforms;
        u.strength.value = damp(u.strength.value, 0.55, 1.5, dt) + (A.t < 0.6 ? (0.6 - A.t) * 3 : 0);
        u.time.value = t;
      }
      // Pink wisps rising from broken anchors; mint sparks while tuning.
      it.wisp += dt * (fixed ? 0 : tuning ? 18 : 5);
      while (it.wisp > 1) {
        it.wisp -= 1;
        const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.4;
        const col = tuning ? (Math.random() < p ? C.dream : C.dreamPink) : C.dreamPink;
        fx.spark(A.x + Math.cos(a) * r, A.y + 1.75, A.z + Math.sin(a) * r, Math.cos(a) * 0.4, 1.4 + Math.random(), Math.sin(a) * 0.4, 1.2, 0.05, col, -0.4);
      }
    });
  }

  onEvent(e, fx) {
    if (e.type !== "anchorFixed") return;
    // The calm pulse.
    fx.ring([e.x, e.y + 0.1, e.z], [0, 1, 0], C.dream, 14, 0.9);
    fx.ring([e.x, e.y + 1.75, e.z], [0, 1, 0], C.dream, 6, 0.6);
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 5;
      fx.spark(e.x, e.y + 1.75, e.z, Math.cos(a) * v, 2 + Math.random() * 4, Math.sin(a) * v, 0.8 + Math.random() * 0.6, 0.08, i % 3 ? C.dream : C.dreamGold, 4);
    }
  }
}
