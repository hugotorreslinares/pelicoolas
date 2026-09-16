import type { APIRoute } from "astro";
import { searchTV } from "@/lib/tmdb/tv";
import { TmdbError } from "@/lib/tmdb/client";
import {
  jsonResponse,
  errorResponse,
  logApiError,
  rateLimitResponse,
} from "@/lib/api";

export const prerender = false;

const CACHE_SECONDS = 60 * 60; // 1h — matches /api/search-movie

export const GET: APIRoute = async ({ url, request }) => {
  const limited = rateLimitResponse(request, "search-tv", 30, 60_000);
  if (limited) return limited;

  const query = url.searchParams.get("q")?.trim();
  if (!query) {
    return errorResponse("Missing query parameter q", 400);
  }

  try {
    const results = await searchTV(query);
    return jsonResponse({ results }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      logApiError("search-tv", error);
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
