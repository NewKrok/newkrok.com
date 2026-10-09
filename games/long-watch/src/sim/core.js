// ── The reactor ──────────────────────────────────────────────────────────
// The thing the bugs come for. It stands in the middle of the base, has
// health, and the run is lost when it is gone. It is a target like the
// ranger and the defenders (kind, body, downed, hurt), so the bugs' code
// does not care what it is biting; it just takes less per bite, because
// it is a machine the size of a shed.

export class Core {
  constructor(x, y, z, hp) {
    this.kind = "core";
    this.body = { x, y, z, px: x, py: y, pz: z, vx: 0, vz: 0, r: 2.4, h: 3.2, speed2D: 0, grounded: true };
    this.hp = hp; this.maxHp = hp;
    this.hitT = 0;
    this.lastHit = -99;
  }
  get x() { return this.body.x; } get z() { return this.body.z; }
  get downed() { return this.hp <= 0; }
  get exposure() { return 1; }
  get crouchK() { return 0; }

  hurt(run, dmg, fromX, fromZ, kind = "hit") {
    if (this.hp <= 0) return;
    dmg *= 0.6 * run.diff.dmg;
    this.hp = Math.max(0, this.hp - dmg);
    this.hitT = 0.15;
    this.lastHit = run.time;
    run.fx({ type: "coreHit", x: this.body.x, y: this.body.y + 1.5, z: this.body.z, kind });
    if (this.hp <= 0) { run.fx({ type: "coreDown" }); run.script.onCoreDown?.(run); }
  }
  repair(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
}
