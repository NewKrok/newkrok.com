// What to ask Tripo for: id → { prompt, model, … }. The id becomes
// public/models/<id>.glb (and a .png preview); scripts/tripo.mjs only
// regenerates an entry whose prompt or options changed.
//
// model: "P1-20260311" (clean low-poly game topology, 40 credits with a
// standard texture), "P2-20260801" (quad, 110) or "v3.1-20260211" (H series,
// 20 credits, add
// smart_low_poly: true for +10 to get a game mesh out of it).
// face_limit: P1 takes 48–20000 triangles; the H series with smart_low_poly
// 500–20000. The rest of the fields go into the request body as they are.
// rig: { model, rig_type, animations } rigs the model (25 credits) and bakes
// the presets into <id>_anim.glb (10 credits each). Rig v1.0-20240301 is
// biped only with 90+ presets (preset:biped:idle, walk, run, shoot, hurt,
// fall, jump, slash, turn, fire, standing_relax …); v2.5-20260210 does
// creatures too (preset:hexapod:walk …) with fewer presets.

// The look every prompt shares (DESIGN.md, 1.): Synty-like chunky low poly.
const STYLE =
  "Stylized low poly game asset in the style of Synty Studios polygon packs: " +
  "chunky rounded bevelled plates, flat shaded faces, a few strong flat colours, " +
  "no text, no decals, clean readable silhouette, a single object centred on a plain background.";

const BUG_PROMPT =
  `${STYLE} A menacing beetle-like alien insect monster, a six-legged hive bug the size of a large dog, ` +
  "seen in a low wide crouching stance. A huge domed carapace covers most of the body like a shield, split down " +
  "the middle by a raised spine ridge, rusty orange with bold dark tiger stripes. Under the back edge of the shell " +
  "a ringed segmented abdomen is tucked in. The head is small and set low at the front with two short horns, " +
  "sharp mandibles and glowing acid green eyes. Six long blade-like legs spread wide like a spider, each with " +
  "serrated fins and a pointed tip, the front pair raised like scythes. Glowing acid green seams between the plates.";
const BUG_NEGATIVE = "cute, friendly, cartoon face, ladybug, round body, smooth, soft, fur, wings spread, standing upright";

const P1 = { model: "P1-20260311", texture: true, pbr: false, texture_quality: "standard" };

export const MODELS = {
  crate: {
    ...P1, face_limit: 1500,
    prompt: `${STYLE} A rugged supply crate of a mining colony: rusted orange steel with worn grey bands, chamfered edges, a few big bolts and a recessed handle on each side.`,
  },
  generator: {
    ...P1, face_limit: 2500,
    prompt: `${STYLE} A portable diesel generator unit on skids: olive drab boxy body, a yellow exhaust stack, a control panel with a few big buttons and a gauge, chunky cables coiled on the side.`,
  },
  rover: {
    ...P1, face_limit: 4000,
    prompt: `${STYLE} A six-wheeled lunar mining rover with a small open cab: big chunky tyres, orange and grey hull with rust-red dust, a radio antenna, two round headlights, a cargo bed with a crate.`,
  },
  // The bug, after the silithid of WoW (DESIGN.md): a big domed shell, a
  // small low head, blade legs. Once with P1, once with P2 (quad-friendly
  // topology, 110 credits) to compare; both get a hexapod rig and a walk.
  swarmer: {
    ...P1, face_limit: 4000,
    prompt: BUG_PROMPT, negative_prompt: BUG_NEGATIVE,
    rig: { model: "v2.5-20260210", rig_type: "hexapod", animations: ["preset:hexapod:walk"] },
  },
  swarmer_p2: {
    model: "P2-20260801", texture: true, pbr: false, texture_quality: "standard", face_limit: 4000,
    prompt: BUG_PROMPT, negative_prompt: BUG_NEGATIVE,
    rig: { model: "v2.5-20260210", rig_type: "hexapod", animations: ["preset:hexapod:walk"] },
  },
  ranger: {
    ...P1, face_limit: 6000,
    prompt: `${STYLE} A space ranger in heavy sci-fi armour standing in a relaxed A-pose: white shell with lime green and purple stripes, a big segmented chest plate with a panel of buttons, large round pauldrons, knee guards, big gloved hands and heavy boots, an open helmet with a clear bubble visor showing the face of a tired veteran, a jetpack-like pack on the back.`,
    rig: { model: "v1.0-20240301", rig_type: "biped", animations: ["preset:biped:idle", "preset:biped:walk", "preset:biped:run", "preset:biped:shoot", "preset:biped:hurt", "preset:biped:jump", "preset:biped:fall", "preset:biped:hit_to_body_01"] },
  },
  // The same crate through the H series + smart low poly, to compare.
  crate_h: {
    model: "v3.1-20260211", texture: true, pbr: false, texture_quality: "standard", smart_low_poly: true, face_limit: 1500,
    prompt: `${STYLE} A rugged supply crate of a mining colony: rusted orange steel with worn grey bands, chamfered edges, a few big bolts and a recessed handle on each side.`,
  },
};

// Rough credit estimate per entry (developers.tripo3d.ai/en/pricing).
export function credits(m) {
  const tex = m.pbr || m.texture !== false;
  let c = m.model.startsWith("P2") ? (tex ? 110 : 100) : m.model.startsWith("P1") ? (tex ? 40 : 30) : (tex ? 20 : 10);
  if (m.texture_quality === "detailed") c += 10;
  if (m.texture_quality === "extreme") c += 20;
  if (!m.model.startsWith("P")) {
    if (m.smart_low_poly) c += 10;
    if (m.quad) c += 5;
    if (m.geometry_quality === "detailed") c += 20;
  }
  return c;
}
export const rigCredits = (m, reuse = false) => (reuse ? 0 : 25) + 10 * m.rig.animations.length;
