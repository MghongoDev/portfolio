import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  test: {
    include: ["tests/smoke/*.test.ts"],
    // Each route is one local GET against the already-prepared production
    // server. 30s is far more than a prerendered page needs, but a cold first
    // route turn on a loaded machine should still fail on its assertion rather
    // than on a budget borrowed from vitest's 5s default.
    testTimeout: 30_000,
    // Must stay strictly above READY_DEADLINE_MS in server.ts: when the server
    // cannot become ready, vitest must not kill this hook at the same instant
    // the server gives up, or its "did not become ready" diagnostic is never
    // seen and the failure comes back as a bare hook timeout.
    hookTimeout: 45_000,
  },
});
