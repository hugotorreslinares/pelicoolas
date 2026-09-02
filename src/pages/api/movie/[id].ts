import type { APIRoute } from "astro";
import { getMovieDetails } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";
import { jsonResponse, errorResponse, rateLimitResponse } from "@/lib/api";

export const prerender = false;

const CACHE_SECONDS = 60 * 60 * 24; // 1d — a released movie's details rarely change

export const GET: APIRoute = async ({ params, request }) => {
  const limited = rateLimitResponse(request, "movie", 30, 60_000);
  if (limited) return limited;

  const movieId = Number(params.id);
  if (!Number.isInteger(movieId)) {
    return errorResponse("Invalid movie id", 400);
  }

  try {
    const movie = await getMovieDetails(movieId);
    return jsonResponse({ movie }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
