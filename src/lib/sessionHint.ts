// Firebase auth lives entirely client-side, so the server can't tell a
// signed-out visitor from a returning member and used to render only a
// skeleton for everyone until auth resolved — no server-rendered content
// for crawlers, a late LCP, and a huge layout shift when the real page
// replaced it. This cookie (just "1", nothing personal) is a hint the server
// can read: absent means "render the signed-out home right away".
export const SESSION_HINT_COOKIE = "pc_session";

export function setSessionHint(signedIn: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = signedIn
    ? `${SESSION_HINT_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`
    : `${SESSION_HINT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
