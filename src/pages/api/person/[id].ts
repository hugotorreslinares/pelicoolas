import type { APIRoute } from "astro";
import { getPersonProfile } from "@/lib/tmdb/people";
import { getFilmography } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";
import { jsonResponse, errorResponse, rateLimitResponse } from "@/lib/api";
import type { CreditDepartment } from "@/types/filmography";

export const prerender = false;

const CACHE_SECONDS = 60 * 60 * 6; // 6h — a filmography grows over time, but not within hours

export const GET: APIRoute = async ({ params, request }) => {
  const limited = rateLimitResponse(request, "person", 30, 60_000);
  if (limited) return limited;

  const personId = Number(params.id);
  if (!Number.isInteger(personId)) {
    return errorResponse("Invalid person id", 400);
  }

  try {
    const profile = await getPersonProfile(personId);
    const department: CreditDepartment =
      profile.knownForDepartment === "Directing" ? "Directing" : "Acting";
    const movies = await getFilmography(personId, department);

    return jsonResponse({ profile, department, movies }, CACHE_SECONDS);
  } catch (error) {
    if (error instanceof TmdbError) {
      return errorResponse("TMDB unavailable", 502);
    }
    throw error;
  }
};
