import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { canShareBadgeImage } from "@/lib/hooks/useBadgeShare";
import { getDictionary, type Locale } from "@/i18n";
import type { Badge } from "@/types/badges";

interface BadgeShareDialogProps {
  readonly badge: Badge;
  readonly preview: { readonly blob: Blob; readonly url: string } | null;
  readonly sharing: boolean;
  readonly locale: Locale;
  /** Shows a congratulatory line — set when the dialog opened itself right after the badge was earned, rather than from a manual share click. */
  readonly justEarned?: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onShare: () => void;
  readonly onDownload: () => void;
}

export function BadgeShareDialog({
  badge,
  preview,
  sharing,
  locale,
  justEarned = false,
  onOpenChange,
  onShare,
  onDownload,
}: BadgeShareDialogProps) {
  const t = getDictionary(locale);
  return (
    <Dialog open={preview !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{badge.label}</DialogTitle>
          {justEarned && (
            <DialogDescription>{t.badge.justEarned}</DialogDescription>
          )}
        </DialogHeader>
        {preview && (
          <img
            src={preview.url}
            alt={t.badge.badgeAlt(badge.label)}
            className="aspect-square w-full rounded-lg"
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onDownload} disabled={sharing}>
            <DownloadIcon /> {t.badge.download}
          </Button>
          {preview && canShareBadgeImage(preview.blob, badge) && (
            <Button disabled={sharing} onClick={onShare}>
              {sharing ? t.badge.sharing : t.badge.share}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
