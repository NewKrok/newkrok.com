// ── Analytics ────────────────────────────────────────────────────────────
// Google Analytics 4, the same property as newkrok.com, so the game's
// numbers sit next to the site's. Only in production builds (the dev
// server and headless checks never report anything), and only once the
// visitor has accepted cookies on the site: the choice is shared through
// localStorage ("newkrok-consent"), so a yes given on the Gamer Zone page
// reaches the game in its iframe too.

const GA_ID = "G-JPELFBHLSB";
const CONSENT_KEY = "newkrok-consent";
const enabled = import.meta.env.PROD;

const consent = () => {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
};

let loaded = false;
function start() {
  if (loaded) return;
  loaded = true;
  window.gtag("consent", "update", { analytics_storage: "granted" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

if (enabled) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { page_title: "Hitch & Park" });
  if (consent() === "granted") start();
  // Accepted (or withdrawn) on the site while the game is open.
  window.addEventListener("storage", (e) => {
    if (e.key !== CONSENT_KEY) return;
    if (e.newValue === "granted") start();
    else window.gtag("consent", "update", { analytics_storage: "denied" });
  });
}

// Every event is named hitch_park_<name> and carries game: "hitch-park",
// so the game's events never mix with the rest of the site's. Events from
// before consent wait in the dataLayer and are only sent if it is given.
export function track(name, params = {}) {
  if (!enabled) return;
  try { window.gtag("event", `hitch_park_${name}`, { game: "hitch-park", ...params }); } catch { /* never break the game */ }
}
