// Screenshots of models through the dev viewer (?model=…).
// node scripts/models.mjs <out-dir> <id|all> [query …]
// Each extra argument is one picture: a query string such as
// "pose=aim&yaw=-0.6" or "skin=kessler&pose=reload&k=0.5&zoom=1.6".
import { launch, URL } from "./browser.mjs";
const [out = ".", id = "all", ...queries] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: Number(process.env.W || 900), height: Number(process.env.H || 700) } });
const logs = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text()); });
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
let i = 0;
for (const qs of queries.length ? queries : ["yaw=-0.6"]) {
  const q = new URLSearchParams(qs);
  if (!q.has("yaw")) q.set("yaw", "-0.6");
  if (!q.has("t")) q.set("t", "0.4");
  await p.goto(`${URL}?model=${id}&${q}`, { waitUntil: "load" });
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${out}/${id}_${i++}.png` });
}
console.log(logs.slice(0, 15).join("\n"));
await b.close();
