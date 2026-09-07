import type { ExternalRatings } from "@/types/movie";

interface OmdbResponse {
  readonly Response: "True" | "False";
  readonly Ratings?: readonly {
    readonly Source: string;
    readonly Value: string;
  }[];
}

/**
 * OMDb has no equivalent to TMDB's own vote average once you already have
 * one — this is purely for Rotten Tomatoes/Metacritic, which TMDB doesn't
 * carry at all. Never throws: a missing API key, an unreachable OMDb, or a
 * movie with no IMDb entry should degrade to "no external ratings", not
 * break the rest of the movie details.
 */
export async function getExternalRatings(
  imdbId: string | null | undefined,
): Promise<ExternalRatings | null> {
  const apiKey = import.meta.env.OMDB_API_KEY;
  if (!imdbId || !apiKey) return null;

  try {
    const res = await fetch(
      `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${apiKey}`,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as OmdbResponse;
    if (data.Response !== "True") return null;

    const ratings = data.Ratings ?? [];
    const find = (source: string) =>
      ratings.find((r) => r.Source === source)?.Value ?? null;

    return {
      imdb: find("Internet Movie Database"),
      rottenTomatoes: find("Rotten Tomatoes"),
      metacritic: find("Metacritic"),
    };
  } catch {
    return null;
  }
}
