import { useRef, useState, type ReactNode } from "react";
import { PopcornIcon } from "lucide-react";
import { WelcomeHero } from "./WelcomeHero";
import { FollowedPeopleHero } from "./FollowedPeopleHero";
import { SocialHero } from "./SocialHero";
import { HalloweenHero } from "./HalloweenHero";
import { isHalloweenSeason } from "@/lib/halloween";
import { cn } from "@/lib/utils";
import { getDictionary, type Locale } from "@/i18n";
import type { FollowedPerson } from "@/types/filmography";

interface HomeHeroSliderProps {
  readonly locale: Locale;
  readonly people: readonly FollowedPerson[];
  readonly posters?: readonly string[];
}

// A brand-new signed-in user has nothing on screen anywhere else on the
// page to explain what the app does — the welcome message used to only
// show for anonymous visitors. Once there ARE followed people, the photo
// wall (FollowedPeopleHero) is worth showing too, but it shouldn't bump
// the welcome message off screen entirely, so both live in a swipeable
// carousel alongside a social slide (SocialHero) that's always present —
// an already-active user is exactly who has friends to go find, so it
// isn't gated on any state the way the welcome/photo-wall slides are.
export function HomeHeroSlider({
  people,
  locale,
  posters,
}: HomeHeroSliderProps) {
  const t = getDictionary(locale);
  const hasPhotos = people.some((p) => p.profilePath !== null);
  const baseSlides: readonly ReactNode[] = hasPhotos
    ? [
        <WelcomeHero key="welcome" locale={locale} posters={posters} />,
        <FollowedPeopleHero key="followed" people={people} locale={locale} />,
        <SocialHero key="social" locale={locale} />,
      ]
    : [
        <WelcomeHero key="welcome" locale={locale} posters={posters} />,
        <SocialHero key="social" locale={locale} />,
      ];

  // The welcome slide stays first (it's the brand's permanent landing
  // moment); the seasonal banner goes right after it.
  const slides: readonly ReactNode[] = isHalloweenSeason(new Date())
    ? [
        baseSlides[0],
        <HalloweenHero key="halloween" locale={locale} />,
        ...baseSlides.slice(1),
      ]
    : baseSlides;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        // The backdrop is one continuous image, tiled horizontally
        // (background-size auto 100% + repeat-x) instead of stretched to
        // exactly N slides — a seamless subtle texture tiles cleanly at any
        // slide count, no need to recompute sizing when Halloween season
        // adds/removes a slide. `background-attachment: local` (not the
        // CSS default `scroll`) is what makes it pan together with the
        // slides as you swipe, instead of staying fixed in the viewport —
        // that's the whole "one long image" illusion.
        style={{
          backgroundImage: "url(/hero-backdrop.webp)",
          backgroundSize: "auto 100%",
          backgroundRepeat: "repeat-x",
          backgroundAttachment: "local",
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-2xl scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          // Row-flex children stretch to the tallest slide, so every slide
          // shares one height and the content below never jumps on swipe.
          // Each slide's root fills that height and centers its own content.
          <div key={index} className="flex w-full shrink-0 snap-center">
            {slide}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1 sm:gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={t.cards.goToSlide(index + 1, slides.length)}
            aria-current={activeIndex === index}
            onClick={() => goTo(index)}
            // A bigger hit target than the icon itself (the icon stays
            // small/subtle; the button padding is what's actually easier
            // to click with a mouse on desktop, per request).
            className="focus-ring rounded-full p-1.5 sm:p-2"
          >
            <PopcornIcon
              className={cn(
                "size-2.5 transition-colors sm:size-3.5",
                activeIndex === index
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
