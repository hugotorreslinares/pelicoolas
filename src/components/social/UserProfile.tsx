import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { FollowButton } from "./FollowButton";
import { FollowRequestsInbox } from "./FollowRequestsInbox";
import { CompatibilitySection } from "./CompatibilitySection";
import { CinematicIdentity } from "./CinematicIdentity";
import { ProfileInsights } from "./ProfileInsights";
import { PeopleLikeYou } from "./PeopleLikeYou";
import { UserMovieSection } from "./UserMovieSection";
import { BookmarkIcon, CheckCircleIcon, LockIcon } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  subscribeToIsFollowing,
  subscribeToPublicProfile,
  subscribeToRecommendations,
  subscribeToSeenMoviesFull,
  subscribeToWatchlist,
} from "@/lib/firebase/firestore";
import { getDictionary, type Locale } from "@/i18n";
import type { PublicProfile } from "@/types/user";

interface UserProfileProps {
  readonly locale: Locale;
  readonly userId: string;
}

type LoadState = "loading" | "error" | "not-found" | "ready";

export function UserProfile({ locale, userId }: UserProfileProps) {
  const t = getDictionary(locale);
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<PublicProfile | null>(null);
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
      announce(t.profile.linkCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the URL is already in the address bar.
    }
  }

  useEffect(() => {
    setState("loading");
    return subscribeToPublicProfile(
      userId,
      (result) => {
        setProfile(result);
        setState(result ? "ready" : "not-found");
      },
      () => setState("error"),
    );
  }, [userId]);

  // Owner sees their own lists regardless — not() needs its own listener
  // when not owner, but FollowButton already opens one; this mirrors it
  // to gate the private sections without a second follow-status query.
  useEffect(() => {
    if (!user || isOwner) {
      setIsFollowing(false);
      return;
    }
    return subscribeToIsFollowing(user.uid, userId, setIsFollowing);
  }, [user, userId, isOwner]);

  if (authLoading || state === "loading") {
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

  if (state === "error") {
    return (
      <div className="space-y-3 text-center">
        <p className="text-muted-foreground">{t.profile.couldntLoad}</p>
        <Button size="sm" variant="outline" onClick={() => setState("loading")}>
          {t.profile.retry}
        </Button>
      </div>
    );
  }

  if (state === "not-found" || !profile) {
    return (
      <p className="text-center text-muted-foreground">
        {t.profile.doesntExist}
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
            {profile.displayName ?? t.profile.pelicoolasUser}
          </h1>
        </div>

        {isOwner ? (
          <Button size="sm" variant="outline" onClick={() => void copyLink()}>
            {copied ? t.profile.copied : t.profile.copyLinkToShare}
          </Button>
        ) : (
          <FollowButton
            locale={locale}
            target={{
              uid: userId,
              displayName: profile.displayName,
              photoURL: profile.photoURL,
              username: profile.username,
            }}
            onFollowingChange={setIsFollowing}
          />
        )}
      </div>

      {isOwner && <FollowRequestsInbox userId={userId} locale={locale} />}

      {canSeePrivateLists && (
        <ProfileInsights
          locale={locale}
          userId={userId}
          displayName={profile.displayName}
          isOwner={isOwner}
          onOpenMovie={setOpenMovie}
        />
      )}

      {isOwner && (
        <>
          <CinematicIdentity
            locale={locale}
            userId={userId}
            displayName={profile.displayName}
            onOpenMovie={setOpenMovie}
          />
          <PeopleLikeYou locale={locale} myUid={userId} />
        </>
      )}

      <UserMovieSection
        title={t.profile.favorites}
        emptyLabel={t.profile.emptyFavorites}
        noPosterLabel={t.common.noImage}
        userId={userId}
        subscribeFn={subscribeToRecommendations}
        onOpen={setOpenMovie}
        defaultOpen
      />

      {canSeePrivateLists ? (
        <>
          {!isOwner && user && (
            <CompatibilitySection
              locale={locale}
              myUid={user.uid}
              theirUid={userId}
              theirDisplayName={profile.displayName}
              onOpenMovie={setOpenMovie}
            />
          )}
          <div>
            <p className="mb-1 text-sm font-semibold">
              {t.profile.theirLists(
                profile.displayName ?? t.profile.theirDefault,
              )}
            </p>
            <div className="rounded-lg border px-3">
              <UserMovieSection
                title={t.profile.watched}
                emptyLabel={t.profile.emptyWatched}
                noPosterLabel={t.common.noImage}
                icon={CheckCircleIcon}
                userId={userId}
                subscribeFn={subscribeToSeenMoviesFull}
                onOpen={setOpenMovie}
              />
              <UserMovieSection
                title={t.profile.watchlist}
                emptyLabel={t.profile.emptyWatchlist}
                noPosterLabel={t.common.noImage}
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
            {t.profile.privateListsLocked(
              profile.displayName ?? t.profile.thisUser,
            )}
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
