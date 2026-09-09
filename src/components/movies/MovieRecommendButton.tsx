import { useEffect, useState } from "react";
import { StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/auth/LoginButton";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  addToRecommendations,
  isInRecommendations,
  removeFromRecommendations,
} from "@/lib/firebase/firestore";
import type { TrendingMovie } from "@/types/movie";

interface MovieRecommendButtonProps {
  readonly movie: TrendingMovie;
  /** See MovieWatchlistButton's prop of the same name — lets a parent that
   * renders both buttons show a single shared sign-in prompt. */
  readonly onRequireSignIn?: () => void;
}

// Toggles a movie on the signed-in user's public recommendations board
// (/board/{uid}) — a separate list from the watchlist: watchlist is "I want
// to see this", this is "I'm telling other people to see this".
export function MovieRecommendButton({
  movie,
  onRequireSignIn,
}: MovieRecommendButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const [recommended, setRecommended] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showSignInHint, setShowSignInHint] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    void isInRecommendations(user.uid, movie.tmdbMovieId).then((value) => {
      setRecommended(value);
      setChecked(true);
    });
  }, [user, movie.tmdbMovieId]);

  async function toggleRecommended(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      if (onRequireSignIn) onRequireSignIn();
      else setShowSignInHint(true);
      return;
    }
    if (recommended) {
      await removeFromRecommendations(user.uid, movie.tmdbMovieId);
      setRecommended(false);
      announce(`Removed ${movie.title} from your recommendations board`);
    } else {
      await addToRecommendations(user.uid, {
        tmdbId: movie.tmdbMovieId,
        title: movie.title,
        posterPath: movie.posterPath,
        releaseYear: movie.releaseYear,
        voteAverage: movie.voteAverage,
      });
      setRecommended(true);
      announce(`Added ${movie.title} to your recommendations board`);
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
          recommended
            ? `Remove ${movie.title} from your recommendations board`
            : `Add ${movie.title} to your recommendations board`
        }
        onClick={(e) => void toggleRecommended(e)}
      >
        <StarIcon className={recommended ? "fill-current" : ""} />
      </Button>
      {showSignInHint && <LoginButton size="sm" />}
    </div>
  );
}
