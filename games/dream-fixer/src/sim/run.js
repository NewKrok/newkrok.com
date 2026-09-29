import { DT } from "../config.js";
import { Body } from "./player.js";
import { ToolState } from "./tools.js";
import { buildLevel } from "../levels/kit.js";
import { rng } from "../rng.js";

// ── One visit to a dream ─────────────────────────────────────────────────
// Everything that happens in a level, with no rendering: the body, the
// tools, and (later) the Knots, anchors and the boss. The renderer and
// the sound read `events` after every step and clear them.

export class Run {
  constructor(levelDef, seed = 1) {
    this.def = levelDef;
    this.kit = buildLevel(levelDef);
    this.world = this.kit.world;
    this.rnd = rng(seed);
    this.body = new Body();
    const s = this.kit.spawn;
    this.checkpoint = { ...s };
    this.body.place(s.x, s.y, s.z, s.yaw);
    this.tools = [new ToolState("stabilizer")];
    this.tool = 0;
    this.time = 0;
    this.events = [];
    this._shots = [];
    this._hit = {};
  }

  get activeTool() { return this.tools[this.tool]; }

  // Unit vector of the view.
  aimDir(spread = 0) {
    const b = this.body;
    const yaw = b.yaw + (spread ? (this.rnd() - 0.5) * 2 * spread : 0);
    const pitch = b.pitch + (spread ? (this.rnd() - 0.5) * 2 * spread : 0);
    const cp = Math.cos(pitch);
    return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
  }

  step(intent, dt = DT) {
    this.time += dt;
    const b = this.body;
    b.step(this.world, intent, dt);
    if (b.jumped) this.events.push({ type: "jump" });
    if (b.landSpeed > 4) this.events.push({ type: "land", speed: b.landSpeed });
    if (b.fell) {
      // Falling out of a dream just puts you back: no harm done.
      const c = this.checkpoint;
      b.place(c.x, c.y, c.z, b.yaw);
      this.events.push({ type: "respawn" });
    }

    const tool = this.activeTool;
    this._shots.length = 0;
    for (const shot of tool.step(intent, dt, this._shots)) this.fire(tool, shot);
  }

  fire(tool, shot) {
    const d = tool.def, b = this.body;
    const [dx, dy, dz] = this.aimDir(shot.big ? 0 : d.spread);
    const ox = b.x, oy = b.eyeY, oz = b.z;
    const hit = this.world.raycast(ox, oy, oz, dx, dy, dz, d.range, this._hit);
    const t = hit ? hit.t : d.range;
    this.events.push({
      type: "shot", tool: tool.id, big: shot.big,
      o: [ox, oy, oz], d: [dx, dy, dz], t, hit: !!hit,
      n: hit ? [hit.nx, hit.ny, hit.nz] : null,
    });
  }
}
