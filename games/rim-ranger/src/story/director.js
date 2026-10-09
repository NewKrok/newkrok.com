import { line } from "../i18n/index.js";

// ── Who is talking ───────────────────────────────────────────────────────
// Takes the lines the run queues and says them one after another: the
// voice when there is one, the subtitle for as long as it is spoken (or a
// reading time). Barks that have waited too long are dropped so the talk
// never lags far behind the action.

export class Director {
  constructor(voice) {
    this.voice = voice;
    this.queue = [];
    this.cur = null;          // { id, speaker, name, text, until, el }
  }

  take(run) {
    for (const l of run.lines) this.queue.push({ ...l, t: performance.now() });
    run.lines.length = 0;
  }

  clear() { this.queue.length = 0; this.cur = null; this.voice.stop(); }

  update(now) {
    const c = this.cur;
    if (c) {
      // Done when the voice ends (or, without one, after the reading time).
      const el = c.el;
      const ended = el ? el.ended || el.failed || (el.paused && now > c.until + 4000) : now > c.until;
      if (!ended) return c;
      this.cur = null;
      this.gap = now + 280;
    }
    if (now < (this.gap ?? 0)) return null;
    // Barks older than a few seconds are no longer worth saying, and
    // nothing that waited half a minute (the moment has passed).
    while (this.queue.length && ((this.queue[0].id.match(/clear|ammo|spotted|downed|hit|up$|revive|charger|spitter|contact/) && now - this.queue[0].t > 5000) || now - this.queue[0].t > 30000)) this.queue.shift();
    const next = this.queue.shift();
    if (!next) return null;
    const L = line(next.id);
    if (!L) return null;
    const el = this.voice.ready ? this.voice.play(next.id, L.speaker) : null;
    this.cur = { id: next.id, ...L, el, until: now + 900 + L.text.length * 55 };
    return this.cur;
  }
}
