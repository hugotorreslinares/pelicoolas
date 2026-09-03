import { useEffect, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { useAuth } from "@/lib/hooks/useAuth";
import { subscribeToFollowedPeople } from "@/lib/firebase/firestore";
import { tmdbDensitySrcSet, tmdbImageUrl } from "@/lib/tmdb/image";
import type { FollowedPerson } from "@/types/filmography";

const MAX_SHOWN = 5;

export function FollowedDock() {
  const { user } = useAuth();
  const [people, setPeople] = useState<readonly FollowedPerson[] | null>(null);

  useEffect(() => {
    if (!user) {
      setPeople(null);
      return;
    }
    return subscribeToFollowedPeople(user.uid, setPeople);
  }, [user]);

  if (!people || people.length === 0) return null;

  const sorted = [...people].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const shown = sorted.slice(0, MAX_SHOWN);
  const overflow = sorted.length - shown.length;

  return (
    <AvatarGroup>
      {shown.map((person) => (
        <a
          key={person.tmdbId}
          href={`/person/${person.tmdbId}`}
          title={person.name}
          aria-label={`Go to ${person.name}'s filmography`}
          className="focus-ring rounded-full transition-transform hover:z-10 hover:scale-110"
        >
          <Avatar size="sm">
            <AvatarImage
              src={
                person.profilePath
                  ? tmdbImageUrl(person.profilePath, 45)
                  : undefined
              }
              srcSet={
                person.profilePath
                  ? tmdbDensitySrcSet(person.profilePath, 45, 92)
                  : undefined
              }
              alt=""
            />
            <AvatarFallback>{person.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </a>
      ))}
      {overflow > 0 && (
        <a
          href="/filmographies"
          title={`${overflow} more`}
          aria-label={`${overflow} more followed people — see My Filmographies`}
          className="focus-ring rounded-full"
        >
          <AvatarGroupCount>+{overflow}</AvatarGroupCount>
        </a>
      )}
    </AvatarGroup>
  );
}
