import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
import type { FollowedPerson } from "@/types/filmography";

interface FollowedPersonCardProps {
  readonly person: FollowedPerson;
  readonly watchedCount: number;
  readonly totalCount: number | null;
}

export function FollowedPersonCard({
  person,
  watchedCount,
  totalCount,
}: FollowedPersonCardProps) {
  const percent = totalCount
    ? Math.round((watchedCount / totalCount) * 100)
    : 0;

  return (
    <a href={`/person/${person.tmdbId}`} className="focus-ring block">
      <Card className="transition-colors hover:bg-accent">
        <CardHeader className="flex-row items-center gap-2">
          <Avatar>
            <AvatarImage
              src={
                person.profilePath
                  ? tmdbImageUrl(person.profilePath, 45)
                  : undefined
              }
              srcSet={
                person.profilePath
                  ? tmdbDensitySrcSet(person.profilePath, 45, 92)
                  : undefined
              }
              alt={person.name}
            />
            <AvatarFallback>{person.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <CardTitle>{person.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {totalCount === null ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <>
              <Progress value={percent} />
              <p className="text-sm text-muted-foreground">
                {watchedCount} / {totalCount} · {totalCount - watchedCount}{" "}
                remaining
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </a>
  );
}
