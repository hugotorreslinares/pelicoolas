import { Share2Icon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BadgeShareDialog } from "@/components/badges/BadgeShareDialog";
import { useBadgeShare } from "@/lib/hooks/useBadgeShare";
import { getDictionary, type Locale } from "@/i18n";
import type { Badge } from "@/types/badges";

interface ShareBadgeButtonProps {
  readonly badge: Badge;
  readonly locale: Locale;
}

export function ShareBadgeButton({ badge, locale }: ShareBadgeButtonProps) {
  const t = getDictionary(locale);
  const { preview, loading, sharing, open, close, share, download } =
    useBadgeShare(locale);

  return (
    <>
      {preview && (
        <BadgeShareDialog
          badge={preview.badge}
          preview={preview}
          sharing={sharing}
          locale={locale}
          onOpenChange={(open) => !open && close()}
          onShare={() => void share()}
          onDownload={download}
        />
      )}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t.badge.shareBadge(badge.label)}
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                void open(badge);
              }}
            />
          }
        >
          {loading ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
        </TooltipTrigger>
        <TooltipContent>{t.badge.shareBadgeTooltip}</TooltipContent>
      </Tooltip>
    </>
  );
}
