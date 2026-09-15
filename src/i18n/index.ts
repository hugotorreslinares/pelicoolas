import { en } from "./en";
import { es } from "./es";

export type { Dictionary } from "./en";
export type Locale = "en" | "es";

export const LOCALE_COOKIE = "locale";
export const DEFAULT_LOCALE: Locale = "en";

const dictionaries = { en, es };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

function isLocale(value: string): value is Locale {
  return value === "en" || value === "es";
}

/**
 * Cookie (explicit user choice, set by LocaleToggle) wins; otherwise falls
 * back to the browser's Accept-Language header — "que se tome el idioma
 * por defecto del navegador". Only en/es are supported, so anything else
 * (fr, pt, ...) falls back to DEFAULT_LOCALE rather than a language with no
 * dictionary.
 */
export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguageHeader: string | null,
): Locale {
  if (cookieValue && isLocale(cookieValue)) return cookieValue;

  if (acceptLanguageHeader) {
    // "es-AR,es;q=0.9,en;q=0.8" -> "es-AR" -> "es"
    const primary = acceptLanguageHeader.split(",")[0]?.trim().slice(0, 2);
    if (primary && isLocale(primary)) return primary;
  }

  return DEFAULT_LOCALE;
}
