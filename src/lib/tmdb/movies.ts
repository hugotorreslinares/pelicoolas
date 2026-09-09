import { tmdbFetch } from "./client";
import { getExternalRatings } from "@/lib/omdb";
import {
  tmdbCombinedCreditsResponseSchema,
  tmdbMovieDetailsResponseSchema,
  tmdbTrendingMoviesResponseSchema,
} from "@/types/tmdb";
import type { CreditDepartment } from "@/types/filmography";
import type {
  FilmographyMovie,
  MovieDetails,
  TrendingMovie,
} from "@/types/movie";

export function toReleaseYear(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

export function dedupeByMovieId(
  movies: readonly FilmographyMovie[],
): readonly FilmographyMovie[] {
  const seen = new Map<number, FilmographyMovie>();
  for (const movie of movies) {
    if (!seen.has(movie.tmdbMovieId)) {
      seen.set(movie.tmdbMovieId, movie);
    }
  }
  return Array.from(seen.values());
}

export async function getFilmography(
  personId: number,
  department: CreditDepartment,
): Promise<readonly FilmographyMovie[]> {
  const data = await tmdbFetch(
    `/person/${personId}/combined_credits`,
    tmdbCombinedCreditsResponseSchema,
  );

  const credits =
    department === "Acting"
      ? data.cast.filter((c) => c.media_type === "movie")
      : data.crew.filter(
          (c) => c.media_type === "movie" && c.department === "Directing",
        );

  const movies = credits.map((c): FilmographyMovie => ({
    tmdbMovieId: c.id,
    title: c.title ?? "Untitled",
    posterPath: c.poster_path,
    releaseYear: toReleaseYear(c.release_date),
    releaseDate: c.release_date ?? null,
    character: "character" in c ? (c.character ?? null) : null,
    voteAverage: c.vote_average ?? null,
    genreIds: c.genre_ids ?? [],
  }));

  return dedupeByMovieId(movies);
}

const CAST_LIMIT = 10;

export async function getMovieDetails(movieId: number): Promise<MovieDetails> {
  const data = await tmdbFetch(
    `/movie/${movieId}`,
    tmdbMovieDetailsResponseSchema,
    { append_to_response: "credits" },
  );

  const externalRatings = await getExternalRatings(data.imdb_id);

  return {
    id: data.id,
    title: data.title,
    posterPath: data.poster_path,
    releaseYear: toReleaseYear(data.release_date),
    overview: data.overview,
    runtimeMinutes: data.runtime,
    voteAverage: data.vote_average ?? null,
    genres: data.genres.map((g) => g.name),
    genreIds: data.genres.map((g) => g.id),
    cast: (data.credits?.cast ?? []).slice(0, CAST_LIMIT).map((c) => ({
      personId: c.id,
      name: c.name,
      character: c.character ?? null,
      profilePath: c.profile_path,
    })),
    externalRatings,
  };
}

// /search/movie, /trending/movie/week, and /movie/{id}/similar all return
// this same summary shape — one mapper instead of duplicating it three times.
function toTrendingMovie(m: {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
}): TrendingMovie {
  return {
    tmdbMovieId: m.id,
    title: m.title,
    posterPath: m.poster_path,
    releaseYear: toReleaseYear(m.release_date),
    voteAverage: m.vote_average ?? null,
    genreIds: m.genre_ids ?? [],
  };
}

export async function searchMovie(
  query: string,
): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    "/search/movie",
    tmdbTrendingMoviesResponseSchema,
    { query, include_adult: "false" },
  );
  return data.results.map(toTrendingMovie);
}

const TRENDING_LIMIT = 12;

export async function getTrendingMovies(): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    "/trending/movie/week",
    tmdbTrendingMoviesResponseSchema,
  );
  return data.results.slice(0, TRENDING_LIMIT).map(toTrendingMovie);
}

const SIMILAR_LIMIT = 12;

// TMDB's own ordering is the ranking signal here — index 0 is "most
// similar" — callers that want a closer/farther layout should preserve
// array order, not re-sort by anything else.
export async function getSimilarMovies(
  movieId: number,
): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    `/movie/${movieId}/similar`,
    tmdbTrendingMoviesResponseSchema,
  );
  return data.results.slice(0, SIMILAR_LIMIT).map(toTrendingMovie);
}

export function sortFilmography(
  movies: readonly FilmographyMovie[],
  order: "newest" | "oldest",
): readonly FilmographyMovie[] {
  const withYear = movies.filter((m) => m.releaseYear !== null);
  const withoutYear = movies.filter((m) => m.releaseYear === null);

  const sorted = [...withYear].sort((a, b) =>
    order === "newest"
      ? b.releaseYear! - a.releaseYear!
      : a.releaseYear! - b.releaseYear!,
  );

  return [...sorted, ...withoutYear];
}
