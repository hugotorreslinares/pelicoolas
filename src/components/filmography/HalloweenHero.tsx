import { GhostIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/i18n";

interface HalloweenHeroProps {
  readonly locale: Locale;
}

// Seasonal slide — only mounted while isHalloweenSeason() is true (see
// HomeHeroSlider). Sends people to /halloween to build the 31-movie list.
export function HalloweenHero({ locale }: HalloweenHeroProps) {
  const t = getDictionary(locale).halloween;
  return (
    <div className="flex w-full flex-col justify-center space-y-4 py-6 text-center">
      <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-orange-500/15 sm:size-32">
        <GhostIcon className="size-10 text-orange-500 sm:size-14" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
        {t.heroTitle}
      </h2>
      <p className="mx-auto max-w-md text-muted-foreground">{t.heroBody}</p>
      <Button render={<a href="/halloween" />}>{t.heroCta}</Button>
    </div>
  );
}
