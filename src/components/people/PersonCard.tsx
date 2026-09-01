import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PersonSearchResult } from "@/types/person";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";

interface PersonCardProps {
  readonly person: PersonSearchResult;
  readonly onClick?: () => void;
  readonly variant?: "row" | "grid";
}

export function PersonCard({ person, onClick, variant = "row" }: PersonCardProps) {
  const avatar = (
    <Avatar className={variant === "grid" ? "h-16 w-16" : undefined}>
      <AvatarImage
        src={person.profilePath ? `${TMDB_IMAGE_BASE}${person.profilePath}` : undefined}
        alt={person.name}
        loading="lazy"
      />
      <AvatarFallback>{person.name.slice(0, 1)}</AvatarFallback>
    </Avatar>
  );

  if (variant === "grid") {
    return (
      <button
        onClick={onClick}
        className="flex w-full flex-col items-center gap-2 rounded-lg border p-3 text-center hover:bg-accent"
      >
        {avatar}
        <div>
          <p className="font-medium">{person.name}</p>
          {person.knownForDepartment && (
            <p className="text-sm text-muted-foreground">{person.knownForDepartment}</p>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent"
    >
      {avatar}
      <div>
        <p className="font-medium">{person.name}</p>
        {person.knownForDepartment && (
          <p className="text-sm text-muted-foreground">{person.knownForDepartment}</p>
        )}
      </div>
    </button>
  );
}
