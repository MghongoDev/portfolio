#!/usr/bin/env node
/**
 * Break-restore cycle for the hero scale guard (ticket #10).
 *
 * The guard must be provably non-vacuous: it must see a clip when one is
 * forced, and pass when the shipped tree is intact. Three verdicts:
 *
 *   0  baseline  (no variant)      -> exit 0: every viewport clean
 *   1  break     (--variant 30vw)  -> exit 1: name clips on purpose
 *   2  restore   (no variant)      -> exit 0: every viewport clean again
 *
 * A green triple report means the guard could see a clip and could not pass
 * through a broken state. If the break step does not go red, the guard is
 * asleep and this cycle is void.
 *
 * Usage:
 *   node scripts/break-restore-scale-guard.mjs
 *
 * Exits 0 only when the full cycle stands (0,1,0); prints each step's exit
 * code and the harness's own verdict line so the break/restores are named.
 */

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const harness = join(root, "scripts", "hero-harness.mjs");
const guard = join(root, "scripts", "check-hero-scale.mjs");

const labels = ["baseline", "break", "restore"];
const commands = [
  [harness, guard],
  [harness, guard, "--variant", "30vw"],
  [harness, guard],
];

function run(cmd, label) {
  try {
    execFileSync(process.execPath, cmd, {
      stdio: "pipe",
    });
    return { code: 0, verdict: "PASS" };
  } catch (err) {
    const code = err.status ?? err.statusCode ?? 1;
    const out = (err.stdout || "").toString().trim();
    const errText = (err.stderr || "").toString().trim();
    return { code, verdict: "FAIL", out, err: errText };
  }
}

const results = [];
for (let i = 0; i < commands.length; i += 1) {
  const { code, ...rest } = run(commands[i], labels[i]);
  results.push({ step: labels[i], code, ...rest });
  console.log(`\n[${labels[i].toUpperCase()}] node ${commands[i].join(" ")}`);
  if (rest.out) console.log(rest.out.slice(0, 600));
  if (rest.err) console.error(`  stderr: ${rest.err.slice(0, 400)}`);
  console.log(`  exit=${code}  ${results[i].verdict}`);
}

const ok =
  results[0].code === 0 &&
  results[1].code === 1 &&
  results[2].code === 0 &&
  results[0].verdict === "PASS" &&
  results[1].verdict === "FAIL" &&
  results[2].verdict === "PASS";

console.log(`\nBREAK-RESTORE CYCLE: ${ok ? "VALID" : "VOID"}`);
console.log(`  expected 0/1/0 -> got ${results.map((r) => r.code).join("/")}`);

if (!ok) {
  process.exitCode = 3;
}
