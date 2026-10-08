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
import { ACTED } from "./margo.mjs";

const VOICE = { name: "Jessica", id: "cgSgspJ2msm6clMCkdW9" };
// v3 reads the [tags] in margo.mjs as acting directions (they are not spoken and
// never shown); its stability is one of 0 (creative), 0.5, 1 (steady).
const MODEL = "eleven_v3";
const SETTINGS = { stability: 0.5, similarity_boost: 0.8 };

// Only the words must match the line on screen: case and punctuation are
// ignored, so "A VACUUM CLEANER." can be said deadpan and a calm "Duck."
// on screen can be a lively "Duck!" in the ear.
const words = (s) => s.replace(/\[[^\]]*\]/g, " ").toLowerCase().replace(/[^\p{L}\p{N}']+/gu, " ").trim();
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
  let spoken = ACTED[id];
  if (spoken && words(spoken) !== words(text)) { console.warn(`! ${id}: the acted text no longer matches the line, reading it plainly`); spoken = null; }
  spoken ??= text;
  const h = hash(spoken), file = path.join(outDir, `${id}.mp3`);
  if (!force && manifest[id]?.hash === h && fs.existsSync(file)) continue;
  // Out of date: drop the old take first, so a run that stops half way
  // (out of credits) never leaves a long old take under a new short text.
  delete manifest[id];
  fs.rmSync(file, { force: true });
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}?output_format=${FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: spoken, model_id: MODEL, voice_settings: SETTINGS }),
  });
  if (!r.ok) { console.error(id, r.status, (await r.text()).slice(0, 300)); break; }
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  manifest[id] = { hash: h };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
  made++; chars += spoken.length;
  console.log("✓", id, spoken.length, "chars");
}
// Lines that no longer exist (or changed speaker) are dropped.
for (const id of Object.keys(manifest)) {
  if (SPEAKERS.includes(LINES_EN[id]?.[0])) continue;
  delete manifest[id];
  fs.rmSync(path.join(outDir, `${id}.mp3`), { force: true });
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
console.log(`${made} line(s) generated, ${chars} characters (credits).`);
