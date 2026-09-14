import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface FilmographyProgressProps {
  readonly watchedCount: number;
  readonly totalCount: number;
  /** True while watched-status is still loading — showing 0/N here would
   *  read as "you haven't watched anything," which may well be wrong. */
  readonly loading?: boolean;
}

export function FilmographyProgress({
  watchedCount,
  totalCount,
  loading = false,
}: FilmographyProgressProps) {
  if (loading) {
    return (
      <div className="space-y-1" role="status">
        <span className="sr-only">Loading watched progress…</span>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-5 w-28" />
      </div>
    );
  }

  const percent =
    totalCount === 0 ? 0 : Math.round((watchedCount / totalCount) * 100);
  const remaining = totalCount - watchedCount;

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">
        {watchedCount} / {totalCount} movies
      </p>
      <Progress value={percent} />
      <p className="text-sm text-muted-foreground">
        {remaining} movies pending
      </p>
    </div>
  );
}
