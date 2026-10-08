// Headless Chromium for the screenshot scripts. playwright-core is not a
// dependency of the game: point PLAYWRIGHT_CORE at an install of it (or of
// playwright) and CHROME at a Chromium binary.
import os from "node:os";
const home = os.homedir();
const core = process.env.PLAYWRIGHT_CORE || `${home}/work/nape-js/node_modules/playwright-core/index.mjs`;
const executablePath = process.env.CHROME || `${home}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const mod = await import(core);
const chromium = mod.chromium ?? mod.default.chromium;
export const launch = () => chromium.launch({ executablePath, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
export const URL = process.env.GAME_URL || "http://localhost:5340/";
