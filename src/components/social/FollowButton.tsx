import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCheckIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/auth/LoginButton";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  cancelFollowRequest,
  completeFollowMirror,
  sendFollowRequest,
  subscribeToFollowRequestStatus,
  subscribeToIsFollower,
  subscribeToIsFollowing,
  unfollow,
} from "@/lib/firebase/firestore";
import { getDictionary, type Locale } from "@/i18n";
import type { UserCardProfile } from "./UserCard";

interface FollowButtonProps {
  readonly locale: Locale;
  readonly target: UserCardProfile;
  /** Lets a parent (the profile page) gate private lists on the same
   *  subscription instead of opening a duplicate one. */
  readonly onFollowingChange?: (isFollowing: boolean) => void;
}

// One state machine for "my relationship to this user" — used by the profile
// header and every user list. Each instance opens three small snapshot
// listeners, fine for the ≤20-row lists that use it; a bigger list should
// batch these instead.
export function FollowButton({
  locale,
  target,
  onFollowingChange,
}: FollowButtonProps) {
  const t = getDictionary(locale);
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [isFollower, setIsFollower] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const isSelf = user?.uid === target.uid;

  useEffect(() => {
    if (!user || isSelf) return;
    const unsubs = [
      subscribeToFollowRequestStatus(target.uid, user.uid, setPending),
      subscribeToIsFollower(target.uid, user.uid, setIsFollower),
      subscribeToIsFollowing(user.uid, target.uid, setIsFollowing),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user, target.uid, isSelf]);

  useEffect(() => {
    onFollowingChange?.(isFollowing);
  }, [isFollowing, onFollowingChange]);

  // Once the target approved me but my own `following` mirror doc doesn't
  // exist yet, write it — see design.md for why this can't happen server-side.
  useEffect(() => {
    if (!user || isSelf || !isFollower || isFollowing) return;
    void completeFollowMirror(user.uid, {
      uid: target.uid,
      displayName: target.displayName,
      photoURL: target.photoURL,
    });
  }, [user, isSelf, isFollower, isFollowing, target]);

  async function run(action: () => Promise<void>, errorMessage: string) {
    try {
      await action();
    } catch {
      toast.error(errorMessage, {
        action: {
          label: t.profile.retry,
          onClick: () => void run(action, errorMessage),
        },
      });
    }
  }

  if (isSelf) return null;
  if (!user) return <LoginButton size="sm" />;

  if (isFollowing) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          void run(async () => {
            await unfollow(user.uid, target.uid);
            announce(
              t.profile.unfollowed(target.displayName ?? t.profile.thisUser),
            );
          }, t.profile.couldntUnfollow)
        }
      >
        <UserCheckIcon data-icon="inline-start" />
        {t.profile.following}
      </Button>
    );
  }

  if (pending) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          void run(
            () => cancelFollowRequest(target.uid, user.uid),
            t.profile.couldntFollow,
          )
        }
      >
        {t.profile.requested}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() =>
        void run(async () => {
          await sendFollowRequest(target.uid, user);
          announce(t.profile.followRequestSent);
        }, t.profile.couldntFollow)
      }
    >
      <UserPlusIcon data-icon="inline-start" />
      {t.profile.requestToFollow}
    </Button>
  );
}
