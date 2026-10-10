// 3D models from text: generates public/models/<id>.glb (and a rendered
// <id>.png preview) with the Tripo3D API (v3) from the prompts in
// scripts/tripo-models.mjs, then rigs and animates the ones that ask for it
// (<id>_anim.glb). The same shape as scripts/voice.mjs.
//
// node scripts/tripo.mjs [--dry] [--force] [--balance] [ids…]
//   --balance  print the credit balance and stop
//   --dry      list what would be generated, with the credit estimate
//   --force    regenerate even when the prompt did not change
//
// The API key is read from tripo.txt next to package.json (git-ignored) or
// TRIPO_API_KEY. Only entries whose prompt or options changed are generated
// again (manifest.json keeps a hash of each). Look at the results with the
// dev viewer: http://localhost:5360/?glb=crate,rover (&flat=1 for flat
// shading, ?glb=ranger_anim&clip=walk for an animation).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { MODELS, credits, rigCredits } from "./tripo-models.mjs";

const BASE = "https://openapi.tripo3d.ai/v3";
const PARALLEL = 4;          // P1 allows 5 tasks at once
const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const outDir = path.join(root, "public", "models");
const manifestPath = path.join(outDir, "manifest.json");
const keyFile = path.join(root, "tripo.txt");
const key = (process.env.TRIPO_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8") : "")).trim();

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const only = args.filter((a) => !a.startsWith("--"));
const force = flag("--force"), dry = flag("--dry");

const api = async (p, body) => {
  const r = await fetch(BASE + p, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.code !== 0) throw new Error(`${p}: HTTP ${r.status} code ${j.code ?? "?"} ${j.message ?? j.error ?? JSON.stringify(j).slice(0, 200)}`);
  return j.data;
};
const sleep = (ms) => new Promise((f) => setTimeout(f, ms));
const hash = (m) => crypto.createHash("sha1").update(JSON.stringify(m)).digest("hex").slice(0, 12);

// Submits a task and waits for it; returns the finished task.
async function task(label, endpoint, body) {
  const t0 = await api(endpoint, body);
  console.log(`… ${label}: task ${t0.task_id}`);
  for (;;) {
    await sleep(3000);
    const t = await api(`/tasks/${t0.task_id}`);
    if (t.status === "success") return t;
    if (["failed", "cancelled", "banned", "expired", "unknown"].includes(t.status)) throw new Error(`${label}: ${t.status} ${t.error_code ?? ""} ${t.error_message ?? ""}`);
  }
}
// The download links are good for five minutes.
async function download(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download HTTP ${r.status} ${file}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return fs.statSync(file).size;
}
const modelUrl = (t) => t.output?.model_url ?? t.output?.pbr_model ?? t.output?.model;

fs.mkdirSync(outDir, { recursive: true });
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const save = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");

// What is due: a model whose prompt changed, and a rig whose options (or
// model) changed.
const picked = Object.entries(MODELS).filter(([id]) => !only.length || only.includes(id));
const modelHash = ({ rig: _r, ...m }) => hash(m);
const rigHash = (m) => hash([modelHash(m), m.rig]);
// The skeleton alone: when only the preset list changed, the rig is reused.
const boneHash = (m) => hash([modelHash(m), m.rig.model, m.rig.rig_type, m.rig.spec]);
const todo = picked.filter(([id, m]) => force || manifest[id]?.hash !== modelHash(m) || !fs.existsSync(path.join(outDir, `${id}.glb`)));
const toRig = picked.filter(([id, m]) => m.rig && (force || todo.some(([t]) => t === id) || manifest[id]?.rig?.hash !== rigHash(m) || !fs.existsSync(path.join(outDir, `${id}_anim.glb`))));
const estimate = todo.reduce((s, [, m]) => s + credits(m), 0) + toRig.reduce((s, [id, m]) => s + rigCredits(m, manifest[id]?.rig?.bones === boneHash(m)), 0);

if (dry) {
  for (const [id, m] of todo) console.log(`${id.padEnd(12)} ${m.model.padEnd(13)} ~${credits(m)} credits  ${m.prompt.slice(0, 70)}…`);
  for (const [id, m] of toRig) console.log(`${id.padEnd(12)} ${manifest[id]?.rig?.bones === boneHash(m) ? "retarget" : "rig +"} ${m.rig.animations.length} animations ~${rigCredits(m, manifest[id]?.rig?.bones === boneHash(m))} credits`);
  console.log(`${todo.length} model(s), ${toRig.length} rig(s), ~${estimate} credits (~$${(estimate / 100).toFixed(2)}).`);
  process.exit(0);
}
if (!key) { console.error("No API key: put it in tripo.txt or TRIPO_API_KEY."); process.exit(1); }

const bal = await api("/account/balance");
console.log(`Balance: ${bal.balance} credits (${bal.frozen} frozen).`);
if (flag("--balance")) process.exit(0);
if (!todo.length && !toRig.length) { console.log("Nothing to generate."); process.exit(0); }
console.log(`${todo.length} model(s) and ${toRig.length} rig(s) to generate, ~${estimate} credits.`);
if (estimate > bal.balance) { console.error("Not enough credits."); process.exit(1); }

async function generate(id, m) {
  const { prompt, rig: _rig, ...opts } = m;
  const t = await task(id, "/generation/text-to-model", { prompt, ...opts });
  const url = modelUrl(t);
  if (!url) throw new Error(`${id}: no model in the output ${JSON.stringify(t.output).slice(0, 200)}`);
  const bytes = await download(url, path.join(outDir, `${id}.glb`));
  const img = t.output.rendered_image_url ?? t.output.rendered_image;
  if (img) await download(img, path.join(outDir, `${id}.png`)).catch(() => {});
  manifest[id] = { hash: modelHash(m), task: t.task_id, credits: t.credits_consumed, model: m.model, bytes };
  save();
  console.log(`✓ ${id}: ${(bytes / 1024).toFixed(0)} kB, ${t.credits_consumed} credits`);
  return Number(t.credits_consumed) || 0;
}

// Rig check (free), auto rig, then every preset in one retarget task:
// <id>_rig.glb and <id>_anim.glb.
async function rig(id, m) {
  const src = manifest[id]?.task;
  if (!src) throw new Error(`${id}: no generated model to rig`);
  const R = m.rig, prev = manifest[id].rig;
  let rigTask = prev?.bones === boneHash(m) ? prev.task : null, type = prev?.type, spent = 0;
  if (!rigTask) {
    const check = await task(`${id} rig-check`, "/animations/rig-check", { input: src });
    console.log(`  ${id}: riggable ${check.output.riggable}, suggested ${check.output.rig_type}`);
    if (!check.output.riggable) throw new Error(`${id}: not riggable`);
    type = check.output.rig_type;
    const rigged = await task(`${id} rig`, "/animations/rig", { input: src, model: R.model, rig_type: R.rig_type ?? type, spec: R.spec ?? "mixamo", out_format: "glb" });
    await download(modelUrl(rigged), path.join(outDir, `${id}_rig.glb`));
    rigTask = rigged.task_id;
    spent += Number(rigged.credits_consumed) || 0;
    // The skeleton is kept even when a retarget below fails.
    manifest[id].rig = { bones: boneHash(m), task: rigTask, type, credits: spent };
    save();
  }
  // At most five presets per retarget: the first batch carries the
  // geometry (<id>_anim.glb), the others only the clips (<id>_anim2.glb…).
  const files = [], anims = [];
  for (let i = 0; i < R.animations.length; i += 5) {
    const n = files.length + 1, file = `${id}_anim${n > 1 ? n : ""}.glb`;
    const anim = await task(`${id} retarget ${n}`, "/animations/retarget", { input: rigTask, animations: R.animations.slice(i, i + 5), out_format: "glb", bake_animation: true, animate_in_place: R.in_place ?? true, export_with_geometry: n === 1 });
    await download(modelUrl(anim), path.join(outDir, file));
    files.push(file); anims.push(anim.task_id);
    spent += Number(anim.credits_consumed) || 0;
  }
  const bytes = files.reduce((s, f) => s + fs.statSync(path.join(outDir, f)).size, 0);
  manifest[id].rig = { hash: rigHash(m), bones: boneHash(m), task: rigTask, anim: anims, parts: files.length, type, credits: spent, bytes };
  console.log(`✓ ${id} animated: ${(bytes / 1024).toFixed(0)} kB, ${spent} credits`);
  return spent;
}

// A small pool: PARALLEL jobs in flight. Rigs wait for their model.
let spent = 0, failed = 0;
async function pool(jobs) {
  const queue = [...jobs];
  await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
    while (queue.length) {
      const job = queue.shift();
      try { spent += await job(); } catch (e) { failed++; console.error("✗", e.message); }
    }
  }));
}
await pool(todo.map(([id, m]) => () => generate(id, m)));
await pool(toRig.filter(([id]) => manifest[id]?.task).map(([id, m]) => () => rig(id, m)));
// Entries that no longer exist are dropped (files kept until --force).
for (const id of Object.keys(manifest)) if (!MODELS[id]) delete manifest[id];
save();
const after = await api("/account/balance").catch(() => null);
console.log(`${todo.length + toRig.length - failed} job(s) done, ${failed} failed, ${spent} credits spent${after ? `, ${after.balance} left` : ""}.`);
