#!/usr/bin/env node
/**
 * Hero guard harness.
 *
 * Starts headless Chrome and the production server on ports it is given, waits
 * for both to answer, runs one Node script against them, then tears both down
 * whatever the verdict was.
 *
 * CI used to hand-roll this bootstrap three times, once per guard. The three
 * copies drifted: they hardcoded port 9222, so two could never run at once, and
 * a fix to one copy never reached the others. This is the one copy.
 *
 * Usage:
 *   node scripts/hero-harness.mjs <script.mjs> [guard flags...]
 *                                         [--server-port N] [--cdp-port N]
 *                                         [--chrome PATH]
 *
 * The script is invoked as:
 *   node <script.mjs> http://127.0.0.1:<server-port>/ --cdp http://127.0.0.1:<cdp-port> [guard flags...]
 *
 * so every hero guard and every break-restore cycle takes the same two
 * arguments: the base URL first, then --cdp. A caller only ever passes the
 * guard's own break flags.
 *
 * Exit codes:
 *   0  the script passed
 *   1  the script failed
 *   2  the harness itself failed: bad usage, a service never came up, or a
 *      process survived teardown
 */

import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DEFAULT_SERVER_PORT = 3311;
export const DEFAULT_CDP_PORT = 9222;
export const DEFAULT_SERVER_TIMEOUT_MS = 120_000;
export const DEFAULT_CDP_TIMEOUT_MS = 60_000;
export const PORT_FREE_TIMEOUT_MS = 10_000;

export const EXIT_OK = 0;
export const EXIT_SCRIPT_FAILED = 1;
export const EXIT_HARNESS_FAILED = 2;

export const USAGE = `usage: node scripts/hero-harness.mjs <script.mjs> [guard flags...]
                                   [--server-port N] [--cdp-port N] [--chrome PATH]

starts Chrome and the production server, waits for both, runs <script.mjs>
against them, then tears both down whatever the verdict was.

  --server-port N    port for the production server   (default ${DEFAULT_SERVER_PORT})
  --cdp-port N       port for Chrome DevTools        (default ${DEFAULT_CDP_PORT})
  --chrome PATH      Chrome binary to launch         (default: first found, or $CHROME_BIN)
  --server-timeout N milliseconds to wait for the server   (default ${DEFAULT_SERVER_TIMEOUT_MS})
  --cdp-timeout N    milliseconds to wait for Chrome       (default ${DEFAULT_CDP_TIMEOUT_MS})

any other flag is passed through to <script.mjs> unchanged.`;

/**
 * Keeps the tail of a process's output so a service that never came up can name
 * its own last words instead of surfacing as a hero that never rendered.
 */
export class TailBuffer {
  constructor(limit = 40) {
    this.limit = limit;
    this.buf = "";
  }

  push(chunk) {
    this.buf += String(chunk);
  }

  text() {
    const lines = this.buf.split(/\r?\n/);
    // A completed last line ends with a newline, which splits into a trailing
    // empty string. It is not a line, and printing it puts a blank line under
    // every log tail.
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    const tail = lines.slice(-this.limit);
    return (lines.length > this.limit ? ["...", ...tail] : tail).join("\n");
  }
}

export function parseArgs(argv) {
  const spec = {
    script: null,
    passthrough: [],
    serverPort: DEFAULT_SERVER_PORT,
    cdpPort: DEFAULT_CDP_PORT,
    chrome: null,
    serverTimeoutMs: DEFAULT_SERVER_TIMEOUT_MS,
    cdpTimeoutMs: DEFAULT_CDP_TIMEOUT_MS,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") spec.help = true;
    else if (a === "--server-port") spec.serverPort = Number(argv[++i]);
    else if (a === "--cdp-port") spec.cdpPort = Number(argv[++i]);
    else if (a === "--chrome") spec.chrome = argv[++i];
    else if (a === "--server-timeout") spec.serverTimeoutMs = Number(argv[++i]);
    else if (a === "--cdp-timeout") spec.cdpTimeoutMs = Number(argv[++i]);
    // Anything else belongs to the script being run. The harness must not
    // reject a guard's own break flags: it would refuse the very arguments the
    // caller was told to pass. The script owns its flags and names its own
    // usage; the harness only supplies the base URL and --cdp.
    else if (!spec.script) spec.script = a;
    else spec.passthrough.push(a);
  }

  return spec;
}

/** Every place Chrome might live, most specific first. */
export function chromeCandidates(explicit) {
  if (explicit) return [explicit];
  if (process.env.CHROME_BIN) return [process.env.CHROME_BIN];

  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    return [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      local ? join(local, "Google", "Chrome", "Application", "chrome.exe") : null,
      "google-chrome",
    ].filter(Boolean);
  }

  return ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
}

