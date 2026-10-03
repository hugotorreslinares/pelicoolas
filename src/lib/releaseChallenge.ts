import type { FilmographyMovie } from "@/types/movie";

export interface UpcomingRelease {
  readonly title: string;
  readonly releaseDate: string;
}

/** Local "YYYY-MM-DD" — TMDB release dates are plain dates, so compare as strings, not instants. */
export function todayIso(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function daysUntil(releaseDate: string, today: string): number {
  const ms =
    Date.parse(`${releaseDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** The soonest movie still to come (release date strictly after today), if any. */
export function nextUpcoming(
  movies: readonly FilmographyMovie[],
  today: string,
): UpcomingRelease | null {
  const future = movies
    .filter(
      (m): m is FilmographyMovie & { releaseDate: string } =>
        m.releaseDate !== null && m.releaseDate > today,
    )
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  return future[0]
    ? { title: future[0].title, releaseDate: future[0].releaseDate }
    : null;
}

/** Ids of movies that are already out — the only ones that can be watched. */
export function releasedIds(
  movies: readonly FilmographyMovie[],
  today: string,
): readonly number[] {
  return movies
    .filter((m) => m.releaseDate !== null && m.releaseDate <= today)
    .map((m) => m.tmdbMovieId);
}
