import { useEffect, useState } from "react";
import { BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  addToWatchlist,
  isInWatchlist,
  removeFromWatchlist,
} from "@/lib/firebase/firestore";
import type { TrendingMovie } from "@/types/movie";

interface MovieWatchlistButtonProps {
  readonly movie: TrendingMovie;
}

// Standalone toggle for contexts with no followed-person to attribute the
// movie to (movie search results) — unlike Filmography's watchlist toggle,
// which is driven by a parent that already knows sourcePersonId/Name.
export function MovieWatchlistButton({ movie }: MovieWatchlistButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showSignInHint, setShowSignInHint] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    void isInWatchlist(user.uid, movie.tmdbMovieId).then((value) => {
      setInWatchlist(value);
      setChecked(true);
    });
  }, [user, movie.tmdbMovieId]);

  async function toggleWatchlist(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      setShowSignInHint(true);
      return;
    }
    if (inWatchlist) {
      await removeFromWatchlist(user.uid, movie.tmdbMovieId);
      setInWatchlist(false);
      announce(`Removed ${movie.title} from watchlist`);
    } else {
      await addToWatchlist(user.uid, {
        tmdbId: movie.tmdbMovieId,
        title: movie.title,
        posterPath: movie.posterPath,
        releaseYear: movie.releaseYear,
        voteAverage: movie.voteAverage,
      });
      setInWatchlist(true);
      announce(`Added ${movie.title} to watchlist`);
    }
  }

  if (authLoading || !checked) return null;

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={
          inWatchlist
            ? `Remove ${movie.title} from watchlist`
            : `Add ${movie.title} to watchlist`
        }
        onClick={(e) => void toggleWatchlist(e)}
      >
        <BookmarkIcon className={inWatchlist ? "fill-current" : ""} />
      </Button>
      {showSignInHint && (
        <p className="text-xs text-muted-foreground">
          Sign in to use your watchlist.
        </p>
      )}
    </div>
  );
}
