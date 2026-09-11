import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { requireDb } from "./firestore";
import type { ReleaseNotification } from "@/types/notifications";

const NOTIFICATION_LIMIT = 30;

function notificationRef(userId: string, notificationId: string) {
  return doc(requireDb(), "users", userId, "notifications", notificationId);
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: readonly ReleaseNotification[]) => void,
): () => void {
  const q = query(
    collection(requireDb(), "users", userId, "notifications"),
    orderBy("createdAt", "desc"),
    limit(NOTIFICATION_LIMIT),
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ReleaseNotification,
      ),
    );
  });
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
