import type { APIRoute } from "astro";
import { searchPerson } from "@/lib/tmdb/people";
import { TmdbError } from "@/lib/tmdb/client";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("q")?.trim();
  if (!query) {
    return new Response(
      JSON.stringify({ error: "Missing query parameter q" }),
      {
        status: 400,
      },
    );
  }

  try {
    const results = await searchPerson(query);
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    if (error instanceof TmdbError) {
      return new Response(JSON.stringify({ error: "TMDB unavailable" }), {
        status: 502,
      });
    }
    throw error;
  }
};
