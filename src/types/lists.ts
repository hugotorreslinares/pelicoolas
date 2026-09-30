/**
 * `users/{userId}/lists/{listId}` — a user-created, named movie list (e.g.
 * "Found footage", "Películas colombianas"). Separate feature from the
 * Halloween challenge (which stays as its own fixed, gamified 31-movie
 * list — see halloween.ts) — this is the general-purpose version: any
 * number of lists, any name, any movies, owner-managed.
 *
 * Public read (same precedent as `recommendations`/the Halloween list
 * itself): a list is only worth sharing if anyone can open the link
 * without an account.
 */
export interface MovieList {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
}

/** `users/{userId}/lists/{listId}/movies/{movieDocId}` — one entry. */
export interface ListMovie {
  readonly tmdbId: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly voteAverage: number | null;
  readonly addedAt: string;
  /** Absent means "movie". */
  readonly mediaType?: "movie" | "tv";
}
