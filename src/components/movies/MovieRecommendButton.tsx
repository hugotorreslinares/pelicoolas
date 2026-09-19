import { useEffect, useState } from "react";
import { StarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LoginButton } from "@/components/auth/LoginButton";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  addToRecommendations,
  isInRecommendations,
  removeFromRecommendations,
} from "@/lib/firebase/firestore";
import { notifyFollowersOfRecommendation } from "@/lib/firebase/notifications";
import { getDictionary } from "@/i18n";
import { useLocale } from "@/lib/hooks/useLocale";
import type { TrendingMovie } from "@/types/movie";

interface MovieRecommendButtonProps {
  readonly movie: TrendingMovie;
  /** Lets a parent that renders both this and <MovieActions> show a single
   * shared sign-in prompt instead of one per button. */
  readonly onRequireSignIn?: () => void;
}

// Toggles a movie on the signed-in user's public recommendations board
// (/board/{uid}) — a separate list from the watchlist: watchlist is "I want
// to see this", this is "I'm telling other people to see this".
export function MovieRecommendButton({
  movie,
  onRequireSignIn,
}: MovieRecommendButtonProps) {
  const t = getDictionary(useLocale()).movie;
  const { user, loading: authLoading } = useAuth();
  const [recommended, setRecommended] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showSignInHint, setShowSignInHint] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    void isInRecommendations(user.uid, movie.tmdbMovieId, movie.mediaType).then(
      (value) => {
        setRecommended(value);
        setChecked(true);
      },
    );
  }, [user, movie.tmdbMovieId, movie.mediaType]);

  async function toggleRecommended(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      if (onRequireSignIn) onRequireSignIn();
      else setShowSignInHint(true);
      return;
    }
    const next = !recommended;
    setRecommended(next);
    announce(t.boardChanged(movie.title, next));
    try {
      if (next) {
        await addToRecommendations(user.uid, {
          tmdbId: movie.tmdbMovieId,
          title: movie.title,
          posterPath: movie.posterPath,
          releaseYear: movie.releaseYear,
          voteAverage: movie.voteAverage,
          mediaType: movie.mediaType,
        });
        // Best-effort, never blocks the toggle itself on a slow/failed
        // fan-out — the recommendation is already saved either way.
        void notifyFollowersOfRecommendation(user, {
          tmdbId: movie.tmdbMovieId,
          title: movie.title,
          posterPath: movie.posterPath,
          mediaType: movie.mediaType,
        }).catch(() => {});
      } else {
        await removeFromRecommendations(
          user.uid,
          movie.tmdbMovieId,
          movie.mediaType,
        );
      }
    } catch {
      setRecommended(!next);
      toast.error(t.couldntUpdate(movie.title));
    }
  }

  if (authLoading || !checked) return null;

  return (
    <div className="space-y-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={
                recommended
                  ? t.removeFromBoardAria(movie.title)
                  : t.addToBoardAria(movie.title)
              }
              onClick={(e) => void toggleRecommended(e)}
            />
          }
        >
          <StarIcon className={recommended ? "fill-current" : ""} />
        </TooltipTrigger>
        <TooltipContent>
          {recommended ? t.removeFromRecommendations : t.recommendThis}
        </TooltipContent>
      </Tooltip>
      {showSignInHint && <LoginButton size="sm" />}
    </div>
  );
}
