import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
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
    if (following) {
      await unfollowPerson(user.uid, personId);
      setFollowing(false);
      announce(`Unfollowed ${name}`);
    } else {
      await followPerson(user.uid, {
        tmdbId: personId,
        name,
        profilePath,
        knownForDepartment,
      });
      setFollowing(true);
      announce(`Now following ${name}`);
    }
  }

  if (authLoading || !checked) return null;

  return (
    <div className="space-y-1">
      <Button
        variant={following ? "secondary" : "default"}
        onClick={() => void toggleFollow()}
      >
        {following ? "✓ Following" : "+ Follow"}
      </Button>
      {showSignInHint && (
        <p className="text-sm text-muted-foreground">
          Sign in to follow filmographies.
        </p>
      )}
    </div>
  );
}
