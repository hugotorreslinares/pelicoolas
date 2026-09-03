import * as Sentry from "@sentry/astro";
import { clientIp, isRateLimited } from "./rateLimit";

/**
 * TMDB responses are identical for every visitor, so they're safe to share
 * across users on Vercel's CDN via `s-maxage` — not just cached per-browser.
 * `stale-while-revalidate` lets a stale hit serve instantly while a fresh
 * copy is fetched in the background, so cache expiry never blocks a request.
 */
export function jsonResponse(data: unknown, cacheSeconds?: number): Response {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cacheSeconds) {
    headers["cache-control"] =
      `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 10}`;
  }
  return new Response(JSON.stringify(data), { status: 200, headers });
}

export function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status });
}

/**
 * A caught TmdbError becomes a generic 502 to the client on purpose (never
 * leak upstream error details) — this is the one place that keeps the real
 * cause visible: structured JSON on stdout (Vercel's function logs are
 * plain text, so a single-line JSON blob is what stays greppable/parseable
 * there) and forwarded to Sentry, since a caught error never reaches
 * Sentry's automatic instrumentation on its own.
 */
export function logApiError(route: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: "error", route, message }));
  Sentry.captureException(error, { tags: { route } });
}

/** Returns a 429 Response if the client is over the limit for this route, else null. */
export function rateLimitResponse(
  request: Request,
  routeKey: string,
  limit: number,
  windowMs: number,
): Response | null {
  const ip = clientIp(request);
  if (!isRateLimited(`${routeKey}:${ip}`, limit, windowMs)) return null;
  return errorResponse("Too many requests. Please slow down.", 429);
}
