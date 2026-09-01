import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import { subscribeToWatchedMovies } from "@/lib/firebase/firestore";
import type { FollowedPerson } from "@/types/filmography";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";

interface FollowedPersonCardProps {
  readonly person: FollowedPerson;
}

export function FollowedPersonCard({ person }: FollowedPersonCardProps) {
  const { user } = useAuth();
  const [watchedCount, setWatchedCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToWatchedMovies(user.uid, person.tmdbId, (watched) =>
      setWatchedCount(watched.size),
    );
  }, [user, person.tmdbId]);

  useEffect(() => {
    fetch(`/api/person/${person.tmdbId}`)
      .then((r) => r.json())
      .then((data: { movies: readonly unknown[] }) => setTotalCount(data.movies.length))
      .catch(() => setTotalCount(0));
  }, [person.tmdbId]);

  const percent = totalCount ? Math.round((watchedCount / totalCount) * 100) : 0;

  return (
    <a href={`/person/${person.tmdbId}`}>
      <Card className="transition-colors hover:bg-accent">
        <CardHeader className="flex-row items-center gap-2">
          <Avatar>
            <AvatarImage
              src={person.profilePath ? `${TMDB_IMAGE_BASE}${person.profilePath}` : undefined}
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
                {watchedCount} / {totalCount} · {totalCount - watchedCount} remaining
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </a>
  );
}
