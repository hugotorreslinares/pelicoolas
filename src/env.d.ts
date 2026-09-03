/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly TMDB_API_KEY: string;
  /** Set only by the Playwright E2E harness to redirect TMDB calls at a local fixture server. Unset everywhere else, including production. */
  readonly TMDB_API_BASE_URL: string | undefined;
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  readonly PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  /** Set only by the Playwright E2E harness — never in dev or production. Points the client at local Firebase emulators instead of the real project. */
  readonly PUBLIC_USE_FIREBASE_EMULATOR: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** ISO timestamp captured at build time, injected via vite.define in astro.config.mjs. */
declare const __BUILD_TIME__: string;
