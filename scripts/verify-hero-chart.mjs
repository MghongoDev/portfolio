#!/usr/bin/env node
/**
 * Break-restore cycle for the hero chart guard (ticket #12).
 *
 * Proves scripts/check-hero-chart.mjs is a real guard rather than a green
 * light. A cycle that takes its baseline before it breaks anything, then prints
 * all the verdicts side by side, is the only shape that proves a guard can go
 * red. A run whose baseline is already red proves nothing.
 *
 * Today this cycle has only the baseline step. The chart guard has no break flag
 * to force a violation with, so there is nothing to break and nothing to
 * restore, and this script says so rather than implying a proof. The break and
 * restore steps arrive with ticket #23.
 *
 * Usage:
 *   node scripts/verify-hero-chart.mjs <baseUrl> [--cdp url]
 *
 * Expects a server and a Chrome DevTools endpoint to be running already, the
 * way scripts/hero-harness.mjs leaves them. It starts neither.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const GUARD = join(here, "check-hero-chart.mjs");

// Same shape as the guards: the base URL first, then --cdp. scripts/hero-harness.mjs
// supplies both, so every hero script is invoked the same way and a reader only
// learns the shape once.
function parseArgs(argv) {
  const out = { base: null, cdp: "http://127.0.0.1:9229" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cdp") out.cdp = argv[++i];
    else if (!a.startsWith("--")) out.base = a;
  }
  if (!out.base) {
    console.error("usage: node scripts/verify-hero-chart.mjs <baseUrl> [--cdp url]");
    process.exit(2);
  }
  return out;
}

function runGuard(args, extra = []) {
  const r = spawnSync(process.execPath, [GUARD, args.base, "--cdp", args.cdp, ...extra], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return { code: r.status, text: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

const args = parseArgs(process.argv.slice(2));

console.log("step 1/1  baseline: guard against the unbroken build");
const baseline = runGuard(args);
console.log(`          exit=${baseline.code}`);

console.log("\n================ verdict ================");
console.log(`baseline (unbroken)  exit=${baseline.code}  ${baseline.code === 0 ? "PASS" : "FAIL"}`);

if (baseline.code !== 0) {
  console.error("\nThe baseline was already red, so this cycle proves nothing.");
  console.error(baseline.text.split("\n").slice(-12).join("\n"));
  process.exit(2);
}

console.log(
  "\nThe baseline is green. There is no break step yet, so this says nothing about",
  "\nwhether the guard can go red. Ticket #23 adds the break and the restore.",
);
