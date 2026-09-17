import { TrophyIcon, FlameIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
import engagement from "@/config/engagement.json";
import { getDictionary, type Locale } from "@/i18n";
import type { FollowedPerson } from "@/types/filmography";

const ALMOST_THERE_MAX_REMAINING = 3;

interface FollowedPersonCardProps {
  readonly person: FollowedPerson;
  readonly watchedCount: number;
  readonly totalCount: number | null;
  readonly age: number | null;
  readonly layout?: "grid" | "list";
  readonly locale: Locale;
}

export function FollowedPersonCard({
  person,
  watchedCount,
  totalCount,
  age,
  layout = "grid",
  locale,
}: FollowedPersonCardProps) {
  const t = getDictionary(locale);
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

  if (layout === "list") {
    return (
      <a
        href={`/person/${person.tmdbId}`}
        className="focus-ring card-elevated flex items-center gap-3 rounded-lg border p-2"
      >
        <div className="relative shrink-0">
          <Avatar className="size-11">
            <AvatarImage
              src={
                person.profilePath
                  ? tmdbImageUrl(person.profilePath, 92)
                  : undefined
              }
              srcSet={
                person.profilePath
                  ? tmdbDensitySrcSet(person.profilePath, 92, 185)
                  : undefined
              }
              alt={person.name}
            />
            <AvatarFallback>{person.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          {age !== null && (
            <span
              className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-card bg-secondary text-[9px] font-semibold text-secondary-foreground"
              title={t.followedPerson.yearsOld(age)}
            >
              {age}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{person.name}</p>
          {totalCount === null ? (
            <Skeleton className="mt-1 h-2 w-full" />
          ) : (
            <div className="flex items-center gap-2">
              <Progress value={percent} className="h-2" />
              <span className="shrink-0 text-xs text-muted-foreground">
                {watchedCount}/{totalCount}
              </span>
            </div>
          )}
        </div>
        {isComplete && (
          <Badge
            variant="secondary"
            title={t.followedPerson.filmographyComplete}
            className="shrink-0"
          >
            <TrophyIcon data-icon="inline-start" />
          </Badge>
        )}
        {!isComplete && isAlmostThere && remaining !== null && (
          <Badge
            title={t.followedPerson.moviesToComplete(remaining)}
            className="shrink-0"
          >
            <FlameIcon data-icon="inline-start" />
            {remaining}
          </Badge>
        )}
      </a>
    );
  }

  return (
    <a href={`/person/${person.tmdbId}`} className="focus-ring block">
      <Card size="sm" className="transition-colors hover:bg-accent">
        <CardHeader className="flex-row flex-wrap items-center gap-2">
          <div className="relative shrink-0">
            <Avatar className="size-14">
              <AvatarImage
                src={
                  person.profilePath
                    ? tmdbImageUrl(person.profilePath, 92)
                    : undefined
                }
                srcSet={
                  person.profilePath
                    ? tmdbDensitySrcSet(person.profilePath, 92, 185)
                    : undefined
                }
                alt={person.name}
              />
              <AvatarFallback className="text-base!">
                {person.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            {age !== null && (
              <span
                className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-semibold text-secondary-foreground"
                title={t.followedPerson.yearsOld(age)}
              >
                {age}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{person.name}</CardTitle>
          </div>
          {isComplete && (
            <Badge
              variant="secondary"
              title={t.followedPerson.filmographyComplete}
            >
              <TrophyIcon data-icon="inline-start" />
              {t.followedPerson.complete}
            </Badge>
          )}
          {!isComplete && isAlmostThere && remaining !== null && (
            <Badge title={t.followedPerson.moviesToComplete(remaining)}>
              <FlameIcon data-icon="inline-start" />
              {t.followedPerson.toGo(remaining)}
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
                {t.followedPerson.remaining(
                  watchedCount,
                  totalCount,
                  totalCount - watchedCount,
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </a>
  );
}
