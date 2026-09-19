import { useEffect, useRef, useState, type ReactNode } from "react";
import { WelcomeHero } from "./WelcomeHero";
import { FollowedPeopleHero } from "./FollowedPeopleHero";
import { SocialHero } from "./SocialHero";
import { cn } from "@/lib/utils";
import { getDictionary, type Locale } from "@/i18n";
import type { FollowedPerson } from "@/types/filmography";

interface HomeHeroSliderProps {
  readonly locale: Locale;
  readonly people: readonly FollowedPerson[];
}

// A brand-new signed-in user has nothing on screen anywhere else on the
// page to explain what the app does — the welcome message used to only
// show for anonymous visitors. Once there ARE followed people, the photo
// wall (FollowedPeopleHero) is worth showing too, but it shouldn't bump
// the welcome message off screen entirely, so both live in a swipeable
// carousel alongside a social slide (SocialHero) that's always present —
// an already-active user is exactly who has friends to go find, so it
// isn't gated on any state the way the welcome/photo-wall slides are.
export function HomeHeroSlider({ people, locale }: HomeHeroSliderProps) {
  const t = getDictionary(locale);
  const hasPhotos = people.some((p) => p.profilePath !== null);
  const slides: readonly ReactNode[] = hasPhotos
    ? [
        <WelcomeHero key="welcome" locale={locale} />,
        <FollowedPeopleHero key="followed" people={people} locale={locale} />,
        <SocialHero key="social" locale={locale} />,
      ]
    : [
        <WelcomeHero key="welcome" locale={locale} />,
        <SocialHero key="social" locale={locale} />,
      ];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = slideRefs.current[activeIndex];
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.contentRect.height),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeIndex]);

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
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth transition-[height] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ height }}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            className="w-full shrink-0 snap-center self-start"
          >
            {slide}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={t.cards.goToSlide(index + 1, slides.length)}
            aria-current={activeIndex === index}
            onClick={() => goTo(index)}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              activeIndex === index ? "bg-primary" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </div>
  );
}
