import type { APIRoute } from "astro";
import { searchPerson } from "@/lib/tmdb/people";
import { TmdbError } from "@/lib/tmdb/client";
import {
  jsonResponse,
  errorResponse,
  logApiError,
  rateLimitResponse,
} from "@/lib/api";

export const prerender = false;

const CACHE_SECONDS = 60 * 60; // 1h — query results change rarely, but each query string is a distinct cache key

export const GET: APIRoute = async ({ url, request }) => {
  const limited = rateLimitResponse(request, "search-person", 30, 60_000);
  if (limited) return limited;

  const query = url.searchParams.get("q")?.trim();
  if (!query) {
    return errorResponse("Missing query parameter q", 400);
  }

  try {
    const results = await searchPerson(query);
    return jsonResponse({ results }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      logApiError("search-person", error);
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
