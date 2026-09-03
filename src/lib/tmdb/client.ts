import type { z } from "zod";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export class TmdbError extends Error {}

export async function tmdbFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  params?: Record<string, string>,
): Promise<T> {
  const apiKey = import.meta.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new TmdbError("TMDB_API_KEY is not configured");
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new TmdbError(`TMDB request failed: ${response.status} ${path}`);
  }

  const result = schema.safeParse(await response.json());
  if (!result.success) {
    throw new TmdbError(
      `TMDB response shape changed: ${path}: ${result.error.message}`,
    );
  }
  return result.data;
}
