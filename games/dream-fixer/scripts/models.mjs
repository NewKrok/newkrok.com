// Screenshots of models through the dev viewer.
// node scripts/models.mjs <out-dir> <id|all> [yaw ...]
import { launch, URL } from "./browser.mjs";
const [out = ".", id = "all", ...yaws] = process.argv.slice(2);
const b = await launch();
const p = await b.newPage({ viewport: { width: 900, height: 700 } });
const logs = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text()); });
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
for (const yaw of yaws.length ? yaws : ["-0.6"]) {
  await p.goto(`${URL}?model=${id}&yaw=${yaw}&t=0.4`, { waitUntil: "load" });
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${out}/${id}_${yaw}.png` });
}
console.log(logs.slice(0, 15).join("\n"));
await b.close();
