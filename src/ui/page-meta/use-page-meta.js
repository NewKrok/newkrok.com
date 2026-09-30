import { useEffect } from "react";

// Per-route head tags for a single-page app: title, description, canonical
// URL, Open Graph / Twitter cards and optional JSON-LD. The static
// index.html only describes the home page (and points every route's
// canonical at it), so pages that should rank on their own set these, and
// put the previous values back when they unmount.
const SITE = "https://newkrok.com";

const setTag = (selector, create, attr, value) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  const prev = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return () => (prev == null ? el.remove() : el.setAttribute(attr, prev));
};
const meta = (key, name, value) =>
  setTag(`meta[${key}="${name}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute(key, name);
    return m;
  }, "content", value);

const usePageMeta = ({ title, description, path, image, jsonLd }) => {
  useEffect(() => {
    const url = SITE + path;
    const img = image ? SITE + image : null;
    const prevTitle = document.title;
    document.title = title;
    const undo = [
      meta("name", "description", description),
      setTag('link[rel="canonical"]', () => {
        const l = document.createElement("link");
        l.rel = "canonical";
        return l;
      }, "href", url),
      meta("property", "og:title", title),
      meta("property", "og:description", description),
      meta("property", "og:url", url),
      meta("property", "twitter:title", title),
      meta("property", "twitter:description", description),
      meta("property", "twitter:url", url),
      ...(img ? [meta("property", "og:image", img), meta("property", "twitter:image", img)] : []),
    ];
    let ld = null;
    if (jsonLd) {
      ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(ld);
    }
    return () => {
      document.title = prevTitle;
      undo.forEach((f) => f());
      ld?.remove();
    };
  }, [title, description, path, image, jsonLd]);
};

export default usePageMeta;
