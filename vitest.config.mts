import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only the fast unit suite. The route smoke tests need a built app. Run them with `npm run test:routes`.
    include: ["tests/*.test.ts"],
    // The compile tests run the real Shiki highlighter; a cold start can pass
    // 5s, so give them room. Everything else finishes in milliseconds.
    testTimeout: 30_000,
  },
});
