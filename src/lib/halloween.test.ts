import { describe, expect, it } from "vitest";
import { daysLeft, isHalloweenSeason, pickInitial } from "./halloween";
import type { TrendingMovie } from "@/types/movie";

const movie = (id: number): TrendingMovie => ({
  tmdbMovieId: id,
  title: `m${id}`,
  posterPath: null,
  releaseYear: null,
  voteAverage: null,
  genreIds: [],
  mediaType: "movie",
});

describe("isHalloweenSeason", () => {
  it("is on from Sep 15 through Oct 31 and off outside", () => {
    expect(isHalloweenSeason(new Date(2026, 8, 14))).toBe(false);
    expect(isHalloweenSeason(new Date(2026, 8, 15))).toBe(true);
    expect(isHalloweenSeason(new Date(2026, 9, 31, 12))).toBe(true);
    expect(isHalloweenSeason(new Date(2026, 10, 1))).toBe(false);
  });
});

describe("daysLeft", () => {
  it("counts whole days to the deadline and never goes negative", () => {
    expect(daysLeft(new Date(2026, 9, 30, 23, 59, 59))).toBe(1);
    expect(daysLeft(new Date(2026, 10, 5))).toBe(0);
  });
});

describe("pickInitial", () => {
  it("skips watched movies and caps at size", () => {
    const list = [1, 2, 3, 4].map(movie);
    expect(
      pickInitial(list, new Set([2]), 2).map((m) => m.tmdbMovieId),
    ).toEqual([1, 3]);
  });
});
