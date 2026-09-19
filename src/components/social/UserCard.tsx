import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary, type Locale } from "@/i18n";

/** The minimum any user list needs — PublicProfile, Follower and Following
 *  all map onto this, so callers adapt to it instead of it to them. */
export interface UserCardProfile {
  readonly uid: string;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly username?: string | null;
}

interface UserCardProps {
  readonly locale: Locale;
  readonly profile: UserCardProfile;
  /** Trailing slot — typically a <FollowButton />. */
  readonly action?: ReactNode;
}

export function UserCard({ locale, profile, action }: UserCardProps) {
  const t = getDictionary(locale);
  const name = profile.displayName ?? t.profile.pelicoolasUser;
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5">
      <a
        href={`/u/${profile.uid}`}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-md"
      >
        <Avatar className="size-10">
          <AvatarImage src={profile.photoURL ?? undefined} alt="" />
          <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          {profile.username && (
            <p className="truncate text-xs text-muted-foreground">
              @{profile.username}
            </p>
          )}
        </div>
      </a>
      {action}
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}
