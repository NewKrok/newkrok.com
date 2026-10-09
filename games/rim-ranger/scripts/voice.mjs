// The cast speaks: generates public/voice/<line id>.mp3 with the ElevenLabs
// text-to-speech API from the English story lines (the voices are English
// in every language; only the subtitles change).
//
// node scripts/voice.mjs [--force] [line ids…]
//
// The API key is read from elevenlabs.txt next to package.json (git-ignored)
// or ELEVENLABS_API_KEY. Only lines whose text, voice or model changed are
// generated again (manifest.json keeps a hash of each), so a run after a
// text edit costs just the edited lines. Taken over from Dream Fixer, with
// a voice per speaker (scripts/cast.mjs).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { LINES_EN } from "../src/i18n/lines-en.js";
import { VOICES, ACTED } from "./cast.mjs";

const MODEL = "eleven_v3";
const SETTINGS = { stability: 0.5, similarity_boost: 0.8 };
const FORMAT = "mp3_44100_64";
const words = (s) => s.replace(/\[[^\]]*\]/g, " ").toLowerCase().replace(/[^\p{L}\p{N}']+/gu, " ").trim();

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const outDir = path.join(root, "public", "voice");
const manifestPath = path.join(outDir, "manifest.json");
const keyFile = path.join(root, "elevenlabs.txt");
const key = (process.env.ELEVENLABS_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8") : "")).trim();
if (!key) { console.error("No API key: put it in elevenlabs.txt or ELEVENLABS_API_KEY."); process.exit(1); }

const args = process.argv.slice(2), force = args.includes("--force"), only = args.filter((a) => !a.startsWith("--"));
fs.mkdirSync(outDir, { recursive: true });
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const hash = (voice, text) => crypto.createHash("sha1").update(`${voice}|${MODEL}|${JSON.stringify(SETTINGS)}|${text}`).digest("hex").slice(0, 12);

let made = 0, chars = 0;
for (const [id, [who, text]] of Object.entries(LINES_EN)) {
  const V = VOICES[who];
  if (!V || (only.length && !only.includes(id))) continue;
  let spoken = ACTED[id];
  if (spoken && words(spoken) !== words(text)) { console.warn(`! ${id}: the acted text no longer matches the line, reading it plainly`); spoken = null; }
  spoken ??= text;
  const h = hash(V.id, spoken), file = path.join(outDir, `${id}.mp3`);
  if (!force && manifest[id]?.hash === h && fs.existsSync(file)) continue;
  delete manifest[id];
  fs.rmSync(file, { force: true });
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${V.id}?output_format=${FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: spoken, model_id: MODEL, voice_settings: SETTINGS }),
  });
  if (!r.ok) { console.error(id, r.status, (await r.text()).slice(0, 300)); break; }
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  manifest[id] = { hash: h };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
  made++; chars += spoken.length;
  console.log("✓", id, `(${V.name})`, spoken.length, "chars");
}
// Lines that no longer exist are dropped.
for (const id of Object.keys(manifest)) {
  if (LINES_EN[id] && VOICES[LINES_EN[id][0]]) continue;
  delete manifest[id];
  fs.rmSync(path.join(outDir, `${id}.mp3`), { force: true });
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
console.log(`${made} line(s) generated, ${chars} characters (credits).`);
