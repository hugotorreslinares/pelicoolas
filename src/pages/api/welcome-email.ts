import type { APIRoute } from "astro";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";
import { getResendClient } from "@/lib/resend";
import { errorResponse, jsonResponse, logApiError } from "@/lib/api";

export const prerender = false;

// Fired once per account, from the client's own "is this a brand-new user"
// signal (see syncPublicProfile). The Firestore flag below is the real
// guard against duplicates — client retries, multiple tabs, or a future
// call site all land on the same no-op once welcomeEmailSentAt is set.
export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) return errorResponse("Missing Authorization header", 401);

  let uid: string;
  let email: string | null;
  try {
    const decoded = await verifyFirebaseIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return errorResponse("Invalid or expired session", 401);
  }
  if (!email) return errorResponse("Account has no email address", 400);

  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);

  try {
    const existing = await ref.get();
    if (existing.data()?.welcomeEmailSentAt) {
      return jsonResponse({ ok: true, alreadySent: true });
    }

    const resend = getResendClient();
    const { error } = await resend.emails.send(
      {
        from: "Info <info@pelicoolas.com>",
        to: [email],
        template: { id: "welcome-email" },
      },
      { idempotencyKey: `welcome-email/${uid}` },
    );
    if (error) {
      logApiError("welcome-email", new Error(error.message));
      return errorResponse("Couldn't send the welcome email", 502);
    }

    await ref.set(
      { welcomeEmailSentAt: new Date().toISOString() },
      { merge: true },
    );

    return jsonResponse({ ok: true, alreadySent: false });
  } catch (error) {
    logApiError("welcome-email", error);
    return errorResponse("Couldn't send the welcome email", 500);
  }
};
