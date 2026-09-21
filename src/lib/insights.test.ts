import { describe, expect, it } from "vitest";
import {
  computeInsights,
  latestRecommendation,
  rankTopPeople,
} from "./insights";
import type {
  FollowedPerson,
  RecommendedMovie,
  SeenMovie,
  WatchlistMovie,
} from "@/types/filmography";

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

const person = (tmdbId: number): FollowedPerson => ({
  tmdbId,
  name: `P${tmdbId}`,
  profilePath: null,
  knownForDepartment: "Acting",
  createdAt: "",
});
const wl = (tmdbId: number, sourcePersonId?: number): WatchlistMovie =>
  ({ tmdbId, sourcePersonId }) as WatchlistMovie;

describe("rankTopPeople", () => {
  it("ranks by watched + watchlist, drops zero-score people, applies the limit", () => {
    const ranked = rankTopPeople(
      [person(1), person(2), person(3)],
      new Map([
        [1, [10, 11, 12]],
        [2, [20, 21]],
        [3, [30]],
      ]),
      [movie({ tmdbId: 10 }), movie({ tmdbId: 11 })],
      [wl(21), wl(99, 2), wl(12, 1)],
      2,
    );
    expect(
      ranked.map((r) => [r.person.tmdbId, r.watched, r.watchlist]),
    ).toEqual([
      [1, 2, 1],
      [2, 0, 2],
    ]);
  });
});

describe("latestRecommendation", () => {
  it("returns the most recently added, or null", () => {
    const rec = (tmdbId: number, addedAt: string) =>
      ({ tmdbId, addedAt }) as RecommendedMovie;
    expect(latestRecommendation([])).toBeNull();
    expect(
      latestRecommendation([rec(1, "2026-01-01"), rec(2, "2026-05-01")])
        ?.tmdbId,
    ).toBe(2);
  });

  it("handles Firestore Timestamps and pending (null) timestamps", () => {
    const ts = (ms: number) => ({ toMillis: () => ms });
    const rec = (tmdbId: number, addedAt: unknown) =>
      ({ tmdbId, addedAt }) as unknown as RecommendedMovie;
    expect(
      latestRecommendation([rec(1, ts(1000)), rec(2, ts(5000))])?.tmdbId,
    ).toBe(2);
    expect(latestRecommendation([rec(1, ts(1000)), rec(3, null)])?.tmdbId).toBe(
      3,
    );
    const i = computeInsights([
      movie({ watchedAt: ts(Date.UTC(2026, 5, 15, 12)) as unknown as string }),
    ]);
    expect(i.busiestMonth?.month).toBe(5);
  });
});
