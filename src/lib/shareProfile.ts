// Shared by every "share my profile" entry point (Dashboard header button,
// the post-watch invite prompt, UserMenu's copy-link item) so they all
// produce the same URL/text and fall back to clipboard the same way.
export function profileUrl(uid: string): string {
  return `${window.location.origin}/u/${uid}`;
}

export async function shareProfile(
  uid: string,
  title: string,
  text: string,
): Promise<"shared" | "copied" | "failed"> {
  const url = profileUrl(uid);
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (e) {
      // AbortError is the user dismissing the native share sheet — not a
      // failure, just don't fall back to clipboard on top of it.
      if (e instanceof Error && e.name === "AbortError") return "failed";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
