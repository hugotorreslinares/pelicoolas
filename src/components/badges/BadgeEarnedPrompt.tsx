import { useEffect } from "react";
import { BadgeShareDialog } from "@/components/badges/BadgeShareDialog";
import { useBadgeShare } from "@/lib/hooks/useBadgeShare";
import { BADGE_EARNED_EVENT } from "@/lib/firebase/badges";
import type { Locale } from "@/i18n";
import type { Badge } from "@/types/badges";

interface BadgeEarnedPromptProps {
  readonly locale: Locale;
}

// Mounted once, globally (see Layout.astro) — listens for the event
// `awardBadgeOnce` fires the moment it writes a badge for the first time,
// wherever in the app that happens, and pops the share card right then.
// Sharing in the moment of earning something converts far better than
// making someone find a share icon on a dashboard later.
export function BadgeEarnedPrompt({ locale }: BadgeEarnedPromptProps) {
  const { preview, sharing, open, close, share, download } =
    useBadgeShare(locale);

  useEffect(() => {
    function onEarned(e: Event) {
      void open((e as CustomEvent<Badge>).detail);
    }
    window.addEventListener(BADGE_EARNED_EVENT, onEarned);
    return () => window.removeEventListener(BADGE_EARNED_EVENT, onEarned);
  }, []);

  if (!preview) return null;

  return (
    <BadgeShareDialog
      badge={preview.badge}
      preview={preview}
      sharing={sharing}
      locale={locale}
      justEarned
      onOpenChange={(open) => !open && close()}
      onShare={() => void share()}
      onDownload={download}
    />
  );
}
