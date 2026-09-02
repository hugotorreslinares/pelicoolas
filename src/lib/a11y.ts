/**
 * Announces a message to screen readers via the shared aria-live region
 * (see #a11y-announcer in Layout.astro). Clearing then setting the text
 * on a delay forces a re-announcement even if the same message repeats
 * back to back (e.g. toggling a checkbox on, off, on).
 */
export function announce(message: string): void {
  const region = document.getElementById("a11y-announcer");
  if (!region) return;
  region.textContent = "";
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}
