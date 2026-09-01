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
  readonly sourcePersonId: number;
  readonly sourcePersonName: string;
  readonly addedAt: string;
}

export type FilmographyFilter = "all" | "watched" | "unwatched";
