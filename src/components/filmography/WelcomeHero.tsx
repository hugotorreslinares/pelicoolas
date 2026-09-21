import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/i18n";

interface WelcomeHeroProps {
  readonly locale: Locale;
}

// Shared "what is this app" moment — the anonymous home, and the slide-1
// welcome shown to a signed-in user with nobody followed yet (see
// HomeHeroSlider). Same content either way: neither visitor has anything
// else on screen to explain what to do next.
export function WelcomeHero({ locale }: WelcomeHeroProps) {
  const t = getDictionary(locale);
  return (
    <div className="flex w-full flex-col justify-center space-y-4 py-6 text-center">
      <img
        src="/logo.png"
        alt=""
        width={128}
        height={128}
        className="mx-auto size-24 sm:size-32"
      />
      <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
        Pelicoolas
      </h1>
      <p className="mx-auto max-w-md text-muted-foreground">
        {t.heroes.welcomeBody}
      </p>
      <Button render={<a href="/search" />}>
        {t.heroes.searchActorsDirectors}
      </Button>
    </div>
  );
}
