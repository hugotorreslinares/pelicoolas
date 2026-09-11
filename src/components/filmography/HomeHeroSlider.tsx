import { useEffect, useRef, useState } from "react";
import { WelcomeHero } from "./WelcomeHero";
import { FollowedPeopleHero } from "./FollowedPeopleHero";
import { cn } from "@/lib/utils";
import type { FollowedPerson } from "@/types/filmography";

interface HomeHeroSliderProps {
  readonly people: readonly FollowedPerson[];
}

// A brand-new signed-in user has nothing on screen anywhere else on the
// page to explain what the app does — the welcome message used to only
// show for anonymous visitors. Once there ARE followed people, the photo
// wall (FollowedPeopleHero) is worth showing too, but it shouldn't bump
// the welcome message off screen entirely, so both live in a two-slide
// swipeable carousel. With nobody followed, there's only one slide and no
// carousel chrome at all.
export function HomeHeroSlider({ people }: HomeHeroSliderProps) {
  const hasPhotos = people.some((p) => p.profilePath !== null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<readonly (HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!hasPhotos) return;
    const el = slideRefs.current[activeIndex];
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.contentRect.height),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeIndex, hasPhotos]);

  if (!hasPhotos) return <WelcomeHero />;

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
        <div
          ref={(el) => {
            slideRefs.current = [el, slideRefs.current[1] ?? null];
          }}
          className="w-full shrink-0 snap-center self-start"
        >
          <WelcomeHero />
        </div>
        <div
          ref={(el) => {
            slideRefs.current = [slideRefs.current[0] ?? null, el];
          }}
          className="w-full shrink-0 snap-center self-start"
        >
          <FollowedPeopleHero people={people} />
        </div>
      </div>

      <div className="flex justify-center gap-1.5">
        {[0, 1].map((index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to slide ${index + 1} of 2`}
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
