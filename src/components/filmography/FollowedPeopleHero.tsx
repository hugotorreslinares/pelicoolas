import { useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { tmdbDensitySrcSet, tmdbImageUrl } from "@/lib/tmdb/image";
import type { FollowedPerson } from "@/types/filmography";

const MAX_PHOTOS = 40;
// Alternating vertical offsets give the row an editorial, uneven top edge
// instead of a flat grid — small nod to the reference's asymmetric layout.
const OFFSETS = [0, 28, -10, 22, 4, 30, -6, 18];

interface FollowedPeopleHeroProps {
  readonly people: readonly FollowedPerson[];
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    // Resolve on error too — a broken image shouldn't hang the spinner forever,
    // it just won't count as "loaded" so the layout doesn't jump around it.
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export function FollowedPeopleHero({ people }: FollowedPeopleHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imagesReady, setImagesReady] = useState(false);
  const photoPeople = people
    .filter((p) => p.profilePath !== null)
    .slice(0, MAX_PHOTOS);

  useEffect(() => {
    if (photoPeople.length === 0) return;
    setImagesReady(false);
    let cancelled = false;

    Promise.all(
      photoPeople.map((p) => preloadImage(tmdbImageUrl(p.profilePath!, 185))),
    ).then(() => {
      if (!cancelled) setImagesReady(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `photoPeople` is derived fresh from `people` every render; only `people` changing identity should re-run this.
  }, [people]);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl || !imagesReady || photoPeople.length === 0) return;
    const container: HTMLDivElement = containerEl;

    let ctx: gsap.Context | undefined;
    let cancelled = false;

    // Dynamic import, not a top-level one: this component renders during
    // SSR (client:load still produces server-rendered initial HTML), and
    // gsap's package ships ESM-only — requiring it from the server's
    // bundled Node function crashes with "Cannot use import statement
    // outside a module". A useEffect body never runs on the server, so a
    // dynamic import here keeps gsap entirely out of that code path.
    import("gsap").then(({ default: gsap }) => {
      if (cancelled) return;

      const cards = Array.from(
        container.querySelectorAll<HTMLElement>("[data-card]"),
      );

      ctx = gsap.context(() => {
        gsap.set(cards, { y: (i) => OFFSETS[i % OFFSETS.length] });

        // Entrance: staggered fade/scale/rise from the offset resting position.
        gsap.from(cards, {
          opacity: 0,
          y: (i) => OFFSETS[i % OFFSETS.length] + 40,
          scale: 0.9,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
        });

        // Idle float: each card drifts up/down on its own slow, offset cycle
        // so the row never looks frozen once the entrance settles.
        cards.forEach((card, i) => {
          gsap.to(card, {
            y: `+=${10 + (i % 3) * 4}`,
            duration: 2.6 + i * 0.25,
            delay: 0.9 + i * 0.05,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
        });

        // Mouse parallax: cards nearer the row's center drift more than the
        // edges, tracking the pointer position across the whole hero.
        const quickSetters = cards.map((card) => ({
          x: gsap.quickTo(card, "x", { duration: 0.6, ease: "power3.out" }),
        }));

        function handlePointerMove(event: PointerEvent) {
          const rect = container.getBoundingClientRect();
          const relX = (event.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
          cards.forEach((_, i) => {
            const depth =
              1 - Math.abs(i - (cards.length - 1) / 2) / cards.length;
            quickSetters[i].x(relX * 24 * depth);
          });
        }

        function handlePointerLeave() {
          cards.forEach((_, i) => quickSetters[i].x(0));
        }

        container.addEventListener("pointermove", handlePointerMove);
        container.addEventListener("pointerleave", handlePointerLeave);

        cards.forEach((card) => {
          const enter = () =>
            gsap.to(card, {
              scale: 1.08,
              duration: 0.35,
              ease: "power2.out",
              overwrite: "auto",
            });
          const leave = () =>
            gsap.to(card, {
              scale: 1,
              duration: 0.35,
              ease: "power2.out",
              overwrite: "auto",
            });
          card.addEventListener("pointerenter", enter);
          card.addEventListener("pointerleave", leave);
        });

        return () => {
          container.removeEventListener("pointermove", handlePointerMove);
          container.removeEventListener("pointerleave", handlePointerLeave);
        };
      }, container);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [imagesReady, photoPeople.length]);

  if (photoPeople.length === 0) return null;

  if (!imagesReady) {
    return (
      <div
        className="flex h-48 items-center justify-center sm:h-64"
        role="status"
      >
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap justify-center gap-4 overflow-visible px-2 py-10 sm:gap-5"
    >
      {photoPeople.map((person) => (
        <button
          key={person.tmdbId}
          type="button"
          data-card
          onClick={() => (window.location.href = `/person/${person.tmdbId}`)}
          className="focus-ring w-20 shrink-0 overflow-hidden rounded-xl border shadow-sm sm:w-28"
          aria-label={`Go to ${person.name}'s filmography`}
        >
          <img
            src={tmdbImageUrl(person.profilePath!, 185)}
            srcSet={tmdbDensitySrcSet(person.profilePath!, 185, 342)}
            alt={person.name}
            className="aspect-[3/4] w-full object-cover"
            loading="eager"
          />
        </button>
      ))}
    </div>
  );
}
