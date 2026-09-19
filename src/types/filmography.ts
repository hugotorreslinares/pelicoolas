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

/**
 * Legacy per-person "watched" doc (followedPeople/{personId}/watchedMovies)
 * — no longer written to. `SeenMovie` (below) is now the single source of
 * truth for "have I watched this movie"; this type only exists to read old
 * data once for `migrateWatchedToSeen`.
 */
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
  /** Set while the movie belongs to a themed challenge (see lib/halloween.ts); the entry stays in the watchlist either way. */
  readonly challenge?: string;
  /** Absent on watchlist entries added before this field existed. */
  readonly genreIds?: readonly number[];
  /** Absent on watchlist entries added before this field existed. */
  readonly durationMinutes?: number | null;
  /** Absent means "movie" — see mediaDocId in firestore.ts for why the doc id itself also encodes this. */
  readonly mediaType?: "movie" | "tv";
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
  /** Absent means "movie". */
  readonly mediaType?: "movie" | "tv";
}

/**
 * `users/{userId}/seen/{movieId}` — the single source of truth for "have I
 * watched this movie", used everywhere: search, watchlist, recommendations
 * board, Connections, and a followed person's filmography checkbox alike.
 * Filmography-completion progress/badges intersect this with a person's
 * movie list rather than tracking their own separate watched state.
 */
export interface SeenMovie {
  readonly tmdbId: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly voteAverage: number | null;
  readonly watchedAt: string;
  /** Absent on entries marked seen before this field existed — same
   *  optional-then-backfilled pattern as WatchlistMovie.genreIds. */
  readonly genreIds?: readonly number[];
  /** Absent means "movie". */
  readonly mediaType?: "movie" | "tv";
}
