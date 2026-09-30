import { getAdminDb } from "@/lib/firebase/admin";

export interface ListSummary {
  readonly name: string | null;
  readonly movieCount: number;
  /** Up to 3 most recently added movies, for the OG image poster row. */
  readonly posters: readonly {
    readonly title: string;
    readonly posterPath: string | null;
  }[];
}

const EMPTY: ListSummary = { name: null, movieCount: 0, posters: [] };

/**
 * Server-side snapshot of a shared list for link previews (page meta tags +
 * OG image) — same pattern as getProfileSummary. Best-effort: any Firestore
 * failure degrades to the generic preview instead of breaking the page.
 */
export async function getListSummary(
  userId: string,
  listId: string,
): Promise<ListSummary> {
  try {
    const db = getAdminDb();
    const [listSnap, moviesSnap] = await Promise.all([
      db.doc(`users/${userId}/lists/${listId}`).get(),
      db
        .collection(`users/${userId}/lists/${listId}/movies`)
        .orderBy("addedAt", "desc")
        .get(),
    ]);
    if (!listSnap.exists) return EMPTY;

    return {
      name: (listSnap.get("name") as string | undefined) ?? null,
      movieCount: moviesSnap.size,
      posters: moviesSnap.docs.slice(0, 3).map((d) => ({
        title: d.get("title") as string,
        posterPath: (d.get("posterPath") as string | null) ?? null,
      })),
    };
  } catch (error) {
    console.error("getListSummary failed", userId, listId, error);
    return EMPTY;
  }
}
