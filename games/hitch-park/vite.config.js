import { defineConfig } from "vite";
import { leaderboardLevels } from "./scripts/leaderboard-levels.js";

// The leaderboard's PHP (public/api/hitch-park/) reads the level list from
// the build: /games/hitch-park/leaderboard-levels.json.
const leaderboardManifest = {
  name: "leaderboard-levels",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "leaderboard-levels.json", source: JSON.stringify(leaderboardLevels()) });
  },
};

// Relative base: the build works under /games/hitch-park/ on newkrok.com and
// from any other folder too.
export default defineConfig({
  base: "./",
  plugins: [leaderboardManifest],
  // Own ports, so a service worker left behind by another project on
  // Vite's default 5173 cannot hijack the page. The leaderboard API runs on
  // PHP's built-in server in development (see public/api/hitch-park/README.md).
  // LB_PROXY=https://newkrok.com points it at the live API instead.
  server: { port: 5310, proxy: { "/api": { target: process.env.LB_PROXY ?? "http://localhost:5312", changeOrigin: true } } },
  preview: { port: 5311, proxy: { "/api": { target: process.env.LB_PROXY ?? "http://localhost:5312", changeOrigin: true } } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
});
