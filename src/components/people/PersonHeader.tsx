import { useState } from "react";
import {
  CalendarIcon,
  FilmIcon,
  MapPinIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./FollowButton";
import { PersonPhotoGallery } from "./PersonPhotoGallery";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
import { calculateAge } from "@/lib/age";
import { cn } from "@/lib/utils";
import type { PersonProfile } from "@/types/person";

interface PersonHeaderProps {
  readonly profile: PersonProfile;
  readonly department: string;
  readonly movieCount: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface InfoItemProps {
  readonly icon: typeof UserIcon;
  readonly label: string;
  readonly value: string;
  readonly className?: string;
}

// One icon+label+value block, reused for every fact in the row below the
// name — a plain muted-icon-circle + two-line text stack, same shape TMDB's
// own person pages and movie-map.com use for this kind of metadata.
function InfoItem({ icon: Icon, label, value, className }: InfoItemProps) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

export function PersonHeader({
  profile,
  department,
  movieCount,
}: PersonHeaderProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);

  const genderLabel =
    profile.gender === "female"
      ? "Female"
      : profile.gender === "male"
        ? "Male"
        : profile.gender === "non-binary"
          ? "Non-binary"
          : null;

  const birthdayLine = profile.birthday
    ? profile.deathday
      ? `${formatDate(profile.birthday)} — ${formatDate(profile.deathday)} (${calculateAge(profile.birthday, profile.deathday)} years old)`
      : `${formatDate(profile.birthday)} (${calculateAge(profile.birthday)} years old)`
    : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <button
        type="button"
        onClick={() => setGalleryOpen(true)}
        aria-label={`View photos of ${profile.name}`}
        className="focus-ring mx-auto shrink-0 rounded-2xl sm:mx-0"
      >
        <Avatar className="size-32 rounded-2xl after:rounded-2xl">
          <AvatarImage
            src={
              profile.profilePath
                ? tmdbImageUrl(profile.profilePath, 185)
                : undefined
            }
            srcSet={
              profile.profilePath
                ? tmdbDensitySrcSet(profile.profilePath, 185, 342)
                : undefined
            }
            alt={profile.name}
            className="object-cover"
          />
          <AvatarFallback className="rounded-2xl text-2xl">
            {profile.name.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
      </button>

      <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
        <div className="flex flex-wrap items-start justify-center gap-3 sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {profile.name}
            </h1>
            <p className="text-sm text-muted-foreground">{department}</p>
          </div>
          <FollowButton
            personId={profile.id}
            name={profile.name}
            profilePath={profile.profilePath}
            knownForDepartment={profile.knownForDepartment}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:justify-start">
          {genderLabel && (
            <InfoItem icon={UserIcon} label="Gender" value={genderLabel} />
          )}
          {birthdayLine && (
            <InfoItem
              icon={CalendarIcon}
              label={profile.deathday ? "Birthday — Deathday" : "Birthday"}
              value={birthdayLine}
            />
          )}
          {profile.placeOfBirth && (
            <InfoItem
              icon={MapPinIcon}
              label="Place of Birth"
              value={profile.placeOfBirth}
            />
          )}
          {profile.knownForDepartment && (
            <InfoItem
              icon={StarIcon}
              label="Known For"
              value={profile.knownForDepartment}
            />
          )}
          <InfoItem
            icon={FilmIcon}
            label="Known Credits"
            value={String(movieCount)}
          />
        </div>

        {profile.alsoKnownAs.length > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Also known as:</span>{" "}
            {profile.alsoKnownAs.join(", ")}
          </p>
        )}
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
