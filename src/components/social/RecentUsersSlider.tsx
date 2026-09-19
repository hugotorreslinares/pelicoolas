import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import { fetchRecentUsers } from "@/lib/firebase/firestore";
import { getDictionary, type Locale } from "@/i18n";
import type { PublicProfile } from "@/types/user";

const COUNT = 15;

interface RecentUsersSliderProps {
  readonly locale: Locale;
}

// Public by design (users/{userId} is public-read, same precedent as the
// recommendations board) — lets a signed-out visitor see who's on the app
// too, not just existing followers of someone they already know.
export function RecentUsersSlider({ locale }: RecentUsersSliderProps) {
  const t = getDictionary(locale);
  const { user } = useAuth();
  const [users, setUsers] = useState<readonly PublicProfile[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchRecentUsers(COUNT).then((result) => {
      if (!cancelled) setUsers(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (users === null) {
    return (
      <div className="space-y-2 text-left">
        <p className="text-sm font-medium text-muted-foreground">
          {t.heroes.newOnPelicoolas}
        </p>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-16 shrink-0 space-y-1.5">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const visible = users.filter((u) => u.uid !== user?.uid);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 text-left">
      <p className="text-sm font-medium text-muted-foreground">
        {t.heroes.newOnPelicoolas}
      </p>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {visible.map((profile) => (
          <a
            key={profile.uid}
            href={`/u/${profile.uid}`}
            className="focus-ring w-16 shrink-0 text-center"
          >
            <Avatar className="mx-auto size-14">
              <AvatarImage
                src={profile.photoURL ?? undefined}
                alt={profile.displayName ?? ""}
              />
              <AvatarFallback>
                {profile.displayName?.slice(0, 1).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <p className="mt-1 truncate text-xs font-medium">
              {profile.displayName ?? t.profile.pelicoolasUser}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
