import { Progress } from "@/components/ui/progress";

interface FilmographyProgressProps {
  readonly watchedCount: number;
  readonly totalCount: number;
}

export function FilmographyProgress({
  watchedCount,
  totalCount,
}: FilmographyProgressProps) {
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
