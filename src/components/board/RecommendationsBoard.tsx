import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { XIcon } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
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
  const [openMovieId, setOpenMovieId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const isOwner = user?.uid === userId;

  useEffect(() => {
    return subscribeToRecommendations(userId, setMovies);
  }, [userId]);

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
              : "Movies worth watching, picked by a Filmo user."}
          </p>
        </div>
        {isOwner && (
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? "Copied!" : "Copy link to share"}
          </Button>
        )}
      </div>

      {movies === null && (
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="mb-3 aspect-[2/3] w-full break-inside-avoid rounded-lg"
            />
          ))}
        </div>
      )}

      {movies !== null && movies.length === 0 && (
        <p className="text-center text-muted-foreground">
          {isOwner
            ? "Nothing here yet — open any movie and tap the star to recommend it."
            : "This board is empty for now."}
        </p>
      )}

      {movies !== null && movies.length > 0 && (
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
          {movies.map((movie) => (
            <div key={movie.tmdbId} className="mb-3 break-inside-avoid">
              <div className="card-elevated group relative overflow-hidden rounded-lg border">
                <button
                  type="button"
                  onClick={() => setOpenMovieId(movie.tmdbId)}
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

                {isOwner && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label={`Remove ${movie.title} from your recommendations`}
                    className="absolute top-2 right-2 size-11 rounded-full shadow"
                    onClick={() => {
                      void removeFromRecommendations(userId, movie.tmdbId);
                      announce(`Removed ${movie.title}`);
                    }}
                  >
                    <XIcon />
                  </Button>
                )}
              </div>

              <p className="mt-1 truncate font-medium">{movie.title}</p>
              <p className="text-sm text-muted-foreground">
                {movie.releaseYear ?? "Unknown"}
              </p>
            </div>
          ))}
        </div>
      )}

      {!isOwner && (
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-sm">
            Track your own filmographies and build a board like this one.
          </p>
          <Button className="mt-2" size="sm" render={<a href="/search" />}>
            Try Filmo
          </Button>
        </div>
      )}

      {openMovieId !== null && (
        <MovieDetailsDialog
          movieId={openMovieId}
          open={openMovieId !== null}
          onOpenChange={(open) => !open && setOpenMovieId(null)}
        />
      )}
    </div>
  );
}
