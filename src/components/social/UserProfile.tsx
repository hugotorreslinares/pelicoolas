import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginButton } from "@/components/auth/LoginButton";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { FollowRequestsInbox } from "./FollowRequestsInbox";
import { CompatibilitySection } from "./CompatibilitySection";
import { CinematicIdentity } from "./CinematicIdentity";
import { PeopleLikeYou } from "./PeopleLikeYou";
import {
  BookmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  LockIcon,
  UserCheckIcon,
  UserPlusIcon,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  cancelFollowRequest,
  completeFollowMirror,
  sendFollowRequest,
  subscribeToFollowRequestStatus,
  subscribeToIsFollower,
  subscribeToIsFollowing,
  subscribeToPublicProfile,
  subscribeToRecommendations,
  subscribeToSeenMoviesFull,
  subscribeToWatchlist,
  unfollow,
} from "@/lib/firebase/firestore";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { PublicProfile } from "@/types/user";

interface UserProfileProps {
  readonly userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(
    undefined,
  );
  const [pendingRequest, setPendingRequest] = useState(false);
  const [isFollower, setIsFollower] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [openMovie, setOpenMovie] = useState<{
    readonly tmdbId: number;
    readonly mediaType?: "movie" | "tv";
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner = user?.uid === userId;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      announce("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the URL is already in the address bar.
    }
  }

  useEffect(() => subscribeToPublicProfile(userId, setProfile), [userId]);

  useEffect(() => {
    if (!user || isOwner) {
      setPendingRequest(false);
      return;
    }
    return subscribeToFollowRequestStatus(userId, user.uid, setPendingRequest);
  }, [user, userId, isOwner]);

  useEffect(() => {
    if (!user || isOwner) {
      setIsFollower(false);
      return;
    }
    return subscribeToIsFollower(userId, user.uid, setIsFollower);
  }, [user, userId, isOwner]);

  useEffect(() => {
    if (!user || isOwner) {
      setIsFollowing(false);
      return;
    }
    return subscribeToIsFollowing(user.uid, userId, setIsFollowing);
  }, [user, userId, isOwner]);

  // Once the target has approved me (isFollower) but my own `following`
  // mirror doc doesn't exist yet, write it — this is what actually lets my
  // own client (and anything reading my `following` list) know the follow
  // completed. See design.md for why this can't just happen server-side.
  useEffect(() => {
    if (!user || isOwner || !isFollower || isFollowing || !profile) return;
    void completeFollowMirror(user.uid, {
      uid: userId,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
    });
  }, [user, isOwner, isFollower, isFollowing, profile, userId]);

  async function handleFollow() {
    if (!user) return;
    await sendFollowRequest(userId, user);
    announce("Follow request sent");
  }

  async function handleCancel() {
    if (!user) return;
    await cancelFollowRequest(userId, user.uid);
  }

  async function handleUnfollow() {
    if (!user) return;
    await unfollow(user.uid, userId);
    announce(`Unfollowed ${profile?.displayName ?? "this user"}`);
  }

