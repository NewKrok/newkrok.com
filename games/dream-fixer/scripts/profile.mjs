// Draw calls, triangles and frame cost at a few viewpoints of each level.
// node scripts/profile.mjs
import { launch, URL } from "./browser.mjs";
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on("pageerror", (e) => console.log("PAGEERROR " + e.message));
await p.goto(URL, { waitUntil: "load" });
await p.waitForTimeout(2500);
const spots = { factory: [[0, 4.5, 0], [0, -3, 3.1]], park: [[0, 18, 0], [-12, 0, 2.6], [15, -20, 0.4], [0, 5, 3.14]] };
for (const [lvl, list] of Object.entries(spots)) {
  await p.evaluate((l) => window.__dreamFixer.level(l), lvl);
  await p.waitForTimeout(800);
  for (const [x, z, yaw] of list) {
    const r = await p.evaluate(([x, z, yaw]) => new Promise((res) => {
      const D = window.__dreamFixer; D.place(x, z, yaw, 0); D.steps(1);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const R = D.view.renderer; R.info.autoReset = false; R.info.reset();
        D.view.composer.render(0.016);
        const i = R.info.render; res({ calls: i.calls, tris: i.triangles });
        R.info.autoReset = true;
      }));
    }), [x, z, yaw]);
    console.log(lvl.padEnd(8), `@${x},${z}`.padEnd(10), "calls", r.calls, "tris", r.tris);
  }
}
await b.close();
