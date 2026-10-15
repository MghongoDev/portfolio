import { existsSync } from "node:fs";
import { createServer } from "node:http";
import next from "next";

const HOST = "127.0.0.1";
const PORT = 3311;
const BASE = `http://${HOST}:${PORT}`;

/** Serve the production build in-process; the caller owns stopping it. */
export async function startProdServer(): Promise<{ base: string; stop: () => Promise<void> }> {
  if (!existsSync(".next/BUILD_ID")) {
    throw new Error("No production build found — run `npm run build` before the smoke suite.");
  }

  const app = next({ dev: false, hostname: HOST, port: PORT });
  await app.prepare();
  const handle = app.getRequestHandler();
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  await new Promise<void>((resolve) => server.listen(PORT, HOST, resolve));

  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      const res = await fetch(BASE);
      if (res.status < 500) break;
    } catch {
      // not accepting connections yet
    }
    if (Date.now() > deadline) {
      throw new Error(`Server at ${BASE} did not become ready within 30s`);
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
