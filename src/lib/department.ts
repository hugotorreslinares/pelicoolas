import type { Dictionary } from "@/i18n";

// TMDB's fixed job-department vocabulary — used both for a credit's crew
// department and for a person's own `known_for_department`. Anything not
// in this list (rare) falls back to the raw TMDB string rather than
// showing nothing.
const KEYS = {
  Acting: "acting",
  Directing: "directing",
  Writing: "writing",
  Production: "production",
  Sound: "sound",
  Camera: "camera",
  Art: "art",
  "Costume & Make-Up": "costumeMakeUp",
  Editing: "editing",
  "Visual Effects": "visualEffects",
  Crew: "crew",
  Lighting: "lighting",
} as const satisfies Record<string, keyof Dictionary["department"]>;

export function translateDepartment(
  department: string | null,
  t: Dictionary,
): string | null {
  if (department === null) return null;
  const key = (
    KEYS as Record<string, keyof Dictionary["department"] | undefined>
  )[department];
  return key ? t.department[key] : department;
}
