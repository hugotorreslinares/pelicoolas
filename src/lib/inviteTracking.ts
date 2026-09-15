const STORAGE_KEY = "pelicoolas_pending_invite";

interface PendingInvite {
  readonly inviteId: string;
  readonly ref: string;
}

/**
 * Reads `?invite=&ref=` off the current URL (present only on a fresh visit
 * from an invite email link) and stashes it in localStorage — survives the
 * full-page redirect Firebase auth falls back to when popup sign-in is
 * blocked (see auth.ts). Strips the params from the visible URL either way.
 */
export function captureInviteFromUrl(): void {
  const url = new URL(window.location.href);
  const inviteId = url.searchParams.get("invite");
  const ref = url.searchParams.get("ref");
  if (!inviteId || !ref) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ inviteId, ref }));
  } catch {
    // localStorage unavailable (privacy mode) — conversion tracking is a
    // nice-to-have metric, not worth failing the visit over.
  }
  url.searchParams.delete("invite");
  url.searchParams.delete("ref");
  window.history.replaceState({}, "", url.toString());
}

function readPendingInvite(): PendingInvite | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingInvite;
  } catch {
    return null;
  }
}

function clearPendingInvite(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort cleanup only
  }
}

/** Call once, right after a brand-new user's first syncPublicProfile. No-op if there's no pending invite. */
export async function convertPendingInviteIfAny(
  getIdToken: () => Promise<string>,
): Promise<void> {
  const pending = readPendingInvite();
  if (!pending) return;
  clearPendingInvite(); // clear first — a failed convert isn't worth retrying forever
  try {
    const idToken = await getIdToken();
    await fetch("/api/invite/convert", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(pending),
    });
  } catch {
    // Vanity metric — a failed conversion ping never blocks or surfaces to the user.
  }
}
