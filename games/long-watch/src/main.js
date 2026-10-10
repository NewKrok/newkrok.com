// ── Boot ─────────────────────────────────────────────────────────────────
// ?model=<id> (dev only) opens the model viewer instead of the game:
// &yaw=<rad> &pitch=<rad> &t=<s> fix the turntable and the time, &pose=<name>
// poses the rangers (see viewer.js).
const q = new URLSearchParams(location.search);
if (import.meta.env.DEV && (q.has("model") || q.has("glb"))) import("./viewer.js").then((m) => m.startViewer(q));
else import("./game.js");
