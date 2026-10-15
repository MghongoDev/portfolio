import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only the fast unit suite. The route smoke tests need a built app — run them with `npm run test:routes`.
    include: ["tests/*.test.ts"],
  },
});
