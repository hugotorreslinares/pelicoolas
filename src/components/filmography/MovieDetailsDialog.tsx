import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { XIcon } from "lucide-react";
import {
  tmdbImageUrl,
  tmdbWidthSrcSet,
  tmdbDensitySrcSet,
} from "@/lib/tmdb/image";
import { fetchMovieDetails } from "@/lib/movieData";
import { MovieWatchlistButton } from "@/components/movies/MovieWatchlistButton";
import { MovieRecommendButton } from "@/components/movies/MovieRecommendButton";
import { MovieSeenButton } from "@/components/movies/MovieSeenButton";
import { LoginButton } from "@/components/auth/LoginButton";
import type { MovieDetails, TrendingMovie } from "@/types/movie";

const POSTER_WIDTHS = [342, 500, 780];

// The three toggle buttons (seen/recommend/watchlist) each just need the
// same handful of summary fields off MovieDetails.
function movieSummary(details: MovieDetails): TrendingMovie {
  return {
    tmdbMovieId: details.id,
    title: details.title,
    posterPath: details.posterPath,
    releaseYear: details.releaseYear,
    voteAverage: details.voteAverage,
    genreIds: details.genreIds,
  };
}

interface MovieDetailsDialogProps {
  readonly movieId: number;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function MovieDetailsDialog({
  movieId,
  open,
  onOpenChange,
}: MovieDetailsDialogProps) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDetails(null);
    setError(null);
    fetchMovieDetails(movieId)
      .then((movie) => {
        if (!movie) throw new Error("request failed");
        setDetails(movie);
      })
      .catch(() => setError("We couldn't load this movie. Please try again."));
  }, [open, movieId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] w-full min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-lg md:max-w-2xl"
      >
        <DialogClose
          render={
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 z-10 size-11 rounded-full shadow"
            />
          }
        >
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>

        {error && (
          <div className="py-6 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {!error && !details && (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-lg md:h-96" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}

        {!error && details && (
          // min-w-0: DialogContent is a CSS grid, and grid items default to
          // min-width:auto — without this, a slightly-too-wide child (the
          // ratings row, a long unbroken word) stretches the whole dialog
          // and forces horizontal scroll instead of wrapping.
          <div className="min-w-0">
            {details.posterPath && (
              <img
                src={tmdbImageUrl(details.posterPath, 342)}
                srcSet={tmdbWidthSrcSet(details.posterPath, POSTER_WIDTHS)}
                sizes="(min-width: 640px) 448px, 100vw"
                alt=""
                className="mb-2 h-64 w-full rounded-lg object-cover md:h-96"
              />
            )}
            <DialogHeader>
              <div className="flex items-start justify-between gap-2">
                <DialogTitle>{details.title}</DialogTitle>
                <div className="flex shrink-0">
                  <MovieSeenButton
                    movie={movieSummary(details)}
                    onRequireSignIn={() => setShowSignIn(true)}
                  />
                  <MovieRecommendButton
                    movie={movieSummary(details)}
                    onRequireSignIn={() => setShowSignIn(true)}
                  />
                  <MovieWatchlistButton
                    movie={movieSummary(details)}
                    onRequireSignIn={() => setShowSignIn(true)}
                  />
                </div>
              </div>
              {showSignIn && (
                <div className="flex items-center gap-2">
                  <LoginButton size="sm" />
                  <span className="text-xs text-muted-foreground">
                    to track, save, or recommend movies
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {[
                  details.releaseYear ?? "Unknown",
                  details.runtimeMinutes
                    ? `${details.runtimeMinutes} min`
                    : null,
                  details.genres.join(", ") || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </DialogHeader>
            <DialogDescription className="mt-2">
              {details.overview || "No overview available."}
            </DialogDescription>

            {details.externalRatings &&
              (details.externalRatings.imdb ||
                details.externalRatings.rottenTomatoes ||
                details.externalRatings.metacritic) && (
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {details.externalRatings.imdb && (
                    <span>
                      <span className="font-medium">IMDb</span>{" "}
                      {details.externalRatings.imdb}
                    </span>
                  )}
                  {details.externalRatings.rottenTomatoes && (
                    <span>
                      <span className="font-medium">Rotten Tomatoes</span>{" "}
                      {details.externalRatings.rottenTomatoes}
                    </span>
                  )}
                  {details.externalRatings.metacritic && (
                    <span>
                      <span className="font-medium">Metacritic</span>{" "}
                      {details.externalRatings.metacritic}
                    </span>
                  )}
                </div>
              )}

            {details.cast.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Cast</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {details.cast.map((member) => (
                    <a
                      key={member.personId}
                      href={`/person/${member.personId}`}
                      className="focus-ring flex w-16 shrink-0 flex-col items-center gap-1 text-center"
                    >
                      <Avatar>
                        <AvatarImage
                          src={
                            member.profilePath
                              ? tmdbImageUrl(member.profilePath, 92)
                              : undefined
                          }
                          srcSet={
                            member.profilePath
                              ? tmdbDensitySrcSet(member.profilePath, 45, 92)
                              : undefined
                          }
                          alt=""
                        />
                        <AvatarFallback>
                          {member.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="w-full truncate text-xs font-medium">
                        {member.name}
                      </p>
                      {member.character && (
                        <p className="w-full truncate text-xs text-muted-foreground">
                          {member.character}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
