import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { MovieActions } from "@/components/movies/MovieActions";
import { ChevronDownIcon, XIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import { announce } from "@/lib/a11y";
import {
  removeFromRecommendations,
  subscribeToRecommendations,
} from "@/lib/firebase/firestore";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import type { RecommendedMovie } from "@/types/filmography";

const POSTER_WIDTHS = [185, 342, 500];
const POSTER_SIZES = "(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

interface RecommendationsBoardProps {
  readonly userId: string;
}

// Public by design (no sign-in required to view — see firestore.rules) so
// it can be shared on social media. The owner, viewing their own board
// while signed in, additionally gets a share link and remove controls;
// anyone else just sees the movies and a nudge to make their own board.
export function RecommendationsBoard({ userId }: RecommendationsBoardProps) {
  const { user } = useAuth();
  const [movies, setMovies] = useState<readonly RecommendedMovie[] | null>(
    null,
  );
  const [openMovie, setOpenMovie] = useState<RecommendedMovie | null>(null);
  const [copied, setCopied] = useState(false);
  // Optimistically hides a removed card immediately instead of waiting on
  // the subscription to echo the delete back — restored on failure.
  const [removingIds, setRemovingIds] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const [open, setOpen] = useState(true);
  const isOwner = user?.uid === userId;

  useEffect(() => {
    return subscribeToRecommendations(userId, setMovies);
  }, [userId]);

  async function handleRemove(movie: RecommendedMovie) {
    setRemovingIds((prev) => new Set(prev).add(movie.tmdbId));
    announce(`Removed ${movie.title}`);
    try {
      await removeFromRecommendations(userId, movie.tmdbId, movie.mediaType);
    } catch {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(movie.tmdbId);
        return next;
      });
      toast.error(`Couldn't remove "${movie.title}". Please try again.`);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      announce("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (permissions, older browser) — the URL
      // is already visible in the address bar, nothing more to do.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            {isOwner ? "Your recommendations" : "Movie recommendations"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "Anyone with this link can see this board, no account needed."
              : "Movies worth watching, picked by a Pelicoolas user."}
          </p>
        </div>
        {isOwner && (
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? "Copied!" : "Copy link to share"}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="focus-ring flex items-center gap-1.5 text-left text-sm font-semibold text-muted-foreground"
          aria-expanded={open}
        >
          <ChevronDownIcon
            className={`size-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          Recommendations{movies !== null && ` (${movies.length})`}
        </button>

        {open && movies === null && (
          <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="mb-3 aspect-[2/3] w-full break-inside-avoid rounded-lg"
              />
            ))}
          </div>
        )}

        {open &&
          movies !== null &&
          movies.filter((m) => !removingIds.has(m.tmdbId)).length === 0 && (
            <p className="text-center text-muted-foreground">
              {isOwner
                ? "Nothing here yet — open any movie and tap the star to recommend it."
                : "This board is empty for now."}
            </p>
          )}

        {open &&
          movies !== null &&
          movies.filter((m) => !removingIds.has(m.tmdbId)).length > 0 && (
            <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
              {movies
                .filter((m) => !removingIds.has(m.tmdbId))
                .map((movie) => (
                  <BoardMovieCard
                    key={movie.tmdbId}
                    movie={movie}
                    isOwner={isOwner}
                    onOpen={() => setOpenMovie(movie)}
                    onRemove={() => void handleRemove(movie)}
                  />
                ))}
            </div>
          )}
      </div>

      {!isOwner && (
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-sm">
            Track your own filmographies and build a board like this one.
          </p>
          <Button className="mt-2" size="sm" render={<a href="/search" />}>
            Try Pelicoolas
          </Button>
        </div>
      )}

      {openMovie !== null && (
        <MovieDetailsDialog
          movieId={openMovie.tmdbId}
          mediaType={openMovie.mediaType}
          open={openMovie !== null}
          onOpenChange={(open) => !open && setOpenMovie(null)}
        />
      )}
    </div>
  );
}

interface BoardMovieCardProps {
  readonly movie: RecommendedMovie;
  readonly isOwner: boolean;
  readonly onOpen: () => void;
  readonly onRemove: () => void;
}

function BoardMovieCard({
  movie,
  isOwner,
  onOpen,
  onRemove,
}: BoardMovieCardProps) {
  // Public page, works signed-out — a signed-out click just opens the
  // dialog, which has its own sign-in prompt.
  const { watched, inWatchlist, ready, toggleWatched, toggleWatchlist } =
    useMovieActionState(
      {
        tmdbMovieId: movie.tmdbId,
        title: movie.title,
        posterPath: movie.posterPath,
        releaseYear: movie.releaseYear,
        voteAverage: movie.voteAverage,
        genreIds: [],
      },
      onOpen,
    );

  return (
    <div className="mb-3 break-inside-avoid">
      <div className="card-elevated group relative overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={onOpen}
          className="focus-ring block w-full"
          aria-label={`View details for ${movie.title}`}
        >
          {movie.posterPath ? (
            <img
              src={tmdbImageUrl(movie.posterPath, 342)}
              srcSet={tmdbWidthSrcSet(movie.posterPath, POSTER_WIDTHS)}
              sizes={POSTER_SIZES}
              alt=""
              loading="lazy"
              className="w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted text-sm text-muted-foreground">
              No poster
            </div>
          )}
        </button>

        {typeof movie.voteAverage === "number" && (
          <span className="absolute top-2 left-2 rounded-full bg-background/90 px-1.5 py-0.5 text-xs font-semibold shadow">
            {Math.round(movie.voteAverage * 10)}%
          </span>
        )}

        <MovieActions
          movie={{ tmdbMovieId: movie.tmdbId, title: movie.title }}
          watched={watched}
          inWatchlist={inWatchlist}
          onToggleWatched={toggleWatched}
          onToggleWatchlist={toggleWatchlist}
          disabled={!ready}
        />

        {isOwner && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label={`Remove ${movie.title} from your recommendations`}
                  className="absolute right-2 bottom-2 size-11 rounded-full shadow"
                  onClick={onRemove}
                />
              }
            >
              <XIcon />
            </TooltipTrigger>
            <TooltipContent>Remove from recommendations</TooltipContent>
          </Tooltip>
        )}
      </div>

      <p className="mt-1 truncate font-medium">{movie.title}</p>
      <p className="text-sm text-muted-foreground">
        {movie.releaseYear ?? "Unknown"}
      </p>
    </div>
  );
}
