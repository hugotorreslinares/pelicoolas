import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LOCALE_COOKIE, type Locale } from "@/i18n";

interface LocaleToggleProps {
  readonly locale: Locale;
  readonly label: string;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Locale changes what the server renders (unlike ThemeToggle, which is
// pure CSS) — a full reload is the simplest way to keep SSR and client in
// sync, no client-side re-translation machinery needed.
export function LocaleToggle({ locale, label }: LocaleToggleProps) {
  function toggle() {
    const next: Locale = locale === "en" ? "es" : "en";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    window.location.reload();
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-full text-xs font-semibold"
            aria-label={label}
            onClick={toggle}
          />
        }
      >
        {locale.toUpperCase()}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
