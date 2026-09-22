import { useEffect, useState } from "react";
import { StarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/auth/LoginButton";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  addPersonToRecommendations,
  isPersonRecommended,
  removePersonFromRecommendations,
} from "@/lib/firebase/firestore";
import { notifyFollowersOfPersonRecommendation } from "@/lib/firebase/notifications";
import { getDictionary } from "@/i18n";
import { useLocale } from "@/lib/hooks/useLocale";

interface PersonRecommendButtonProps {
  readonly personId: number;
  readonly name: string;
  readonly profilePath: string | null;
  readonly knownForDepartment: string | null;
}

// Same "tell other people to check this out" idea as MovieRecommendButton,
// for a person instead of a title — writes to the parallel
// recommendedPeople collection (see firestore.ts) and fans out a
// notification to followers, reusing the same mechanism.
export function PersonRecommendButton({
  personId,
  name,
  profilePath,
  knownForDepartment,
}: PersonRecommendButtonProps) {
  const t = getDictionary(useLocale());
  const { user, loading: authLoading } = useAuth();
  const [recommended, setRecommended] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showSignInHint, setShowSignInHint] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    void isPersonRecommended(user.uid, personId).then((value) => {
      setRecommended(value);
      setChecked(true);
    });
  }, [user, personId]);

  async function toggleRecommended() {
    if (!user) {
      setShowSignInHint(true);
      return;
    }
    const next = !recommended;
    setRecommended(next);
    announce(
      next ? t.recommendPerson.now(name) : t.recommendPerson.removed(name),
    );
    try {
      if (next) {
        await addPersonToRecommendations(user.uid, {
          tmdbId: personId,
          name,
          profilePath,
          knownForDepartment,
        });
        // Best-effort, never blocks the toggle on a slow/failed fan-out —
        // the recommendation is already saved either way.
        void notifyFollowersOfPersonRecommendation(user, {
          tmdbId: personId,
          name,
          profilePath,
        }).catch(() => {});
      } else {
        await removePersonFromRecommendations(user.uid, personId);
      }
    } catch {
      setRecommended(!next);
      toast.error(t.movie.couldntUpdate(name));
    }
  }

  if (authLoading || !checked) return null;

  return (
    <div className="space-y-1">
      <Button
        variant={recommended ? "secondary" : "outline"}
        onClick={() => void toggleRecommended()}
      >
        <StarIcon
          data-icon="inline-start"
          className={recommended ? "fill-current" : ""}
        />
        {recommended
          ? t.recommendPerson.recommended
          : t.recommendPerson.recommend}
      </Button>
      {showSignInHint && (
        <div className="flex items-center gap-2">
          <LoginButton size="sm" />
        </div>
      )}
    </div>
  );
}
