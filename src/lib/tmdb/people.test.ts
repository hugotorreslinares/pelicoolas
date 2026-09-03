import { describe, expect, it } from "vitest";
import { toGender } from "./people";

describe("toGender", () => {
  it("maps TMDB's numeric gender codes", () => {
    expect(toGender(1)).toBe("female");
    expect(toGender(2)).toBe("male");
    expect(toGender(3)).toBe("non-binary");
  });

  it("maps unknown/unset (0) to null", () => {
    expect(toGender(0)).toBeNull();
  });
});
