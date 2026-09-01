import type { APIRoute } from "astro";
import { getPersonImages } from "@/lib/tmdb/people";
import { TmdbError } from "@/lib/tmdb/client";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const personId = Number(params.id);
  if (!Number.isInteger(personId)) {
    return new Response(JSON.stringify({ error: "Invalid person id" }), { status: 400 });
  }

  try {
    const images = await getPersonImages(personId);
    return new Response(JSON.stringify({ images }), {
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
