import { defineMiddleware } from "astro:middleware";

/**
 * Google's own auth/identity domains are wildcarded broadly on purpose: the
 * Google sign-in popup flow (accounts.google.com, apis.google.com) and the
 * Firebase Auth/Firestore REST + streaming endpoints (*.googleapis.com) span
 * several subdomains that aren't worth enumerating individually — a stricter
 * CSP here risks silently breaking login, which is core functionality.
 */
// Playwright E2E only (see tests-e2e/) — the browser needs to reach the
// local Auth/Firestore emulators directly. Never set in dev or production,
// so this stays an empty string (and the CSP unchanged) everywhere else.
const emulatorConnectSrc =
  import.meta.env.PUBLIC_USE_FIREBASE_EMULATOR === "true"
    ? " http://127.0.0.1:9099 http://127.0.0.1:8080"
    : "";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://image.tmdb.org data:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.googleapis.com https://vitals.vercel-insights.com https://*.vercel-insights.com https://*.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io${emulatorConnectSrc}`,
  "frame-src https://*.firebaseapp.com https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
});
