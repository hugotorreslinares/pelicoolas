import { TrophyIcon, FlameIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
import engagement from "@/config/engagement.json";
import type { FollowedPerson } from "@/types/filmography";

const ALMOST_THERE_MAX_REMAINING = 3;

interface FollowedPersonCardProps {
  readonly person: FollowedPerson;
  readonly watchedCount: number;
  readonly totalCount: number | null;
  readonly age: number | null;
}

export function FollowedPersonCard({
  person,
  watchedCount,
  totalCount,
  age,
}: FollowedPersonCardProps) {
  const percent = totalCount
    ? Math.round((watchedCount / totalCount) * 100)
    : 0;
  const remaining = totalCount ? totalCount - watchedCount : null;
  const isComplete = totalCount !== null && totalCount > 0 && remaining === 0;
  const isAlmostThere =
    engagement.nudges.cardAlmostThere &&
    remaining !== null &&
    remaining > 0 &&
    remaining <= ALMOST_THERE_MAX_REMAINING;

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
          <div className="min-w-0 flex-1">
            <CardTitle>{person.name}</CardTitle>
            {age !== null && (
              <p className="text-sm text-muted-foreground">{age} years old</p>
            )}
          </div>
          {isComplete && (
            <Badge variant="secondary" title="Filmography complete">
              <TrophyIcon data-icon="inline-start" />
              Complete
            </Badge>
          )}
          {!isComplete && isAlmostThere && (
            <Badge title={`${remaining} movies to complete this filmography`}>
              <FlameIcon data-icon="inline-start" />
              {remaining} to go
            </Badge>
          )}
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
