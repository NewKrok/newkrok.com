// ── Ghost rig ────────────────────────────────────────────────────────────
// A recorded run driven again on a sim of its own, step for step beside the
// player's: the physics is deterministic, so it does exactly what it did
// when it was set. It never touches the player's world; the scene draws it
// see-through. After its last step it brakes and stays where it parked.

import { createSim } from "./sim.js";
import { decodeReplay } from "./run.js";

const BRAKE = { throttle: 0, steer: 0, brake: true, holdSteer: false };

export function createGhost() {
  const sim = createSim();
  let inputs = null, level = null, steps = 0, i = 0;
  return {
    sim,
    info: null,                // { kind: "best" | "record" | "shared", name, score, steps, id? }
    // Picks the run to drive; false when its replay cannot be read.
    set(lvl, info) {
      inputs = decodeReplay(info.replay);
      if (!inputs) { this.clear(); return false; }
      level = lvl;
      steps = info.steps || inputs.length;
      this.info = info;
      return true;
    },
    clear() { this.info = null; inputs = null; level = null; },
    get active() { return !!this.info; },
    // Back to the start, with the player's attempt.
    reset() {
      if (!this.info) return;
      sim.load(level);
      sim.scoring = true;
      i = 0;
    },
    step() {
      if (!this.info) return;
      sim.step(i < steps ? inputs[i] ?? BRAKE : BRAKE);
      i++;
    },
    get parked() { return !!this.info && i >= steps; },
    get time() { return steps; },
  };
}
