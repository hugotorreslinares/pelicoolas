import { BookmarkIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { watchedLabel, watchlistLabel } from "@/lib/movieActionsCopy";
import { useLocale } from "@/lib/hooks/useLocale";
import type { TrendingMovie } from "@/types/movie";

interface MovieActionsProps {
  readonly movie: Pick<TrendingMovie, "tmdbMovieId" | "title">;
  readonly watched: boolean;
  readonly inWatchlist: boolean;
  readonly onToggleWatched: () => void;
  readonly onToggleWatchlist: () => void;
  /** "default" = full 44px touch target (poster overlays, dialogs).
   *  "sm" = 36px, for tight inline rows next to other text. */
  readonly size?: "default" | "sm";
  /** "overlay" = absolutely positioned top-right corner of a poster.
   *  "inline" = static, sits in the surrounding flex row. */
  readonly placement?: "overlay" | "inline";
  readonly disabled?: boolean;
  readonly className?: string;
}

// The one shared watched/watchlist control — same icons, same active
// style, same tooltips, everywhere a movie can appear. Controlled: the
// caller owns watched/inWatchlist and the optimistic-update + Firestore
// write behind each toggle (either driven by a bulk subscription it
// already has — WatchlistPage, Filmography — or by useMovieActionState
// for standalone contexts — MovieDetailsDialog, search, trending, board).
export function MovieActions({
  movie,
  watched,
  inWatchlist,
  onToggleWatched,
  onToggleWatchlist,
  size = "default",
  placement = "overlay",
  disabled = false,
  className,
}: MovieActionsProps) {
  const locale = useLocale();
  const buttonSize = size === "sm" ? "size-9" : "size-11";
  const iconSize = size === "sm" ? "size-4" : "size-5";

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-full border bg-secondary text-secondary-foreground shadow",
        placement === "overlay" && "absolute top-2 right-2",
        className,
      )}
    >
      <ActionButton
        label={watchedLabel(watched, locale)}
        ariaLabel={`${watchedLabel(watched, locale)}: ${movie.title}`}
        active={watched}
        disabled={disabled}
        buttonSize={buttonSize}
        onClick={onToggleWatched}
      >
        <EyeIcon className={cn(iconSize, watched && "fill-current")} />
      </ActionButton>
      <div className="w-px shrink-0 bg-border" />
      <ActionButton
        label={watchlistLabel(inWatchlist, locale)}
        ariaLabel={`${watchlistLabel(inWatchlist, locale)}: ${movie.title}`}
        active={inWatchlist}
        disabled={disabled}
        buttonSize={buttonSize}
        onClick={onToggleWatchlist}
      >
        <BookmarkIcon className={cn(iconSize, inWatchlist && "fill-current")} />
      </ActionButton>
    </div>
  );
}

interface ActionButtonProps {
  readonly label: string;
  readonly ariaLabel: string;
  readonly active: boolean;
  readonly disabled: boolean;
  readonly buttonSize: string;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}

function ActionButton({
  label,
  ariaLabel,
  active,
  disabled,
  buttonSize,
  onClick,
  children,
}: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-pressed={active}
            className={cn(
              buttonSize,
              "rounded-none",
              active &&
                "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
