import { useState } from "react";
import { PopcornIcon } from "lucide-react";
import { announce } from "@/lib/a11y";
import { getDictionary } from "@/i18n";
import { useLocale } from "@/lib/hooks/useLocale";

const VALUES = [1, 2, 3, 4, 5] as const;

interface PopcornRatingProps {
  readonly value: number | null;
  readonly onRate: (rating: number) => void;
}

// 5-popcorn rating, shown once a movie is marked watched (see
// MovieDetailsDialog — this component itself doesn't gate on that, the
// caller does). Hover previews the value that a click would set.
export function PopcornRating({ value, onRate }: PopcornRatingProps) {
  const t = getDictionary(useLocale()).movie;
  const [hovered, setHovered] = useState<number | null>(null);
  const filled = hovered ?? value ?? 0;

  return (
    <div
      role="group"
      aria-label={t.rateThisMovie}
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(null)}
    >
      {VALUES.map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          aria-label={t.rateCount(n)}
          className="focus-ring rounded p-0.5"
          onMouseEnter={() => setHovered(n)}
          onClick={() => {
            onRate(n);
            announce(t.rated(n));
          }}
        >
          <PopcornIcon
            className={`size-5 ${n <= filled ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}
