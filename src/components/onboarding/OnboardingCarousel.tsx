import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDictionary, type Locale } from "@/i18n";

const STORAGE_KEY = "filmo:onboardingSeen";

interface OnboardingCarouselProps {
  readonly locale: Locale;
}

export function OnboardingCarousel({ locale }: OnboardingCarouselProps) {
  const t = getDictionary(locale);
  const slides = t.onboarding.slides;
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

  const slide = slides[slideIndex];
  const isLastSlide = slideIndex === slides.length - 1;

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
          <div
            className="flex gap-1.5"
            role="tablist"
            aria-label={t.onboarding.progressLabel}
          >
            {slides.map((s, i) => (
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
            {isLastSlide ? t.onboarding.continue : t.onboarding.next}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
