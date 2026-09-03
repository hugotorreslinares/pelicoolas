import { beforeEach, describe, expect, it } from "vitest";
import { addRecentSearch, getRecentSearches } from "./recentSearches";
import type { PersonSearchResult } from "@/types/person";

function person(id: number): PersonSearchResult {
  return {
    id,
    name: `Person ${id}`,
    profilePath: null,
    knownForDepartment: "Acting",
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("recentSearches", () => {
  it("returns an empty list when nothing is stored", () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it("adds the most recent search first", () => {
    addRecentSearch(person(1));
    addRecentSearch(person(2));
    expect(getRecentSearches().map((p) => p.id)).toEqual([2, 1]);
  });

  it("moves a re-added person to the front instead of duplicating it", () => {
    addRecentSearch(person(1));
    addRecentSearch(person(2));
    addRecentSearch(person(1));
    expect(getRecentSearches().map((p) => p.id)).toEqual([1, 2]);
  });

  it("caps the list at 8 entries", () => {
    for (let id = 1; id <= 10; id++) addRecentSearch(person(id));
    const ids = getRecentSearches().map((p) => p.id);
    expect(ids).toHaveLength(8);
    expect(ids).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
  });

  it("recovers from corrupted storage instead of throwing", () => {
    localStorage.setItem("filmo:recentSearches", "{not json");
    expect(getRecentSearches()).toEqual([]);
  });
});
