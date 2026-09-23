import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { getMovieRating, setMovieRating } from "@/lib/firebase/firestore";
import { getDictionary } from "@/i18n";
import { useLocale } from "@/lib/hooks/useLocale";

interface MovieRatingState {
  readonly rating: number | null;
  readonly rate: (value: number) => void;
}

/**
 * Reads/writes the signed-in user's 1-5 "crispetas" rating for a movie —
 * only meaningful once it's marked watched (see setMovieRating), so callers
 * pass `watched` and get `rating: null` until it's true. One-time fetch on
 * becoming watched, not a live subscription — same pattern as
 * useMovieActionState's own watched/watchlist checks.
 */
export function useMovieRating(
  movieId: number,
  watched: boolean,
  mediaType?: "movie" | "tv",
): MovieRatingState {
  const t = getDictionary(useLocale()).movie;
  const { user } = useAuth();
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !watched) {
      setRating(null);
      return;
    }
    void getMovieRating(user.uid, movieId, mediaType).then(setRating);
  }, [user, watched, movieId, mediaType]);

  function rate(value: number) {
    if (!user || !watched) return;
    const previous = rating;
    setRating(value);
    void setMovieRating(user.uid, movieId, value, mediaType).catch(() => {
      setRating(previous);
      toast.error(t.couldntRate);
    });
  }

  return { rating, rate };
}
