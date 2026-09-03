import { describe, expect, it } from "vitest";
import { dedupeByMovieId, sortFilmography, toReleaseYear } from "./movies";
import type { FilmographyMovie } from "@/types/movie";

function movie(
  overrides: Partial<FilmographyMovie> & { tmdbMovieId: number },
): FilmographyMovie {
  return {
    title: `Movie ${overrides.tmdbMovieId}`,
    posterPath: null,
    releaseYear: null,
    releaseDate: null,
    character: null,
    voteAverage: null,
    ...overrides,
  };
}

describe("toReleaseYear", () => {
  it("extracts the year from a full date", () => {
    expect(toReleaseYear("1994-07-06")).toBe(1994);
  });

  it("returns null for missing or empty dates", () => {
    expect(toReleaseYear(undefined)).toBeNull();
    expect(toReleaseYear("")).toBeNull();
  });

  it("returns null for a non-numeric or zero year", () => {
    expect(toReleaseYear("0000-01-01")).toBeNull();
  });
});

describe("dedupeByMovieId", () => {
  it("keeps only the first occurrence of each movie id", () => {
    const movies = [
      movie({ tmdbMovieId: 1 }),
      movie({ tmdbMovieId: 2 }),
      movie({ tmdbMovieId: 1 }),
    ];
    expect(dedupeByMovieId(movies).map((m) => m.tmdbMovieId)).toEqual([1, 2]);
  });
});

describe("sortFilmography", () => {
  const movies = [
    movie({ tmdbMovieId: 1, releaseYear: 1994 }),
    movie({ tmdbMovieId: 2, releaseYear: 2010 }),
    movie({ tmdbMovieId: 3, releaseYear: null }),
    movie({ tmdbMovieId: 4, releaseYear: 2001 }),
  ];

  it("sorts newest first, undated movies last", () => {
    expect(sortFilmography(movies, "newest").map((m) => m.tmdbMovieId)).toEqual(
      [2, 4, 1, 3],
    );
  });

  it("sorts oldest first, undated movies last", () => {
    expect(sortFilmography(movies, "oldest").map((m) => m.tmdbMovieId)).toEqual(
      [1, 4, 2, 3],
    );
  });
});
