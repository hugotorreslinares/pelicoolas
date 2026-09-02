/**
 * In-memory sliding-window limiter, keyed per client IP. Vercel's Fluid
 * Compute reuses function instances across requests, so this Map survives
 * warm invocations — good enough to blunt a runaway bug or scraper without
 * paying for an external store (Redis/KV) that a personal-scale app doesn't
 * need. It resets on cold start and isn't shared across regions; that's an
 * acceptable tradeoff here, not a security boundary.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count++;
  return bucket.count > limit;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}
