#!/usr/bin/env node
// @ts-check
import { main } from "../src/cli.mjs";

process.exitCode = await main(process.argv.slice(2));
