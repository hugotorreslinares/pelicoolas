import type { FilmographyMovie } from "./movie";

export type CreditDepartment = "Acting" | "Directing";

export interface Filmography {
  readonly personId: number;
  readonly department: CreditDepartment;
  readonly movies: readonly FilmographyMovie[];
}

export interface FollowedPerson {
  readonly tmdbId: number;
  readonly name: string;
  readonly profilePath: string | null;
  readonly knownForDepartment: string | null;
  readonly createdAt: string;
}

export interface WatchedMovie {
  readonly tmdbId: number;
  readonly watchedAt: string;
}

export interface WatchlistMovie {
  readonly tmdbId: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly voteAverage: number | null;
  // Absent when added straight from a movie search result rather than
  // through a followed person's filmography — there's no "via" person to
  // attribute it to.
  readonly sourcePersonId?: number;
  readonly sourcePersonName?: string;
  readonly addedAt: string;
  /** Absent on watchlist entries added before this field existed. */
  readonly genreIds?: readonly number[];
}

export type FilmographyFilter = "all" | "watched" | "unwatched";

/** An entry on a user's public recommendations board (`/board/{userId}`). */
export interface RecommendedMovie {
  readonly tmdbId: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly voteAverage: number | null;
  readonly addedAt: string;
}

/**
 * A movie marked watched from a generic context (search, watchlist,
 * recommendations board, Connections) with no specific followed person's
 * filmography to check it off in. Deliberately separate from `WatchedMovie`
 * (nested under `followedPeople/{personId}/watchedMovies`, which drives
 * filmography-completion progress/badges) — marking a movie here does not
 * check it off in any filmography, and vice versa.
 */
export interface SeenMovie {
  readonly tmdbId: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly voteAverage: number | null;
  readonly watchedAt: string;
}
