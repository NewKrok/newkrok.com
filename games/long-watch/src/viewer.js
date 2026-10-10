import * as T from "three";
import { MODELS } from "./render/models/index.js";
import { make } from "./render/modelkit.js";
import { makeRenderer, envMap, Sun } from "./render/look.js";
import { RangerFigure, SWAP_TIME } from "./render/rangerfig.js";
import { loadAssets } from "./render/glb.js";
import { GLB_LIST, makeRanger } from "./render/actors.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

// ── Model viewer (dev) ───────────────────────────────────────────────────
// ?model=<id> shows one model on a turntable; ?model=all lays them all out.
// &yaw=<rad> stops the turntable at that angle (for screenshots), &pitch
// tilts the camera, &t=<seconds> freezes the animation at that time,
// &zoom=<k> moves in. Models take options from the query (&skin=kessler,
// &gun=pistol, &sit=1, &c=0x4a7ab0 …). A ranger is posed by &pose=<name>
// (idle walk run sprint crouch aim fire reload swap cover down pistol
// pistolAim) with &k=<0…1> for how far a reload or swap has got.
// ?glb=<id>[,<id>…] shows generated models from public/models/<id>.glb
// (scripts/tripo.mjs) instead, or next to &model=…; &flat=1 flat-shades
// them, &scale=<k> resizes them. A GLB with animation clips plays the one
// &clip=<name> names (a substring; the first clip when none), the clip
// names go to the console. &fig=glb poses the ranger on the generated,
// rigged model (RangerGlb) instead of the code-built one.

const RANGER_POSES = {
  idle: {},
  walk: { moveK: 0.55, speed: 4.4 },
  run: { moveK: 1, speed: 7.4 },
  sprint: { moveK: 1, sprint: true, speed: 7.4 },
  crouch: { crouchK: 1 },
  crouchWalk: { crouchK: 1, moveK: 0.3, speed: 2.3 },
  aim: { aimK: 1, pitch: 0.05 },
  aimUp: { aimK: 1, pitch: 0.5 },
  fire: { aimK: 1, firing: true, recoil: 0.03 },
  reload: { reloadK: 0.5 },
  swap: { swapT: SWAP_TIME * 0.5, gun: "pistol", from: "rifle" },
  cover: { cover: "high" },
  down: { downed: true },
  pistol: { gun: "pistol" },
  pistolAim: { gun: "pistol", aimK: 1 },
  pistolReload: { gun: "pistol", reloadK: 0.5 },
  launcher: { gun: "launcher", aimK: 1 },
  laser: { gun: "laser", aimK: 1 },
  jump: { air: true },
};

