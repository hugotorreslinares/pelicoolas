export interface FilmographyMovie {
  readonly tmdbMovieId: number;
  readonly title: string;
  readonly posterPath: string | null;
  /** null when TMDB has no release date; always sorts last, never guessed */
  readonly releaseYear: number | null;
  readonly character: string | null;
  readonly voteAverage: number | null;
}

export interface MovieDetails {
  readonly id: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly releaseYear: number | null;
  readonly overview: string | null;
  readonly runtimeMinutes: number | null;
  readonly genres: readonly string[];
}
