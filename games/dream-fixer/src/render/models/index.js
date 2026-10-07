import { stabilizer, fuzzVacuum, foamCannon, lullabyBell, gustUmbrella, starYoyo, yoyoBall, sandSack } from "./tools.js";
import { starHook, plushRocket, windupRobot, spinTop, planetMobile, moonLamp, airlock, kidBed, kidDesk, toyChest, bookcase, stationConsole, spaceLamp, glowStar, porchLight, porthole, bunkBed, wardrobe, dollhouse, dish, telescope, starChart, cupolaFrame, asteroid } from "./space.js";
import { pinwheel, windWell, gnome, slingerGnome, trainTicket, wateringCan, wateringPot, lawnMower, sunflower, bigAlarmClock, raisedBed, shed, roseBush, greenhouse, flowerPot, appleTree, signalBox, stationHouse } from "./garden.js";
import { jelly, souffle, meatball, pepperShaker, rollingPin, meatGrinder, pressureCooker, kitchenWindow, panRail, knob, faucet, burner, kettle, jar, cuttingBoard, breadLoaf, fridge, flourSack, tableCloth, mug, tomato, bucket, spoon, pea } from "./kitchen.js";
import { csavar, kocPark, buzzerPark, knotPark, bunnyPark, tubPark } from "./characters.js";
import { anchor } from "./dream.js";
import { gear, wallGear, gearBit, lockGate, hatch, dreamColumn } from "./oldhum.js";
import { vacuumBoss } from "./boss.js";
import { jobBoard, workbench, desk, lift, dreamTank, pipe, oldHum, crate, shelf, rug, hangLamp, dock, lectern, dreamFrame, trophyCase, corkboard, calendar, cogPoster, gauges } from "./factory.js";
import { memoryBubble } from "./dream.js";
import { mugCoffee, mugCocoa, espresso, pillowBomb, vest, balloon, slipper, magnet, sieve, pouch } from "./kit.js";
import { alarmClock, pencil, backpack, sharpener, redPen, lockers, schoolDesk, teacherDesk, chalkboard, bookshelf, readingTable, schoolBus, flagpole, hoop, wallClock, bellTower, acUnit, fountain } from "./school.js";
import { tree, bush, rock, bench, lamp, bone, tennisBall, hydrant, doghouse, fence, flowers, grass, hurdle, tyre, pole, tunnel, sign, lilypad, reeds, gazebo, dock as jetty, cable, cloud } from "./park.js";

// ── Model registry ───────────────────────────────────────────────────────
// Everything the model viewer (?model=<id>) can show, with the distance
// it frames the model at and an idle animation for its nodes.

const spin = (node, axis, speed) => (o, t) => { const n = o.userData.nodes[node]; if (n) n.rotation[axis] = t * speed; };

