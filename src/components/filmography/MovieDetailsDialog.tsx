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
import { NetworkIcon, XIcon } from "lucide-react";
import {
  tmdbImageUrl,
  tmdbWidthSrcSet,
  tmdbDensitySrcSet,
} from "@/lib/tmdb/image";
import { fetchMovieDetails, fetchTVDetails } from "@/lib/movieData";
import { MovieActions } from "@/components/movies/MovieActions";
import { MovieRecommendButton } from "@/components/movies/MovieRecommendButton";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import { LoginButton } from "@/components/auth/LoginButton";
import type {
  CastMember,
  ExternalRatings,
  MovieDetails,
  TrendingMovie,
  TVDetails,
} from "@/types/movie";

const POSTER_WIDTHS = [342, 500, 780];

type MediaType = "movie" | "tv";

// MovieDetails and TVDetails differ in one field a movie has that a show
// doesn't (runtimeMinutes vs seasonCount/episodeCount) — normalizing both
// into this shared view right after fetch means the rest of the dialog's
// JSX doesn't need to branch on mediaType at all, only this one mapping
// does.
interface DialogView {
  readonly id: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly overview: string | null;
  readonly releaseYear: number | null;
  readonly voteAverage: number | null;
  readonly genres: readonly string[];
  readonly genreIds: readonly number[];
  readonly cast: readonly CastMember[];
  readonly externalRatings: ExternalRatings | null;
  readonly subtitle: string;
}

function toDialogView(
  details: MovieDetails | TVDetails,
  mediaType: MediaType,
): DialogView {
  const secondaryFact =
    mediaType === "movie"
      ? (details as MovieDetails).runtimeMinutes
        ? `${(details as MovieDetails).runtimeMinutes} min`
        : null
      : (details as TVDetails).seasonCount
        ? `${(details as TVDetails).seasonCount} season${(details as TVDetails).seasonCount === 1 ? "" : "s"}`
        : null;

  return {
    id: details.id,
    title: details.title,
    posterPath: details.posterPath,
    overview: details.overview,
    releaseYear: details.releaseYear,
    voteAverage: details.voteAverage,
    genres: details.genres,
    genreIds: details.genreIds,
    cast: details.cast,
    externalRatings: details.externalRatings,
    subtitle: [
      details.releaseYear ?? "Unknown",
      secondaryFact,
      details.genres.join(", ") || null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

// The three toggle buttons (seen/recommend/watchlist) each just need the
// same handful of summary fields, plus mediaType so they read/write the
// right Firestore doc (see mediaDocId in firestore.ts).
function movieSummary(view: DialogView, mediaType: MediaType): TrendingMovie {
  return {
    tmdbMovieId: view.id,
    title: view.title,
    posterPath: view.posterPath,
    releaseYear: view.releaseYear,
    voteAverage: view.voteAverage,
    genreIds: view.genreIds,
    mediaType,
  };
}

interface MovieDetailsDialogProps {
  readonly movieId: number;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Defaults to "movie" — every pre-existing call site opens a movie. */
  readonly mediaType?: MediaType;
}

export function MovieDetailsDialog({
  movieId,
  open,
  onOpenChange,
  mediaType = "movie",
}: MovieDetailsDialogProps) {
  const [view, setView] = useState<DialogView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const actionState = useMovieActionState(
    view
      ? movieSummary(view, mediaType)
      : {
          tmdbMovieId: movieId,
          title: "",
          posterPath: null,
          releaseYear: null,
          voteAverage: null,
          genreIds: [],
          mediaType,
        },
    () => setShowSignIn(true),
  );

  useEffect(() => {
    if (!open) return;
    setView(null);
    setError(null);
    const fetchDetails =
      mediaType === "tv" ? fetchTVDetails(movieId) : fetchMovieDetails(movieId);
    fetchDetails
      .then((details) => {
        if (!details) throw new Error("request failed");
        setView(toDialogView(details, mediaType));
      })
      .catch(() =>
        setError(
          mediaType === "tv"
            ? "We couldn't load this show. Please try again."
            : "We couldn't load this movie. Please try again.",
        ),
      );
  }, [open, movieId, mediaType]);

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

        {!error && !view && (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-lg md:h-96" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}

        {!error && view && (
          // min-w-0: DialogContent is a CSS grid, and grid items default to
          // min-width:auto — without this, a slightly-too-wide child (the
          // ratings row, a long unbroken word) stretches the whole dialog
          // and forces horizontal scroll instead of wrapping.
          <div className="min-w-0">
            {view.posterPath && (
              <img
                src={tmdbImageUrl(view.posterPath, 342)}
                srcSet={tmdbWidthSrcSet(view.posterPath, POSTER_WIDTHS)}
                sizes="(min-width: 640px) 448px, 100vw"
                alt=""
                className="mb-2 h-64 w-full rounded-lg object-cover md:h-96"
              />
            )}
            <DialogHeader>
              <div className="flex items-start justify-between gap-2">
                <DialogTitle>{view.title}</DialogTitle>
                <div className="flex shrink-0 items-center gap-1">
                  <MovieActions
                    movie={{ tmdbMovieId: view.id, title: view.title }}
                    watched={actionState.watched}
                    inWatchlist={actionState.inWatchlist}
                    onToggleWatched={actionState.toggleWatched}
                    onToggleWatchlist={actionState.toggleWatchlist}
                    disabled={!actionState.ready}
                    placement="inline"
                  />
                  <MovieRecommendButton
                    movie={movieSummary(view, mediaType)}
                    onRequireSignIn={() => setShowSignIn(true)}
                  />
                </div>
              </div>
              {showSignIn && (
                <div className="flex items-center gap-2">
                  <LoginButton size="sm" />
                  <span className="text-xs text-muted-foreground">
                    to track, save, or recommend{" "}
                    {mediaType === "tv" ? "shows" : "movies"}
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{view.subtitle}</p>
              {mediaType === "movie" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  render={<a href={`/map?movie=${view.id}`} />}
                >
                  <NetworkIcon data-icon="inline-start" />
                  View in Movie Map
                </Button>
              )}
            </DialogHeader>
            <DialogDescription className="mt-2">
              {view.overview || "No overview available."}
            </DialogDescription>

            {view.externalRatings &&
              (view.externalRatings.imdb ||
                view.externalRatings.rottenTomatoes ||
                view.externalRatings.metacritic) && (
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {view.externalRatings.imdb && (
                    <span>
                      <span className="font-medium">IMDb</span>{" "}
                      {view.externalRatings.imdb}
                    </span>
                  )}
                  {view.externalRatings.rottenTomatoes && (
                    <span>
                      <span className="font-medium">Rotten Tomatoes</span>{" "}
                      {view.externalRatings.rottenTomatoes}
                    </span>
                  )}
                  {view.externalRatings.metacritic && (
                    <span>
                      <span className="font-medium">Metacritic</span>{" "}
                      {view.externalRatings.metacritic}
                    </span>
                  )}
                </div>
              )}

            {view.cast.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Cast</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {view.cast.map((member) => (
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