// A generated GLB as one group, shadows on, optionally flat shaded.
async function loadGlb(id, q) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const g = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${id}.glb`);
  const o = g.scene;
  o.name = `glb:${id}`;
  o.scale.setScalar(q.has("scale") ? Number(q.get("scale")) : 1);
  let tris = 0;
  o.traverse((m) => {
    if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
    if (q.get("flat") === "1") for (const mat of [].concat(m.material)) { mat.flatShading = true; mat.needsUpdate = true; }
  });
  const clips = g.animations ?? [];
  console.log(`glb ${id}: ${Math.round(tris)} triangles${clips.length ? `, clips: ${clips.map((c) => `${c.name} (${c.duration.toFixed(1)}s)`).join(", ")}` : ""}`);
  if (clips.length) {
    const want = q.get("clip");
    const clip = (want && clips.find((c) => c.name.toLowerCase().includes(want.toLowerCase()))) ?? clips[0];
    o.userData.mixer = new T.AnimationMixer(o);
    o.userData.mixer.clipAction(clip).play();
  }
  return o;
}

export async function startViewer(q) {
  const id = q.get("model");
  const app = document.getElementById("app");
  document.body.classList.add("viewer");
  const renderer = makeRenderer(app);
  const scene = new T.Scene();
  scene.background = new T.Color(0x9fb4c8);
  scene.environment = envMap(renderer);
  scene.environmentIntensity = 0.35;
  const light = new Sun(scene, { box: 8, dir: [0.5, 0.9, -0.6], hemi: 1.1, ground: 0x8a8a7a });
  light.follow(0, 0, 0);
  const floor = new T.Mesh(new T.CircleGeometry(30, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0xc7cfd6, roughness: 1 }));
  floor.receiveShadow = true;
  scene.add(floor);

  // Options from the query.
  const opts = {};
  for (const [k, v] of q) if (!["model", "yaw", "pitch", "t", "zoom", "pose", "k"].includes(k)) opts[k] = /^0x[0-9a-f]+$/i.test(v) ? parseInt(v, 16) : v === "1" ? true : v === "0" ? false : v;
  const poseName = q.get("pose") ?? "idle";
  const kk = q.has("k") ? Number(q.get("k")) : null;

  if (q.get("fig") === "glb") await loadAssets(GLB_LIST);
  const glbs = q.has("glb") ? q.get("glb").split(",").filter(Boolean) : [];
  const ids = (id === "all" ? Object.keys(MODELS).filter((k) => k !== "ranger").concat(["ranger", "ranger"]) : id ? [id] : []).concat(glbs.map((g) => `glb:${g}`));
  const loaded = Object.fromEntries(await Promise.all(glbs.map(async (g) => [g, await loadGlb(g, q).catch((e) => { console.error("glb", g, e); return null; })])));
  const items = [];
  const cols = Math.ceil(Math.sqrt(ids.length));
  let x = 0, z = 0;
  ids.forEach((mid, i) => {
    const glb = mid.startsWith("glb:") ? loaded[mid.slice(4)] : null;
    if (!glb && !MODELS[mid]) { console.warn("no model", mid); return; }
    let o, fig = null;
    if (glb) o = glb;
    else if (mid === "ranger") {
      const skin = id === "all" ? (i === ids.length - 1 ? "kessler" : "player") : (opts.skin ?? "player");
      const pose = RANGER_POSES[poseName] ?? RANGER_POSES.idle;
      const first = pose.from ?? pose.gun ?? "rifle";
      const slots = first === "pistol" ? ["pistol", "rifle"] : [first, "pistol"];
      fig = q.get("fig") === "glb" ? makeRanger(scene, skin, slots) : new RangerFigure(scene, skin, slots);
      fig.shown = first;
      o = fig.obj;
    } else o = make(MODELS[mid], opts);
    const bb = new T.Box3().setFromObject(o);
    if (bb.min.y < 0) o.position.y = -bb.min.y;
    const w = Math.max(1.2, bb.max.x - bb.min.x + 0.6);
    if (i % cols === 0 && i) { z += 3; x = 0; }
    o.position.x = x + w / 2; o.position.z = z;
    x += w;
    scene.add(o);
    items.push({ o, fig, w });
  });

  // Frame the lot.
  const box = new T.Box3();
  for (const it of items) box.expandByObject(it.o);
  const c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
  const fov = 32;
  const r = size.length() / 2 / Math.sin(T.MathUtils.degToRad(fov) / 2) * (ids.length > 1 ? 0.6 : 1.0);
  if (ids.length === 1) { for (const it of items) it.o.position.x -= c.x; c.x = 0; }
  const camera = new T.PerspectiveCamera(fov, 1, 0.01, 800);
  const fixedYaw = q.has("yaw") ? Number(q.get("yaw")) : null;
  const fixedT = q.has("t") ? Number(q.get("t")) : null;
  const pitch = q.has("pitch") ? Number(q.get("pitch")) : 0.22;
  let zoom = q.has("zoom") ? 1 / Number(q.get("zoom")) : 1;

  const resize = () => {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize);
  resize();

  let drag = null, yaw = fixedYaw ?? -0.6;
  addEventListener("pointerdown", (e) => { drag = e.clientX; });
  addEventListener("pointerup", () => { drag = null; });
  addEventListener("pointermove", (e) => { if (drag !== null) { yaw -= (e.clientX - drag) * 0.01; drag = e.clientX; } });
  addEventListener("wheel", (e) => { zoom *= Math.exp(e.deltaY * 0.001); });

  // A ranger's synthetic state for the chosen pose.
  const body = { px: 0, x: 0, py: 0, y: 0, pz: 0, z: 0, grounded: true, speed2D: 0 };
  const state = (t) => {
    const P = RANGER_POSES[poseName] ?? RANGER_POSES.idle;
    const s = { body, face: 0, yaw: 0, pitch: 0, aimK: 0, crouchK: 0, moveK: 0, stepPhase: 0, firing: false, recoil: 0, downed: false, gun: "rifle", sprint: false, reloadK: -1, swapT: 0, cover: null, reach: null, ...P };
    if (P.gun) s.gun = P.gun;
    if (P.speed) s.stepPhase = t * P.speed * 1.25;
    body.speed2D = P.speed ?? 0;
    body.grounded = !P.air;
    if (P.reloadK !== undefined) s.reloadK = kk ?? (fixedT !== null ? P.reloadK : (t * 0.45) % 1);
    if (P.swapT !== undefined) s.swapT = kk !== null ? SWAP_TIME * (1 - kk) : SWAP_TIME * (1 - ((t * 0.8) % 1));
    return s;
  };

  const t0 = performance.now();
  let lastT = 0;
  const frame = () => {
    const t = fixedT ?? (performance.now() - t0) / 1000;
    const dt = fixedT !== null ? 1 / 60 : Math.min(0.1, t - lastT);
    lastT = t;
    if (fixedYaw === null && drag === null && ids.length === 1) yaw += 0.004;
    for (const it of items) if (it.o.userData.mixer) it.o.userData.mixer.setTime(t);
    for (const it of items) if (it.fig) {
      const s = state(t);
      // Settle the damped bits when the time is fixed.
      for (let i = 0; i < (fixedT !== null ? 40 : 1); i++) it.fig.pose(s, 1, 1 / 60, t);
      // (pose sets the position from the body; keep the layout)
      it.o.position.set(it.o.userData.lx ?? (it.o.userData.lx = it.o.position.x), it.o.position.y, it.o.userData.lz ?? (it.o.userData.lz = it.o.position.z));
    }
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
