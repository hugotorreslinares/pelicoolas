import type { APIRoute } from "astro";
import { getPersonProfile } from "@/lib/tmdb/people";
import { getFilmography } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";
import type { CreditDepartment } from "@/types/filmography";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const personId = Number(params.id);
  if (!Number.isInteger(personId)) {
    return new Response(JSON.stringify({ error: "Invalid person id" }), { status: 400 });
  }

  try {
    const profile = await getPersonProfile(personId);
    const department: CreditDepartment =
      profile.knownForDepartment === "Directing" ? "Directing" : "Acting";
    const movies = await getFilmography(personId, department);

    return new Response(JSON.stringify({ profile, department, movies }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    if (error instanceof TmdbError) {
      return new Response(JSON.stringify({ error: "TMDB unavailable" }), { status: 502 });
    }
    throw error;
  }
};
