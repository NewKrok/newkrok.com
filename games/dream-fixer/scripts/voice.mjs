// Margo's lines spoken: generates public/voice/<line id>.mp3 with the
// ElevenLabs text-to-speech API, from the English story lines (the voice is
// English in every language; only the text on screen changes).
//
// node scripts/voice.mjs [--force] [line ids…]
//
// The API key is read from elevenlabs.txt next to package.json (git-ignored)
// or ELEVENLABS_API_KEY. Only lines whose text, voice or model changed are
// generated again (manifest.json keeps a hash of each), so a run after a
// text edit costs just the edited lines. Cog's lines stay beeps.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { LINES_EN } from "../src/i18n/lines-en.js";

const VOICE = { name: "Jessica", id: "cgSgspJ2msm6clMCkdW9" };
const MODEL = "eleven_multilingual_v2";
const SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true };
const FORMAT = "mp3_44100_64";
const SPEAKERS = ["margo"];

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const outDir = path.join(root, "public", "voice");
const manifestPath = path.join(outDir, "manifest.json");
const keyFile = path.join(root, "elevenlabs.txt");
const key = (process.env.ELEVENLABS_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8") : "")).trim();
if (!key) { console.error("No API key: put it in elevenlabs.txt or ELEVENLABS_API_KEY."); process.exit(1); }

const args = process.argv.slice(2), force = args.includes("--force"), only = args.filter((a) => !a.startsWith("--"));
fs.mkdirSync(outDir, { recursive: true });
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const hash = (text) => crypto.createHash("sha1").update(`${VOICE.id}|${MODEL}|${JSON.stringify(SETTINGS)}|${text}`).digest("hex").slice(0, 12);

let made = 0, chars = 0;
for (const [id, [who, text]] of Object.entries(LINES_EN)) {
  if (!SPEAKERS.includes(who) || (only.length && !only.includes(id))) continue;
  const h = hash(text), file = path.join(outDir, `${id}.mp3`);
  if (!force && manifest[id]?.hash === h && fs.existsSync(file)) continue;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}?output_format=${FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: SETTINGS }),
  });
  if (!r.ok) { console.error(id, r.status, (await r.text()).slice(0, 300)); break; }
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  manifest[id] = { hash: h };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
  made++; chars += text.length;
  console.log("✓", id, text.length, "chars");
}
// Lines that no longer exist (or changed speaker) are dropped.
for (const id of Object.keys(manifest)) {
  if (SPEAKERS.includes(LINES_EN[id]?.[0])) continue;
  delete manifest[id];
  fs.rmSync(path.join(outDir, `${id}.mp3`), { force: true });
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
console.log(`${made} line(s) generated, ${chars} characters (credits).`);
