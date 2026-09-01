/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly TMDB_API_KEY: string;
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  readonly PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** ISO timestamp captured at build time, injected via vite.define in astro.config.mjs. */
declare const __BUILD_TIME__: string;
