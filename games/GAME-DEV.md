# Building a game: notes from Hitch & Park

What we learned making `hitch-park` (three.js r186 + @newkrok/nape-js 3.42),
written for the next game on the same stack. The mechanics of adding a game
to the site are in [README.md](README.md); this file is about the things
that were not obvious.

## Shape of a game

`hitch-park` is plain ES modules, no framework, about 4–5k lines in `src/`:

| File | Job |
| --- | --- |
| `config.js` | Units and tuning: `M = 12` px per metre, fixed `DT = 1/60`, vehicle and trailer specs. |
| `sim.js` | All physics. Knows nothing about rendering; the renderer reads positions from it. |
| `render/scene3d.js` | three.js scene built from the level data, synced from the sim every frame. |
| `render/topdown.js` | 2D canvas drawing: ground texture, level thumbnails, icons. |
| `hud.js` | HUD on a separate 2D canvas over the WebGL one. |
| `audio.js` | WebAudio, every sound synthesised (no audio files). |
| `levels/kit.js` + `levels/chN.js` | Levels as plain data built with small helpers. |
| `i18n/` | UI and level texts per language; English level texts live with the level data. |
| `analytics.js` | GA events, consent-aware (see below). |

The main loop runs the physics at a fixed step (`while (acc >= DT)`) and
renders once per frame. Keep the sim deterministic and render-free: this is
what made headless level checking possible.

## Site integration

- Vite `base: "./"` and your own dev port (a stale service worker on Vite's
  default 5173 hijacked the page once).
- Analytics: import `track()` from the game's `analytics.js` (copy it).
  Event names are `<slug>_<event>` plus a `game: "<slug>"` param so they never
  mix with the site's events. It only runs in production builds and only once
  `localStorage["newkrok-consent"] === "granted"` (set by the site's cookie
  banner; the game in its iframe shares the origin and hears the `storage`
  event).
- Debug handle: expose `window.__<game>` with the state and a few actions,
  but only `if (import.meta.env.DEV)`.
- Credit line in the game: "Krisztian Somoracz, with the help of Claude",
  with links to three.js and nape-js.

## three.js

- r186 has no `PCFSoftShadowMap`; use `PCFShadowMap`. Make the shadow
  camera follow the player with a tight box instead of covering the whole
  map: sharper shadows and cheaper.
- Draw calls are the budget. Merge static props into one mesh per material
  when a level loads; draw trees, bollards and the like with `InstancedMesh`;
  use one `InstancedMesh` ring buffer for skid marks.
- The ground is one baked canvas texture (surfaces painted as tiles, road
  markings on top), not many meshes.
- Z-fighting showed up everywhere two faces were coplanar: tyres against
  wheel arches, rims against tyres, roof parts against the roof. Offset by
  ~1 px or change the size so faces never share a plane.
- Water: one sheet per water rectangle, split around decks and ramps so it
  never covers them.

## nape-js

- A car is a chassis plus four wheel bodies. Wheels are pinned with
  `PivotJoint`, steering is an `AngleJoint` whose limits we move (Ackermann),
  and each tyre applies its own forces inside a friction circle. That gives
  sliding, grip per surface (mud, sand, snow) and a skid value for sound and
  marks.
- A trailer is one more body on a `PivotJoint`, with an `AngleJoint` limit
  against jack-knifing. For a semi, the kingpin sits over the tractor's
  driven rear axle; it reverses very differently from a car trailer.
- Contacts: give the vehicle and the obstacles their own `CbType`s and use an
  `InteractionListener` (BEGIN, COLLISION) for bumps, with a per-body
  cooldown.
- Loose props (hay bales) are small dynamic bodies. Parked cars are dynamic
  bodies too (lorries heavier), so a hit shoves them a little.
- "In the bay" checks need ~1.5 px slack: backing against a wall pushes the
  tail a hair into it.

## Sound

- Everything is oscillators and filtered noise through a master, sfx and
  music gain chain; start the `AudioContext` on the first user input.
- Engine: a few sines at rpm-related frequencies plus a filtered rumble.
  Pure sawtooths sounded harsh.
- Tyre squeal: white noise through two narrow band-passes (~1.7 and
  ~2.6 kHz) whose pitch drifts, with a light amplitude flutter; gain ∝ skid^1.5.
  Gate it on real sliding speed, otherwise slow parking manoeuvres hiss.
- Match loudness by measuring RMS with an `OfflineAudioContext` in headless
  Chromium instead of guessing.

## Levels

- Levels are data (`surfaces`, `paint`, `statics`, `parked`, `start`, `bay`)
  made with helpers from `kit.js`: bay rows, roads from polylines,
  `smooth()` for round corners, `wallLine()` for hedges and fences along a
  line, `sample()` / `distToLine()` for trees and rocks beside a road.
- `npm run check-levels` loads every level in the real sim and reports
  overlaps, a blocked bay, or a start inside something. Run it after every
  change.
