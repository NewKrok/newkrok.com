// Headless Chromium for the check scripts. playwright-core is not a
// dependency of the game: point PLAYWRIGHT_CORE at an install of it (or of
// playwright) and CHROME at a Chromium binary.
import os from "node:os";
const core = process.env.PLAYWRIGHT_CORE || `${os.homedir()}/work/nape-js/node_modules/playwright-core/index.mjs`;
const executablePath = process.env.CHROME || "/opt/pw-browsers/chromium";
const mod = await import(core);
const chromium = mod.chromium ?? mod.default.chromium;
export const launch = () => chromium.launch({ executablePath, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
export const URL = process.env.GAME_URL || "http://localhost:5360/";
