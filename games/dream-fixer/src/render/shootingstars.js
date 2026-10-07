import * as T from "three";

// ── Shooting stars ───────────────────────────────────────────────────────
// Now and then a streak of light falls across the night outside (the
// Factory's window); more often while you stand and gaze out of it.
// A few pooled streaks, past the fog, high over Old Hum.

const POOL = 5;

export class ShootingStars {
  constructor(group) {
    const geo = new T.CylinderGeometry(0.06, 0.005, 1, 5, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
    this.items = Array.from({ length: POOL }, () => {
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xfff4d8, fog: false, toneMapped: false, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      m.visible = false;
      m.renderOrder = -1;
      group.add(m);
      return { m, t: 0, life: 0, v: new T.Vector3() };
    });
    this.nextT = 1.5;
  }

  // gazing: you are looking out of the window (they come thicker).
  update(dt, gazing) {
    this.nextT -= dt * (gazing ? 2.5 : 1);
    if (this.nextT <= 0) {
      this.nextT = 2.5 + Math.random() * 4;
      const s = this.items.find((x) => !x.m.visible);
      if (s) {
        const side = Math.random() < 0.5 ? -1 : 1;
        s.m.position.set((Math.random() - 0.5) * 120, 30 + Math.random() * 45, -70 - Math.random() * 90);
        s.v.set(side * (40 + Math.random() * 30), -(18 + Math.random() * 20), (Math.random() - 0.5) * 10);
        s.m.lookAt(s.m.position.clone().sub(s.v));
        s.len = 6 + Math.random() * 8;
        s.t = 0; s.life = 0.7 + Math.random() * 0.6;
        s.m.visible = true;
      }
    }
    for (const s of this.items) {
      if (!s.m.visible) continue;
      s.t += dt;
      const k = s.t / s.life;
      if (k >= 1) { s.m.visible = false; continue; }
      s.m.position.addScaledVector(s.v, dt);
      // Grows a tail as it goes, then fades out.
      s.m.scale.set(1 + (1 - k), 1 + (1 - k), s.len * Math.min(1, k * 4));
      s.m.material.opacity = Math.min(1, k * 6) * (1 - k * k);
    }
  }
}
