import { useMemo, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfileLists } from "@/lib/hooks/useProfileLists";
import { computeCompatibility } from "@/lib/compatibility";
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

function Collapsible({
  title,
  count,
  children,
}: {
  readonly title: string;
  readonly count: number;
  readonly children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="focus-ring flex w-full items-center gap-1.5 text-left text-sm font-semibold text-muted-foreground"
        aria-expanded={open}
        disabled={count === 0}
      >
        <ChevronDownIcon
          className={`size-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"} ${count === 0 ? "opacity-30" : ""}`}
        />
        {title} ({count})
      </button>
      {open && count > 0 && children}
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

  if (!compatibility) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  const { score, commonTitles, commonGenres, commonPeople } = compatibility;
  const name = theirDisplayName ?? "this user";
  // Distinct from "Movies & shows in common" (which also counts a title
  // either of you has already watched) — specifically both still-want-to-
  // watch, so it reads as "here's what to plan a watch party around".
  const bothWatchlisted = commonTitles.filter(
    (t) => t.mine === "watchlist" && t.theirs === "watchlist",
  );

  return (
    <div className="card-elevated space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold">{score}%</div>
        <p className="text-sm text-muted-foreground">
          taste match with {name} — a rough estimate based on movies, genres,
          and people you both follow, not a recommendation.
        </p>
      </div>

      <Collapsible
        title="On both your watchlists"
        count={bothWatchlisted.length}
      >
        <TitlePosterGrid titles={bothWatchlisted} onOpenMovie={onOpenMovie} />
      </Collapsible>

      <Collapsible title="Movies & shows in common" count={commonTitles.length}>
        <TitlePosterGrid titles={commonTitles} onOpenMovie={onOpenMovie} />
      </Collapsible>

      <Collapsible title="Genres in common" count={commonGenres.length}>
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
      </Collapsible>

      <Collapsible
        title="Actors & directors you both follow"
        count={commonPeople.length}
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
                    p.profilePath ? tmdbImageUrl(p.profilePath, 92) : undefined
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
      </Collapsible>
    </div>
  );
}
