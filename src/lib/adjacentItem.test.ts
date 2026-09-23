import { describe, expect, it } from "vitest";
import { adjacentItem } from "./adjacentItem";

describe("adjacentItem", () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it("returns both neighbors for a middle item", () => {
    expect(adjacentItem(items, items[1])).toEqual({
      previous: items[0],
      next: items[2],
    });
  });

  it("returns null previous at the start and null next at the end", () => {
    expect(adjacentItem(items, items[0])).toEqual({
      previous: null,
      next: items[1],
    });
    expect(adjacentItem(items, items[2])).toEqual({
      previous: items[1],
      next: null,
    });
  });

  it("returns nulls for a null current or an item not in the list", () => {
    expect(adjacentItem(items, null)).toEqual({ previous: null, next: null });
    expect(adjacentItem(items, { id: 99 })).toEqual({
      previous: null,
      next: null,
    });
  });
});
