import type { APIRoute } from "astro";
import { getTVDetails } from "@/lib/tmdb/tv";
import { TmdbError } from "@/lib/tmdb/client";
import { resolveWatchRegion } from "@/lib/region";
import {
  jsonResponse,
  errorResponse,
  logApiError,
  rateLimitResponse,
} from "@/lib/api";

export const prerender = false;

const CACHE_SECONDS = 60 * 60 * 24; // 1d — matches /api/movie/[id]

export const GET: APIRoute = async ({ params, request }) => {
  const limited = rateLimitResponse(request, "tv", 120, 60_000);
  if (limited) return limited;

  const tvId = Number(params.id);
  if (!Number.isInteger(tvId)) {
    return errorResponse("Invalid tv id", 400);
  }

  // See /api/movie/[id] — region must be in the URL to keep the shared CDN
  // cache below correct per-region.
  const regionParam = new URL(request.url).searchParams.get("region");
  const region =
    regionParam && /^[A-Za-z]{2}$/.test(regionParam)
      ? regionParam.toUpperCase()
      : resolveWatchRegion(request.headers.get("accept-language"));

  try {
    const show = await getTVDetails(tvId, region);
    return jsonResponse({ show }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      logApiError("tv", error);
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
