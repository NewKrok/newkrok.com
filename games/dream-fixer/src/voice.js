// ── Margo's voice ────────────────────────────────────────────────────────
// Spoken lines from public/voice (made by scripts/voice.mjs): English in
// every language, the text on screen follows the chosen language. Played
// through a little radio filter (she is on the radio), with the music
// ducked under it. A line without a file (or with voices turned off) just
// types out with beep-talk as before.

export class Voice {
  constructor(audio, settings) {
    this.audio = audio;
    this.settings = settings;
    this.lines = {};
    this.el = null;
    // Lines wait for the list of voiced ones (the first would start silent);
    // a list that never comes stops holding them up after a few seconds.
    this.ready = false;
    const done = () => { this.ready = true; };
    fetch("./voice/manifest.json").then((r) => (r.ok ? r.json() : {})).then((m) => { this.lines = m; }).catch(() => {}).finally(done);
    setTimeout(done, 4000);
  }

  has(id) { return this.settings.voice !== false && !!this.lines[id]; }

  // Starts the line; returns the <audio> element (its duration arrives with
  // loadedmetadata), or null.
  play(id) {
    this.stop();
    if (!this.has(id)) return null;
    const el = new Audio(`./voice/${id}.mp3`);
    const A = this.audio;
    if (A.ctx) {
      try {
        const c = A.ctx, src = c.createMediaElementSource(el);
        const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 220;
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6000;
        this.gain = c.createGain();
        src.connect(hp).connect(lp).connect(this.gain).connect(A.master);
        el._nodes = [src, hp, lp, this.gain];
      } catch { this.gain = null; }
    }
    this.el = el;
    this.setVolume();
    A.duck?.(true);
    el.addEventListener("ended", () => { if (this.el === el) this.stop(); });
    // (A pause right as it starts interrupts play(): that is not a failure.)
    el.play().catch((e) => { if (e?.name === "AbortError") return; if (this.el === el) this.stop(); el.failed = true; });
    el.addEventListener("error", () => { if (this.el === el) this.stop(); el.failed = true; });
    return el;
  }

  setVolume() {
    const v = this.settings.voiceVol ?? 0.9;
    if (!this.el) return;
    if (this.gain) { this.gain.gain.value = v * 1.4; this.el.volume = 1; } else this.el.volume = Math.min(1, v * (this.settings.master ?? 1));
  }

  pause(on) {
    if (!this.el) return;
    if (on && !this.el.paused) this.el.pause();
    else if (!on && this.el.paused && !this.el.ended) this.el.play().catch(() => {});
  }

  stop() {
    const el = this.el;
    this.el = null;
    this.audio.duck?.(false);
    if (!el) return;
    el.pause();
    for (const n of el._nodes ?? []) try { n.disconnect(); } catch { /* gone */ }
  }
}
