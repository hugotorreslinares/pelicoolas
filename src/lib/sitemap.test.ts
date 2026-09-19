import { describe, expect, it } from "vitest";
import { buildSitemap } from "./sitemap";

describe("buildSitemap", () => {
  it("lists each loc and escapes XML special characters", () => {
    const xml = buildSitemap(["https://x.com/a", "https://x.com/b?c=1&d=2"]);
    expect(xml).toContain("<loc>https://x.com/a</loc>");
    expect(xml).toContain("<loc>https://x.com/b?c=1&amp;d=2</loc>");
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
  });
});
