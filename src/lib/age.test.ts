import { describe, expect, it } from "vitest";
import { calculateAge } from "./age";

describe("calculateAge", () => {
  it("counts full years elapsed", () => {
    expect(calculateAge("1990-01-01", "2024-01-01")).toBe(34);
  });

  it("doesn't count the birthday year until it passes", () => {
    expect(calculateAge("1990-06-15", "2024-06-14")).toBe(33);
    expect(calculateAge("1990-06-15", "2024-06-15")).toBe(34);
  });

  it("handles a same-month, earlier-day comparison", () => {
    expect(calculateAge("1990-06-15", "2024-06-01")).toBe(33);
  });

  it("defaults `until` to now", () => {
    const birthYear = new Date().getFullYear() - 20;
    expect(calculateAge(`${birthYear}-01-01`)).toBeGreaterThanOrEqual(19);
  });
});
