import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import { getDictionary } from "@/i18n";
import { useLocale } from "@/lib/hooks/useLocale";
import { LoginButton } from "@/components/auth/LoginButton";
import {
  followPerson,
  isFollowingPerson,
  unfollowPerson,
} from "@/lib/firebase/firestore";

interface FollowButtonProps {
  readonly personId: number;
  readonly name: string;
  readonly profilePath: string | null;
  readonly knownForDepartment: string | null;
}

export function FollowButton({
  personId,
  name,
  profilePath,
  knownForDepartment,
}: FollowButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const t = getDictionary(useLocale());
  const [following, setFollowing] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showSignInHint, setShowSignInHint] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    void isFollowingPerson(user.uid, personId).then((value) => {
      setFollowing(value);
      setChecked(true);
    });
  }, [user, personId]);

  async function toggleFollow() {
    if (!user) {
      setShowSignInHint(true);
      return;
    }
    const next = !following;
    setFollowing(next);
    announce(next ? t.followPerson.now(name) : t.followPerson.unfollowed(name));
    try {
      if (next) {
        await followPerson(user.uid, {
          tmdbId: personId,
          name,
          profilePath,
          knownForDepartment,
        });
      } else {
        await unfollowPerson(user.uid, personId);
      }
    } catch {
      setFollowing(!next);
      toast.error(t.movie.couldntUpdate(name));
    }
  }

  if (authLoading || !checked) return null;

  return (
    <div className="space-y-1">
      <Button
        variant={following ? "secondary" : "default"}
        onClick={() => void toggleFollow()}
      >
        {following ? t.followPerson.following : t.followPerson.follow}
      </Button>
      {showSignInHint && (
        <div className="flex items-center gap-2">
          <LoginButton size="sm" />
          <span className="text-xs text-muted-foreground">
            to follow filmographies
          </span>
        </div>
      )}
    </div>
  );
}
