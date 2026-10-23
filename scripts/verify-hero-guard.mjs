#!/usr/bin/env node
/**
 * Break-restore cycle for the hero scale guard (ticket #10).
 *
 * Proves scripts/check-hero-scale.mjs is a real guard rather than a green
 * light. The control inside the guard proves it can SEE a clip; this cycle
 * proves it exits non-zero for a real one and returns to green after.
 *
 * It takes the baseline BEFORE it breaks anything, then prints all three
 * verdicts side by side. A run whose baseline is already red proves nothing.
 *
 * The break is injected at measurement time via the guard's --variant flag
 * rather than by editing the source, because the guard measures a running
 * server's build: editing globals.css would not take effect without a rebuild.
 * The tree is never touched, so there is nothing to restore and nothing to
 * lose.
 *
 * Usage:
 *   node scripts/verify-hero-guard.mjs <baseUrl> [--cdp http://127.0.0.1:9229]
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const GUARD = join(here, "check-hero-scale.mjs");

// The scale this ticket replaced. Measured to clip at 375px, which is what
// makes it a valid break: the guard must go red for the intended reason.
const BAD_SCALE = "clamp(4rem, 17.5vw, 12.75rem)";

function parseArgs(argv) {
  const out = { base: null, cdp: "http://127.0.0.1:9229" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cdp") out.cdp = argv[++i];
    else if (!a.startsWith("--")) out.base = a;
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
if (!args.base) {
  console.error("usage: node scripts/verify-hero-guard.mjs <baseUrl> [--cdp url]");
  process.exit(2);
}
if (!existsSync(GUARD)) {
  console.error(`FATAL: guard not found at ${GUARD}`);
  process.exit(2);
}

console.log("step 1/3  baseline: guard against the shipped build, nothing broken");
const baseline = runGuard(args);
console.log(`          exit=${baseline.code}`);

console.log(`\nstep 2/3  break: force the hero to ${BAD_SCALE} (measured to clip at 375px)`);
const broken = runGuard(args, ["--variant", BAD_SCALE]);
console.log(`          exit=${broken.code}`);

console.log("\nstep 3/3  restore: guard again with nothing broken");
const restored = runGuard(args);
console.log(`          exit=${restored.code}`);

console.log("\n================ verdict ================");
console.log(`baseline (unbroken)  exit=${baseline.code}  ${baseline.code === 0 ? "PASS" : "FAIL"}`);
console.log(`broken   (clips)     exit=${broken.code}  ${broken.code === 1 ? "PASS" : "FAIL"}`);
console.log(`restored (unbroken)  exit=${restored.code}  ${restored.code === 0 ? "PASS" : "FAIL"}`);

if (baseline.code !== 0) {
  console.error("\nThe baseline was already red, so this cycle proves nothing.");
  console.error(baseline.text.split("\n").slice(-12).join("\n"));
  process.exit(2);
}
if (broken.code !== 1) {
  console.error("\nThe guard did not go red on a clip it should have seen.");
  console.error(broken.text.split("\n").slice(-12).join("\n"));
  process.exit(2);
}
if (restored.code !== 0) {
  console.error("\nThe guard did not return to green after the restore.");
  process.exit(2);
}

console.log("\nThe guard fails for the intended reason and recovers, so its green is evidence.");