- `npm run solve-levels [-- <n>]` searches for a way to park (hybrid A*)
  and flags levels that can be done without reversing. Long routes need
  stop-over poses (the `VIA` table). Run one level at a time, `nice`d. Its
  distance fields are Float64: in Float32, rounding made equal-cost cells
  look improvable and the search re-expanded them endlessly, which is what
  used to make big levels take many minutes and run out of memory.
- A trailer that is not a box needs its own collision shape: the field
  gun was a full 4.4 × 2 m rectangle, so its invisible corners touched the
  wire. It is now shield + barrel + trail, denser to keep the old mass.
- Season packs (`SEASONS` in `src/levels.js`, e.g. `levels/autumn.js`)
  sit after the main game in `LEVELS`, so the main levels keep their
  indices. Each level carries `season`, `num` (its number within the main
  game or its pack) and `first` (opens by itself); a pack opens without
  the chapters and its jobs unlock one after another. These fields, and
  render-only ones like `foliage`, `cargo`, `livery`, are listed in
  `COSMETIC` in `src/run.js`, so adding a pack leaves every existing
  level's fingerprint (and leaderboard) alone.
- Mines (`level.mines`) are checked in `sim.step` against the tow vehicle's
  outline and the trailer's axle; the solver treats them as obstacles.
- Players asked for varied starts: middle of the map, top, inside a shed
  nose-in (back out first), not always bottom-left.
- Bugs playtesting kept finding: segmented hedges whose gap doesn't line up
  with the road (build them from separate lines), a shortcut that lets you
  drive forwards into the bay, props dropped in the only gateway, lamps
  standing on the road (lamps take an arm angle `a`), and the bay facing
  the other way from the parked vehicles next to it.

## Input

- Keyboard, pointer drag and gamepad all feed one `readInput()` per physics
  step. The steering rack can be told to stay where it was left
  (`holdSteer`, the "Steering centres itself" setting: always / not
  reversing / never) for keys, d-pad and stick; pointer drag is absolute and
  always re-centres. Pointer drag can be limited to steering only, leaving
  throttle to the keys or the pad.
- Gamepad (`src/gamepad.js`): every connected pad is read and merged
  (following one "active" pad broke when the system listed the controller
  twice). A button or axis only counts once it has been seen at rest, so a
  stuck button or an axis resting at ±1 on another device cannot hold a
  direction. Non-standard pads get their d-pad from the hat axis (9), only
  their first twelve buttons are read (12+ are Home, Capture …) and the face
  buttons are reordered (Switch pads by letter, others by position).
  A HORI Switch pad on macOS Chrome shows up as two devices and sends no
  stick data at all, only the hat and the buttons.
  Settings show the raw readout for checking a player's controller.
