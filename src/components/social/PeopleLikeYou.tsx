import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfileLists } from "@/lib/hooks/useProfileLists";
import { subscribeToFollowingList } from "@/lib/firebase/firestore";
import {
  computeCompatibility,
  type CompatibilityInput,
} from "@/lib/compatibility";
import { getDictionary, type Locale } from "@/i18n";
import type { Following } from "@/types/user";

const RESULT_LIMIT = 5;
// Bounds how many friends get a live compatibility calculation (3 Firestore
// listeners each) mounted at once — plenty for a hobby-scale follow list;
// the visible result is capped at RESULT_LIMIT anyway.
const CANDIDATE_LIMIT = 30;

// Headless: computes one friend's score and reports it up via onScore, then
// renders nothing. A single component-per-friend is what lets each one
// call useProfileLists (a hook) for a dynamic, per-friend id — you can't
// call hooks in a loop directly, but you can mount N components that each
// call a hook once.
function FriendScoreProbe({
  myLists,
  friend,
  onScore,
}: {
  readonly myLists: CompatibilityInput;
  readonly friend: Following;
  readonly onScore: (targetId: string, score: number) => void;
}) {
  const theirLists = useProfileLists(friend.targetId);
  useEffect(() => {
    if (!theirLists) return;
    onScore(friend.targetId, computeCompatibility(myLists, theirLists).score);
  }, [theirLists, myLists, friend.targetId, onScore]);
  return null;
}

interface PeopleLikeYouProps {
  readonly locale: Locale;
  readonly myUid: string;
}

// Ranks the current user's mutual friends by taste-compatibility score
// (see compatibility.ts) — only meaningful on your own profile, since it's
// always "compatibility with me".
export function PeopleLikeYou({ locale, myUid }: PeopleLikeYouProps) {
  const t = getDictionary(locale);
  const myLists = useProfileLists(myUid);
  const [following, setFollowing] = useState<readonly Following[] | null>(null);
  const [scores, setScores] = useState<Readonly<Record<string, number>>>({});

  useEffect(() => subscribeToFollowingList(myUid, setFollowing), [myUid]);

  const onScore = useCallback((targetId: string, score: number) => {
    setScores((prev) => ({ ...prev, [targetId]: score }));
  }, []);

  if (!myLists || following === null) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (following.length === 0) return null;

  const candidates = following.slice(0, CANDIDATE_LIMIT);
  const ranked = candidates
    .filter((f) => scores[f.targetId] !== undefined)
    .sort((a, b) => scores[b.targetId] - scores[a.targetId])
    .slice(0, RESULT_LIMIT);

  return (
    <div className="space-y-2">
      {candidates.map((f) => (
        <FriendScoreProbe
          key={f.targetId}
          myLists={myLists}
          friend={f}
          onScore={onScore}
        />
      ))}

      <p className="text-sm font-medium">{t.peopleLikeYou.heading}</p>
      {ranked.length === 0 ? (
        <Skeleton className="h-14 w-full rounded-lg" />
      ) : (
        <div className="space-y-2">
          {ranked.map((f) => (
            <a
              key={f.targetId}
              href={`/u/${f.targetId}`}
              className="focus-ring flex items-center gap-2 rounded-lg border p-2"
            >
              <Avatar className="size-9">
                <AvatarImage src={f.targetPhotoURL ?? undefined} alt="" />
                <AvatarFallback>
                  {f.targetName?.slice(0, 1).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <p className="flex-1 truncate text-sm font-medium">
                {f.targetName ?? t.peopleLikeYou.pelicoolasUser}
              </p>
              <span className="text-sm font-semibold text-primary">
                {scores[f.targetId]}%
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
