import { readCache, writeCache } from "@/lib/clientCache";
import type { PersonProfile } from "@/types/person";
import type { CreditDepartment } from "@/types/filmography";
import type {
  FilmographyMovie,
  MovieDetails,
  TrendingMovie,
  TVDetails,
} from "@/types/movie";

// Client-side cached wrappers around this app's own /api/* proxies (never
// TMDB directly — see src/lib/tmdb/* for the server-only client). Centralized
// here because Dashboard, ConnectionsPage, and WrappedStats each fetch the
// same /api/person/{id} for every followed person, and MovieDetailsDialog +
// ConnectionsPage both fetch /api/movie/{id} — duplicated fetch logic that's
// now also duplicated cache-miss cost on every reload.

const PERSON_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // matches /api/person/[id]'s own 6h server cache
const MOVIE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // matches /api/movie/[id]'s own 1d server cache

export interface PersonData {
  readonly profile: PersonProfile;
  readonly department: CreditDepartment;
  readonly movies: readonly FilmographyMovie[];
}

export async function fetchPersonData(
  personId: number,
): Promise<PersonData | null> {
  const cacheKey = `person:${personId}`;
  const cached = readCache<PersonData>(cacheKey, PERSON_CACHE_MAX_AGE_MS);
  if (cached) return cached;

  const res = await fetch(`/api/person/${personId}`);
  if (!res.ok) return null;
  const data = (await res.json()) as PersonData;
  writeCache(cacheKey, data);
  return data;
}

export async function fetchMovieDetails(
  movieId: number,
): Promise<MovieDetails | null> {
  const cacheKey = `movie:${movieId}`;
  const cached = readCache<MovieDetails>(cacheKey, MOVIE_CACHE_MAX_AGE_MS);
  if (cached) return cached;

  const res = await fetch(`/api/movie/${movieId}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { movie: MovieDetails };
  writeCache(cacheKey, data.movie);
  return data.movie;
}

export async function fetchTVDetails(tvId: number): Promise<TVDetails | null> {
  // Own "tv:" cache-key namespace, not shared with fetchMovieDetails'
  // "movie:" — a TV id and a movie id can collide numerically (separate
  // TMDB namespaces), so sharing a key prefix would return the wrong
  // cached details for one of them.
  const cacheKey = `tv:${tvId}`;
  const cached = readCache<TVDetails>(cacheKey, MOVIE_CACHE_MAX_AGE_MS);
  if (cached) return cached;

  const res = await fetch(`/api/tv/${tvId}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { show: TVDetails };
  writeCache(cacheKey, data.show);
  return data.show;
}

export async function fetchSimilarMovies(
  movieId: number,
): Promise<readonly TrendingMovie[]> {
  const cacheKey = `similar:${movieId}`;
  const cached = readCache<readonly TrendingMovie[]>(
    cacheKey,
    MOVIE_CACHE_MAX_AGE_MS,
  );
  if (cached) return cached;

  const res = await fetch(`/api/movie/${movieId}/similar`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results: readonly TrendingMovie[] };
  writeCache(cacheKey, data.results);
  return data.results;
}
