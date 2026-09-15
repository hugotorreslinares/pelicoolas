/** Call once, right after a brand-new user's first syncPublicProfile. Best-effort — a failed send never blocks or surfaces to the user; /api/welcome-email is itself idempotent per account. */
export async function sendWelcomeEmail(
  getIdToken: () => Promise<string>,
): Promise<void> {
  try {
    const idToken = await getIdToken();
    await fetch("/api/welcome-email", {
      method: "POST",
      headers: { authorization: `Bearer ${idToken}` },
    });
  } catch {
    // best-effort only
  }
}
