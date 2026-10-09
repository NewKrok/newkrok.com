import * as P from "./props.js";
import { ranger, survivor, GUNS } from "./characters.js";
import { BUG_MODELS } from "./bugs.js";

// Every model by name: model(builder, opts).
export const MODELS = { ...P, ranger, survivor, ...BUG_MODELS, ...Object.fromEntries(Object.entries(GUNS).map(([k, f]) => [`gun_${k}`, f])) };
