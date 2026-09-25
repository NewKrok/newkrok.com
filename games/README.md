# Games

Every folder here is one game: its own npm workspace with its own
dependencies and build (Vite). The homepage build compiles each of them and
copies the output to `build/games/<slug>/`, so a game is served at
`https://newkrok.com/games/<slug>/` and shown in the Gamer Zone in an iframe.
Built files are not committed.

## Working on a game

```sh
npm install                      # once, from the repo root (installs all workspaces)
npm run dev -w games/<slug>      # Vite dev server with hot reload
npm run build -w games/<slug>    # production build into games/<slug>/dist
```

`npm run build` at the root builds the homepage and then every game
(`scripts/build-games.js`); CI deploys the whole `build/` folder.
`npm run preview` then serves `build/` at http://localhost:4790/ the way the
live `.htaccess` does, so the games run inside the homepage iframe as they
will in production. (Don't use `serve -s`: it rewrites the game folders to
the homepage too.)

## Adding a new game

For the three.js + nape-js stack, read [GAME-DEV.md](GAME-DEV.md) first:
patterns and pitfalls from building Hitch & Park.

1. Create `games/<slug>/` with a `package.json` that has a `build` script
   writing to `dist/`, and a Vite config with `base: "./"` so the build works
   from any sub-folder.
2. Add a 480 × 270 preview image at `public/games/<slug>/media/preview.webp`.
3. Add an entry to `src/components/gamer-zone/gamer-zone.jsx`:

   ```js
   {
     label: "My Game",
     target: "<slug>",                          // route under /gamer-zone/
     preview: "/games/<slug>/media/preview.webp",
     url: "/games/<slug>/",                     // what the iframe loads
   },
   ```

4. Add `https://newkrok.com/gamer-zone/<slug>` to `public/sitemap.xml`.

Keep games self-contained: no imports from the homepage `src/`, and nothing
shared between games except through npm packages. A game that outgrows this
(its own backend, its own release cycle) can move to its own repository and
sub-domain, like MX Dash or Life of a Fish.

## Games

| Slug         | Engine                | Notes                                                        |
| ------------ | --------------------- | ------------------------------------------------------------ |
| `hitch-park` | three.js + nape-js    | Trailer and lorry parking, 30 levels in 6 chapters, 6 languages. Levels are data built with `src/levels/kit.js`; `npm run check-levels -w games/hitch-park` and `npm run solve-levels -w games/hitch-park` validate them. |
