import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only the fast unit suite. The route smoke tests need a built app. Run them with `npm run test:routes`.
    include: ["tests/*.test.ts"],
    // The compile tests are the only slow ones: they are the first to pull in
    // Shiki, and on Windows that cold start is wildly variable. A 30s ceiling
    // failed once at 137s while every warm run since finished in under 6s, so
    // the timeout must cover the variance of the author's own machine. A real
    // hang still fails, it just takes two minutes to say so.
    testTimeout: 120_000,
  },
});
