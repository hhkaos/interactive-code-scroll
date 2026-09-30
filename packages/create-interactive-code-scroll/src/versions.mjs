// @ts-check
import { readFileSync } from "node:fs";

/** The core package moves in lockstep with this one (tested). */
export const VERSION = /** @type {{ version: string }} */ (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))).version;

/** Astro range for generated projects: the core's peer dependency (tested). */
export const ASTRO_VERSION = "^7.3.5";
