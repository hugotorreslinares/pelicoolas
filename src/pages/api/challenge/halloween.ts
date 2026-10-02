import type { APIRoute } from "astro";
import { getHorrorCandidates } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";
import { CANDIDATES_MAX, CANDIDATES_STEP } from "@/lib/halloween";
import {
  jsonResponse,
  errorResponse,
  logApiError,
  rateLimitResponse,
} from "@/lib/api";

export const prerender = false;

const CACHE_SECONDS = 60 * 60 * 6; // ranking barely moves — 6h at the CDN

export const GET: APIRoute = async ({ request, url }) => {
  const limited = rateLimitResponse(request, "challenge-halloween", 30, 60_000);
  if (limited) return limited;

  try {
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    if (offset >= CANDIDATES_MAX)
      return jsonResponse({ results: [], done: true });
    const limit = Math.min(
      Math.max(1, Number(url.searchParams.get("limit")) || CANDIDATES_STEP),
      CANDIDATES_MAX - offset,
    );
    const results = await getHorrorCandidates(offset, limit);
    // Fewer than asked = TMDB ran out; either way no more to offer.
    const done = results.length < limit || offset + limit >= CANDIDATES_MAX;
    return jsonResponse({ results, done }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      logApiError("challenge-halloween", error);
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
