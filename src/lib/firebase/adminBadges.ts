import { getAdminDb } from "@/lib/firebase/admin";
import type { Badge } from "@/types/badges";

/**
 * Server-side counterpart to `awardBadgeOnce` (badges.ts) — for badges
 * earned by an action the recipient didn't take themselves (e.g. a friend
 * converting their invite), so the write has to come from a privileged
 * context instead of the recipient's own client.
 */
export async function awardBadgeOnceAdmin(
  userId: string,
  badge: Omit<Badge, "earnedAt">,
): Promise<void> {
  const ref = getAdminDb()
    .collection("users")
    .doc(userId)
    .collection("badges")
    .doc(badge.id);
  const snapshot = await ref.get();
  if (snapshot.exists) return;
  await ref.set({ ...badge, earnedAt: new Date().toISOString() });
}
