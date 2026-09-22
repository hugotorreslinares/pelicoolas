import { createHmac, timingSafeEqual } from "node:crypto";

// The weekly digest has no signed-in request to authorize against (it's a
// link clicked from an email client, possibly in a different browser/no
// session at all) — the token itself is the credential, an HMAC over the
// uid so a stranger can't unsubscribe someone else by guessing/incrementing
// ids. Reuses CRON_SECRET rather than adding a dedicated env var: it's
// already a server-only secret gating a privileged automated action, and
// worst case of reuse here is low-stakes (an unwanted unsubscribe, not a
// data leak or account takeover).
export function createUnsubscribeToken(uid: string, secret: string): string {
  return createHmac("sha256", secret).update(uid).digest("hex");
}

export function verifyUnsubscribeToken(
  uid: string,
  token: string,
  secret: string,
): boolean {
  const expected = createUnsubscribeToken(uid, secret);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
