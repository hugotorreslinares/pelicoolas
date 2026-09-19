import type { APIRoute } from "astro";
import { getHorrorCandidates } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";
import {
  jsonResponse,
  errorResponse,
  logApiError,
  rateLimitResponse,
} from "@/lib/api";

export const prerender = false;

const CACHE_SECONDS = 60 * 60 * 6; // ranking barely moves — 6h at the CDN

export const GET: APIRoute = async ({ request }) => {
  const limited = rateLimitResponse(request, "challenge-halloween", 30, 60_000);
  if (limited) return limited;

  try {
    const results = await getHorrorCandidates();
    return jsonResponse({ results }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      logApiError("challenge-halloween", error);
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
