import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { requireDb } from "./firestore";
import type { Badge } from "@/types/badges";

function badgeRef(userId: string, badgeId: string) {
  return doc(requireDb(), "users", userId, "badges", badgeId);
}

/**
 * Writes a badge only the first time it's earned — awarding logic re-checks
 * conditions on every relevant data change, so without this a still-true
 * condition (e.g. "filmography still complete") would keep bumping
 * `earnedAt` on every re-render instead of freezing it at the real moment
 * it was first earned. Badges persist even if their triggering condition
 * later stops being true (e.g. unfollowing someone after completing their
 * filmography) — nothing ever deletes a badge doc.
 */
export const BADGE_EARNED_EVENT = "pelicoolas:badge-earned";

/** Returns true the one time a badge is newly awarded — lets callers trigger a one-shot "you just unlocked this" moment instead of re-firing on every re-render. */
export async function awardBadgeOnce(
  userId: string,
  badge: Omit<Badge, "earnedAt">,
): Promise<boolean> {
  const ref = badgeRef(userId, badge.id);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return false;
  const earned: Badge = { ...badge, earnedAt: new Date().toISOString() };
  await setDoc(ref, earned);
  window.dispatchEvent(
    new CustomEvent<Badge>(BADGE_EARNED_EVENT, { detail: earned }),
  );
  return true;
}

export function subscribeToBadges(
  userId: string,
  callback: (badges: readonly Badge[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "badges"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as Badge));
    },
  );
}
