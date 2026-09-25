// ── Analytics ────────────────────────────────────────────────────────────
// Google Analytics 4, the same property as newkrok.com, so the game's
// numbers sit next to the site's. Only in production builds: the dev
// server and headless checks never report anything.

const GA_ID = "G-JPELFBHLSB";
const enabled = import.meta.env.PROD;

if (enabled) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { page_title: "Hitch & Park" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

// Every event is named hitch_park_<name> and carries game: "hitch-park",
// so the game's events never mix with the rest of the site's.
export function track(name, params = {}) {
  if (!enabled) return;
  try { window.gtag("event", `hitch_park_${name}`, { game: "hitch-park", ...params }); } catch { /* never break the game */ }
}
