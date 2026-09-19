import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/i18n";

export function watchedLabel(
  watched: boolean,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const t = getDictionary(locale).movie;
  return watched ? t.alreadyWatched : t.markWatched;
}

export function watchlistLabel(
  inWatchlist: boolean,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const t = getDictionary(locale).movie;
  return inWatchlist ? t.inWatchlist : t.addToWatchlist;
}
