import * as T from "three";
import { MODELS } from "./render/models/index.js";
import { make } from "./render/modelkit.js";
import { makeRenderer, envMap, Sun } from "./render/look.js";

// ── Model viewer (dev) ───────────────────────────────────────────────────
// ?model=<id> shows one model on a turntable; ?model=all lays them all out.
// &yaw=<rad> stops the turntable at that angle (for screenshots),
// &t=<seconds> freezes the idle animation at that time.

export function startViewer(id) {
  const q = new URLSearchParams(location.search);
  const app = document.getElementById("app");
  document.body.classList.add("viewer");
  const renderer = makeRenderer(app);
  const scene = new T.Scene();
  scene.background = new T.Color(0x9fb4c8);
  scene.environment = envMap(renderer);
  scene.environmentIntensity = 0.45;
  const light = new Sun(scene, { box: 8, dir: [0.5, 0.9, -0.6], hemi: 1.1, ground: 0x8a8a7a });
  light.follow(0, 0, 0);

  const floor = new T.Mesh(new T.CircleGeometry(30, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0xc7cfd6, roughness: 1 }));
  floor.receiveShadow = true;
  scene.add(floor);

  const camera = new T.PerspectiveCamera(35, 1, 0.01, 800);
  const ids = id === "all" ? Object.keys(MODELS) : [id];
  const items = [];
  const cols = Math.ceil(Math.sqrt(ids.length));
  let x = 0, z = 0, rowH = 0, maxW = 0;
  ids.forEach((mid, i) => {
    const def = MODELS[mid];
    if (!def) { console.warn("no model", mid); return; }
    const o = make(def.build, def.opts);
    const bb = new T.Box3().setFromObject(o);
    if (bb.min.y < 0) o.position.y = -bb.min.y;   // fliers are built round their centre
    const w = def.frame * 0.9;
    if (i % cols === 0 && i) { z += rowH; x = 0; rowH = 0; }
    o.position.x = x + w / 2; o.position.z = z;
    x += w; rowH = Math.max(rowH, w); maxW = Math.max(maxW, x);
    scene.add(o);
    items.push({ o, def });
  });

  // Frame the lot.
  const box = new T.Box3();
  for (const it of items) box.expandByObject(it.o);
  const c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
  const r = size.length() / 2 / Math.sin(T.MathUtils.degToRad(35) / 2) * (ids.length > 1 ? 0.5 : 0.95);
  if (ids.length === 1) {
    for (const it of items) it.o.position.x -= c.x;
    c.x = 0;
  }
  const fixedYaw = q.has("yaw") ? Number(q.get("yaw")) : null;
  const fixedT = q.has("t") ? Number(q.get("t")) : null;
  const pitch = q.has("pitch") ? Number(q.get("pitch")) : 0.32;

  const resize = () => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize);
  resize();

  let drag = null, yaw = fixedYaw ?? -0.6, zoom = 1;
  addEventListener("pointerdown", (e) => { drag = e.clientX; });
  addEventListener("pointerup", () => { drag = null; });
  addEventListener("pointermove", (e) => { if (drag !== null) { yaw -= (e.clientX - drag) * 0.01; drag = e.clientX; } });
  addEventListener("wheel", (e) => { zoom *= Math.exp(e.deltaY * 0.001); });

  const t0 = performance.now();
  const frame = () => {
    const t = fixedT ?? (performance.now() - t0) / 1000;
    if (fixedYaw === null && drag === null && ids.length === 1) yaw += 0.004;
    for (const it of items) it.def.anim?.(it.o, t);
    const d = r * zoom;
    const cy = ids.length === 1 ? c.y : 0;
    camera.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * d, cy + Math.sin(pitch) * d, c.z + Math.cos(yaw) * Math.cos(pitch) * d);
    camera.lookAt(c.x, cy, c.z);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  frame();
  window.__viewer = { scene, camera, items };
}
