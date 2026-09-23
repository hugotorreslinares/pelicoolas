import { describe, expect, it } from "vitest";
import { clampRating } from "./rating";

describe("clampRating", () => {
  it("passes valid 1-5 values through unchanged", () => {
    expect(clampRating(1)).toBe(1);
    expect(clampRating(3)).toBe(3);
    expect(clampRating(5)).toBe(5);
  });

  it("clamps out-of-range values", () => {
    expect(clampRating(0)).toBe(1);
    expect(clampRating(-3)).toBe(1);
    expect(clampRating(6)).toBe(5);
    expect(clampRating(100)).toBe(5);
  });

  it("rounds fractional values", () => {
    expect(clampRating(2.4)).toBe(2);
    expect(clampRating(2.6)).toBe(3);
  });
});
