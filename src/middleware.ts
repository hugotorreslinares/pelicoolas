import { defineMiddleware } from "astro:middleware";

/**
 * Google's own auth/identity domains are wildcarded broadly on purpose: the
 * Google sign-in popup flow (accounts.google.com, apis.google.com) and the
 * Firebase Auth/Firestore REST + streaming endpoints (*.googleapis.com) span
 * several subdomains that aren't worth enumerating individually — a stricter
 * CSP here risks silently breaking login, which is core functionality.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://image.tmdb.org data:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://vitals.vercel-insights.com https://*.vercel-insights.com",
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