export const MODELS = {
  stabilizer: { build: stabilizer, frame: 0.55 },
  vacuum: { build: fuzzVacuum, frame: 0.55, anim: (o, t) => { o.userData.nodes.fan.rotation.z = t * 20; } },
  foam: { build: foamCannon, frame: 0.55, anim: (o, t) => { o.userData.nodes.pump.position.z = -0.105 + 0.06 + Math.abs(Math.sin(t * 2)) * 0.03; } },
  bell: { build: lullabyBell, frame: 0.55, anim: (o, t) => { const N = o.userData.nodes; N.hammer.rotation.x = -0.5 + Math.abs(Math.sin(t * 2)) * 0.5; N.crank.rotation.x = t * 3; N.clapper.rotation.x = Math.sin(t * 4) * 0.15; } },
  umbrella: { build: gustUmbrella, frame: 0.8, anim: (o, t) => { const k = 0.1 + 0.9 * Math.min(1, Math.max(0, Math.sin(t * 1.2) * 1.4 + 0.4)); o.userData.nodes.canopy.scale.set(k, k, 1 + (1 - k) * 0.6); } },
  yoyo: { build: starYoyo, frame: 0.55 },
  sand: { build: sandSack, frame: 0.6, anim: (o, t) => { const N = o.userData.nodes; const k = 1 + Math.max(0, Math.sin(t * 3)) * 0.12; N.sack.scale.set(1 / k, 1 / k, k); N.sand.scale.setScalar(0.9 + Math.sin(t * 5) * 0.1); } },
  yoyoBall: { build: yoyoBall, frame: 0.9, anim: spin("spin", "x", 6) },
  starHook: { build: starHook, frame: 2.4, anim: spin("star", "y", 1) },
  rocket: { build: plushRocket, frame: 2, anim: (o, t) => { const N = o.userData.nodes; N.body.rotation.z = Math.sin(t * 2) * 0.2; N.flame.scale.setScalar(0.8 + Math.abs(Math.sin(t * 9)) * 0.4); } },
  robot: { build: windupRobot, frame: 1.8, anim: (o, t) => { const N = o.userData.nodes; N.key.rotation.z = t * 4; N.armL.rotation.x = Math.sin(t * 4) * 0.8; N.armR.rotation.x = -Math.sin(t * 4) * 0.8; } },
  top: { build: spinTop, frame: 3, anim: (o, t) => { const N = o.userData.nodes; N.spin.rotation.y = t * 6; N.body.rotation.z = Math.sin(t * 2) * 0.1; } },
  mobile: { build: planetMobile, frame: 4, anim: spin("arms", "y", 0.8) },
  moon: { build: moonLamp, frame: 12, anim: (o, t) => { const N = o.userData.nodes; N.lids.scale.y = 0.2 + Math.abs(Math.sin(t * 0.6)) * 0.8; N.chain.rotation.z = Math.sin(t * 1.3) * 0.15; } },
  airlock: { build: airlock, frame: 9 },
  kidBed: { build: kidBed, frame: 6 },
  kidDesk: { build: kidDesk, frame: 4.5 },
  toyChest: { build: toyChest, frame: 3.4 },
  bookcase: { build: bookcase, frame: 6 },
  console: { build: stationConsole, frame: 3.4 },
  spaceLamp: { build: spaceLamp, frame: 5 },
  glowStar: { build: glowStar, frame: 1.6 },
  porchLight: { build: porchLight, frame: 4.5 },
  porthole: { build: porthole, frame: 3.4 },
  bunkBed: { build: bunkBed, frame: 6 },
  wardrobe: { build: wardrobe, frame: 5.5 },
  dollhouse: { build: dollhouse, frame: 4.5 },
  dish: { build: dish, frame: 4.5 },
  telescope: { build: telescope, frame: 4 },
  starChart: { build: starChart, frame: 3.4 },
  cupolaFrame: { build: cupolaFrame, frame: 40 },
  asteroid: { build: asteroid, frame: 9 },
  pinwheel: { build: pinwheel, frame: 3, anim: spin("wheel", "z", 4) },
  windWell: { build: windWell, frame: 4.5 },
  gnome: { build: gnome, frame: 1.6, anim: (o, t) => { const N = o.userData.nodes; N.body.rotation.z = Math.sin(t * 6) * 0.08; N.shovel.rotation.x = -Math.abs(Math.sin(t * 2)) * 1.2; } },
  slinger: { build: slingerGnome, frame: 1.6, anim: (o, t) => { const N = o.userData.nodes; N.body.rotation.z = Math.sin(t * 6) * 0.08; N.shovel.rotation.x = -Math.abs(Math.sin(t * 2)) * 1.2; } },
  ticket: { build: trainTicket, frame: 1.2, anim: (o, t) => { o.userData.nodes.body.rotation.x = Math.sin(t * 9) * 0.4; } },
  can: { build: wateringCan, frame: 2, anim: (o, t) => { o.userData.nodes.body.rotation.x = -Math.max(0, Math.sin(t)) * 0.9; } },
  mower: { build: lawnMower, frame: 3.4, anim: (o, t) => { const N = o.userData.nodes; N.blades.rotation.y = t * 20; N.body.rotation.z = Math.sin(t * 30) * 0.01; } },
  sunflower: { build: sunflower, frame: 4.5, anim: (o, t) => { const N = o.userData.nodes; N.head.rotation.y = Math.sin(t * 0.7) * 0.6; N.core.scale.setScalar(1 + Math.max(0, Math.sin(t * 3)) * 0.08); } },
  bigclock: { build: bigAlarmClock, frame: 11, anim: (o, t) => { const N = o.userData.nodes; N.minute.rotation.z = -t * 2; N.hour.rotation.z = -t * 0.2; N.glass.rotation.y = Math.max(0, Math.sin(t * 0.6)) * 1.8; N.hammer.rotation.z = Math.sin(t * 30) * 0.4; N.key.rotation.y = t; } },
  wateringPot: { build: wateringPot, frame: 1.4 },
  raisedBed: { build: raisedBed, frame: 4.5 },
  shed: { build: shed, frame: 6 },
  roseBush: { build: roseBush, frame: 2 },
  greenhouse: { build: greenhouse, frame: 14 },
  flowerPot: { build: flowerPot, frame: 1.2 },
  appleTree: { build: appleTree, frame: 6 },
  signalBox: { build: signalBox, frame: 7 },
  stationHouse: { build: stationHouse, frame: 22 },
  jelly: { build: jelly, frame: 3.2, anim: (o, t) => { const s = Math.sin(t * 9) * 0.08; o.userData.nodes.body.scale.set(1 - s * 0.6, 1 + s, 1 - s * 0.6); } },
  meatball: { build: meatball, frame: 2, anim: (o, t) => { const n = o.userData.nodes.body, h = Math.abs(Math.sin(t * 5)); n.position.y = 0.36 + h * 0.25; n.scale.set(1 + (1 - h) * 0.1, 1 - (1 - h) * 0.12, 1 + (1 - h) * 0.1); } },
  pepper: { build: pepperShaker, frame: 2, anim: (o, t) => { o.userData.nodes.body.rotation.z = Math.sin(t * 2) * 0.3; } },
  rollingpin: { build: rollingPin, frame: 3.6, anim: (o, t) => { o.userData.nodes.roller.rotation.x = t * 2; } },
  grinder: { build: meatGrinder, frame: 3.4, anim: (o, t) => { o.userData.nodes.crank.rotation.x = t * 3; } },
  cooker: { build: pressureCooker, frame: 7, anim: (o, t) => { const N = o.userData.nodes; N.valve.rotation.y = t * 6; N.needle.rotation.z = -1.2 + Math.abs(Math.sin(t * 0.5)) * 2.4; N.lid.position.y = 2.25 + Math.max(0, Math.sin(t * 1.3)) * 0.4; } },
  kitchenWindow: { build: kitchenWindow, frame: 18 },
  panRail: { build: panRail, frame: 16 },
  knob: { build: knob, frame: 1 },
  faucet: { build: faucet, frame: 6 },
  burner: { build: burner, frame: 5 },
  kettle: { build: kettle, frame: 5 },
  jar: { build: jar, frame: 3.4 },
  cuttingBoard: { build: cuttingBoard, frame: 7 },
  breadLoaf: { build: breadLoaf, frame: 3.4 },
  fridge: { build: fridge, frame: 22 },
  flourSack: { build: flourSack, frame: 3.4 },
  tableCloth: { build: tableCloth, frame: 22 },
  mug: { build: mug, frame: 3.4 },
  tomato: { build: tomato, frame: 4.4 },
  bucket: { build: bucket, frame: 3.4 },
  spoon: { build: spoon, frame: 8 },
  pea: { build: pea, frame: 1.2 },
  souffle: { build: souffle, frame: 3.6, anim: (o, t) => { o.userData.nodes.puff.scale.y = 0.6 + Math.cos(t) * 0.4; } },
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
  bunny: { build: bunnyPark, frame: 1 },
  tub: { build: tubPark, frame: 3 },
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
  // Ethan's school.
  clock: { build: alarmClock, frame: 2.2, anim: (o, t) => { const N = o.userData.nodes; N.minute.rotation.z = -t * 4; N.hour.rotation.z = -t * 0.4; N.bells.rotation.z = Math.sin(t * 40) * 0.08; } },
  pencil: { build: pencil, frame: 3.4, anim: (o, t) => { const n = o.userData.nodes.body; n.rotation.y = t * 0.8; n.position.y = Math.abs(Math.sin(t * 4)) * 0.2; } },
  backpack: { build: backpack, frame: 3.2, anim: (o, t) => { o.userData.nodes.lid.rotation.x = -Math.max(0, Math.sin(t * 1.5)) * 0.8; } },
  sharpener: { build: sharpener, frame: 3.2, anim: (o, t) => { o.userData.nodes.crank.rotation.x = t * 3; } },
  pen: { build: redPen, frame: 6, anim: (o, t) => { o.userData.nodes.pen.rotation.x = Math.sin(t * 0.8) * 0.25; } },
  lockers: { build: lockers, frame: 4.5 },
  schoolDesk: { build: schoolDesk, frame: 2.4 },
  teacherDesk: { build: teacherDesk, frame: 2.8 },
  chalkboard: { build: chalkboard, frame: 5 },
  bookshelf: { build: bookshelf, frame: 5.5 },
  readingTable: { build: readingTable, frame: 3.2 },
  bus: { build: schoolBus, frame: 11 },
  flagpole: { build: flagpole, frame: 8 },
  hoop: { build: hoop, frame: 4.5 },
  wallClock: { build: wallClock, frame: 1.2 },
  bellTower: { build: bellTower, frame: 6 },
  acUnit: { build: acUnit, frame: 2.6 },
  fountain: { build: fountain, frame: 1.8 },
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
  hurdle: { build: hurdle, frame: 3 },
  tyre: { build: tyre, frame: 3.2 },
  pole: { build: pole, frame: 1.4 },
  tunnel: { build: tunnel, frame: 5 },
  sign: { build: sign, frame: 2 },
  lilypad: { build: lilypad, frame: 1.4 },
  reeds: { build: reeds, frame: 2 },
  gazebo: { build: gazebo, frame: 6 },
  jetty: { build: jetty, frame: 5 },
  cable: { build: cable, frame: 3 },
  cloud: { build: cloud, frame: 14 },
  memory: { build: memoryBubble, frame: 1.6, anim: (o, t) => { o.userData.nodes.item.rotation.y = t; } },
  jobBoard: { build: jobBoard, frame: 3 },
  workbench: { build: workbench, frame: 3.4 },
  desk: { build: desk, frame: 2.8 },
  lift: { build: lift, frame: 4.5 },
  dreamTank: { build: dreamTank, frame: 4.5 },
  pipe: { build: pipe, frame: 3 },
  oldHum: { build: oldHum, frame: 16 },
  gear: { build: gear, frame: 8, anim: spin("spin", "y", 0.3) },
  wallGear: { build: wallGear, frame: 8 },
  gearBit: { build: gearBit, frame: 4 },
  lockGate: { build: lockGate, frame: 7, anim: (o, t) => { const N = o.userData.nodes, k = Math.max(0, Math.sin(t * 0.8)) * 1.9; N.left.position.x = -1 - k; N.right.position.x = 1 + k; } },
  hatch: { build: hatch, frame: 4.5 },
  dreamColumn: { build: dreamColumn, frame: 8 },
  crate: { build: crate, frame: 1.4 },
  shelf: { build: shelf, frame: 2.8 },
  rug: { build: rug, frame: 4 },
  hangLamp: { build: hangLamp, frame: 2 },
  dock: { build: dock, frame: 1.8 },
  lectern: { build: lectern, frame: 1.8 },
  dreamFrame: { build: dreamFrame, frame: 1.4 },
  trophyCase: { build: trophyCase, frame: 2.4 },
  corkboard: { build: corkboard, frame: 1.8 },
  calendar: { build: calendar, frame: 1 },
  cogPoster: { build: cogPoster, frame: 1.4 },
  gauges: { build: gauges, frame: 1.8 },
  mugCoffee: { build: mugCoffee, frame: 0.4 },
  mugCocoa: { build: mugCocoa, frame: 0.4 },
  espresso: { build: espresso, frame: 0.3 },
  pillowBomb: { build: pillowBomb, frame: 0.6 },
  vest: { build: vest, frame: 0.8 },
  balloon: { build: balloon, frame: 0.7 },
  slipper: { build: slipper, frame: 0.45 },
  magnet: { build: magnet, frame: 0.4 },
  sieve: { build: sieve, frame: 0.6 },
  pouch: { build: pouch, frame: 0.45 },
};
export { spin };
