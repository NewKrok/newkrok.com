import * as T from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// ── Renderer, sky and light ──────────────────────────────────────────────
// Shared by the game and the model viewer, so a model looks the same in
// both.

export function makeRenderer(container) {
  const r = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
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
export function skyDome({ top = 0x6fb4ff, horizon = 0xffe2c4, bottom = 0xc9e6ff, sunDir = [0.4, 0.6, -0.5], sunGlow = 0xfff0c8 } = {}) {
  const g = new T.SphereGeometry(400, 32, 16);
  const m = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new T.Color(top) }, horizon: { value: new T.Color(horizon) }, bottom: { value: new T.Color(bottom) },
      sunDir: { value: new T.Vector3(...sunDir).normalize() }, sunGlow: { value: new T.Color(sunGlow) },
    },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top, horizon, bottom, sunGlow, sunDir; varying vec3 vDir;
      void main() {
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(horizon, top, pow(clamp(y, 0.0, 1.0), 0.55)) : mix(horizon, bottom, pow(clamp(-y, 0.0, 1.0), 0.5));
        float s = max(dot(normalize(vDir), sunDir), 0.0);
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
