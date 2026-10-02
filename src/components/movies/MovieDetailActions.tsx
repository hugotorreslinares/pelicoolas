import { useState } from "react";
import { MovieActions } from "./MovieActions";
import { LoginButton } from "@/components/auth/LoginButton";
import { PopcornRating } from "./PopcornRating";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import { useMovieRating } from "@/lib/hooks/useMovieRating";
import { getDictionary, type Locale } from "@/i18n";
import type { TrendingMovie } from "@/types/movie";

interface MovieDetailActionsProps {
  readonly movie: TrendingMovie;
  readonly locale: Locale;
}

// Watched/watchlist toggle for the standalone /movie and /tv SEO pages —
// same useMovieActionState + MovieActions pair used everywhere else
// (MovieResultRow, RecommendationsBoard, the dialog), just inline instead
// of overlaid on a poster, since this page's poster is the static,
// crawlable <img> below it rather than a button surface.
export function MovieDetailActions({ movie, locale }: MovieDetailActionsProps) {
  const t = getDictionary(locale);
  const [showSignInHint, setShowSignInHint] = useState(false);
  const { watched, inWatchlist, ready, toggleWatched, toggleWatchlist } =
    useMovieActionState(movie, () => setShowSignInHint(true));
  const { rating, rate } = useMovieRating(
    movie.tmdbMovieId,
    watched,
    movie.mediaType,
  );

  if (showSignInHint) {
    return (
      <div className="flex items-center gap-2">
        <LoginButton size="sm" locale={locale} />
        <span className="text-xs text-muted-foreground">
          {t.movie.signInToTrack(movie.mediaType === "tv")}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <MovieActions
        movie={movie}
        watched={watched}
        inWatchlist={inWatchlist}
        onToggleWatched={toggleWatched}
        onToggleWatchlist={toggleWatchlist}
        disabled={!ready}
        placement="inline"
      />
      {watched && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t.movie.yourRating}
          </span>
          <PopcornRating value={rating} onRate={rate} />
        </div>
      )}
    </div>
  );
}
