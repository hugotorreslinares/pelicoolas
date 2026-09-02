// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react()],

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
