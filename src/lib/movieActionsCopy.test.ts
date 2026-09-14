import { describe, expect, it } from "vitest";
import { watchedLabel, watchlistLabel } from "./movieActionsCopy";

describe("watchedLabel", () => {
  it("prompts to mark watched when not watched", () => {
    expect(watchedLabel(false)).toBe("Mark as watched");
  });

  it("confirms watched when already watched", () => {
    expect(watchedLabel(true)).toBe("Already watched");
  });
});

describe("watchlistLabel", () => {
  it("prompts to add when not in watchlist", () => {
    expect(watchlistLabel(false)).toBe("Add to watchlist");
  });

  it("confirms membership when in watchlist", () => {
    expect(watchlistLabel(true)).toBe("In watchlist");
  });
});
