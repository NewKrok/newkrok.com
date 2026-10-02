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
// v3 reads the [tags] below as acting directions (they are not spoken and
// never shown); its stability is one of 0 (creative), 0.5, 1 (steady).
const MODEL = "eleven_v3";
const SETTINGS = { stability: 0.5, similarity_boost: 0.8 };

// How Margo says each line: the English text with acting tags woven in.
// If a line's text changes and no longer matches, it is read plainly (and
// the script says so) until the tags here are updated.
const ACTED = {
  hub_intro1: "[cheerfully] Evening, rookie! Welcome to the Dream Factory. [warmly] I'm Margo, your dispatcher on the night shift.",
  hub_intro2: "[gently] First night's a gentle one. A dog called Biscuit is having a bad dream. [brightly] Check the job board, over by the window.",
  hub_journal: "[reassuring] Missed something on the radio? Don't worry, I write it all in the journal. It's by the shelf, and you can leaf through it in the pause menu on a job, too.",
  hub_picked: "[pleased] Good pick. Take the lift down to the dreams. [playfully] Cog knows the way.",
  hub_back1: "[excited] Welcome back! First dream fixed and you're still in one piece. [laughs] Coffee's on me.",
  hub_back2: "[warmly] Dream dust buys upgrades at the workbench. [yawns] That's all the jobs tonight: more dreamers next shift!",
  hub_nojob: "[amused] Hold on, rookie: pick a job at the board first. The lift needs to know where to go.",
  hub_radio: "[tired] This is Margo. Still here, still on my third coffee. [sighs] Board, bench or lift: your call.",
  hub_bench: "[proudly] The workbench. Bring me dream dust and I'll make your tools purr.",
  park_in1: "[softly] You're in. [sniffs] Smells like cut grass and… [amused] tennis balls.",
  park_in2: "[concerned] Look at it: a grey, bruised sky, pink glitch shards in the air, cables everywhere. Three dream anchors should hold this dream together, and all three are broken. [focused] Look for the pink wisps and the dark patches on the ground.",
  park_in3: "[thoughtfully] One is in the pond past the east bridge, one on the dog run over the west bridge, and one on the little island up the bone steps.",
  park_foe: "[alarmed] Squirrels! [quickly] In a dog's dream the glitches come out as the thing it chases every day, and these ones chase back. Tangled up, see the pink yarn? Smooth them out with the Stabilizer!",
  park_nut: "[shouting] Duck! [urgently] The squirrels throw nuts. One that rears back with a nut over its head is about to throw: step aside, or shoot the nut out of the air.",
  park_bunny: "[amused] Dust bunnies: the Vacuum Cleaner's little pests. One zap each, or suck the whole pack up with the Fuzz Vacuum.",
  park_tub: "[confused] Is that… a bathtub? [laughs] A dog's second-worst nightmare. [urgently] It lobs soap bubbles: watch the ring on the ground and step out of it!",
  park_buzzer: "[alert] A Buzzer! It spits slow orbs. You can shoot them out of the air.",
  park_knot: "[serious] That's a Knot: it keeps tangling out new fuzzes. The Vacuum's stream unravels it.",
  park_tune: "[urgently] Tuning shakes glitches loose. Stay inside the ring and hold your ground!",
  park_fix1: "[delighted] One down, and look, the sky's clearing! [excited] I'm sending you the Fuzz Vacuum: hold it on glitches and the stream wears them down; the little ones it sucks right in, then right click fires them back out.",
  park_fix2: "[cheering] Two! One more to go.",
  park_all: "[triumphant] All three hold! [hesitant] Hm, the readings are still jumpy… [gasps] wait. Something big is coming up in the middle of the lawn!",
  park_memory: "[curious] Ooh, a memory. [warmly] Collect those: they tell us what the dream is really about.",
  park_boss: "[deadpan] A VACUUM CLEANER. [sighs] Of course. Every dog's worst nightmare.",
  park_suck: "[shouting] Don't let it gulp you! Run, or catch a fuzz and fire it right into the nozzle!",
  park_clog: "[laughs] Ha! Clogged! [excited] Go for the dust bag on its back!",
  park_phase: "[alarmed] Now it's furious. [shouting] Jump over that cord!",
  park_faint: "[gently] Easy there, rookie. I pulled you back to the last anchor.",
  park_win: "[overjoyed] Dream fixed! [laughs] Biscuit's snoring like a little engine. [warmly] Come on back up.",
};
const plain = (s) => s.replace(/\[[^\]]*\]\s*/g, "").replace(/\s+/g, " ").trim();
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
  if (spoken && plain(spoken) !== text.replace(/\s+/g, " ").trim()) { console.warn(`! ${id}: the acted text no longer matches the line, reading it plainly`); spoken = null; }
  spoken ??= text;
  const h = hash(spoken), file = path.join(outDir, `${id}.mp3`);
  if (!force && manifest[id]?.hash === h && fs.existsSync(file)) continue;
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
