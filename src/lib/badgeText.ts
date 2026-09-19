import { getDictionary, type Locale } from "@/i18n";
import type { Badge } from "@/types/badges";

// Badge label/description are persisted in Firestore in English at award
// time. Rather than migrate stored docs, translate at render from the
// stable id/type (+ personName). English keeps the stored text untouched.
export function localizeBadge(badge: Badge, locale: Locale): Badge {
  if (locale === "en") return badge;
  const t = getDictionary(locale).badges;
  const n = Number(badge.id.split("-").pop());
  const name = badge.personName ?? "";
  switch (badge.type) {
    case "person-complete":
      return {
        ...badge,
        label: t.personComplete(name),
        description: t.personCompleteDesc(name),
      };
    case "filmography-milestone":
      return {
        ...badge,
        label: t.filmographyMilestone(n),
        description: t.filmographyMilestoneDesc(n),
      };
    case "watchlist-milestone":
      return {
        ...badge,
        label: t.watchlistMilestone(n),
        description: t.watchlistMilestoneDesc(n),
      };
    case "actor-milestone":
      return { ...badge, label: t.leadingRole, description: t.leadingRoleDesc };
    case "director-milestone":
      return {
        ...badge,
        label: t.directorsCut,
        description: t.directorsCutDesc,
      };
    case "decade-span":
      return {
        ...badge,
        label: t.fullRetrospective(name),
        description: t.fullRetrospectiveDesc(name),
      };
  }
}
