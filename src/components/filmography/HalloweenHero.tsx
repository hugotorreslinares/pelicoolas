import { GhostIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/i18n";

interface HalloweenHeroProps {
  readonly locale: Locale;
}

// Seasonal slide — only mounted while isHalloweenSeason() is true (see
// HomeHeroSlider). Sends people to /halloween to build the 31-movie list.
//
// Same composition as SocialHero (image + fade + text on top), but the
// generated art (moon/bats/pumpkins, src/lib/... see design.md) is dark
// regardless of site theme, so the text colors are fixed light values here
// instead of following light/dark tokens — same reasoning SocialHero has
// for pinning dark text against its light photo, just inverted.
export function HalloweenHero({ locale }: HalloweenHeroProps) {
  const t = getDictionary(locale).halloween;
  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      <img
        src="/halloween-hero.webp"
        alt=""
        width={1600}
        height={600}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent sm:bg-gradient-to-r sm:from-black/70 sm:via-black/30 sm:to-transparent"
      />
      <div className="relative flex w-full flex-col items-center justify-center space-y-4 px-4 py-10 text-center sm:items-start sm:px-10 sm:text-left">
        <div className="flex size-24 items-center justify-center rounded-full bg-orange-500/20 sm:size-32">
          <GhostIcon className="size-10 text-orange-400 sm:size-14" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
          {t.heroTitle}
        </h2>
        <p className="max-w-md text-white/80">{t.heroBody}</p>
        <Button render={<a href="/halloween" />}>{t.heroCta}</Button>
      </div>
    </div>
  );
}
