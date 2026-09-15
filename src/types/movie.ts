export interface FilmographyMovie {
  readonly tmdbMovieId: number;
  readonly title: string;
  readonly posterPath: string | null;
  /** null when TMDB has no release date; always sorts last, never guessed */
  readonly releaseYear: number | null;
  /** Full "YYYY-MM-DD" from TMDB, null when unknown — needed for day-level matching ("on this day"), releaseYear alone isn't enough. */
  readonly releaseDate: string | null;
  readonly character: string | null;
  readonly voteAverage: number | null;
  /** TMDB genre ids (see `lib/tmdb/genres.ts`) — empty when TMDB returned none. */
  readonly genreIds: readonly number[];
}

/**
 * Also doubles as the TV trending summary shape (`mediaType: "tv"`) — same
 * fields fit both (title = show name, releaseYear = first-air year), and
 * splitting into a parallel TrendingTV type would just duplicate this for
 * no benefit. Absent `mediaType` means "movie", for backward compatibility
 * with every trending/similar/search-movie call site that predates TV
 * support.
 */
export interface TrendingMovie {
  readonly tmdbMovieId: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly voteAverage: number | null;
  readonly genreIds: readonly number[];
  readonly mediaType?: "movie" | "tv";
}

export interface CastMember {
  readonly personId: number;
  readonly name: string;
  readonly character: string | null;
  readonly profilePath: string | null;
}

/** IMDb/Rotten Tomatoes/Metacritic scores from OMDb — TMDB has no equivalent. */
export interface ExternalRatings {
  readonly imdb: string | null;
  readonly rottenTomatoes: string | null;
  readonly metacritic: string | null;
}

export interface MovieDetails {
  readonly id: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly overview: string | null;
  readonly runtimeMinutes: number | null;
  readonly voteAverage: number | null;
  readonly genres: readonly string[];
  /** Same genres as `genres`, as TMDB ids — for filtering (see `lib/tmdb/genres.ts`) rather than display. */
  readonly genreIds: readonly number[];
  readonly cast: readonly CastMember[];
  /** null when TMDB has no imdb_id for this movie, or OMDb has nothing/is unreachable — never blocks the rest of the details. */
  readonly externalRatings: ExternalRatings | null;
}

/**
 * A TV show has no single "runtime" the way a movie does — seasonCount/
 * episodeCount stand in for it in the details dialog's subtitle line.
 * Otherwise mirrors MovieDetails field-for-field so MovieDetailsDialog can
 * adapt to either with one small mapping function rather than a second
 * dialog component.
 */
export interface TVDetails {
  readonly id: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly overview: string | null;
  readonly seasonCount: number | null;
  readonly episodeCount: number | null;
  readonly voteAverage: number | null;
  readonly genres: readonly string[];
  readonly genreIds: readonly number[];
  readonly cast: readonly CastMember[];
  readonly externalRatings: ExternalRatings | null;
}
