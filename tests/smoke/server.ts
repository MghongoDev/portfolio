import { existsSync } from "node:fs";
import { createServer } from "node:http";
import next from "next";

const HOST = "127.0.0.1";
const PORT = 3311;
const BASE = `http://${HOST}:${PORT}`;

/**
 * How long the server is given to become ready. The smoke config's hookTimeout
 * must stay strictly above this, or vitest kills the hook at the same instant
 * this module gives up and the message below is never the thing you read.
 */
export const READY_DEADLINE_MS = 30_000;

/** Serve the production build in-process; the caller owns stopping it. */
export async function startProdServer(): Promise<{ base: string; stop: () => Promise<void> }> {
  if (!existsSync(".next/BUILD_ID")) {
    throw new Error("No production build found. Run `npm run build` before the smoke suite.");
  }

  const app = next({ dev: false, hostname: HOST, port: PORT });
  await app.prepare();
  const handle = app.getRequestHandler();
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  await new Promise<void>((resolve, reject) => {
    // A port already in use is a harness problem, not a crash dump.
    server.once("error", (err: NodeJS.ErrnoException) => {
      reject(new Error(`Could not listen on ${BASE}: ${err.message}. Is another smoke run holding the port?`));
    });
    server.listen(PORT, HOST, resolve);
  });

  const deadline = Date.now() + READY_DEADLINE_MS;
  for (;;) {
    try {
      const res = await fetch(BASE);
      if (res.status < 500) break;
    } catch {
      // not accepting connections yet
    }
    if (Date.now() > deadline) {
      throw new Error(`Server at ${BASE} did not become ready within ${READY_DEADLINE_MS}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return {
    base: BASE,
    stop: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await app.close();
    },
  };
}
