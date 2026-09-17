import type {
  FollowedPerson,
  SeenMovie,
  WatchlistMovie,
} from "@/types/filmography";

export interface CompatibilityInput {
  readonly watchlist: readonly WatchlistMovie[];
  readonly seen: readonly SeenMovie[];
  readonly followedPeople: readonly FollowedPerson[];
}

export interface CommonTitle {
  readonly tmdbId: number;
  readonly mediaType: "movie" | "tv";
  readonly title: string;
  readonly posterPath: string | null;
  /** Where each side has it — e.g. I have it on my watchlist, they've seen it. */
  readonly mine: "watchlist" | "seen";
  readonly theirs: "watchlist" | "seen";
}

export interface CommonGenre {
  readonly genreId: number;
  /** How many of each side's titles carry this genre — not a percentage,
   *  just enough to rank "how much" a shared genre is, not only whether. */
  readonly myCount: number;
  readonly theirCount: number;
}

export interface Compatibility {
  /** 0-100, average of three Jaccard indices (titles, genres, people) — a
   *  rough estimate, not a recommendation-engine score. */
  readonly score: number;
  readonly commonTitles: readonly CommonTitle[];
  readonly commonGenres: readonly CommonGenre[];
  readonly commonPeople: readonly FollowedPerson[];
}

// A movie id and a TV id can collide numerically — the app's Firestore docs
// dodge this with a "tv-" doc-id prefix (see mediaDocId in firestore.ts);
// here we're comparing plain objects, so the same composite key is built
// by hand.
function titleKey(tmdbId: number, mediaType: "movie" | "tv" | undefined) {
  return `${mediaType ?? "movie"}-${tmdbId}`;
}

function jaccard(a: ReadonlySet<unknown>, b: ReadonlySet<unknown>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Union of watchlist+seen, deduped by title key, keeping which list(s) it
// came from — the same title on both a user's watchlist and seen list only
// counts once for the titles/genres comparison.
function indexTitles(
  watchlist: readonly WatchlistMovie[],
  seen: readonly SeenMovie[],
) {
  const byKey = new Map<
    string,
    {
      tmdbId: number;
      mediaType: "movie" | "tv";
      title: string;
      posterPath: string | null;
      genreIds: readonly number[];
      list: "watchlist" | "seen";
    }
  >();
  for (const m of watchlist) {
    byKey.set(titleKey(m.tmdbId, m.mediaType), {
      tmdbId: m.tmdbId,
      mediaType: m.mediaType ?? "movie",
      title: m.title,
      posterPath: m.posterPath,
      genreIds: m.genreIds ?? [],
      list: "watchlist",
    });
  }
  // seen takes priority when a title is on both of *my own* lists — "seen"
  // is the stronger taste signal (see compatibility.ts plan).
  for (const m of seen) {
    byKey.set(titleKey(m.tmdbId, m.mediaType), {
      tmdbId: m.tmdbId,
      mediaType: m.mediaType ?? "movie",
      title: m.title,
      posterPath: m.posterPath,
      genreIds: m.genreIds ?? [],
      list: "seen",
    });
  }
  return byKey;
}

export function computeCompatibility(
  mine: CompatibilityInput,
  theirs: CompatibilityInput,
): Compatibility {
  const myTitles = indexTitles(mine.watchlist, mine.seen);
  const theirTitles = indexTitles(theirs.watchlist, theirs.seen);

  const commonTitles: CommonTitle[] = [];
  const myGenreCounts = new Map<number, number>();
  const theirGenreCounts = new Map<number, number>();
  for (const [, t] of myTitles) {
    for (const g of t.genreIds)
      myGenreCounts.set(g, (myGenreCounts.get(g) ?? 0) + 1);
  }
  for (const [, t] of theirTitles) {
    for (const g of t.genreIds) {
      theirGenreCounts.set(g, (theirGenreCounts.get(g) ?? 0) + 1);
    }
  }

  for (const [key, myTitle] of myTitles) {
    const theirTitle = theirTitles.get(key);
    if (!theirTitle) continue;
    commonTitles.push({
      tmdbId: myTitle.tmdbId,
      mediaType: myTitle.mediaType,
      title: myTitle.title,
      posterPath: myTitle.posterPath,
      mine: myTitle.list,
      theirs: theirTitle.list,
    });
  }

  const commonGenres: CommonGenre[] = [...myGenreCounts.keys()]
    .filter((g) => theirGenreCounts.has(g))
    .map((genreId) => ({
      genreId,
      myCount: myGenreCounts.get(genreId)!,
      theirCount: theirGenreCounts.get(genreId)!,
    }))
    .sort(
      (a, b) =>
        Math.min(b.myCount, b.theirCount) - Math.min(a.myCount, a.theirCount),
    );

  const myPeopleIds = new Set(mine.followedPeople.map((p) => p.tmdbId));
  const theirPeopleIds = new Set(theirs.followedPeople.map((p) => p.tmdbId));
  const commonPeople = mine.followedPeople.filter((p) =>
    theirPeopleIds.has(p.tmdbId),
  );

  const titleScore = jaccard(
    new Set(myTitles.keys()),
    new Set(theirTitles.keys()),
  );
  const genreScore = jaccard(
    new Set(myGenreCounts.keys()),
    new Set(theirGenreCounts.keys()),
  );
  const peopleScore = jaccard(myPeopleIds, theirPeopleIds);
  const score = Math.round(((titleScore + genreScore + peopleScore) / 3) * 100);

  return { score, commonTitles, commonGenres, commonPeople };
}
