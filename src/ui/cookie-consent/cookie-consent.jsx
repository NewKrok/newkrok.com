import { useEffect, useState } from "react";

import styles from "./cookie-consent.module.scss";

// The visitor's analytics choice: "granted", "denied" or null (not asked
// yet). Shared with the games under /games/ through localStorage.
export const CONSENT_KEY = "newkrok-consent";
export const OPEN_EVENT = "newkrok:cookie-settings";

const readConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
};

const saveConsent = (value) => {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage blocked: the banner will simply ask again next time.
  }
};

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));

const CookieConsent = () => {
  const [open, setOpen] = useState(() => readConsent() === null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  const accept = () => {
    saveConsent("granted");
    window.newkrokGrantAnalytics?.();
    setOpen(false);
  };

  const decline = () => {
    const wasGranted = readConsent() === "granted";
    saveConsent("denied");
    window.gtag?.("consent", "update", { analytics_storage: "denied" });
    setOpen(false);
    // Stop a tag that is already running.
    if (wasGranted) window.location.reload();
  };

  if (!open) return null;

  return (
    <div className={styles.banner} role="dialog" aria-live="polite" aria-label="Cookie consent">
      <p className={styles.text}>
        We use Google Analytics cookies to count visits and see which games
        and levels get played. No ads, no selling data. Is that OK?
      </p>
      <div className={styles.buttons}>
        <button type="button" className={styles.decline} onClick={decline}>
          Decline
        </button>
        <button type="button" className={styles.accept} onClick={accept}>
          Accept
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
