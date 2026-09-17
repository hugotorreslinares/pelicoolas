import { computeCompatibility, type CompatibilityInput } from "./compatibility";

export interface SharedWatchlistItem {
  readonly tmdbId: number;
  readonly mediaType: "movie" | "tv";
  readonly title: string;
  readonly posterPath: string | null;
  readonly genreIds: readonly number[];
  /** Who this was added "via" — the closest proxy this app has to "this
   *  title features an actor/director you like", short of a TMDB cast
   *  lookup per title (see byTopSharedPerson below). Absent when added
   *  straight from a search result instead of a followed person's page. */
  readonly sourcePersonId: number | null;
}

export interface WatchPick {
  readonly item: SharedWatchlistItem;
  readonly reason: "genre" | "person" | "random";
}

function titleKey(tmdbId: number, mediaType: "movie" | "tv" | undefined) {
  return `${mediaType ?? "movie"}-${tmdbId}`;
}

function sharedWatchlist(
  mine: CompatibilityInput,
  theirs: CompatibilityInput,
): readonly SharedWatchlistItem[] {
  const theirKeys = new Set(
    theirs.watchlist.map((m) => titleKey(m.tmdbId, m.mediaType)),
  );
  return mine.watchlist
    .filter((m) => theirKeys.has(titleKey(m.tmdbId, m.mediaType)))
    .map((m) => ({
      tmdbId: m.tmdbId,
      mediaType: m.mediaType ?? "movie",
      title: m.title,
      posterPath: m.posterPath,
      genreIds: m.genreIds ?? [],
      sourcePersonId: m.sourcePersonId ?? null,
    }));
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// ============================================================================
// "Pick something for us" — rules for what to suggest from a shared
// watchlist, tried in order. The FIRST rule that returns at least one
// candidate wins; the actual pick is random among that rule's candidates.
//
// This is the whole strategy, in one place, on purpose — tune priority,
// add a new rule, or drop one without touching the UI component that
// calls pickForUs(). A `Rule` gets the shared watchlist plus the pair's
// precomputed compatibility (genres/people/titles in common — see
// compatibility.ts) and returns the subset of `shared` it thinks fits.
// ============================================================================

type Compatibility = ReturnType<typeof computeCompatibility>;

type Rule = (
  shared: readonly SharedWatchlistItem[],
  compat: Compatibility,
) => readonly SharedWatchlistItem[];

// Rule 1: something in your #1 shared favorite genre — the top of
// commonGenres, already ranked by how much both sides watch it (see
// computeCompatibility's commonGenres sort).
const byTopSharedGenre: Rule = (shared, compat) => {
  const topGenre = compat.commonGenres[0]?.genreId;
  if (topGenre === undefined) return [];
  return shared.filter((item) => item.genreIds.includes(topGenre));
};

// Rule 2: something added via a person you both follow (an actor or
// director) — see SharedWatchlistItem.sourcePersonId above for why this,
// not a real cast match.
const byTopSharedPerson: Rule = (shared, compat) => {
  const commonPersonIds = new Set(compat.commonPeople.map((p) => p.tmdbId));
  return shared.filter(
    (item) =>
      item.sourcePersonId != null && commonPersonIds.has(item.sourcePersonId),
  );
};

// Rule 3: no signal to prioritize on — anything on the shared watchlist.
// Always non-empty when `shared` is, so this is the guaranteed fallback.
const anyShared: Rule = (shared) => shared;

const PICK_RULES: readonly { rule: Rule; reason: WatchPick["reason"] }[] = [
  { rule: byTopSharedGenre, reason: "genre" },
  { rule: byTopSharedPerson, reason: "person" },
  { rule: anyShared, reason: "random" },
];

// Null when there's nothing on both watchlists at all — the button that
// calls this should be disabled/hidden in that case, not shown to fail.
export function pickForUs(
  mine: CompatibilityInput,
  theirs: CompatibilityInput,
): WatchPick | null {
  const shared = sharedWatchlist(mine, theirs);
  if (shared.length === 0) return null;

  const compat = computeCompatibility(mine, theirs);
  for (const { rule, reason } of PICK_RULES) {
    const candidates = rule(shared, compat);
    if (candidates.length > 0) {
      return { item: pickRandom(candidates), reason };
    }
  }
  // Unreachable: anyShared always matches when shared.length > 0.
  return null;
}
