import { stabilizer, fuzzVacuum } from "./tools.js";
import { csavar, kocPark, buzzerPark, knotPark } from "./characters.js";
import { anchor } from "./dream.js";
import { vacuumBoss } from "./boss.js";
import { jobBoard, workbench, desk, lift, dreamTank, pipe, almos, crate, shelf, rug, hangLamp, dock } from "./factory.js";
import { memoryBubble } from "./dream.js";
import { tree, bush, rock, bench, lamp, bone, tennisBall, hydrant, doghouse, fence, flowers, grass } from "./park.js";

// ── Model registry ───────────────────────────────────────────────────────
// Everything the model viewer (?model=<id>) can show, with the distance
// it frames the model at and an idle animation for its nodes.

const spin = (node, axis, speed) => (o, t) => { const n = o.userData.nodes[node]; if (n) n.rotation[axis] = t * speed; };

export const MODELS = {
  stabilizer: { build: stabilizer, frame: 0.55 },
  vacuum: { build: fuzzVacuum, frame: 0.55, anim: (o, t) => { o.userData.nodes.fan.rotation.z = t * 20; } },
  csavar: {
    build: csavar, frame: 1.1,
    anim: (o, t) => {
      const N = o.userData.nodes;
      N.prop.rotation.y = t * 18;
      N.body.position.y = Math.sin(t * 2.2) * 0.03;
      N.armL.rotation.z = 0.4 + Math.sin(t * 3) * 0.2;
      N.armR.rotation.z = -0.4 - Math.sin(t * 3 + 1) * 0.2;
      N.eye.rotation.y = Math.sin(t * 0.7) * 0.25;
    },
  },
  koc: {
    build: kocPark, frame: 2,
    anim: (o, t) => {
      const N = o.userData.nodes;
      const hop = Math.abs(Math.sin(t * 5));
      N.body.position.y = 0.36 + hop * 0.12;
      N.body.scale.set(1 + (1 - hop) * 0.08, 1 - (1 - hop) * 0.1, 1 + (1 - hop) * 0.08);
      N.tail.rotation.x = Math.sin(t * 5) * 0.2;
      N.tail.position.y = 0.3 + hop * 0.1;
    },
  },
  buzzer: {
    build: buzzerPark, frame: 1.6,
    anim: (o, t) => {
      const N = o.userData.nodes;
      N.wingL.rotation.z = Math.sin(t * 60) * 0.5; N.wingR.rotation.z = -Math.sin(t * 60) * 0.5;
      N.body.position.y = Math.sin(t * 3) * 0.05;
    },
  },
  knot: {
    build: knotPark, frame: 3,
    anim: (o, t) => { const s = 1 + Math.sin(t * 3) * 0.08; o.userData.nodes.core.scale.setScalar(s); },
  },
  boss: {
    build: vacuumBoss, frame: 7,
    anim: (o, t) => {
      const N = o.userData.nodes;
      N.hose1.rotation.set(-0.5 + Math.sin(t) * 0.2, Math.sin(t * 0.7) * 0.3, 0);
      N.hose2.rotation.set(0.9 + Math.sin(t * 1.3) * 0.2, 0, 0);
      N.nozzle.rotation.set(-0.3, 0, 0);
      N.bag.scale.setScalar(1 + Math.sin(t * 3) * 0.04);
    },
  },
  anchor: {
    build: anchor, frame: 4.2,
    anim: (o, t) => {
      const N = o.userData.nodes;
      N.ring1.rotation.y = t * 0.8;
      N.ring2.rotation.x = t * 1.3;
      N.crystal.rotation.y = -t * 0.6;
      N.crystal.position.y = 1.75 + Math.sin(t * 1.6) * 0.06;
    },
  },
  tree: { build: tree, frame: 9 },
  bush: { build: bush, frame: 3 },
  rock: { build: rock, frame: 2.5 },
  bench: { build: bench, frame: 3 },
  lamp: { build: lamp, frame: 5.5 },
  bone: { build: bone, frame: 4 },
  tennisBall: { build: tennisBall, frame: 3.5 },
  hydrant: { build: hydrant, frame: 2.6 },
  doghouse: { build: doghouse, frame: 4.6 },
  fence: { build: fence, frame: 5 },
  flowers: { build: flowers, frame: 2 },
  grass: { build: grass, frame: 1.4 },
  memory: { build: memoryBubble, frame: 1.6, anim: (o, t) => { o.userData.nodes.item.rotation.y = t; } },
  jobBoard: { build: jobBoard, frame: 3 },
  workbench: { build: workbench, frame: 3.4 },
  desk: { build: desk, frame: 2.8 },
  lift: { build: lift, frame: 4.5 },
  dreamTank: { build: dreamTank, frame: 4.5 },
  pipe: { build: pipe, frame: 3 },
  almos: { build: almos, frame: 16 },
  crate: { build: crate, frame: 1.4 },
  shelf: { build: shelf, frame: 2.8 },
  rug: { build: rug, frame: 4 },
  hangLamp: { build: hangLamp, frame: 2 },
  dock: { build: dock, frame: 1.8 },
};
export { spin };
