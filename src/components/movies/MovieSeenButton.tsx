import { useEffect, useState } from "react";
import { EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/auth/LoginButton";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  isMovieSeen,
  markMovieSeen,
  unmarkMovieSeen,
} from "@/lib/firebase/firestore";
import type { TrendingMovie } from "@/types/movie";

interface MovieSeenButtonProps {
  readonly movie: TrendingMovie;
  /** See MovieWatchlistButton's prop of the same name. */
  readonly onRequireSignIn?: () => void;
}

// A personal "I've seen this" log for contexts with no specific followed
// person's filmography to check the movie off in (search, watchlist,
// recommendations board, Connections). Separate from the per-person
// watched-movie tracking that drives filmography completion — marking a
// movie here doesn't check it off in anyone's filmography, and vice versa.
export function MovieSeenButton({
  movie,
  onRequireSignIn,
}: MovieSeenButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const [seen, setSeen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showSignInHint, setShowSignInHint] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    void isMovieSeen(user.uid, movie.tmdbMovieId).then((value) => {
      setSeen(value);
      setChecked(true);
    });
  }, [user, movie.tmdbMovieId]);

  async function toggleSeen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      if (onRequireSignIn) onRequireSignIn();
      else setShowSignInHint(true);
      return;
    }
    if (seen) {
      await unmarkMovieSeen(user.uid, movie.tmdbMovieId);
      setSeen(false);
      announce(`Unmarked ${movie.title} as watched`);
    } else {
      await markMovieSeen(user.uid, {
        tmdbId: movie.tmdbMovieId,
        title: movie.title,
        posterPath: movie.posterPath,
        releaseYear: movie.releaseYear,
        voteAverage: movie.voteAverage,
      });
      setSeen(true);
      announce(`Marked ${movie.title} as watched`);
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
          seen
            ? `Unmark ${movie.title} as watched`
            : `Mark ${movie.title} as watched`
        }
        onClick={(e) => void toggleSeen(e)}
      >
        <EyeIcon className={seen ? "fill-current" : ""} />
      </Button>
      {showSignInHint && <LoginButton size="sm" />}
    </div>
  );
}
