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
