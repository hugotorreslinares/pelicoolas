import { Button } from "@/components/ui/button";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { getDictionary, type Locale } from "@/i18n";

const WALL_SIZE = 28;

interface WelcomeHeroProps {
  readonly locale: Locale;
  /** Poster paths for the tilted wall behind the text — omitted = plain backdrop. */
  readonly posters?: readonly string[];
}

// Shared "what is this app" moment — the anonymous home, and the slide-1
// welcome shown to a signed-in user with nobody followed yet (see
// HomeHeroSlider). Same content either way: neither visitor has anything
// else on screen to explain what to do next.
//
// Text is fixed light (not theme tokens) — this slide sits on the shared
// dark hero backdrop (see HomeHeroSlider) regardless of the site's own
// light/dark theme, same reasoning HalloweenHero/SocialHero use.
export function WelcomeHero({ locale, posters = [] }: WelcomeHeroProps) {
  const t = getDictionary(locale);
  // Repeat the few trending posters to fill the wall.
  const wall = posters.length
    ? Array.from({ length: WALL_SIZE }, (_, i) => posters[i % posters.length])
    : [];
  return (
    <div className="relative flex w-full flex-col justify-center space-y-4 overflow-hidden px-4 py-10 text-center">
      {wall.length > 0 && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-10 grid -rotate-6 grid-cols-7 gap-2 opacity-35"
          >
            {wall.map((path, i) => (
              <img
                key={i}
                src={tmdbImageUrl(path, 185)}
                alt=""
                loading="lazy"
                className="aspect-[2/3] w-full rounded-md object-cover"
              />
            ))}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/70"
          />
        </>
      )}
      <img
        src="/logo.png"
        alt=""
        width={128}
        height={128}
        className="relative mx-auto size-24 sm:size-32"
      />
      <h1 className="relative flex items-center justify-center gap-2 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
        Pelicoolas
        <span className="rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-white/90 uppercase sm:text-sm">
          {t.heroes.betaBadge}
        </span>
      </h1>
      <p className="relative mx-auto max-w-md text-white/80">
        {t.heroes.welcomeBody}
      </p>
      <Button className="relative" render={<a href="/search" />}>
        {t.heroes.searchActorsDirectors}
      </Button>
      <p className="relative mx-auto max-w-sm text-xs text-white/60">
        {t.heroes.betaNote}
      </p>
    </div>
  );
}
