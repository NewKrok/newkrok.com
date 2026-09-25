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
  and flags levels that can be done without reversing. It is slow and hungry:
  lorry levels can run out of memory, and long routes need stop-over poses
  (the `VIA` table). Run one level at a time, `nice`d, never several in
  parallel: it makes the machine unusable.
- Bugs playtesting kept finding: segmented hedges whose gap doesn't line up
  with the road (build them from separate lines), a shortcut that lets you
  drive forwards into the bay, props dropped in the only gateway, lamps
  standing on the road (lamps take an arm angle `a`), and the bay facing
  the other way from the parked vehicles next to it.

## Testing without a screen

Headless Chromium from playwright-core with software GL:

```js
chromium.launch({ executablePath, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
```

Open a level through the debug handle, switch to the overview camera, take
a screenshot and look at it. This caught most layout mistakes before anyone
played them. Stop the dev server and the browser when done.
