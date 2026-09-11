import { useState } from "react";
import { Share2Icon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { announce } from "@/lib/a11y";
import { shareOrDownloadBadgeImage } from "@/lib/shareBadgeImage";
import type { Badge } from "@/types/badges";

interface ShareBadgeButtonProps {
  readonly badge: Badge;
}

export function ShareBadgeButton({ badge }: ShareBadgeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      await shareOrDownloadBadgeImage(badge);
      announce(`Shared "${badge.label}" badge`);
    } catch (e) {
      // AbortError is the user dismissing the native share sheet — not a
      // failure worth surfacing.
      if (e instanceof Error && e.name !== "AbortError") {
        announce("Couldn't share this badge. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={`Share "${badge.label}" badge`}
      disabled={loading}
      onClick={(e) => {
        e.stopPropagation();
        void handleShare();
      }}
    >
      {loading ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
    </Button>
  );
}
