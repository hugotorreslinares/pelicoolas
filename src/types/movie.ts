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
}

export interface TrendingMovie {
  readonly tmdbMovieId: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly voteAverage: number | null;
}

export interface CastMember {
  readonly personId: number;
  readonly name: string;
  readonly character: string | null;
  readonly profilePath: string | null;
}

export interface MovieDetails {
  readonly id: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly overview: string | null;
  readonly runtimeMinutes: number | null;
  readonly genres: readonly string[];
  readonly cast: readonly CastMember[];
}
