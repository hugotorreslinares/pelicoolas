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

export type FilmographyFilter = "all" | "watched" | "unwatched";