function onPath(name) {
  const dirs = (process.env.PATH ?? "").split(process.platform === "win32" ? ";" : ":");
  const exts =
    process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
  for (const d of dirs) {
    if (!d) continue;
    for (const ext of exts) {
      const candidate = join(d, name + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Resolves the Chrome binary, or null. Resolving before spawning matters: a
 * missing binary and a crashed Chrome are different failures, and only the
 * first one is the user's fault.
 */
export function resolveChrome(explicit) {
  for (const candidate of chromeCandidates(explicit)) {
    const looksAbsolute = candidate.includes("/") || candidate.includes("\\");
    if (looksAbsolute ? existsSync(candidate) : onPath(candidate)) return candidate;
  }
  return null;
}

export function repoRoot() {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Resolves with the HTTP status once something answers, or with the failure. */
export function httpGet(url, timeoutMs = 5_000) {
  return new Promise((resolvePromise) => {
    // http.get throws synchronously on a malformed URL, so the guard has to be
    // around the call itself: an unbound port must read as a failure, not as a
    // crash that names no service.
    let req;
    try {
      req = http.get(url, (res) => {
        res.resume();
        res.on("end", () => resolvePromise({ ok: true, status: res.statusCode }));
      });
    } catch (err) {
      resolvePromise({ ok: false, error: err.message });
      return;
    }
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolvePromise({ ok: false, error: `request timed out after ${timeoutMs}ms` });
    });
    req.on("error", (err) => resolvePromise({ ok: false, error: err.message }));
  });
}

/**
 * Waits for a service to answer. On failure the message names the service, says
 * how long it waited, and prints the service's own log tail, so the cause is
 * visible rather than implied.
 *
 * A service that exits before it answers is reported at once. Polling a dead
 * process for the full timeout would name the wrong cause and cost a minute.
 */
export async function waitForService(url, timeoutMs, label, log, proc) {
  const deadline = Date.now() + timeoutMs;
  let last = "no response";
  while (Date.now() < deadline) {
    if (proc && proc.exitCode !== null) {
      return {
        ok: false,
        message:
          `${label} exited before it came up (exit ${proc.exitCode}).\n` +
          `Last log lines:\n${log.text()}`,
      };
    }
    const r = await httpGet(url);
    // Only a real answer counts. A 404 from something else squatting on the port
    // is not the service coming up, so the ceiling is 399 rather than 499.
    if (r.ok && r.status < 400) return { ok: true };
    last = r.ok ? `HTTP ${r.status}` : r.error;
    await sleep(500);
  }
  return {
    ok: false,
    message:
      `${label} never came up at ${url} after ${Math.round(timeoutMs / 1000)}s ` +
      `(last answer: ${last}).\nLast log lines:\n${log.text()}`,
  };
}

/** True when nothing is listening on the port, so it can be bound. */
export function portIsFree(port, host = "127.0.0.1") {
  return new Promise((resolvePromise) => {
    const probe = net.createServer();
    probe.once("error", () => resolvePromise(false));
    probe.once("listening", () => probe.close(() => resolvePromise(true)));
    probe.listen(port, host);
  });
}

export async function waitForFreePorts(ports, timeoutMs = PORT_FREE_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let stillBound = [];
  while (Date.now() < deadline) {
    stillBound = [];
    for (const port of ports) {
      if (!(await portIsFree(port))) stillBound.push(port);
    }
    if (!stillBound.length) return { ok: true };
    await sleep(250);
  }
  return {
    ok: false,
    message: `teardown did not free port(s) ${stillBound.join(", ")}: a process survived.`,
  };
}

/**
 * Kills a process and everything under it. A guard harness that leaves the
 * server behind poisons the next run, so this is the whole point of the script.
 * On Windows the tree has to be killed explicitly; on POSIX a detached child is
 * a process group leader and can be signalled as one.
 */
export function killTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
}

function pipeToLog(proc, log) {
  proc.stdout?.on("data", (chunk) => log.push(chunk));
  proc.stderr?.on("data", (chunk) => log.push(chunk));
}

/**
 * Prefers the installed Next entry over `npx`, because a direct node process has
 * a clean tree to kill. Falls back to `npx` if the entry moves.
 */
export function spawnServer(root, port, log) {
  const entry = join(root, "node_modules", "next", "dist", "bin", "next");
  const direct = existsSync(entry);
  const proc = spawn(
    direct ? process.execPath : "npx",
    direct ? [entry, "start", "-p", String(port)] : ["next", "start", "-p", String(port)],
    {
      cwd: root,
      detached: true,
      shell: !direct,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  pipeToLog(proc, log);
  return proc;
}

/**
 * A throwaway Chrome profile per run. Chrome keeps one profile per default
 * directory, so a second concurrent instance refuses to start and the first
 * silently answers for it. Two runs on different ports must not share a profile,
 * or "the ports are arguments" is only half true.
 */
export function makeChromeProfile(port) {
  return mkdtempSync(join(tmpdir(), `hero-harness-${port}-`));
}

export function removeChromeProfile(profile) {
  if (!profile) return;
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* a locked file on Windows is not worth failing the run over */
  }
}

export function spawnChrome(chromePath, port, log, profile) {
  const proc = spawn(
    chromePath,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--remote-allow-origins=*",
      "about:blank",
    ],
    { detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  pipeToLog(proc, log);
  return proc;
}

/** The exact argv the script is run with. One shape for all six hero scripts. */
export function buildChildArgv(scriptPath, base, cdp, passthrough) {
  return [scriptPath, base, "--cdp", cdp, ...passthrough];
}

/** The command as a reader would type it, so a mis-passed flag is visible. */
export function childCommand(argv) {
  return argv.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ");
}

export function runScript(argv) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, argv, { stdio: "inherit" });
    child.on("close", (code) => resolvePromise(code ?? EXIT_SCRIPT_FAILED));
    child.on("error", (err) => {
      console.error(`FATAL: could not run ${childCommand(argv)}: ${err.message}`);
      resolvePromise(EXIT_HARNESS_FAILED);
    });
  });
}

