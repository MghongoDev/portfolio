#!/usr/bin/env node
/**
 * Break-restore cycle for the hero grain guard (ticket #11).
 *
 * Proves scripts/check-hero-grain.mjs is a real guard. It runs the guard in
 * baseline mode, then with --force-interactive, then baseline again.
 *
 * Usage:
 *   node scripts/verify-hero-grain.mjs [--base <url>] [--cdp <url>]
 *   Defaults: base=http://127.0.0.1:3311/, cdp=http://127.0.0.1:9229
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const GUARD = join(here, "check-hero-grain.mjs");

function parseArgs(argv) {
  const out = { base: "http://127.0.0.1:3311/", cdp: "http://127.0.0.1:9229" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--base") out.base = argv[++i];
    else if (a === "--cdp") out.cdp = argv[++i];
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

console.log("step 1/3  baseline: guard against the unbroken build");
const baseline = runGuard(args);
console.log(`          exit=${baseline.code}`);

console.log("\nstep 2/3  break: force the grain to accept pointer events");
const broken = runGuard(args, ["--force-interactive"]);
console.log(`          exit=${broken.code}`);

console.log("\nstep 3/3  restore: guard again with nothing broken");
const restored = runGuard(args);
console.log(`          exit=${restored.code}`);

console.log("\n================ verdict ================");
console.log(`baseline (unbroken)  exit=${baseline.code}  ${baseline.code === 0 ? "PASS" : "FAIL"}`);
console.log(`broken   (interactive) exit=${broken.code}  ${broken.code === 1 ? "PASS" : "FAIL"}`);
console.log(`restored (unbroken)  exit=${restored.code}  ${restored.code === 0 ? "PASS" : "FAIL"}`);

if (baseline.code !== 0) {
  console.error("\nThe baseline was already red, so this cycle proves nothing.");
  console.error(baseline.text.split("\n").slice(-12).join("\n"));
  process.exit(2);
}
if (broken.code !== 1) {
  console.error("\nThe guard did not go red on a violation it should have seen.");
  console.error(broken.text.split("\n").slice(-12).join("\n"));
  process.exit(2);
}
if (restored.code !== 0) {
  console.error("\nThe guard did not return to green after the restore.");
  process.exit(2);
}

console.log("\nThe guard fails for the intended reason and recovers, so its green is evidence.");
