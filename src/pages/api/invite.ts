import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";
import { getResendClient } from "@/lib/resend";
import { errorResponse, jsonResponse, logApiError } from "@/lib/api";
import { isRateLimited } from "@/lib/rateLimit";
import type { Invite } from "@/types/user";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAILY_LIMIT_PER_USER = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// Deterministic per (inviter, email) — re-inviting the same address reuses
// the same doc instead of piling up duplicates, and doubles as the dedupe
// check below (one read, no query needed).
function inviteId(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) return errorResponse("Missing Authorization header", 401);

  let inviterUid: string;
  let inviterName: string | null;
  try {
    const decoded = await verifyFirebaseIdToken(token);
    inviterUid = decoded.uid;
    inviterName = decoded.name;
  } catch {
    return errorResponse("Invalid or expired session", 401);
  }

  if (isRateLimited(`invite:${inviterUid}`, DAILY_LIMIT_PER_USER, DAY_MS)) {
    return errorResponse(
      "You've reached today's invite limit. Try again tomorrow.",
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const email =
    typeof (body as { email?: unknown })?.email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  if (!EMAIL_RE.test(email)) {
    return errorResponse("Invalid email address", 400);
  }
  const rawMessage = (body as { message?: unknown }).message;
  const message =
    typeof rawMessage === "string" ? rawMessage.trim().slice(0, 500) : "";

  const db = getAdminDb();
  const id = inviteId(email);
  const ref = db
    .collection("users")
    .doc(inviterUid)
    .collection("invites")
    .doc(id);

  try {
    const existing = await ref.get();
    if (existing.exists && (existing.data() as Invite).status === "converted") {
      return jsonResponse({ id, status: "converted" });
    }

    const resend = getResendClient();
    const inviteUrl = `https://pelicoolas.com/?invite=${id}&ref=${inviterUid}`;
    const { error } = await resend.emails.send(
      {
        to: [email],
        template: {
          id: "invitation-email",
          variables: {
            inviter_name: inviterName ?? "Alguien",
            app_url: "https://pelicoolas.com",
            invite_url: inviteUrl,
            ...(message ? { invitation_message: message } : {}),
          },
        },
      },
      { idempotencyKey: `invite/${inviterUid}/${id}` },
    );
    if (error) {
      logApiError("invite", new Error(error.message));
      return errorResponse("Couldn't send the invite email", 502);
    }

    await ref.set(
      {
        email,
        sentAt: new Date().toISOString(),
        status: "sent",
        convertedUid: null,
        convertedAt: null,
      } satisfies Invite,
      { merge: true },
    );

    return jsonResponse({ id, status: "sent" });
  } catch (error) {
    logApiError("invite", error);
    return errorResponse("Couldn't send the invite", 500);
  }
};
