import { describe, expect, it } from "vitest";
import {
  daysUntil,
  nextUpcoming,
  releasedIds,
  todayIso,
} from "./releaseChallenge";
import type { FilmographyMovie } from "@/types/movie";

const movie = (id: number, releaseDate: string | null): FilmographyMovie => ({
  tmdbMovieId: id,
  title: `M${id}`,
  posterPath: null,
  releaseYear: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
  releaseDate,
  character: null,
  voteAverage: null,
  genreIds: [],
});

describe("release challenge helpers", () => {
  const movies = [
    movie(1, "2026-01-01"),
    movie(2, "2026-10-03"),
    movie(3, "2026-12-25"),
    movie(4, "2026-11-01"),
    movie(5, null),
  ];

  it("formats today as a local date string", () => {
    expect(todayIso(new Date(2026, 9, 3))).toBe("2026-10-03");
  });

  it("picks the soonest strictly-future release", () => {
    expect(nextUpcoming(movies, "2026-10-03")).toEqual({
      title: "M4",
      releaseDate: "2026-11-01",
    });
  });

  it("returns null when nothing is upcoming", () => {
    expect(
      nextUpcoming([movie(1, "2020-01-01"), movie(2, null)], "2026-10-03"),
    ).toBeNull();
  });

  it("counts a movie releasing today as released", () => {
    expect(releasedIds(movies, "2026-10-03")).toEqual([1, 2]);
  });

  it("counts days between dates", () => {
    expect(daysUntil("2026-10-10", "2026-10-03")).toBe(7);
  });
});
