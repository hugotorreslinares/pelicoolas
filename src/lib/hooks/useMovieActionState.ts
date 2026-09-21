import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import { useLocale } from "@/lib/hooks/useLocale";
import { getDictionary } from "@/i18n";
import {
  addToWatchlist,
  isInWatchlist,
  isMovieSeen,
  markMovieSeen,
  removeFromWatchlist,
  unmarkMovieSeen,
} from "@/lib/firebase/firestore";
import type { TrendingMovie } from "@/types/movie";

interface MovieActionState {
  readonly watched: boolean;
  readonly inWatchlist: boolean;
  readonly ready: boolean;
  readonly toggleWatched: () => void;
  readonly toggleWatchlist: () => void;
}

// Self-managed watched/watchlist state for contexts with no bulk
// subscription already at hand (search results, trending, co-star grid,
// the public board, the movie details dialog). Replaces the duplicated
// check-on-mount + optimistic-toggle logic that used to live separately in
// MovieSeenButton and MovieWatchlistButton. Pages that already have a
// `seenIds`/`watchlist` set loaded in bulk (Filmography, Watchlist) skip
// this hook and drive <MovieActions> as a controlled component instead —
// see WatchlistPage.tsx / Filmography.tsx.
export function useMovieActionState(
  movie: TrendingMovie,
  onRequireSignIn?: () => void,
): MovieActionState {
  const { user, loading: authLoading } = useAuth();
  const t = getDictionary(useLocale());
  const [watched, setWatched] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    setChecked(false);
    void Promise.all([
      isMovieSeen(user.uid, movie.tmdbMovieId, movie.mediaType),
      isInWatchlist(user.uid, movie.tmdbMovieId, movie.mediaType),
    ]).then(([seen, listed]) => {
      setWatched(seen);
      setInWatchlist(listed);
      setChecked(true);
    });
  }, [user, movie.tmdbMovieId, movie.mediaType]);

  function requireSignIn(): boolean {
    if (user) return false;
    onRequireSignIn?.();
    return true;
  }

  function toggleWatched() {
    if (requireSignIn()) return;
    const next = !watched;
    setWatched(next);
    announce(`${next ? "Marked" : "Unmarked"} ${movie.title} as watched`);
    const write = next
      ? markMovieSeen(user!.uid, {
          tmdbId: movie.tmdbMovieId,
          title: movie.title,
          posterPath: movie.posterPath,
          releaseYear: movie.releaseYear,
          voteAverage: movie.voteAverage,
          genreIds: movie.genreIds,
          mediaType: movie.mediaType,
        })
      : unmarkMovieSeen(user!.uid, movie.tmdbMovieId, movie.mediaType);
    write.catch(() => {
      setWatched(!next);
      toast.error(t.movie.couldntUpdate(movie.title));
    });
  }

  function toggleWatchlist() {
    if (requireSignIn()) return;
    const next = !inWatchlist;
    setInWatchlist(next);
    announce(
      `${next ? "Added" : "Removed"} ${movie.title} ${next ? "to" : "from"} watchlist`,
    );
    const write = next
      ? addToWatchlist(user!.uid, {
          tmdbId: movie.tmdbMovieId,
          title: movie.title,
          posterPath: movie.posterPath,
          releaseYear: movie.releaseYear,
          voteAverage: movie.voteAverage,
          genreIds: movie.genreIds,
          mediaType: movie.mediaType,
        })
      : removeFromWatchlist(user!.uid, movie.tmdbMovieId, movie.mediaType);
    write.catch(() => {
      setInWatchlist(!next);
      toast.error(t.movie.couldntUpdate(movie.title));
    });
  }

  return {
    watched,
    inWatchlist,
    ready: !authLoading && checked,
    toggleWatched,
    toggleWatchlist,
  };
}
