// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import sentry from "@sentry/astro";

// Sourcemap upload (org/project/authToken) only runs when SENTRY_AUTH_TOKEN
// is set — without it the integration still captures errors via
// PUBLIC_SENTRY_DSN, it just skips the upload step. Keeps local dev and any
// fork of this repo buildable without Sentry credentials.
const sentryIntegration = sentry(
  process.env.SENTRY_AUTH_TOKEN
    ? {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
      }
    : { telemetry: false },
);

// https://astro.build/config
export default defineConfig({
  output: "server",
  // Needed to build absolute canonical/Open Graph URLs (Astro.site) —
  // without it those tags would silently emit relative/broken URLs.
  site: "https://pelicoolas.vercel.app",
  integrations: [react(), sentryIntegration],

  vite: {
    plugins: [tailwindcss()],
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    build: {
      // Firebase alone is ~500kB minified; that's inherent to the SDK, not
      // something split further without swapping it out. The warning below
      // was useful to *find* the mixed-in bloat (fixed via manualChunks) —
      // now that it's isolated in its own cacheable chunk, silence it.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Firebase (auth + firestore + app) was landing in the same shared
          // chunk as unrelated UI code (button.tsx), producing a >500kB blob
          // that every page paid for regardless of whether it touched Firebase.
          // Isolating it: separately cacheable, and its own size is visible.
          manualChunks(id) {
            if (
              id.includes("node_modules/firebase") ||
              id.includes("node_modules/@firebase")
            ) {
              return "firebase";
            }
          },
        },
      },
    },
  },

  adapter: vercel(),
});
