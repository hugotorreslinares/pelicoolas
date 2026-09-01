import { tmdbFetch } from "./client";
import type { CreditDepartment } from "@/types/filmography";
import type { FilmographyMovie, MovieDetails } from "@/types/movie";

interface TmdbCastCredit {
  readonly id: number;
  readonly title?: string;
  readonly poster_path: string | null;
  readonly release_date?: string;
  readonly character?: string;
  readonly media_type: string;
  readonly vote_average?: number;
}

interface TmdbCrewCredit extends TmdbCastCredit {
  readonly department?: string;
}

interface TmdbCombinedCreditsResponse {
  readonly cast: readonly TmdbCastCredit[];
  readonly crew: readonly TmdbCrewCredit[];
}

function toReleaseYear(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

function dedupeByMovieId(
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
  const data = await tmdbFetch<TmdbCombinedCreditsResponse>(
    `/person/${personId}/combined_credits`,
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

interface TmdbMovieDetailsResponse {
  readonly id: number;
  readonly title: string;
  readonly poster_path: string | null;
  readonly release_date?: string;
  readonly overview: string | null;
  readonly runtime: number | null;
  readonly genres: readonly { readonly id: number; readonly name: string }[];
}

export async function getMovieDetails(movieId: number): Promise<MovieDetails> {
  const data = await tmdbFetch<TmdbMovieDetailsResponse>(`/movie/${movieId}`);

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
