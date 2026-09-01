import type { APIRoute } from "astro";
import { getMovieDetails } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const movieId = Number(params.id);
  if (!Number.isInteger(movieId)) {
    return new Response(JSON.stringify({ error: "Invalid movie id" }), { status: 400 });
  }

  try {
    const movie = await getMovieDetails(movieId);
    return new Response(JSON.stringify({ movie }), {
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
