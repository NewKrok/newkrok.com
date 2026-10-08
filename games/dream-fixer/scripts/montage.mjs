// Tiles PNG screenshots into one image: node scripts/montage.mjs out.png cols a.png b.png …
import fs from "node:fs";
import { launch } from "./browser.mjs";
const [out, cols, ...files] = process.argv.slice(2);
const imgs = files.map((f) => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`);
const b = await launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;background:#000;width:1600px">${imgs.map((s) => `<img src="${s}" style="width:100%">`).join("")}</body>`);
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true });
await b.close();
