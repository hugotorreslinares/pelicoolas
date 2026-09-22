import { describe, expect, it } from "vitest";
import { buildDigestItems, renderDigestEmailHtml } from "./weeklyDigest";
import type { AppNotification } from "@/types/notifications";

describe("buildDigestItems", () => {
  it("maps each notification type to a title/subtitle/link", () => {
    const notifications: readonly AppNotification[] = [
      {
        id: "1",
        type: "new-release",
        movieId: 10,
        movieTitle: "New Movie",
        posterPath: "/poster.jpg",
        personId: 500,
        personName: "Tom Cruise",
        releaseDate: "2026-09-01",
        read: false,
        createdAt: "2026-09-20T00:00:00.000Z",
      },
      {
        id: "2",
        type: "recommendation",
        recommenderId: "bob",
        recommenderName: "Bob",
        movieId: 20,
        movieTitle: "A Show",
        posterPath: null,
        mediaType: "tv",
        read: false,
        createdAt: "2026-09-20T00:00:00.000Z",
      },
      {
        id: "3",
        type: "person-recommendation",
        recommenderId: "carol",
        recommenderName: "Carol",
        personId: 600,
        personName: "Meryl Streep",
        profilePath: "/meryl.jpg",
        read: false,
        createdAt: "2026-09-20T00:00:00.000Z",
      },
    ];

    const items = buildDigestItems(notifications);

    expect(items).toEqual([
      {
        title: "Tom Cruise tiene película nueva",
        subtitle: "New Movie",
        imageUrl: "https://image.tmdb.org/t/p/w154/poster.jpg",
        linkPath: "/person/500",
      },
      {
        title: "Bob recomendó una serie",
        subtitle: "A Show",
        imageUrl: null,
        linkPath: "/u/bob",
      },
      {
        title: "Carol recomendó un actor o director",
        subtitle: "Meryl Streep",
        imageUrl: "https://image.tmdb.org/t/p/w154/meryl.jpg",
        linkPath: "/person/600",
      },
    ]);
  });

  it("caps at 10 items", () => {
    const notifications: readonly AppNotification[] = Array.from(
      { length: 15 },
      (_, i) => ({
        id: String(i),
        type: "new-release" as const,
        movieId: i,
        movieTitle: `Movie ${i}`,
        posterPath: null,
        personId: i,
        personName: `Person ${i}`,
        releaseDate: "2026-09-01",
        read: false,
        createdAt: "2026-09-20T00:00:00.000Z",
      }),
    );
    expect(buildDigestItems(notifications)).toHaveLength(10);
  });
});

describe("renderDigestEmailHtml", () => {
  it("includes every item's title/subtitle and escapes HTML in them", () => {
    const html = renderDigestEmailHtml(
      [
        {
          title: "<script>alert(1)</script>",
          subtitle: "Safe & sound",
          imageUrl: null,
          linkPath: "/person/1",
        },
      ],
      "https://pelicoolas.com/api/unsubscribe-digest?uid=1&token=abc",
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Safe &amp; sound");
    expect(html).toContain("https://pelicoolas.com/person/1");
    expect(html).toContain(
      "https://pelicoolas.com/api/unsubscribe-digest?uid=1&token=abc",
    );
  });
});
