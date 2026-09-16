import type { APIRoute } from "astro";
import { getMovieDetails } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";
import { resolveWatchRegion } from "@/lib/region";
import {
  jsonResponse,
  errorResponse,
  logApiError,
  rateLimitResponse,
} from "@/lib/api";

export const prerender = false;

const CACHE_SECONDS = 60 * 60 * 24; // 1d — a released movie's details rarely change

export const GET: APIRoute = async ({ params, request }) => {
  // Higher than the default on purpose — see the "person" route's own
  // comment; a watchlist of 100+ movies backfilling genres, or Connections
  // scanning a big filmography, legitimately bursts past 30/60s.
  const limited = rateLimitResponse(request, "movie", 120, 60_000);
  if (limited) return limited;

  const movieId = Number(params.id);
  if (!Number.isInteger(movieId)) {
    return errorResponse("Invalid movie id", 400);
  }

  // Region is part of the URL (not just derived server-side from
  // Accept-Language) because the response below is cached on Vercel's
  // shared CDN with no Vary header — baking the region into the querystring
  // is what keeps that cache correct per-region instead of serving
  // whichever region happened to be first to warm the cache.
  const regionParam = new URL(request.url).searchParams.get("region");
  const region =
    regionParam && /^[A-Za-z]{2}$/.test(regionParam)
      ? regionParam.toUpperCase()
      : resolveWatchRegion(request.headers.get("accept-language"));

  try {
    const movie = await getMovieDetails(movieId, region);
    return jsonResponse({ movie }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      logApiError("movie", error);
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
