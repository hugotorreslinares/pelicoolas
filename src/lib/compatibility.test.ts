import { describe, expect, it } from "vitest";
import { computeCompatibility, type CompatibilityInput } from "./compatibility";
import type {
  SeenMovie,
  WatchlistMovie,
  FollowedPerson,
} from "@/types/filmography";

function watchlistMovie(
  overrides: Partial<WatchlistMovie> & Pick<WatchlistMovie, "tmdbId" | "title">,
): WatchlistMovie {
  return {
    posterPath: null,
    releaseYear: 2020,
    voteAverage: 7,
    addedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function seenMovie(
  overrides: Partial<SeenMovie> & Pick<SeenMovie, "tmdbId" | "title">,
): SeenMovie {
  return {
    posterPath: null,
    releaseYear: 2020,
    voteAverage: 7,
    watchedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function person(
  overrides: Partial<FollowedPerson> & Pick<FollowedPerson, "tmdbId" | "name">,
): FollowedPerson {
  return {
    profilePath: null,
    knownForDepartment: "Acting",
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const empty: CompatibilityInput = {
  watchlist: [],
  seen: [],
  followedPeople: [],
};

describe("computeCompatibility", () => {
  it("finds a title shared between one's watchlist and the other's seen list", () => {
    const mine: CompatibilityInput = {
      ...empty,
      watchlist: [watchlistMovie({ tmdbId: 1, title: "Matrix" })],
    };
    const theirs: CompatibilityInput = {
      ...empty,
      seen: [seenMovie({ tmdbId: 1, title: "Matrix" })],
    };
    const result = computeCompatibility(mine, theirs);
    expect(result.commonTitles).toHaveLength(1);
    expect(result.commonTitles[0]).toMatchObject({
      tmdbId: 1,
      mine: "watchlist",
      theirs: "seen",
    });
  });

  it("doesn't collide a movie id with a TV id", () => {
    const mine: CompatibilityInput = {
      ...empty,
      watchlist: [
        watchlistMovie({
          tmdbId: 550,
          title: "Fight Club",
          mediaType: "movie",
        }),
      ],
    };
    const theirs: CompatibilityInput = {
      ...empty,
      watchlist: [
        watchlistMovie({ tmdbId: 550, title: "Some Show", mediaType: "tv" }),
      ],
    };
    expect(computeCompatibility(mine, theirs).commonTitles).toHaveLength(0);
  });

  it("ranks shared genres by the smaller of the two counts", () => {
    const mine: CompatibilityInput = {
      ...empty,
      seen: [
        seenMovie({ tmdbId: 1, title: "A", genreIds: [28, 12] }),
        seenMovie({ tmdbId: 2, title: "B", genreIds: [28] }),
      ],
    };
    const theirs: CompatibilityInput = {
      ...empty,
      seen: [
        seenMovie({ tmdbId: 3, title: "C", genreIds: [28] }),
        seenMovie({ tmdbId: 4, title: "D", genreIds: [28] }),
        seenMovie({ tmdbId: 5, title: "E", genreIds: [12] }),
      ],
    };
    const result = computeCompatibility(mine, theirs);
    expect(result.commonGenres[0]).toMatchObject({
      genreId: 28,
      myCount: 2,
      theirCount: 2,
    });
  });

  it("intersects followed people by tmdbId", () => {
    const mine: CompatibilityInput = {
      ...empty,
      followedPeople: [person({ tmdbId: 1, name: "Spielberg" })],
    };
    const theirs: CompatibilityInput = {
      ...empty,
      followedPeople: [person({ tmdbId: 1, name: "Spielberg" })],
    };
    expect(computeCompatibility(mine, theirs).commonPeople).toHaveLength(1);
  });

  it("scores identical taste as 100", () => {
    const both: CompatibilityInput = {
      watchlist: [watchlistMovie({ tmdbId: 1, title: "A", genreIds: [28] })],
      seen: [],
      followedPeople: [person({ tmdbId: 1, name: "X" })],
    };
    expect(computeCompatibility(both, both).score).toBe(100);
  });

  it("scores no overlap at all as 0", () => {
    const mine: CompatibilityInput = {
      ...empty,
      watchlist: [watchlistMovie({ tmdbId: 1, title: "A" })],
    };
    const theirs: CompatibilityInput = {
      ...empty,
      watchlist: [watchlistMovie({ tmdbId: 2, title: "B" })],
    };
    expect(computeCompatibility(mine, theirs).score).toBe(0);
  });

  it("handles two completely empty profiles without dividing by zero", () => {
    expect(computeCompatibility(empty, empty).score).toBe(0);
  });
});
