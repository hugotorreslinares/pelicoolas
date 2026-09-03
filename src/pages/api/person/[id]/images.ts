import type { APIRoute } from "astro";
import { getPersonImages } from "@/lib/tmdb/people";
import { TmdbError } from "@/lib/tmdb/client";
import {
  jsonResponse,
  errorResponse,
  logApiError,
  rateLimitResponse,
} from "@/lib/api";

export const prerender = false;

const CACHE_SECONDS = 60 * 60 * 24; // 1d — a person's photo gallery on TMDB barely changes

export const GET: APIRoute = async ({ params, request }) => {
  const limited = rateLimitResponse(request, "person-images", 30, 60_000);
  if (limited) return limited;

  const personId = Number(params.id);
  if (!Number.isInteger(personId)) {
    return errorResponse("Invalid person id", 400);
  }

  try {
    const images = await getPersonImages(personId);
    return jsonResponse({ images }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      logApiError("person-images", error);
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
