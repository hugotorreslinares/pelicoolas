import type { APIRoute } from "astro";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getResendClient } from "@/lib/resend";
import { logApiError } from "@/lib/api";
import { buildDigestItems, renderDigestEmailHtml } from "@/lib/weeklyDigest";
import { createUnsubscribeToken } from "@/lib/digestUnsubscribe";
import type { AppNotification } from "@/types/notifications";
import type { PrivateSettings } from "@/types/user";

export const prerender = false;

const WINDOW_DAYS = 7;
const SITE_URL = "https://pelicoolas.com";

// Runs weekly (see vercel.json) — "what happened with your circle this
// week", built entirely from each user's own `notifications` (already
// written by the release cron and the recommendation fan-outs, see
// notifications.ts) rather than re-deriving activity from scratch. Skips
// anyone with nothing to report or no email on file — a recurring empty
// email is exactly the kind of thing that gets an account to unsubscribe
// from everything, including the notifications that ARE useful to them.
export const GET: APIRoute = async ({ request, url }) => {
  const secret = import.meta.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getAdminDb();
  const resend = getResendClient();
  const cutoff = Timestamp.fromMillis(
    Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const runDate = new Date().toISOString().slice(0, 10);

  let sent = 0;
  let skipped = 0;

  // ?uid=... scopes a manual run to one account — same auth (CRON_SECRET)
  // as the real weekly run, just for trying it on yourself before trusting
  // it to actually go out to everyone on the real schedule.
  const singleUid = url.searchParams.get("uid");
  const userRefs = singleUid
    ? [db.collection("users").doc(singleUid)]
    : (await db.collection("users").get()).docs.map((d) => d.ref);

  for (const userRef of userRefs) {
    const uid = userRef.id;
    try {
      const settingsSnap = await userRef
        .collection("private")
        .doc("settings")
        .get();
      const settings = settingsSnap.data() as PrivateSettings | undefined;
      if (!settings?.email || settings.weeklyDigestOptOut) {
        skipped++;
        continue;
      }

      const notifSnap = await userRef
        .collection("notifications")
        .where("createdAt", ">=", cutoff)
        .orderBy("createdAt", "desc")
        .get();
      if (notifSnap.empty) {
        skipped++;
        continue;
      }

      const notifications = notifSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AppNotification,
      );
      const items = buildDigestItems(notifications);
      const unsubscribeUrl = `${SITE_URL}/api/unsubscribe-digest?uid=${uid}&token=${createUnsubscribeToken(uid, secret)}`;

      const { error } = await resend.emails.send(
        {
          from: "Pelicoolas <digest@pelicoolas.com>",
          to: [settings.email],
          subject: "Tu semana en Pelicoolas",
          html: renderDigestEmailHtml(items, unsubscribeUrl),
        },
        // Only set on the real scheduled run (no ?uid=) — its purpose is
        // surviving a retried cron invocation without double-sending
        // everyone, not blocking a manual re-test on the same calendar day
        // (Resend 409s a reused key once the payload changes, e.g. after
        // tweaking the template — a manual test should always go through).
        singleUid
          ? undefined
          : { idempotencyKey: `weekly-digest/${uid}/${runDate}` },
      );
      if (error) {
        logApiError("cron-weekly-digest", new Error(error.message));
        continue;
      }
      sent++;
    } catch (error) {
      logApiError("cron-weekly-digest", error);
    }
  }

  return new Response(JSON.stringify({ sent, skipped }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
