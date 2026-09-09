import type { APIRoute } from "astro";
import { getSimilarMovies } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";
import {
  jsonResponse,
  errorResponse,
  logApiError,
  rateLimitResponse,
} from "@/lib/api";

export const prerender = false;

const CACHE_SECONDS = 60 * 60 * 24; // 1d — same as /api/movie/[id], TMDB's similarity ranking doesn't move fast

export const GET: APIRoute = async ({ params, request }) => {
  const limited = rateLimitResponse(request, "movie-similar", 30, 60_000);
  if (limited) return limited;

  const movieId = Number(params.id);
  if (!Number.isInteger(movieId)) {
    return errorResponse("Invalid movie id", 400);
  }

  try {
    const results = await getSimilarMovies(movieId);
    return jsonResponse({ results }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      logApiError("movie-similar", error);
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
