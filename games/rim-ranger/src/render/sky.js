import * as T from "three";

// ── The sky over a moon ──────────────────────────────────────────────────
// A dusty gradient, faint stars higher up, and the gas giant the moon
// circles: banded, lit from the sun's side, with a ring tilted across it.

export function moonSky({ top = 0x1c2236, horizon = 0xc98a62, bottom = 0x8a5a44, sunDir = [0.5, 0.45, -0.4], sunGlow = 0xffd2a0, giantDir = [-0.35, 0.42, -0.84], giantR = 0.32, band1 = 0xd8b48a, band2 = 0x9a6a52, stars = 0.6 } = {}) {
  const g = new T.SphereGeometry(450, 32, 16);
  const m = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new T.Color(top) }, horizon: { value: new T.Color(horizon) }, bottom: { value: new T.Color(bottom) },
      sunDir: { value: new T.Vector3(...sunDir).normalize() }, sunGlow: { value: new T.Color(sunGlow) },
      gDir: { value: new T.Vector3(...giantDir).normalize() }, gR: { value: giantR },
      band1: { value: new T.Color(band1) }, band2: { value: new T.Color(band2) }, stars: { value: stars },
    },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top, horizon, bottom, sunGlow, sunDir, gDir, band1, band2; uniform float gR, stars; varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 c = y > 0.0 ? mix(horizon, top, pow(clamp(y, 0.0, 1.0), 0.45)) : mix(horizon, bottom, pow(clamp(-y, 0.0, 1.0), 0.5));
        // Stars where the dust thins out.
        vec3 g = floor(d * 240.0);
        float h = hash(g), r = length(fract(d * 240.0) - 0.5);
        c += vec3(0.9, 0.92, 1.0) * stars * smoothstep(0.15, 0.6, y) * step(0.988, h) * smoothstep(0.35, 0.0, r) * (0.4 + 2.0 * fract(h * 97.0));
        // The gas giant.
        vec3 u = normalize(cross(gDir, vec3(0.0, 1.0, 0.0))), v = cross(u, gDir);
        float a = acos(clamp(dot(d, gDir), -1.0, 1.0));
        vec2 q = vec2(dot(d, u), dot(d, v)) / sin(gR);
        // The ring: an ellipse across the planet, hidden behind it at the back.
        vec2 rq = vec2(q.x * 0.96 + q.y * 0.28, -q.x * 0.28 + q.y * 0.96);
        float re = length(vec2(rq.x, rq.y * 5.2));
        float ring = smoothstep(1.35, 1.4, re) * smoothstep(2.05, 1.95, re) * (0.55 + 0.45 * sin(re * 40.0));
        bool front = rq.y < 0.0;
        if (a < gR) {
          float k = clamp(1.0 - dot(q, q), 0.0, 1.0), z = sqrt(k);
          vec3 n = normalize(q.x * u + q.y * v - z * gDir);
          float lat = q.y + 0.08 * sin(q.x * 6.0 + q.y * 3.0);
          float bands = sin(lat * 18.0) * 0.5 + 0.5 + 0.25 * sin(lat * 47.0 + q.x * 2.0);
          vec3 col = mix(band2, band1, clamp(bands, 0.0, 1.0));
          float storm = smoothstep(0.12, 0.0, length(q - vec2(0.3, -0.25)) - 0.02);
          col = mix(col, vec3(0.75, 0.38, 0.28), storm * 0.8);
          float lit = clamp(dot(n, sunDir) * 0.9 + 0.25, 0.04, 1.0);
          vec3 body = col * lit;
          body += vec3(1.0, 0.75, 0.55) * pow(1.0 - z, 3.0) * 0.25 * lit;
          c = mix(c, body, smoothstep(gR, gR * 0.985, a));
        }
        // The ring over it (in front) or round it (behind, only off the disc).
        if (ring > 0.0 && (a > gR || front)) c = mix(c, vec3(0.86, 0.74, 0.6) * (front && a < gR ? 0.8 : 1.0), ring * 0.6);
        // The sun and its glow through the dust.
        float s = max(dot(d, sunDir), 0.0);
        c += sunGlow * (pow(s, 8.0) * 0.25 + pow(s, 600.0) * 1.4);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new T.Mesh(g, m);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}
