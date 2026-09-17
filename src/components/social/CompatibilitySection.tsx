import { useMemo, useState } from "react";
import {
  BookmarkIcon,
  ChevronRightIcon,
  FilmIcon,
  ShuffleIcon,
  TagIcon,
  UsersIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfileLists } from "@/lib/hooks/useProfileLists";
import { computeCompatibility } from "@/lib/compatibility";
import { pickForUs } from "@/lib/watchPick";
import { genreName } from "@/lib/tmdb/genres";
import { tmdbImageUrl } from "@/lib/tmdb/image";

interface CompatibilitySectionProps {
  readonly myUid: string;
  readonly theirUid: string;
  readonly theirDisplayName: string | null;
  readonly onOpenMovie: (movie: {
    tmdbId: number;
    mediaType?: "movie" | "tv";
  }) => void;
}

const RING_SIZE = 72;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ScoreRing({ score }: { readonly score: number }) {
  const offset = RING_CIRCUMFERENCE * (1 - score / 100);
  return (
    <div
      className="relative shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          className="stroke-muted"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold">{score}%</span>
      </div>
    </div>
  );
}

function TitlePosterGrid({
  titles,
  onOpenMovie,
}: {
  readonly titles: readonly {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string | null;
  }[];
  readonly onOpenMovie: (movie: {
    tmdbId: number;
    mediaType?: "movie" | "tv";
  }) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {titles.map((t) => (
        <button
          key={`${t.mediaType}-${t.tmdbId}`}
          type="button"
          onClick={() => onOpenMovie(t)}
          className="focus-ring card-elevated text-left"
          aria-label={`View details for ${t.title}`}
        >
          {t.posterPath ? (
            <img
              src={tmdbImageUrl(t.posterPath, 185)}
              alt=""
              loading="lazy"
              className="aspect-[2/3] w-full rounded-lg border object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
              No image
            </div>
          )}
          <p className="mt-1 truncate text-xs font-medium">{t.title}</p>
        </button>
      ))}
    </div>
  );
}

function CommonRow({
  icon: Icon,
  count,
  label,
  children,
}: {
  readonly icon: typeof BookmarkIcon;
  readonly count: number;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="focus-ring flex w-full items-center gap-3 py-3 text-left disabled:opacity-40"
        aria-expanded={open}
        disabled={count === 0}
      >
        <Icon className="size-5 shrink-0 text-primary" />
        <span className="w-6 shrink-0 text-lg font-bold">{count}</span>
        <span className="flex-1 text-sm text-muted-foreground">{label}</span>
        <ChevronRightIcon
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && count > 0 && <div className="pb-3">{children}</div>}
    </div>
  );
}

// Only rendered once the viewer can already see the target's watchlist/seen
// (same gate as ProfileSection's canSeePrivateLists in UserProfile.tsx) —
// this reads six lists total (the viewer's own three plus the target's),
// all already covered by existing firestore.rules follower-read grants.
export function CompatibilitySection({
  myUid,
  theirUid,
  theirDisplayName,
  onOpenMovie,
}: CompatibilitySectionProps) {
  const mine = useProfileLists(myUid);
  const theirs = useProfileLists(theirUid);

  const compatibility = useMemo(() => {
    if (!mine || !theirs) return null;
    return computeCompatibility(mine, theirs);
  }, [mine, theirs]);

  if (!mine || !theirs || !compatibility) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  const { score, commonTitles, commonGenres, commonPeople } = compatibility;
  const name = theirDisplayName ?? "this user";
  // The three lists are mutually exclusive by (mine,theirs) list pair — no
  // title double-counts across them.
  const bothWatchlisted = commonTitles.filter(
    (t) => t.mine === "watchlist" && t.theirs === "watchlist",
  );
  const bothWatched = commonTitles.filter(
    (t) => t.mine === "seen" && t.theirs === "seen",
  );

  function handlePick() {
    const pick = pickForUs(mine!, theirs!);
    if (!pick) return;
    onOpenMovie(pick.item);
  }

  const pickPreview = pickForUs(mine, theirs);
  const pickReasonLabel: Record<
    NonNullable<ReturnType<typeof pickForUs>>["reason"],
    string
  > = {
    genre: "Picked from a genre you both love",
    person: "Picked via someone you both follow",
    random: "Picked from your shared watchlist",
  };

  return (
    <div className="card-elevated space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={score} />
        <div>
          <p className="font-semibold">Taste Match</p>
          <p className="text-sm text-muted-foreground">
            Based on movies, genres and people you both follow
          </p>
        </div>
      </div>

      {pickPreview && (
        <Button
          size="lg"
          className="h-auto w-full flex-col items-start gap-0.5 py-3 sm:w-auto sm:flex-row sm:items-center sm:gap-2"
          onClick={handlePick}
        >
          <span className="flex items-center gap-2">
            <ShuffleIcon />
            Pick something for us
          </span>
          <span className="text-xs font-normal opacity-80">
            {pickReasonLabel[pickPreview.reason]}
          </span>
        </Button>
      )}

      <div>
        <p className="mb-1 text-sm font-semibold">In Common</p>
        <div className="rounded-lg border px-3">
          <CommonRow
            icon={BookmarkIcon}
            count={bothWatchlisted.length}
            label="On both watchlists"
          >
            <TitlePosterGrid
              titles={bothWatchlisted}
              onOpenMovie={onOpenMovie}
            />
          </CommonRow>

          <CommonRow
            icon={FilmIcon}
            count={bothWatched.length}
            label="Movies & shows both watched"
          >
            <TitlePosterGrid titles={bothWatched} onOpenMovie={onOpenMovie} />
          </CommonRow>

          <CommonRow
            icon={TagIcon}
            count={commonGenres.length}
            label="Genres in common"
          >
            <div className="flex flex-wrap gap-2">
              {commonGenres.map((g) => (
                <span
                  key={g.genreId}
                  className="rounded-full border px-3 py-1 text-sm"
                >
                  {genreName(g.genreId) ?? "Other"}
                </span>
              ))}
            </div>
          </CommonRow>

          <CommonRow
            icon={UsersIcon}
            count={commonPeople.length}
            label="Actors & directors both follow"
          >
            <div className="space-y-2">
              {commonPeople.map((p) => (
                <a
                  key={p.tmdbId}
                  href={`/person/${p.tmdbId}`}
                  className="focus-ring flex items-center gap-2"
                >
                  <Avatar className="size-9">
                    <AvatarImage
                      src={
                        p.profilePath
                          ? tmdbImageUrl(p.profilePath, 92)
                          : undefined
                      }
                      alt=""
                    />
                    <AvatarFallback>{p.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.knownForDepartment && (
                      <p className="text-xs text-muted-foreground">
                        {p.knownForDepartment}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </CommonRow>
        </div>
      </div>

      <p className="sr-only">Compatibility with {name}</p>
    </div>
  );
}
