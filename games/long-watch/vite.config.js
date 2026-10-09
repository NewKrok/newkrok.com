import { defineConfig } from "vite";

// Relative base: the build works under /games/long-watch/ on newkrok.com
// and from any other folder too.
export default defineConfig({
  base: "./",
  // Own ports, so a service worker left behind by another project on
  // Vite's default 5173 cannot hijack the page.
  server: { port: 5360 },
  preview: { port: 5361 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
});
