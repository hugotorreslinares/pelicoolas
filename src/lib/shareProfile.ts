// Shared by every "share" entry point (Dashboard header button, the
// post-watch invite prompt, the Halloween list) so they all use the native
// share sheet and fall back to clipboard the same way.
export function profileUrl(uid: string): string {
  return `${window.location.origin}/u/${uid}`;
}

export async function shareContent(
  url: string,
  title: string,
  text: string,
  /** What the clipboard fallback copies; defaults to just the url. */
  copyText: string = url,
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (e) {
      // AbortError is the user dismissing the native share sheet — not a
      // failure, just don't fall back to clipboard on top of it.
      if (e instanceof Error && e.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(copyText);
    return "copied";
  } catch {
    return "failed";
  }
}

export function shareProfile(uid: string, title: string, text: string) {
  return shareContent(profileUrl(uid), title, text);
}