/**
 * Brings up both services, runs the script, and always tears both down.
 * Returns { childCode } on a clean run, or { harnessError } when the harness
 * itself failed. Teardown is verified, not assumed: a surviving process is a
 * harness failure, not a caveat.
 */
export async function run(spec) {
  const root = repoRoot();
  const base = `http://127.0.0.1:${spec.serverPort}/`;
  const cdp = `http://127.0.0.1:${spec.cdpPort}`;

  if (!spec.script) {
    return { harnessError: `no script given.\n${USAGE}` };
  }
  // A port nothing can listen on is a usage error, and it has to be named as one
  // rather than surfacing as a malformed URL deep in the readiness probe.
  for (const [label, port] of [
    ["--server-port", spec.serverPort],
    ["--cdp-port", spec.cdpPort],
  ]) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { harnessError: `${label} must be an integer between 1 and 65535, got ${port}` };
    }
  }
  const scriptPath = resolve(root, spec.script);
  if (!existsSync(scriptPath)) {
    return { harnessError: `script not found: ${spec.script} (looked for ${scriptPath})` };
  }
  const chrome = resolveChrome(spec.chrome);
  if (!chrome) {
    return {
      harnessError:
        `no Chrome found. Pass --chrome <path>, or set CHROME_BIN.\n` +
        `looked for: ${chromeCandidates(spec.chrome).join(", ")}`,
    };
  }

  console.log(
    `harness: starting the site server on ${spec.serverPort} and Chrome DevTools on ${spec.cdpPort}`,
  );

  const serverLog = new TailBuffer();
  const chromeLog = new TailBuffer();
  const profile = makeChromeProfile(spec.cdpPort);
  const argv = buildChildArgv(scriptPath, base, cdp, spec.passthrough);
  const server = spawnServer(root, spec.serverPort, serverLog);
  const chromeProc = spawnChrome(chrome, spec.cdpPort, chromeLog, profile);

  let childCode = null;
  try {
    const serverReady = await waitForService(
      base,
      spec.serverTimeoutMs,
      "the site server",
      serverLog,
      server,
    );
    if (!serverReady.ok) return { harnessError: serverReady.message };

    const cdpReady = await waitForService(
      `${cdp}/json/version`,
      spec.cdpTimeoutMs,
      "the Chrome DevTools endpoint",
      chromeLog,
      chromeProc,
    );
    if (!cdpReady.ok) return { harnessError: cdpReady.message };

    console.log(`harness: running ${childCommand(argv)}`);
    childCode = await runScript(argv);
    console.log(`harness: ${spec.script} exited ${childCode}`);
  } finally {
    killTree(server?.pid);
    killTree(chromeProc?.pid);
    removeChromeProfile(profile);
  }

  const freed = await waitForFreePorts([spec.serverPort, spec.cdpPort]);
  if (!freed.ok) return { harnessError: freed.message, childCode };
  console.log("harness: both ports free");

  return { childCode };
}

async function main() {
  const spec = parseArgs(process.argv.slice(2));

  if (spec.help) {
    console.log(USAGE);
    return EXIT_OK;
  }

  const result = await run(spec);
  if (result.harnessError) {
    console.error(`\n${result.harnessError}`);
    return EXIT_HARNESS_FAILED;
  }
  return result.childCode ?? EXIT_HARNESS_FAILED;
}

// Imported by the unit tests, so the script only runs when invoked directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