  if (authLoading || profile === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <p className="text-center text-muted-foreground">
        This user doesn't exist or hasn't signed in yet.
      </p>
    );
  }

  const canSeePrivateLists = isOwner || isFollowing;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar className="size-16">
          <AvatarImage
            src={profile.photoURL ?? undefined}
            alt={profile.displayName ?? ""}
          />
          <AvatarFallback className="text-xl">
            {profile.displayName?.slice(0, 1).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">
            {profile.displayName ?? "Pelicoolas user"}
          </h1>
        </div>

        {isOwner && (
          <Button size="sm" variant="outline" onClick={() => void copyLink()}>
            {copied ? "Copied!" : "Copy link to share"}
          </Button>
        )}
        {!isOwner && !user && <LoginButton size="sm" />}
        {!isOwner && user && isFollowing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleUnfollow()}
          >
            <UserCheckIcon data-icon="inline-start" />
            Following
          </Button>
        )}
        {!isOwner && user && !isFollowing && pendingRequest && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleCancel()}
          >
            Requested
          </Button>
        )}
        {!isOwner && user && !isFollowing && !pendingRequest && (
          <Button size="sm" onClick={() => void handleFollow()}>
            <UserPlusIcon data-icon="inline-start" />
            Request to follow
          </Button>
        )}
      </div>

      {isOwner && <FollowRequestsInbox userId={userId} />}

      {isOwner && (
        <>
          <CinematicIdentity
            userId={userId}
            displayName={profile.displayName}
            onOpenMovie={setOpenMovie}
          />
          <PeopleLikeYou myUid={userId} />
        </>
      )}

      <ProfileSection
        title="Favorites"
        userId={userId}
        subscribeFn={subscribeToRecommendations}
        onOpen={setOpenMovie}
        defaultOpen
      />

      {canSeePrivateLists ? (
        <>
          {!isOwner && user && (
            <CompatibilitySection
              myUid={user.uid}
              theirUid={userId}
              theirDisplayName={profile.displayName}
              onOpenMovie={setOpenMovie}
            />
          )}
          <div>
            <p className="mb-1 text-sm font-semibold">
              {profile.displayName ?? "Their"}'s Lists
            </p>
            <div className="rounded-lg border px-3">
              <ProfileSection
                title="Watched"
                icon={CheckCircleIcon}
                userId={userId}
                subscribeFn={subscribeToSeenMoviesFull}
                onOpen={setOpenMovie}
              />
              <ProfileSection
                title="Watchlist"
                icon={BookmarkIcon}
                userId={userId}
                subscribeFn={subscribeToWatchlist}
                onOpen={setOpenMovie}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          <LockIcon className="size-4 shrink-0" />
          <span>
            {profile.displayName ?? "This user"}'s watched movies and watchlist
            are only visible to approved followers.
          </span>
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

interface ProfileMovie {
  readonly tmdbId: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly mediaType?: "movie" | "tv";
}

interface ProfileSectionProps<M extends ProfileMovie> {
  readonly title: string;
  readonly userId: string;
  readonly subscribeFn: (
    userId: string,
    callback: (movies: readonly M[]) => void,
  ) => () => void;
  readonly onOpen: (movie: ProfileMovie) => void;
  /** Closed sections don't subscribe at all until opened — keeps the
   *  page's initial load cheap when a list is big and not the main draw
   *  (e.g. Watched). Favorites stays open — it's usually short and is the
   *  whole point of a shared profile. */
  readonly defaultOpen?: boolean;
  /** Row style (icon left, chevron-right, bordered divider) for grouping
   *  under a card heading (e.g. "X's Lists") instead of the plain
   *  chevron-down label used standalone (e.g. Favorites). */
  readonly icon?: typeof BookmarkIcon;
}

function ProfileSection<M extends ProfileMovie>({
  title,
  userId,
  subscribeFn,
  onOpen,
  defaultOpen = false,
  icon: Icon,
}: ProfileSectionProps<M>) {
  const [open, setOpen] = useState(defaultOpen);
  const [movies, setMovies] = useState<readonly M[] | null>(null);

  useEffect(() => {
    if (!open) return;
    return subscribeFn(userId, setMovies);
  }, [subscribeFn, userId, open]);

  return (
    <div className={Icon ? "border-b last:border-b-0" : "space-y-2"}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          Icon
            ? "focus-ring flex w-full items-center gap-3 py-3 text-left"
            : "focus-ring flex w-full items-center gap-1.5 text-left text-sm font-semibold text-muted-foreground"
        }
        aria-expanded={open}
      >
        {Icon ? (
          <>
            <Icon className="size-5 shrink-0 text-primary" />
            <span className="flex-1 text-sm text-muted-foreground">
              {title}
              {movies !== null && ` (${movies.length})`}
            </span>
            <ChevronRightIcon
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
          </>
        ) : (
          <>
            <ChevronDownIcon
              className={`size-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
            />
            {title}
            {movies !== null && ` (${movies.length})`}
          </>
        )}
      </button>

      {open && movies === null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
          ))}
        </div>
      )}

      {open && movies !== null && movies.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      )}

      {open && movies !== null && movies.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {movies.map((movie) => (
            <button
              key={movie.tmdbId}
              type="button"
              onClick={() => onOpen(movie)}
              className="focus-ring card-elevated text-left"
              aria-label={`View details for ${movie.title}`}
            >
              {movie.posterPath ? (
                <img
                  src={tmdbImageUrl(movie.posterPath, 185)}
                  alt=""
                  loading="lazy"
                  className="aspect-[2/3] w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                  No poster
                </div>
              )}
              <p className="mt-1 truncate text-xs font-medium">{movie.title}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
