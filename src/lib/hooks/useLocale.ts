import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/i18n";

const subscribe = () => () => {};

// For shared components (movie cards, dialogs, login button) rendered from
// too many places to thread a `locale` prop through — Layout.astro already
// stamps the resolved locale on <html lang>. The server snapshot is the
// default locale, so hydration is mismatch-free; the client re-renders with
// the real one right after.
export function useLocale(): Locale {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.lang === "es" ? "es" : "en"),
    () => DEFAULT_LOCALE,
  );
}