- Menus are driven by moving the DOM focus: up / down picks the nearest row
  first, then the control closest across; left / right stays in the row;
  with nothing further, it scrolls the screen, and so does the right stick.
  A clicks the focused control (or the screen's primary button), B does
  what Escape does. A `pad-nav` class on `<body>` shows the focus until a
  key is pressed (segmented buttons need an inner ring: `overflow: hidden`
  clips an outline).
- To test the pad headless, stub `navigator.getGamepads` in an init script
  and hold each button for longer than a frame: software GL runs at a few
  frames per second, so a short tap falls between two polls.

## Testing without a screen

Headless Chromium from playwright-core with software GL:

```js
chromium.launch({ executablePath, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
```

Open a level through the debug handle, switch to the overview camera, take
a screenshot and look at it. This caught most layout mistakes before anyone
played them. Stop the dev server and the browser when done.

## Leaderboard and determinism

Hitch & Park's leaderboard trusts no score from the browser: the server
stores the run's inputs and a GitHub Action replays them with the game's
physics (setup and API: `public/api/hitch-park/README.md`). That only works
if a replay gives the same result everywhere, and out of the box it does
not: `Math.sin`, `cos` and `pow` differ in the last bits between engines,
even between Node 22 and Chrome 141, and the physics drifted apart on every
test run within seconds.

- `src/detmath.js` swaps the trig the sim and nape-js use (`sin`, `cos`,
  `tan`, `atan`, `atan2`, `asin`, `acos`, `hypot`) for musl/fdlibm ports made
  of `+ − × ÷` and `sqrt`, which IEEE 754 fixes to the bit. It is installed
  globally by `config.js`'s first import, before any level is built
  (level geometry uses trig too). About 1 ulp from the native results.
- No `Math.random` in a run that can finish (the one in the mine blast is
  fine: a mine ends the attempt), no wall-clock time in the sim.
- Analog input is rounded to 1/64 before the sim sees it, so the replay
  stores it exactly (`quantizeInput` in `src/run.js`).
- Scoring and the parking hold live in `src/run.js` and are shared by the
  game and the verifier; change them there only.
- Ghost rigs (`src/ghost.js`) lean on the same determinism: a second
  `createSim()` gets the recorded inputs step for step beside the player's
  sim and the scene draws its rig see-through. Cheap: a step costs some
  30 µs in Node.
- `SIM_VERSION` in `src/run.js`: bump it when a physics or tuning change
  alters how a run plays out. Every level's board starts afresh instead of
  the verifier rejecting the old records.

## Notes from Last Lantern

`last-lantern` (a survivor roguelite grown out of nape-js' Swarm Night demo)
uses the same split: `sim/` is render-free (`run.js` lifecycle, `core.js`
spawning / damage / drops, `monsters.js` AI and bosses, `weapons.js`,
`world.js` arenas), `render/` reads the run's arrays every frame.

- The crowd is the contact solver: monsters only blend a desired velocity
  into their body's own, so knockback, slams and shoved props survive into
  the next frame. Every random number comes from the run's seeded `R.rng`.
- `npm run bot -w games/last-lantern -- <stage> <hero> [seed]` plays a stage
  headless (`GOD=1` for boss-fight timing, `HEARTH='{"might":3}'` for meta
  upgrades). Weapons that pick targets must prefer the boss, or a kiting
  player never hurts it.
- Remove a body's joints before the body: nape throws "Constraints must have
  each body within the same space" on the next step otherwise (the worm).
- One NaN in an instance colour turns the whole frame black through the
  bloom pass. Every zone with a `life` needs its `T`.
- Monsters are `InstancedMesh` rigs per type, created lazily, with unlit
  parts for eyes and fire so bloom picks them up; static props are merged
  per material (`render/batch.js`); a small pool of point lights follows the
  hero between the stage's light sources.
- `scripts/shot.mjs`, `boss-shots.mjs`, `ui-shots.mjs` screenshot the dev
  server through `window.__lastLantern` (see `scripts/browser.mjs` for the
  Chromium paths).

### Performance (Hitch & Park)

- Fixed-step physics needs render interpolation: keep each moving body's
  pose from before the last step and draw `acc / DT` of the way to the
  current one (Hitch & Park `sim.pose`). Without it a 120/144 Hz screen shows
  the car stepping in jerks under a smoothly gliding camera, which players
  read as the camera falling out of sync with the physics.
- Parked cars as `InstancedMesh` per body type and material (paint and
  hazard lamps from the instance colour), building walls merged per window
  texture: Hitch & Park's busiest level went from ~800 draw calls to under 300.

### Performance (Last Lantern)

- Measure first: `scripts/profile.mjs` times the sim, rig sync and effects
  in a crowded scene and reports draw calls and triangles; Chrome's
  sampling heap profiler (CDP `HeapProfiler.startSampling` with
  `includeObjectsCollected…`) finds per-frame allocation sites.
- Instanced rigs: bake the parts that never move into one vertex-coloured
  geometry per type (hit flash and frost become an `instanceColor` tint
  over it); keep only swinging or held parts separate. Keep instanced
  geometry lean (a 20-triangle dot for eyes) and leave crowds out of the
  shadow pass - blob shadows are enough.
- Cull instanced crowds against the camera's real ground footprint (cast
  the four screen corners onto z = 0), not a guessed rectangle.
- Split merged static batches into ~1000 px chunks so the camera and the
  shadow camera can skip them.
- Hot loops: no `new Vec2` per body per step (`velocity.setxy`,
  `Vec2.weak` for impulses), no Object3D as a matrix scratchpad, and give
  every entity all its fields at creation so objects share one shape.
- Adaptive resolution (render scale down to 55 %, then no bloom) keeps
  weak GPUs playable without asking the player to find a setting.

## Notes from Dream Fixer

`dream-fixer` is first person, so the 2D nape-js plane was the wrong fit
(jumps, floating islands, a bridge you walk under). `sim/world.js` is a
small 3D collider set instead: boxes turned about y, ramps and upright
cylinders in a uniform grid over (x, z). A body is an upright cylinder:
walls push it out in the ground plane unless their top is within a step,
floors below `y + step` hold it, ramps are followed. Ray casts walk the
grid (2D DDA) and clip each piece plane by plane. It stays render-free,
so `scripts/bot.js` plays the whole dream headless.

- Every model is code in `render/models/*` over `render/modelkit.js`:
  chamfered boxes (a convex hull of three boxes), lathes, lumpy blobs,
  per-shape gradients along y and a little per-face shade jitter, baked
  into one vertex-coloured mesh per material (solid, metal, glass, glow).
  The dev viewer (`?model=<id>&yaw=…&t=…`, `scripts/models.mjs`) is where
  a model gets looked at before it goes into a level.
- The tool in hand is a second scene rendered after the world with the
  depth cleared (a `RenderPass` with `clear = false, clearDepth = true`),
  so it never pokes into walls. Its glowing parts get their own material
  so the colour can follow the heat.
- Clamp the frame dt at 0: after a long level build the first rAF stamp
  is older than `performance.now()` taken before it, and a negative dt
  through `damp()` blows exponentials up.
- Crowds: only two fuzzes may be winding up or lunging at once, the rest
  circle. Without it a casual bot fainted three times per anchor.
- Headless Chromium runs at a few frames per second: step the sim in
  small chunks with a `requestAnimationFrame` between, or every effect of
  a whole second lands in one frame and the screenshot is white.
