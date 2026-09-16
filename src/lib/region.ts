// TMDB's watch/providers endpoint is keyed by ISO 3166-1 country code
// (JustWatch data — see design docs). No UI toggle in v1: the region comes
// straight from the browser's own Accept-Language, same signal already
// used for i18n locale (see src/i18n/index.ts), just kept independent of
// it since a browser's region subtag is finer-grained than our two
// supported UI locales (en/es) and shouldn't be conflated with them.
const DEFAULT_REGION = "US";

// "es-AR,es;q=0.9,en;q=0.8" -> "AR"
function regionFromAcceptLanguage(header: string): string | null {
  const primary = header.split(",")[0]?.trim();
  const region = primary?.split("-")[1];
  return region ? region.toUpperCase() : null;
}

export function resolveWatchRegion(
  acceptLanguageHeader: string | null,
): string {
  if (!acceptLanguageHeader) return DEFAULT_REGION;
  const region = regionFromAcceptLanguage(acceptLanguageHeader);
  if (region && /^[A-Z]{2}$/.test(region)) return region;
  // No region subtag (e.g. plain "es") — a language-only guess is better
  // than always falling back to US for a Spanish-speaking visitor.
  const primaryLang = acceptLanguageHeader.split(",")[0]?.trim().slice(0, 2);
  if (primaryLang === "es") return "MX";
  return DEFAULT_REGION;
}
