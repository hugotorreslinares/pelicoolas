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
  removePersonFromRecommendations,
  subscribeToRecommendations,
  subscribeToRecommendedPeople,
} from "@/lib/firebase/firestore";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import { getDictionary, type Locale } from "@/i18n";
import type { RecommendedMovie, RecommendedPerson } from "@/types/filmography";

const POSTER_WIDTHS = [185, 342, 500];
const POSTER_SIZES = "(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

interface RecommendationsBoardProps {
  readonly userId: string;
  readonly locale: Locale;
}

// Public by design (no sign-in required to view — see firestore.rules) so
// it can be shared on social media. The owner, viewing their own board
// while signed in, additionally gets a share link and remove controls;
// anyone else just sees the movies and a nudge to make their own board.
export function RecommendationsBoard({
  userId,
  locale,
}: RecommendationsBoardProps) {
  const t = getDictionary(locale);
  const { user } = useAuth();
  const [movies, setMovies] = useState<readonly RecommendedMovie[] | null>(
    null,
  );
  const [people, setPeople] = useState<readonly RecommendedPerson[] | null>(
    null,
  );
  const [openMovie, setOpenMovie] = useState<RecommendedMovie | null>(null);
  const [removingPersonIds, setRemovingPersonIds] = useState<
    ReadonlySet<number>
  >(new Set());
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

  useEffect(() => {
    return subscribeToRecommendedPeople(userId, setPeople);
  }, [userId]);

  async function handleRemovePerson(person: RecommendedPerson) {
    setRemovingPersonIds((prev) => new Set(prev).add(person.tmdbId));
    announce(t.board.removed(person.name));
    try {
      await removePersonFromRecommendations(userId, person.tmdbId);
    } catch {
      setRemovingPersonIds((prev) => {
        const next = new Set(prev);
        next.delete(person.tmdbId);
        return next;
      });
      toast.error(t.board.couldntRemove(person.name));
    }
  }

  async function handleRemove(movie: RecommendedMovie) {
    setRemovingIds((prev) => new Set(prev).add(movie.tmdbId));
    announce(t.board.removed(movie.title));
    try {
      await removeFromRecommendations(userId, movie.tmdbId, movie.mediaType);
    } catch {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(movie.tmdbId);
        return next;
      });
      toast.error(t.board.couldntRemove(movie.title));
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      announce(t.board.linkCopied);
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
            {isOwner
              ? t.board.yourRecommendations
              : t.board.movieRecommendations}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOwner ? t.board.ownerSubtitle : t.board.visitorSubtitle}
          </p>
        </div>
        {isOwner && (
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? t.board.copied : t.board.copyLinkToShare}
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
          {t.board.recommendations(movies !== null ? movies.length : null)}
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
              {isOwner ? t.board.emptyOwner : t.board.emptyVisitor}
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
                    t={t}
                  />
                ))}
            </div>
          )}
      </div>

      {(isOwner
        ? people === null || people.length > 0
        : (people?.length ?? 0) > 0) && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">
            {t.board.peopleRecommendations(
              people !== null ? people.length : null,
            )}
          </p>
          {people === null && (
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="size-20 shrink-0 rounded-full" />
              ))}
            </div>
          )}
          {people !== null &&
            people.filter((p) => !removingPersonIds.has(p.tmdbId)).length >
              0 && (
              <div className="flex flex-wrap gap-4">
                {people
                  .filter((p) => !removingPersonIds.has(p.tmdbId))
                  .map((person) => (
                    <BoardPersonCard
                      key={person.tmdbId}
                      person={person}
                      isOwner={isOwner}
                      onRemove={() => void handleRemovePerson(person)}
                      t={t}
                    />
                  ))}
              </div>
            )}
        </div>
      )}

      {!isOwner && (
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-sm">{t.board.trackYourOwn}</p>
          <Button className="mt-2" size="sm" render={<a href="/search" />}>
            {t.board.tryPelicoolas}
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
  readonly t: ReturnType<typeof getDictionary>;
}

function BoardMovieCard({
  movie,
  isOwner,
  onOpen,
  onRemove,
  t,
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
          aria-label={t.board.viewDetailsFor(movie.title)}
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
              {t.board.noPoster}
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
                  aria-label={t.board.removeFrom(movie.title)}
                  className="absolute right-2 bottom-2 size-11 rounded-full shadow"
                  onClick={onRemove}
                />
              }
            >
              <XIcon />
            </TooltipTrigger>
            <TooltipContent>{t.board.removeFromRecommendations}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <p className="mt-1 truncate font-medium">{movie.title}</p>
      <p className="text-sm text-muted-foreground">
        {movie.releaseYear ?? t.board.unknown}
      </p>
    </div>
  );
}

interface BoardPersonCardProps {
  readonly person: RecommendedPerson;
  readonly isOwner: boolean;
  readonly onRemove: () => void;
  readonly t: ReturnType<typeof getDictionary>;
}

function BoardPersonCard({
  person,
  isOwner,
  onRemove,
  t,
}: BoardPersonCardProps) {
  return (
    <div className="w-20 shrink-0 text-center">
      <div className="relative">
        <a
          href={`/person/${person.tmdbId}`}
          className="focus-ring block"
          aria-label={t.board.viewProfileOf(person.name)}
        >
          {person.profilePath ? (
            <img
              src={tmdbImageUrl(person.profilePath, 185)}
              alt=""
              loading="lazy"
              className="card-elevated aspect-square w-full rounded-full border object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-full border bg-muted text-lg font-semibold text-muted-foreground">
              {person.name.slice(0, 1)}
            </div>
          )}
        </a>
        {isOwner && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label={t.board.removePersonFrom(person.name)}
                  className="absolute -right-1 -bottom-1 size-8 rounded-full shadow"
                  onClick={onRemove}
                />
              }
            >
              <XIcon />
            </TooltipTrigger>
            <TooltipContent>{t.board.removeFromRecommendations}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className="mt-1 truncate text-sm font-medium">{person.name}</p>
    </div>
  );
}
