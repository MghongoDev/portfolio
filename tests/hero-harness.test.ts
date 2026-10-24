import { describe, expect, it } from "vitest";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import {
  DEFAULT_CDP_PORT,
  DEFAULT_SERVER_PORT,
  TailBuffer,
  buildChildArgv,
  childCommand,
  parseArgs,
  portIsFree,
  resolveChrome,
  waitForFreePorts,
  waitForService,
} from "../scripts/hero-harness.mjs";

// The harness's own command line is proven by scripts/verify-hero-harness.mjs,
// which needs Chrome and a built app. These tests cover the parts that can be
// checked without either: how arguments are read, the one shape every hero
// script is run with, and the verdicts a dead service produces. They cannot
// catch a process that fails to die, which is why the live cycle exists.

describe("harness argument parsing", () => {
  it("defaults to the documented ports", () => {
    const spec = parseArgs(["scripts/check-hero-scale.mjs"]);
    expect(spec.serverPort).toBe(DEFAULT_SERVER_PORT);
    expect(spec.cdpPort).toBe(DEFAULT_CDP_PORT);
    expect(spec.script).toBe("scripts/check-hero-scale.mjs");
  });

  it("takes the script as the first positional and passes later flags through", () => {
    const spec = parseArgs([
      "scripts/check-hero-scale.mjs",
      "--widths",
      "375,768",
      "--variant",
      "clamp(4rem, 17.5vw, 12.75rem)",
    ]);
    expect(spec.script).toBe("scripts/check-hero-scale.mjs");
    expect(spec.passthrough).toEqual([
      "--widths",
      "375,768",
      "--variant",
      "clamp(4rem, 17.5vw, 12.75rem)",
    ]);
  });

  it("reads its own ports without swallowing the guard's flags", () => {
    const spec = parseArgs([
      "scripts/check-hero-grain.mjs",
      "--server-port",
      "3411",
      "--cdp-port",
      "9332",
      "--force-interactive",
    ]);
    expect(spec.serverPort).toBe(3411);
    expect(spec.cdpPort).toBe(9332);
    expect(spec.passthrough).toEqual(["--force-interactive"]);
  });

  it("flags help", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
  });
});

describe("the child command", () => {
  it("runs every hero script with the same two arguments", () => {
    const argv = buildChildArgv(
      "scripts/check-hero-scale.mjs",
      "http://127.0.0.1:3311/",
      "http://127.0.0.1:9222",
      ["--widths", "375"],
    );
    expect(argv).toEqual([
      "scripts/check-hero-scale.mjs",
      "http://127.0.0.1:3311/",
      "--cdp",
      "http://127.0.0.1:9222",
      "--widths",
      "375",
    ]);
  });

  it("quotes an argument that contains a space", () => {
    expect(childCommand(["node", "a b"])).toBe('node "a b"');
  });
});

describe("chrome resolution", () => {
  it("prefers an explicit path that exists", () => {
    expect(resolveChrome(__filename)).toBe(__filename);
  });

  it("returns null when nothing it looks for exists", () => {
    const saved = process.env.CHROME_BIN;
    delete process.env.CHROME_BIN;
    try {
      expect(resolveChrome("definitely-not-a-browser-xyz")).toBeNull();
    } finally {
      if (saved) process.env.CHROME_BIN = saved;
    }
  });
});

describe("the log tail", () => {
  it("keeps only the last lines", () => {
    const buf = new TailBuffer(3);
    for (const line of ["a", "b", "c", "d", "e"]) buf.push(`${line}\n`);
    expect(buf.text()).toBe("...\nc\nd\ne");
  });

  it("does not add a blank line under a completed last line", () => {
    const buf = new TailBuffer(10);
    buf.push("only line\n");
    expect(buf.text()).toBe("only line");
  });
});

describe("port state", () => {
  it("reports a bound port as not free and a released one as free", async () => {
    const srv = net.createServer();
    await new Promise<void>((resolvePromise) => {
      srv.listen(0, "127.0.0.1", () => resolvePromise());
    });
    const { port } = srv.address() as net.AddressInfo;

    expect(await portIsFree(port)).toBe(false);

    await new Promise<void>((resolvePromise) => {
      srv.close(() => resolvePromise());
    });
    expect(await portIsFree(port)).toBe(true);
  });

  it("names a port that survived teardown", async () => {
    const srv = net.createServer();
    await new Promise<void>((resolvePromise) => {
      srv.listen(0, "127.0.0.1", () => resolvePromise());
    });
    const { port } = srv.address() as net.AddressInfo;

    const result = await waitForFreePorts([port], 300);
    expect(result.ok).toBe(false);
    expect(result.message).toContain(String(port));

    await new Promise<void>((resolvePromise) => {
      srv.close(() => resolvePromise());
    });
  });
});

describe("readiness", () => {
  it("names the service and prints its log tail when it never answers", async () => {
    const log = new TailBuffer();
    log.push("▲ Next.js 16.4.0\n- Local: http://localhost:59999\n");

    const result = await waitForService("http://127.0.0.1:59999/", 300, "the site server", log);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("the site server");
    expect(result.message).toContain("never came up");
    expect(result.message).toContain("Last log lines");
    expect(result.message).toContain("▲ Next.js 16.4.0");
  });

  it("does not mistake a squatter answering 404 for the service coming up", async () => {
    const srv = http.createServer((req, res) => {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not the app\n");
    });
    await new Promise<void>((resolvePromise) => {
      srv.listen(0, "127.0.0.1", () => resolvePromise());
    });
    const { port } = srv.address() as net.AddressInfo;

    const result = await waitForService(
      `http://127.0.0.1:${port}/`,
      400,
      "the site server",
      new TailBuffer(),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain("HTTP 404");

    await new Promise<void>((resolvePromise) => {
      srv.close(() => resolvePromise());
    });
  });

  it("fails at once when the process died before answering", async () => {
    const log = new TailBuffer();
    log.push("EADDRINUSE: port is already in use\n");

    // A real process that has already exited, so the guard reads its exitCode
    // instead of polling a live one for the full timeout.
    const proc = spawn(process.execPath, ["-e", "process.exit(1)"]);
    await new Promise<void>((resolvePromise) => {
      proc.on("close", () => resolvePromise());
    });

    const result = await waitForService(
      "http://127.0.0.1:59998/",
      60_000,
      "the site server",
      log,
      proc,
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain("exited before it came up");
    expect(result.message).toContain("EADDRINUSE");
  });
});
