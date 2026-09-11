import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "filmo:onboardingSeen";

interface Slide {
  readonly kicker: string;
  readonly title: string;
  readonly description: string;
}

const SLIDES: readonly Slide[] = [
  {
    kicker: "Pelicoolas",
    title: "¿Cuántas películas de tu actor favorito realmente viste?",
    description:
      "Seguí a los actores y directores que te gustan, marcá lo que ya viste, y descubrí qué te falta.",
  },
  {
    kicker: "Filmografías",
    title: "Seguí actores y directores. Marcá lo que ya viste.",
    description:
      "Cada persona que seguís tiene su propio progreso — sabés exactamente cuánto te falta para completar su filmografía.",
  },
  {
    kicker: "Watchlist & logros",
    title: "Guardá lo que querés ver. Desbloqueá insignias.",
    description:
      "Tu watchlist personal, y una recompensa cada vez que completás la filmografía de alguien.",
  },
  {
    kicker: "Empezá gratis",
    title: "Tu progreso de cine, siempre visible.",
    description:
      "Sin redes, sin ruido. Solo vos, tus filmografías, y lo que te falta ver.",
  },
];

export function OnboardingCarousel() {
  const [open, setOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  // Only ever opens once per browser: checked on mount, and closing (by
  // any means — Continuar, the X, Escape, backdrop click) marks it seen so
  // it never opens again. Absent/unreadable localStorage (private mode)
  // just means it won't persist — the modal shows again next visit rather
  // than crashing or blocking the page.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") setOpen(true);
    } catch {
      // localStorage unavailable — skip onboarding rather than risk showing it every load
    }
  }, []);

  function handleOpenChange(nextOpen: boolean): void {
    setOpen(nextOpen);
    if (!nextOpen) {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // localStorage unavailable — nothing to persist
      }
    }
  }

  const slide = SLIDES[slideIndex];
  const isLastSlide = slideIndex === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-6 p-6 sm:max-w-md">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {slide.kicker}
          </p>
          <DialogTitle className="font-heading text-xl leading-tight font-semibold text-balance">
            {slide.title}
          </DialogTitle>
          <DialogDescription className="text-base text-pretty">
            {slide.description}
          </DialogDescription>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" role="tablist" aria-label="Progreso">
            {SLIDES.map((s, i) => (
              <span
                key={s.kicker}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === slideIndex ? "bg-foreground" : "bg-muted-foreground/30",
                )}
              />
            ))}
          </div>
          <Button
            size="sm"
            onClick={() =>
              isLastSlide
                ? handleOpenChange(false)
                : setSlideIndex((i) => i + 1)
            }
          >
            {isLastSlide ? "Continuar" : "Siguiente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
