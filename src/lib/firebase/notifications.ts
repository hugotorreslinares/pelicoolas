import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { requireDb } from "./firestore";
import type { AppNotification } from "@/types/notifications";

const NOTIFICATION_LIMIT = 30;

function notificationRef(userId: string, notificationId: string) {
  return doc(requireDb(), "users", userId, "notifications", notificationId);
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: readonly AppNotification[]) => void,
): () => void {
  const q = query(
    collection(requireDb(), "users", userId, "notifications"),
    orderBy("createdAt", "desc"),
    limit(NOTIFICATION_LIMIT),
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification),
    );
  });
}

/**
 * Fan-out from the recommender's own client — one notification doc per
 * follower, no Cloud Functions (same client-writes-related-data pattern as
 * the rest of the follow feature). Best-effort: if the tab closes mid-
 * batch, some followers miss it — acceptable at this app's scale, same
 * tradeoff already made for unfollow's two non-transactional deletes.
 */
export async function notifyFollowersOfRecommendation(
  recommender: { readonly uid: string; readonly displayName: string | null },
  movie: {
    readonly tmdbId: number;
    readonly title: string;
    readonly posterPath: string | null;
    readonly mediaType?: "movie" | "tv";
  },
): Promise<void> {
  const followersSnap = await getDocs(
    collection(requireDb(), "users", recommender.uid, "followers"),
  );
  if (followersSnap.empty) return;

  const batch = writeBatch(requireDb());
  for (const followerDoc of followersSnap.docs) {
    const followerId = followerDoc.id;
    const ref = doc(
      collection(requireDb(), "users", followerId, "notifications"),
    );
    batch.set(ref, {
      type: "recommendation",
      recommenderId: recommender.uid,
      recommenderName: recommender.displayName ?? "Someone you follow",
      movieId: movie.tmdbId,
      movieTitle: movie.title,
      posterPath: movie.posterPath,
      mediaType: movie.mediaType ?? null,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await updateDoc(notificationRef(userId, notificationId), { read: true });
}

export async function markAllNotificationsRead(
  userId: string,
  notificationIds: readonly string[],
): Promise<void> {
  const batch = writeBatch(requireDb());
  for (const id of notificationIds) {
    batch.update(notificationRef(userId, id), { read: true });
  }
  await batch.commit();
}

export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<void> {
  await deleteDoc(notificationRef(userId, notificationId));
}
