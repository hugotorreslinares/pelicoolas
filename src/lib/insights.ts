import type {
  FollowedPerson,
  RecommendedMovie,
  SeenMovie,
  WatchlistMovie,
} from "@/types/filmography";

export interface Insights {
  readonly total: number;
  /** Mean TMDB rating of the watched movies that have one. */
  readonly averageRating: number | null;
  /** Release year the user has watched the most titles from. */
  readonly bestYear: {
    readonly year: number;
    readonly count: number;
    /** Highest-rated watched title from that year. */
    readonly topTitle: string;
  } | null;
  /** 0–11, month in which the user marked the most movies as watched. */
  readonly busiestMonth: {
    readonly month: number;
    readonly count: number;
  } | null;
  readonly topGenreId: number | null;
}

/** Below this, "favorite year/month" is noise rather than insight. */
export const MIN_MOVIES_FOR_INSIGHTS = 5;

function mostFrequent<K>(keys: readonly K[]): [K, number] | null {
  const counts = new Map<K, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
}

export function computeInsights(seen: readonly SeenMovie[]): Insights {
  const rated = seen.filter(
    (m): m is SeenMovie & { voteAverage: number } =>
      m.voteAverage !== null && m.voteAverage > 0,
  );
  const averageRating =
    rated.length > 0
      ? rated.reduce((sum, m) => sum + m.voteAverage, 0) / rated.length
      : null;

  const bestYearEntry = mostFrequent(
    seen.flatMap((m) => (m.releaseYear !== null ? [m.releaseYear] : [])),
  );
  const bestYear = bestYearEntry
    ? {
        year: bestYearEntry[0],
        count: bestYearEntry[1],
        topTitle: seen
          .filter((m) => m.releaseYear === bestYearEntry[0])
          .sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))[0].title,
      }
    : null;

  const busiestEntry = mostFrequent(
    seen.flatMap((m) => {
      const month = new Date(m.watchedAt).getMonth();
      return Number.isNaN(month) ? [] : [month];
    }),
  );

  const topGenre = mostFrequent(seen.flatMap((m) => m.genreIds ?? []));

  return {
    total: seen.length,
    averageRating,
    bestYear,
    busiestMonth: busiestEntry
      ? { month: busiestEntry[0], count: busiestEntry[1] }
      : null,
    topGenreId: topGenre?.[0] ?? null,
  };
}

export interface RankedPerson {
  readonly person: FollowedPerson;
  readonly watched: number;
  readonly watchlist: number;
}

/**
 * The followed people (actors/directors) with the most titles watched or
 * on the watchlist. A title counts for a person if it is in their
 * filmography, or was added to the watchlist from their page.
 */
export function rankTopPeople(
  people: readonly FollowedPerson[],
  movieIdsByPerson: ReadonlyMap<number, readonly number[]>,
  seen: readonly SeenMovie[],
  watchlist: readonly WatchlistMovie[],
  limit = 3,
): readonly RankedPerson[] {
  const seenIds = new Set(seen.map((m) => m.tmdbId));
  const watchlistIds = new Set(watchlist.map((m) => m.tmdbId));

  return people
    .map((person) => {
      const filmography = movieIdsByPerson.get(person.tmdbId) ?? [];
      const sourced = watchlist
        .filter((m) => m.sourcePersonId === person.tmdbId)
        .map((m) => m.tmdbId);
      const watched = filmography.filter((id) => seenIds.has(id)).length;
      const onWatchlist = new Set(
        [
          ...filmography.filter((id) => watchlistIds.has(id)),
          ...sourced,
        ].filter((id) => !seenIds.has(id)),
      ).size;
      return { person, watched, watchlist: onWatchlist };
    })
    .filter((r) => r.watched + r.watchlist > 0)
    .sort(
      (a, b) =>
        b.watched + b.watchlist - (a.watched + a.watchlist) ||
        b.watched - a.watched,
    )
    .slice(0, limit);
}

export function latestRecommendation(
  recommendations: readonly RecommendedMovie[],
): RecommendedMovie | null {
  return (
    [...recommendations].sort((a, b) =>
      b.addedAt.localeCompare(a.addedAt),
    )[0] ?? null
  );
}
