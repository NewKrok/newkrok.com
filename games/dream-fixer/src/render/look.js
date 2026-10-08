import * as T from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// ── Renderer, sky and light ──────────────────────────────────────────────
// Shared by the game and the model viewer, so a model looks the same in
// both.

// antialias: false for the game, which draws through its own render
// targets (a multisampled canvas would only cost memory there).
export function makeRenderer(container, { antialias = true } = {}) {
  const r = new T.WebGLRenderer({ antialias, powerPreference: "high-performance" });
  r.toneMapping = T.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.92;
  r.shadowMap.enabled = true;
  r.shadowMap.type = T.PCFShadowMap;
  r.domElement.className = "view3d";
  container.appendChild(r.domElement);
  return r;
}

// A soft studio reflection for the metal parts (brass needs something to shine in).
export function envMap(renderer) {
  const pm = new T.PMREMGenerator(renderer);
  const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return tex;
}

// Vertical gradient sky dome: horizon, zenith and a warm glow near the sun.
// stars: 0…1, a field of stars over the gradient; earth: { dir, r } a
// blue planet hanging in the sky (Sophie's station looks down on it).
export function skyDome({ top = 0x6fb4ff, horizon = 0xffe2c4, bottom = 0xc9e6ff, sunDir = [0.4, 0.6, -0.5], sunGlow = 0xfff0c8, stars = 0, earth = null } = {}) {
  const g = new T.SphereGeometry(400, 32, 16);
  const m = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new T.Color(top) }, horizon: { value: new T.Color(horizon) }, bottom: { value: new T.Color(bottom) },
      sunDir: { value: new T.Vector3(...sunDir).normalize() }, sunGlow: { value: new T.Color(sunGlow) },
      stars: { value: stars }, earthDir: { value: new T.Vector3(...(earth?.dir ?? [0, -1, 0])).normalize() }, earthR: { value: earth?.r ?? 0 },
    },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top, horizon, bottom, sunGlow, sunDir, earthDir; uniform float stars, earthR; varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 c = y > 0.0 ? mix(horizon, top, pow(clamp(y, 0.0, 1.0), 0.55)) : mix(horizon, bottom, pow(clamp(-y, 0.0, 1.0), 0.5));
        if (stars > 0.0) {
          // A star in some cells of a fine grid over the sphere, twinkle-free.
          vec3 g = floor(d * 220.0);
          float h = hash(g), r = length(fract(d * 220.0) - 0.5);
          c += vec3(0.9, 0.95, 1.0) * stars * step(0.985, h) * smoothstep(0.35, 0.0, r) * (0.5 + 2.5 * fract(h * 97.0));
        }
        if (earthR > 0.0) {
          // The Earth: blue seas, green and sand lands, swirls of cloud, a
          // pale rim of air; lit from the sun's side.
          float a = acos(clamp(dot(d, earthDir), -1.0, 1.0));
          if (a < earthR * 1.08) {
            vec3 u = normalize(cross(earthDir, vec3(0.0, 1.0, 0.0))), v = cross(u, earthDir);
            vec2 q = vec2(dot(d, u), dot(d, v)) / sin(earthR);
            float k = clamp(1.0 - dot(q, q), 0.0, 1.0), z = sqrt(k);
            vec3 n = normalize(q.x * u + q.y * v - z * earthDir);
            float land = sin(q.x * 7.0 + sin(q.y * 5.0) * 1.6) * sin(q.y * 6.0 + q.x * 2.0) + sin(q.x * 13.0 - q.y * 11.0) * 0.35;
            float cloud = smoothstep(0.55, 0.9, sin(q.x * 9.0 + q.y * 14.0 + sin(q.y * 21.0)) * 0.5 + sin(q.y * 17.0 - q.x * 4.0) * 0.5);
            vec3 e = land > 0.25 ? mix(vec3(0.22, 0.48, 0.24), vec3(0.62, 0.55, 0.36), smoothstep(0.6, 1.1, land)) : vec3(0.08, 0.26, 0.62);
            e = mix(e, vec3(0.95), cloud * 0.85);
            float lit = 0.25 + 0.75 * clamp(dot(n, sunDir) * 0.5 + 0.6, 0.0, 1.0);
            vec3 body = e * lit;
            float rim = smoothstep(0.0, 0.25, 1.0 - z);
            body = mix(body, vec3(0.5, 0.75, 1.0), rim * 0.35);
            float edge = smoothstep(earthR * 1.08, earthR, a);
            c = a < earthR ? body : mix(c, vec3(0.35, 0.6, 1.0), edge * 0.6);
          }
        }
        float s = max(dot(d, sunDir), 0.0);
        c += sunGlow * (pow(s, 24.0) * 0.25 + pow(s, 900.0) * 1.0);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new T.Mesh(g, m);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

// Hemisphere fill plus a sun that casts shadows in a box around `focus`.
export class Sun {
  constructor(scene, { color = 0xfff1d8, intensity = 2.6, dir = [0.4, 0.8, -0.35], sky = 0xbfe0ff, ground = 0x6a7a4a, hemi = 1.2, box = 22, mapSize = 2048 } = {}) {
    this.dir = new T.Vector3(...dir).normalize();
    this.hemi = new T.HemisphereLight(sky, ground, hemi);
    this.light = new T.DirectionalLight(color, intensity);
    this.light.castShadow = true;
    const c = this.light.shadow.camera;
    c.left = -box; c.right = box; c.top = box; c.bottom = -box; c.near = 1; c.far = 160;
    this.light.shadow.mapSize.set(mapSize, mapSize);
    this.light.shadow.bias = -0.0004;
    this.light.shadow.normalBias = 0.03;
    this.box = box;
    scene.add(this.hemi, this.light, this.light.target);
  }
  // Snap to shadow-map texels so the edges do not crawl as the player moves.
  follow(x, y, z) {
    const step = (this.box * 2) / this.light.shadow.mapSize.x;
    x = Math.round(x / step) * step; z = Math.round(z / step) * step;
    this.light.target.position.set(x, y, z);
    this.light.position.set(x + this.dir.x * 70, y + this.dir.y * 70, z + this.dir.z * 70);
  }
}
