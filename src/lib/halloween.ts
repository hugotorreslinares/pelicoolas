import type { TrendingMovie } from "@/types/movie";

export const HALLOWEEN_CHALLENGE_ID = "halloween-2026";
export const HALLOWEEN_SIZE = 31;

// Banner window: shown from mid-September so people can build their list
// before October starts, and until the challenge deadline.
const SEASON_START = new Date(2026, 8, 15);
const DEADLINE = new Date(2026, 9, 31, 23, 59, 59);

export function isHalloweenSeason(now: Date): boolean {
  return now >= SEASON_START && now <= DEADLINE;
}

export function daysLeft(now: Date): number {
  return Math.max(
    0,
    Math.ceil((DEADLINE.getTime() - now.getTime()) / 86_400_000),
  );
}

/** First `size` candidates the user hasn't already watched (input is already ranked). */
export function pickInitial(
  candidates: readonly TrendingMovie[],
  seenIds: ReadonlySet<number>,
  size: number = HALLOWEEN_SIZE,
): readonly TrendingMovie[] {
  return candidates.filter((m) => !seenIds.has(m.tmdbMovieId)).slice(0, size);
}
