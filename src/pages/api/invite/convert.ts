import type { APIRoute } from "astro";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { errorResponse, jsonResponse, logApiError } from "@/lib/api";
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
    newUserUid = (await getAdminAuth().verifyIdToken(token)).uid;
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

    return jsonResponse({ ok: true });
  } catch (error) {
    logApiError("invite-convert", error);
    return errorResponse("Couldn't record the conversion", 500);
  }
};
