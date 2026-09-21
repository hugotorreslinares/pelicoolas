import { getAdminDb } from "@/lib/firebase/admin";
import { genreName } from "@/lib/tmdb/genres";
import type { PublicProfile } from "@/types/user";

export interface ProfileSummary {
  readonly profile: PublicProfile | null;
  readonly watchedCount: number;
  /** Up to 3 most recent favorites (the public recommendations board). */
  readonly favorites: readonly {
    readonly title: string;
    readonly posterPath: string | null;
  }[];
  readonly topGenre: string | null;
}

const EMPTY: ProfileSummary = {
  profile: null,
  watchedCount: 0,
  favorites: [],
  topGenre: null,
};

/**
 * Server-side snapshot of a user's public profile for link previews (page
 * meta tags + OG image). Best-effort: any Firestore failure degrades to the
 * generic preview instead of breaking the page.
 */
export async function getProfileSummary(
  userId: string,
): Promise<ProfileSummary> {
  try {
    const db = getAdminDb();
    const [profileSnap, seenSnap, favSnap] = await Promise.all([
      db.doc(`users/${userId}`).get(),
      db.collection(`users/${userId}/seen`).select("genreIds").get(),
      db
        .collection(`users/${userId}/recommendations`)
        .orderBy("addedAt", "desc")
        .limit(3)
        .get(),
    ]);

    const genreCounts = new Map<number, number>();
    for (const doc of seenSnap.docs) {
      const ids = (doc.get("genreIds") as number[] | undefined) ?? [];
      for (const id of ids) genreCounts.set(id, (genreCounts.get(id) ?? 0) + 1);
    }
    const [topGenreId] =
      [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];

    return {
      profile: profileSnap.exists
        ? (profileSnap.data() as PublicProfile)
        : null,
      watchedCount: seenSnap.size,
      favorites: favSnap.docs.map((d) => ({
        title: d.get("title") as string,
        posterPath: (d.get("posterPath") as string | null) ?? null,
      })),
      topGenre:
        topGenreId !== undefined ? (genreName(topGenreId) ?? null) : null,
    };
  } catch (error) {
    console.error("getProfileSummary failed", userId, error);
    return EMPTY;
  }
}
