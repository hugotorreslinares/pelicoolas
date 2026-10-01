import type { APIRoute } from "astro";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";
import { awardBadgeOnceAdmin } from "@/lib/firebase/adminBadges";
import { errorResponse, jsonResponse, logApiError } from "@/lib/api";
import engagement from "@/config/engagement.json";
import type { Invite } from "@/types/user";

export const prerender = false;

// Marks the invite that brought a brand-new signup as converted. Runs via
// the Admin SDK (same privileged-write pattern as the release-check cron)
// so the new user never needs write access to a stranger's `invites`
// subcollection — firestore.rules keeps that owner-read-only for clients.
export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) return errorResponse("Missing Authorization header", 401);

  let newUserUid: string;
  try {
    newUserUid = (await verifyFirebaseIdToken(token)).uid;
  } catch {
    return errorResponse("Invalid or expired session", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const { inviteId, ref } = body as { inviteId?: unknown; ref?: unknown };
  if (typeof inviteId !== "string" || typeof ref !== "string") {
    return errorResponse("Missing inviteId or ref", 400);
  }
  if (ref === newUserUid) {
    return jsonResponse({ ok: false }); // can't convert your own invite
  }

  try {
    const docRef = getAdminDb()
      .collection("users")
      .doc(ref)
      .collection("invites")
      .doc(inviteId);
    const snapshot = await docRef.get();
    const invite = snapshot.data() as Invite | undefined;
    if (!snapshot.exists || invite?.status !== "sent") {
      return jsonResponse({ ok: false }); // already converted, or unknown invite
    }

    await docRef.update({
      status: "converted",
      convertedUid: newUserUid,
      convertedAt: new Date().toISOString(),
    } satisfies Partial<Invite>);

    // Double-sided reward — both the inviter and the new signup unlock a
    // badge, so the invite flow pays off for whoever sent it, not just the
    // app. Best-effort: a failure here shouldn't undo the conversion above.
    if (engagement.badges.referral) {
      await Promise.all([
        awardBadgeOnceAdmin(ref, {
          id: "referral-inviter",
          type: "referral",
          label: "Matchmaker",
          description: "A friend you invited joined Pelicoolas.",
        }),
        awardBadgeOnceAdmin(newUserUid, {
          id: "referral-invitee",
          type: "referral",
          label: "Welcomed In",
          description: "Joined Pelicoolas through a friend's invite.",
        }),
      ]).catch((error) => logApiError("invite-convert-badges", error));
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    logApiError("invite-convert", error);
    return errorResponse("Couldn't record the conversion", 500);
  }
};
