import type { APIRoute } from "astro";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";
import { getResendClient } from "@/lib/resend";
import { createUnsubscribeToken } from "@/lib/digestUnsubscribe";
import { renderFriendBadgeEmailHtml } from "@/lib/friendBadgeEmail";
import { errorResponse, jsonResponse, logApiError } from "@/lib/api";
import { isRateLimited } from "@/lib/rateLimit";
import type { Badge } from "@/types/badges";
import type { PrivateSettings } from "@/types/user";

export const prerender = false;

const DAILY_LIMIT_PER_USER = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RECIPIENTS = 50;

// Called right after someone earns a "person-complete" badge. Emails only
// the followers who ALSO follow that person and haven't finished it
// themselves — "your friend finished something you're chasing" is relevant
// to them, a blanket "your friend earned a badge" isn't. The badge doc is
// re-read server-side, so a client can't claim a badge it doesn't hold.
export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) return errorResponse("Missing Authorization header", 401);

  let uid: string;
  try {
    uid = (await verifyFirebaseIdToken(token)).uid;
  } catch {
    return errorResponse("Invalid or expired session", 401);
  }

  if (isRateLimited(`notify-badge:${uid}`, DAILY_LIMIT_PER_USER, DAY_MS)) {
    return errorResponse("Too many requests", 429);
  }

  let badgeId: unknown;
  try {
    badgeId = ((await request.json()) as { badgeId?: unknown }).badgeId;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  if (typeof badgeId !== "string") return errorResponse("Missing badgeId", 400);

  const db = getAdminDb();
  const secret = import.meta.env.CRON_SECRET;
  if (!secret) return errorResponse("Not configured", 500);

  try {
    const userRef = db.collection("users").doc(uid);
    const badgeSnap = await userRef.collection("badges").doc(badgeId).get();
    const badge = badgeSnap.data() as Badge | undefined;
    if (
      !badge ||
      badge.type !== "person-complete" ||
      badge.personId === undefined ||
      !badge.personName
    ) {
      return jsonResponse({ sent: 0 });
    }
    const { personId, personName } = badge;

    const friendName =
      ((await userRef.get()).get("displayName") as string | undefined) ??
      "Un amigo";
    const followersSnap = await userRef
      .collection("followers")
      .limit(MAX_RECIPIENTS)
      .get();

    const resend = getResendClient();
    let sent = 0;
    for (const follower of followersSnap.docs) {
      const followerRef = db.collection("users").doc(follower.id);
      const [followsPerson, alreadyDone, settingsSnap] = await Promise.all([
        followerRef.collection("followedPeople").doc(String(personId)).get(),
        followerRef.collection("badges").doc(badgeId).get(),
        followerRef.collection("private").doc("settings").get(),
      ]);
      const settings = settingsSnap.data() as PrivateSettings | undefined;
      if (
        !followsPerson.exists ||
        alreadyDone.exists ||
        !settings?.email ||
        settings.weeklyDigestOptOut
      ) {
        continue;
      }

      const unsubscribeUrl = `https://pelicoolas.com/api/unsubscribe-digest?uid=${follower.id}&token=${createUnsubscribeToken(follower.id, secret)}`;
      const { error } = await resend.emails.send(
        {
          from: "Pelicoolas <digest@pelicoolas.com>",
          to: [settings.email],
          subject: `${friendName} completó la filmografía de ${personName}`,
          html: renderFriendBadgeEmailHtml({
            friendName,
            personName,
            personId,
            unsubscribeUrl,
          }),
        },
        { idempotencyKey: `friend-badge/${follower.id}/${uid}/${badgeId}` },
      );
      if (error) {
        logApiError("notify-badge", new Error(error.message));
        continue;
      }
      sent++;
    }
    return jsonResponse({ sent });
  } catch (error) {
    logApiError("notify-badge", error);
    return errorResponse("Couldn't send notifications", 500);
  }
};
