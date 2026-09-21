import { describe, expect, it } from "vitest";
import { computeInsights } from "./insights";
import type { SeenMovie } from "@/types/filmography";

const movie = (over: Partial<SeenMovie>): SeenMovie => ({
  tmdbId: 1,
  title: "T",
  posterPath: null,
  releaseYear: 2000,
  voteAverage: 7,
  watchedAt: "2026-03-10T00:00:00.000Z",
  ...over,
});

describe("computeInsights", () => {
  it("returns empty insights for no movies", () => {
    const i = computeInsights([]);
    expect(i).toMatchObject({
      total: 0,
      averageRating: null,
      bestYear: null,
      busiestMonth: null,
      topGenreId: null,
    });
  });

  it("finds best year (with its top-rated title), busiest month and top genre", () => {
    const i = computeInsights([
      movie({
        tmdbId: 1,
        title: "A",
        releaseYear: 2020,
        voteAverage: 6,
        genreIds: [27, 18],
      }),
      movie({
        tmdbId: 2,
        title: "B",
        releaseYear: 2020,
        voteAverage: 8,
        genreIds: [27],
      }),
      movie({
        tmdbId: 3,
        title: "C",
        releaseYear: 1999,
        voteAverage: 9,
        watchedAt: "2026-06-15T12:00:00.000Z",
      }),
    ]);
    expect(i.bestYear).toEqual({ year: 2020, count: 2, topTitle: "B" });
    expect(i.topGenreId).toBe(27);
    expect(i.busiestMonth?.count).toBe(2);
    expect(i.averageRating).toBeCloseTo(7.67, 1);
  });

  it("ignores missing ratings and invalid dates", () => {
    const i = computeInsights([
      movie({ voteAverage: null, releaseYear: null, watchedAt: "nope" }),
    ]);
    expect(i.averageRating).toBeNull();
    expect(i.bestYear).toBeNull();
    expect(i.busiestMonth).toBeNull();
  });
});
