import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

// ── Generated models ─────────────────────────────────────────────────────
// The rigged, animated GLBs from scripts/tripo.mjs (public/models/<id>_anim.glb,
// more clips in <id>_anim2.glb…). An asset is loaded once and cloned per
// figure (the geometry is shared; the skeleton is cloned). Models are
// scaled to a height in metres, stood on y = 0, and flat shaded like the
// code-built ones. Nothing here is required: when a file is missing the
// game keeps its code-built figures.

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const url = (file) => `${import.meta.env.BASE_URL}models/${file}`;

export const ASSETS = {};        // id → { scene, clips, height, scale, bones }

// Loads <id>_anim.glb and merges the clips of <id>_anim2.glb… (clips only).
export async function loadAsset(id, { height, parts = 1, tint = null } = {}) {
  if (ASSETS[id]) return ASSETS[id];
  const g = await loader.loadAsync(url(`${id}_anim.glb`));
  const clips = [...(g.animations ?? [])];
  for (let n = 2; n <= parts; n++) {
    const more = await loader.loadAsync(url(`${id}_anim${n}.glb`)).catch(() => null);
    if (more) clips.push(...(more.animations ?? []));
  }
  const scene = g.scene;
  // Rest pose bounds: the scale and the ground offset.
  scene.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(scene);
  const h = bb.max.y - bb.min.y, scale = height / h;
  scene.traverse((m) => {
    if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = false;
    m.frustumCulled = false;      // skinned: the rest bounds lie
    for (const mat of [].concat(m.material)) {
      mat.flatShading = true;
      mat.roughness = Math.max(mat.roughness ?? 1, 0.7);
      if (tint) mat.color.setHex(tint);
      mat.needsUpdate = true;
    }
  });
  const bones = {};
  scene.traverse((o) => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, "")] = true; });
  ASSETS[id] = { scene, clips, height, scale, groundY: -bb.min.y, center: bb.getCenter(new T.Vector3()), bones: Object.keys(bones) };
  return ASSETS[id];
}

// Loads several; a failure only logs (the game falls back to code models).
export async function loadAssets(list) {
  await Promise.all(list.map(([id, opts]) => loadAsset(id, opts).catch((e) => console.warn(`glb ${id} not loaded:`, e.message))));
}

// A copy of an asset: root (place and face) → inner (scale, stood on the
// ground) → the skinned scene. Bones by short name (no mixamorig prefix).
export function instanceAsset(id) {
  const A = ASSETS[id];
  if (!A) return null;
  const scene = cloneSkinned(A.scene);
  const inner = new T.Group();
  inner.scale.setScalar(A.scale);
  inner.position.y = A.groundY * A.scale;
  inner.add(scene);
  const root = new T.Group();
  root.add(inner);
  const bones = {};
  scene.traverse((o) => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, "")] = o; });
  const mixer = new T.AnimationMixer(scene);
  const actions = {};
  for (const c of A.clips) actions[c.name] = mixer.clipAction(c);
  return { root, inner, scene, bones, mixer, actions, clips: A.clips };
}
