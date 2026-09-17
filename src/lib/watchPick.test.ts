import { describe, expect, it } from "vitest";
import { pickForUs } from "./watchPick";
import type { CompatibilityInput } from "./compatibility";
import type { WatchlistMovie, SeenMovie } from "@/types/filmography";

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

const empty: CompatibilityInput = {
  watchlist: [],
  seen: [],
  followedPeople: [],
};

describe("pickForUs", () => {
  it("returns null when nothing is on both watchlists", () => {
    const mine: CompatibilityInput = {
      ...empty,
      watchlist: [watchlistMovie({ tmdbId: 1, title: "A" })],
    };
    expect(pickForUs(mine, empty)).toBeNull();
  });

  it("prefers a title in the pair's top shared genre", () => {
    // Both have watched plenty of genre 28 — that's the top shared genre —
    // and the shared watchlist has one title in 28, one in 12.
    const mine: CompatibilityInput = {
      watchlist: [
        watchlistMovie({ tmdbId: 1, title: "Action Pick", genreIds: [28] }),
        watchlistMovie({ tmdbId: 2, title: "Other Pick", genreIds: [12] }),
      ],
      seen: [
        seenMovie({ tmdbId: 10, title: "S1", genreIds: [28] }),
        seenMovie({ tmdbId: 11, title: "S2", genreIds: [28] }),
      ],
      followedPeople: [],
    };
    const theirs: CompatibilityInput = {
      watchlist: [
        watchlistMovie({ tmdbId: 1, title: "Action Pick", genreIds: [28] }),
        watchlistMovie({ tmdbId: 2, title: "Other Pick", genreIds: [12] }),
      ],
      seen: [
        seenMovie({ tmdbId: 20, title: "S3", genreIds: [28] }),
        seenMovie({ tmdbId: 21, title: "S4", genreIds: [28] }),
      ],
      followedPeople: [],
    };
    const pick = pickForUs(mine, theirs);
    expect(pick?.reason).toBe("genre");
    expect(pick?.item.tmdbId).toBe(1);
  });

  it("falls back to a shared person when there's no shared favorite genre", () => {
    const mine: CompatibilityInput = {
      watchlist: [
        watchlistMovie({ tmdbId: 1, title: "Via Nolan", sourcePersonId: 525 }),
        watchlistMovie({ tmdbId: 2, title: "Random" }),
      ],
      seen: [],
      followedPeople: [
        {
          tmdbId: 525,
          name: "Nolan",
          profilePath: null,
          knownForDepartment: "Directing",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    const theirs: CompatibilityInput = {
      watchlist: [
        watchlistMovie({ tmdbId: 1, title: "Via Nolan", sourcePersonId: 525 }),
        watchlistMovie({ tmdbId: 2, title: "Random" }),
      ],
      seen: [],
      followedPeople: [
        {
          tmdbId: 525,
          name: "Nolan",
          profilePath: null,
          knownForDepartment: "Directing",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    const pick = pickForUs(mine, theirs);
    expect(pick?.reason).toBe("person");
    expect(pick?.item.tmdbId).toBe(1);
  });

  it("falls back to a random shared pick with no genre or person signal", () => {
    const mine: CompatibilityInput = {
      ...empty,
      watchlist: [watchlistMovie({ tmdbId: 1, title: "A" })],
    };
    const theirs: CompatibilityInput = {
      ...empty,
      watchlist: [watchlistMovie({ tmdbId: 1, title: "A" })],
    };
    const pick = pickForUs(mine, theirs);
    expect(pick?.reason).toBe("random");
    expect(pick?.item.tmdbId).toBe(1);
  });
});
