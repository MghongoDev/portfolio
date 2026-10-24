#!/usr/bin/env node
/**
 * Break-restore cycle for the hero guard harness (ticket #18).
 *
 * Proves scripts/hero-harness.mjs does the three things it exists for:
 *
 *   1. a run whose service never came up fails, names which service, and prints
 *      that service's own log tail
 *   2. both processes are gone once the command exits, whatever its verdict,
 *      including after a command that fails
 *   3. two runs at once do not collide, because the ports are arguments
 *
 * The baseline is taken before anything is broken. A run whose baseline is
 * already red proves nothing, so a red baseline fails the cycle rather than
 * being reported as a result.
 *
 * Step 5 runs the two harnesses concurrently: both are spawned before either is
 * awaited. Two sequential runs on different ports prove only that the ports are
 * arguments, not that the runs can overlap.
 *
 * Step 2 occupies the server port rather than leaving it empty, because the
 * harness starts the service itself and an empty port would simply come up. The
 * occupant answers 500, which the harness reads as "not the app".
 *
 * Usage:
 *   node scripts/verify-hero-harness.mjs
 *
 * Needs the app built (npm run build) and Chrome installed. It starts and stops
 * its own services through the harness, so it touches nothing outside its ports.
 */

import { spawn } from "node:child_process";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(here, "hero-harness.mjs");
const GUARD = join(here, "check-hero-scale.mjs");

// Distinct ports per step, so no step can be the thing that proves another.
const BASELINE = { serverPort: 3311, cdpPort: 9222 };
const BREAK = { serverPort: 3402, cdpPort: 9337 };
const FIRST = { serverPort: 3411, cdpPort: 9332 };
const SECOND = { serverPort: 3412, cdpPort: 9333 };

// The scale the editorial change replaced. Measured to clip at 375px, so the
// guard exits 1: a command that fails while both services are up.
const CLIPPING_VARIANT = "clamp(4rem, 17.5vw, 12.75rem)";

/** Runs one harness invocation and resolves with its verdict and full output. */
function spawnHarness(ports, script = GUARD, extra = []) {
  const child = spawn(
    process.execPath,
    [
      HARNESS,
      script,
      "--server-port",
      String(ports.serverPort),
      "--cdp-port",
      String(ports.cdpPort),
      ...extra,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  let text = "";
  child.stdout.on("data", (chunk) => (text += chunk));
  child.stderr.on("data", (chunk) => (text += chunk));

  return new Promise((resolvePromise) => {
    child.on("close", (code) => resolvePromise({ code, text }));
  });
}

/** Prints the interesting end of a run's output, for a step worth reading. */
function tail(text, lines = 4) {
  const kept = text
    .split("\n")
    .filter((l) => l.trim())
    .slice(-lines);
  return kept.map((l) => `          ${l}`).join("\n");
}

/**
 * Occupies a port so the app cannot bind it. Bound on the dual-stack wildcard so
 * it blocks the app whichever address family it prefers.
 */
function occupy(port) {
  return new Promise((resolvePromise, reject) => {
    const srv = http.createServer((req, res) => {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("occupied\n");
    });
    srv.on("error", reject);
    srv.listen(port, () => resolvePromise(srv));
  });
}

const results = [];
const record = (label, ok, detail) => {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

console.log("step 1/5  baseline: harness brings both services up and the guard passes");
const baseline = await spawnHarness(BASELINE);
console.log(`          exit=${baseline.code}`);
record("baseline is green", baseline.code === 0, `exit ${baseline.code}`);
record(
  "baseline reports both ports free",
  baseline.text.includes("both ports free"),
  "harness printed 'both ports free'",
);

console.log("\nstep 2/5  break: occupy the server port so the app cannot come up");
const occupied = await occupy(BREAK.serverPort);
const broken = await spawnHarness(BREAK, GUARD, ["--server-timeout", "8000"]);
console.log(`          exit=${broken.code}`);
record("break fails the run", broken.code === 2, `exit ${broken.code}`);
record(
  "break names the service that never came up",
  /the site server/.test(broken.text),
  "output named the site server",
);
record(
  "break prints that service's log tail",
  /Last log lines/.test(broken.text),
  "output carried a log tail",
);
await new Promise((r) => occupied.close(r));

console.log(
  "\nstep 3/5  a command that fails: the guard clips, so it exits 1 with both services up",
);
const failing = await spawnHarness(BASELINE, GUARD, ["--variant", CLIPPING_VARIANT]);
console.log(`          exit=${failing.code}`);
console.log(tail(failing.text));
record("a failing command fails the run", failing.code === 1, `exit ${failing.code}`);
record(
  "both ports are free after a command that fails",
  failing.text.includes("both ports free"),
  "harness printed 'both ports free'",
);

console.log("\nstep 4/5  restore: harness again with nothing broken");
const restored = await spawnHarness(BASELINE);
console.log(`          exit=${restored.code}`);
record("restore is green", restored.code === 0, `exit ${restored.code}`);

console.log("\nstep 5/5  two runs at once on different ports");
// One viewport each: this step is about the ports, not the measurement.
const extra = ["--widths", "375"];
const [first, second] = await Promise.all([
  spawnHarness(FIRST, GUARD, extra),
  spawnHarness(SECOND, GUARD, extra),
]);
console.log(`          exits=${first.code},${second.code}`);
record(
  "two runs at once do not collide",
  first.code === 0 && second.code === 0,
  `exits ${first.code}, ${second.code}`,
);

console.log("\n================ verdict ================");
let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail ? `  (${r.detail})` : ""}`);
}

if (baseline.code !== 0 || restored.code !== 0) {
  console.error("\nThe baseline was already red, so this cycle proves nothing.");
  console.error(baseline.text.split("\n").slice(-12).join("\n"));
  process.exit(2);
}
if (failed) {
  console.error(`\n${failed} of ${results.length} checks failed.`);
  if (broken.text) console.error("\nlast break output:\n" + tail(broken.text, 12));
  process.exit(2);
}

console.log(
  `\nAll ${results.length} checks passed: the harness names a dead service, frees its ports`,
  "\nafter a command that fails, and two runs coexist.",
);
