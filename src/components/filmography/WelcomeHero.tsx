import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/i18n";

interface WelcomeHeroProps {
  readonly locale: Locale;
}

// Shared "what is this app" moment — the anonymous home, and the slide-1
// welcome shown to a signed-in user with nobody followed yet (see
// HomeHeroSlider). Same content either way: neither visitor has anything
// else on screen to explain what to do next.
//
// Text is fixed light (not theme tokens) — this slide sits on the shared
// dark hero backdrop (see HomeHeroSlider) regardless of the site's own
// light/dark theme, same reasoning HalloweenHero/SocialHero use.
export function WelcomeHero({ locale }: WelcomeHeroProps) {
  const t = getDictionary(locale);
  return (
    <div className="flex w-full flex-col justify-center space-y-4 px-4 py-10 text-center">
      <img
        src="/logo.png"
        alt=""
        width={128}
        height={128}
        className="mx-auto size-24 sm:size-32"
      />
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
        Pelicoolas
      </h1>
      <p className="mx-auto max-w-md text-white/80">{t.heroes.welcomeBody}</p>
      <Button render={<a href="/search" />}>
        {t.heroes.searchActorsDirectors}
      </Button>
    </div>
  );
}
