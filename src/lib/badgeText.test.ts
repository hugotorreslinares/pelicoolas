import { describe, expect, it } from "vitest";
import { localizeBadge } from "./badgeText";
import type { Badge } from "@/types/badges";

const base = { earnedAt: "2026-01-01", description: "stored" };

describe("localizeBadge", () => {
  it("leaves English badges untouched", () => {
    const b: Badge = {
      ...base,
      id: "watchlist-milestone-10",
      type: "watchlist-milestone",
      label: "Watchlist of 10+",
    };
    expect(localizeBadge(b, "en")).toBe(b);
  });

  it("translates threshold badges using the id suffix", () => {
    const b: Badge = {
      ...base,
      id: "filmography-milestone-25",
      type: "filmography-milestone",
      label: "x",
    };
    expect(localizeBadge(b, "es").label).toBe("25 filmografías completas");
  });

  it("translates person badges using personName", () => {
    const b: Badge = {
      ...base,
      id: "person-complete-1",
      type: "person-complete",
      label: "x",
      personName: "Ana",
    };
    expect(localizeBadge(b, "es").label).toBe("Completaste a Ana");
  });
});
