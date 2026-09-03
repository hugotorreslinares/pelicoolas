import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts (which drives `pnpm test`, the CI suite)
// because these tests need a live Firestore emulator — see
// tests/firestore.rules.test.ts and the `test:rules` script.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
