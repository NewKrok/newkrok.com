import { defineConfig } from "vite";

// Relative base: the build works under /games/dream-fixer/ on newkrok.com
// and from any other folder too.
export default defineConfig({
  base: "./",
  // Own ports, so a service worker left behind by another project on
  // Vite's default 5173 cannot hijack the page.
  server: { port: 5340 },
  preview: { port: 5341 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
});
