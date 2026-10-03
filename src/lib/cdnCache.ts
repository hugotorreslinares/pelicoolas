/**
 * Marks a page response as shareable on Vercel's CDN so repeat visits (and
 * crawlers) don't run the serverless function. Only for pages whose server
 * HTML is identical for every visitor — anything user-specific loads
 * client-side. `Vary` is Accept-Language only: Vercel's CDN refuses to cache
 * anything varying on Cookie.
 */
export function setCdnCache(
  headers: Headers,
  sMaxAgeSeconds: number,
  staleSeconds = sMaxAgeSeconds * 7,
): void {
  headers.set(
    "Cache-Control",
    `public, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${staleSeconds}`,
  );
  headers.set("Vary", "Accept-Language");
}
