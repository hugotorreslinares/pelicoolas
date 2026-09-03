import { tmdbFetch } from "./client";
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
    character: "character" in c ? (c.character ?? null) : null,
    voteAverage: c.vote_average ?? null,
  }));

  return dedupeByMovieId(movies);
}

export async function getMovieDetails(movieId: number): Promise<MovieDetails> {
  const data = await tmdbFetch(
    `/movie/${movieId}`,
    tmdbMovieDetailsResponseSchema,
  );

  return {
    id: data.id,
    title: data.title,
    posterPath: data.poster_path,
    releaseYear: toReleaseYear(data.release_date),
    overview: data.overview,
    runtimeMinutes: data.runtime,
    genres: data.genres.map((g) => g.name),
  };
}

const TRENDING_LIMIT = 12;

export async function getTrendingMovies(): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    "/trending/movie/week",
    tmdbTrendingMoviesResponseSchema,
  );

  return data.results.slice(0, TRENDING_LIMIT).map((m) => ({
    tmdbMovieId: m.id,
    title: m.title,
    posterPath: m.poster_path,
    releaseYear: toReleaseYear(m.release_date),
    voteAverage: m.vote_average ?? null,
  }));
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
