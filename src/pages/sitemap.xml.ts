import type { APIRoute } from "astro";
import { getPopularPersonIds } from "@/lib/tmdb/people";
import { TmdbError } from "@/lib/tmdb/client";
import { buildSitemap } from "@/lib/sitemap";

export const prerender = false;

// Only indexable pages (no `noindex`): the static public routes plus a seed
// of TMDB's most popular people, since /person/{id} is the real public
// content. Every other person is still reachable via search and internal links.
const STATIC_PATHS = ["/search", "/privacy"];
const CACHE_SECONDS = 60 * 60 * 24;

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL("https://pelicoolas.com")).origin;
  let personIds: readonly number[] = [];
  try {
    personIds = await getPopularPersonIds();
  } catch (error) {
    // TMDB down: still serve the static URLs rather than a 5xx that Search
    // Console would flag; the cache header below is shortened accordingly.
    if (!(error instanceof TmdbError)) throw error;
  }

  const locs = [
    ...STATIC_PATHS.map((p) => `${origin}${p}`),
    ...personIds.map((id) => `${origin}/person/${id}`),
  ];
  const ttl = personIds.length > 0 ? CACHE_SECONDS : 300;
  return new Response(buildSitemap(locs), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`,
    },
  });
};
