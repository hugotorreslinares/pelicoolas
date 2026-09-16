import { useEffect, useRef, useState } from "react";
import { EyeIcon, BookmarkIcon, StarIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FriendSearch } from "./FriendSearch";
import { FollowRequestsInbox } from "@/components/social/FollowRequestsInbox";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  fetchLatestActivity,
  subscribeToFollowingList,
} from "@/lib/firebase/firestore";
import { mapWithConcurrency } from "@/lib/concurrency";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { relativeTime } from "@/lib/relativeTime";
import type { Following } from "@/types/user";
import type { FriendActivity } from "@/types/friends";

function ActivityRow({
  icon: Icon,
  label,
  movie,
}: {
  readonly icon: typeof EyeIcon;
  readonly label: string;
  readonly movie: { title: string; posterPath: string | null } & (
    { watchedAt: string } | { addedAt: string }
  );
}) {
  const at = "watchedAt" in movie ? movie.watchedAt : movie.addedAt;
  return (
    <div className="flex items-center gap-2">
      {movie.posterPath ? (
        <img
          src={tmdbImageUrl(movie.posterPath, 92)}
          alt=""
          className="h-12 w-8 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-muted">
          <Icon className="size-3 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Icon className="size-3" />
          {label} · {relativeTime(at)}
        </p>
        <p className="truncate text-sm font-medium">{movie.title}</p>
      </div>
    </div>
  );
}

function FriendCard({
  friend,
  activity,
}: {
  readonly friend: Following;
  readonly activity: FriendActivity | undefined;
}) {
  const hasAnyActivity =
    activity &&
    (activity.lastWatched ||
      activity.lastWatchlisted ||
      activity.lastRecommended);

  return (
    <a
      href={`/u/${friend.targetId}`}
      className="focus-ring card-elevated block space-y-3 rounded-lg border p-3"
    >
      <div className="flex items-center gap-2">
        <Avatar className="size-9">
          <AvatarImage
            src={friend.targetPhotoURL ?? undefined}
            alt={friend.targetName ?? ""}
          />
          <AvatarFallback>
            {friend.targetName?.slice(0, 1).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <p className="truncate font-medium">
          {friend.targetName ?? "Pelicoolas user"}
        </p>
      </div>

      {activity === undefined && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {activity && !hasAnyActivity && (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      )}

      {activity && (
        <div className="space-y-2">
          {activity.lastWatched && (
            <ActivityRow
              icon={EyeIcon}
              label="Watched"
              movie={activity.lastWatched}
            />
          )}
          {activity.lastWatchlisted && (
            <ActivityRow
              icon={BookmarkIcon}
              label="Added to watchlist"
              movie={activity.lastWatchlisted}
            />
          )}
          {activity.lastRecommended && (
            <ActivityRow
              icon={StarIcon}
              label="Recommended"
              movie={activity.lastRecommended}
            />
          )}
        </div>
      )}
    </a>
  );
}

export function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const [following, setFollowing] = useState<readonly Following[] | null>(null);
  const [activityByUid, setActivityByUid] = useState<
    Record<string, FriendActivity>
  >({});

  useEffect(() => {
    if (!user) {
      setFollowing(null);
      return;
    }
    return subscribeToFollowingList(user.uid, setFollowing);
  }, [user]);

  const fetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!following) return;
    const toFetch = following.filter(
      (f) => !fetchedRef.current.has(f.targetId),
    );
    for (const f of toFetch) fetchedRef.current.add(f.targetId);

    void mapWithConcurrency(toFetch, 6, async (f) => {
      const activity = await fetchLatestActivity(f.targetId);
      setActivityByUid((prev) => ({ ...prev, [f.targetId]: activity }));
    });
  }, [following]);

  if (authLoading) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="sr-only">Friends</h1>
        <Skeleton className="mx-auto h-7 w-32" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Friends</h1>
        <p className="text-muted-foreground">
          Sign in to see what the people you follow are watching.
        </p>
      </div>
    );
  }

  if (following === null) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <h1 className="sr-only">Friends</h1>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Friends</h1>
        <FriendSearch />
        <FollowRequestsInbox userId={user.uid} />
        <div className="space-y-3 text-center">
          <p className="text-muted-foreground">
            You're not following anyone yet. Search for a friend's username
            above, or ask them for their profile link.
          </p>
          <Button render={<a href={`/u/${user.uid}`} />}>My profile</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Friends</h1>
      <FriendSearch />
      <FollowRequestsInbox userId={user.uid} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {following.map((friend) => (
          <FriendCard
            key={friend.targetId}
            friend={friend}
            activity={activityByUid[friend.targetId]}
          />
        ))}
      </div>
    </div>
  );
}
