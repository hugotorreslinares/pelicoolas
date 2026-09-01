import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./FollowButton";
import { PersonPhotoGallery } from "./PersonPhotoGallery";
import type { PersonProfile } from "@/types/person";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300";

interface PersonHeaderProps {
  readonly profile: PersonProfile;
  readonly department: string;
  readonly movieCount: number;
}

export function PersonHeader({
  profile,
  department,
  movieCount,
}: PersonHeaderProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
      <button
        type="button"
        onClick={() => setGalleryOpen(true)}
        aria-label={`View photos of ${profile.name}`}
        className="rounded-full"
      >
        <Avatar className="h-24 w-24">
          <AvatarImage
            src={
              profile.profilePath
                ? `${TMDB_IMAGE_BASE}${profile.profilePath}`
                : undefined
            }
            alt={profile.name}
          />
          <AvatarFallback>{profile.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
      </button>

      <div className="space-y-2">
        <div>
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">{department}</p>
          <p className="text-sm text-muted-foreground">{movieCount} movies</p>
        </div>
        <FollowButton
          personId={profile.id}
          name={profile.name}
          profilePath={profile.profilePath}
          knownForDepartment={profile.knownForDepartment}
        />
      </div>

      <PersonPhotoGallery
        personId={profile.id}
        personName={profile.name}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
    </div>
  );
}
