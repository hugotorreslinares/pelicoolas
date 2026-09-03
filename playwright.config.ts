import { defineConfig, devices } from "@playwright/test";

// Fake but well-formed Firebase config for the "demo-" project convention:
// the Auth/Firestore emulators never touch a real backend once connected
// (see the PUBLIC_USE_FIREBASE_EMULATOR block in src/lib/firebase/client.ts),
// so these values only need to look right to the SDK's own validation.
const FIREBASE_TEST_ENV = {
  PUBLIC_USE_FIREBASE_EMULATOR: "true",
  PUBLIC_FIREBASE_API_KEY: "fake-api-key",
  PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-filmo-e2e.firebaseapp.com",
  PUBLIC_FIREBASE_PROJECT_ID: "demo-filmo-e2e",
  PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-filmo-e2e.appspot.com",
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000000000",
};

export default defineConfig({
  testDir: "./tests-e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  // A bit above the 30s default: Vite transforms /search's whole module
  // graph (React, Firebase, Sentry, ...) on its first hit after a cold
  // dev-server start, which can eat a good chunk of the default budget.
  timeout: 45_000,
  reporter: "list",
  use: {
    // localhost, not 127.0.0.1: astro dev binds IPv6 (::1) only, and
    // "localhost" resolves there first — 127.0.0.1 gets connection refused.
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests-e2e/mock-tmdb-server.mjs",
      port: 4400,
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "firebase emulators:start --only auth,firestore --project demo-filmo-e2e",
      url: "http://127.0.0.1:9099",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "pnpm dev",
      // Hits /search itself, not just the home page — pre-warms Vite's
      // transform of the exact module graph the test needs, so that cost
      // isn't paid inside the test's own timeout window.
      url: "http://localhost:4321/search",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        TMDB_API_KEY: "e2e-dummy-key",
        TMDB_API_BASE_URL: "http://127.0.0.1:4400",
        ...FIREBASE_TEST_ENV,
      },
    },
  ],
});
