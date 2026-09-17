import { useEffect, useState } from "react";
import { Share2Icon, Loader2Icon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { announce } from "@/lib/a11y";
import {
  canShareBadgeImage,
  downloadBadgeImage,
  renderBadgeImage,
  shareBadgeImage,
} from "@/lib/shareBadgeImage";
import { getDictionary, type Locale } from "@/i18n";
import type { Badge } from "@/types/badges";

interface ShareBadgeButtonProps {
  readonly badge: Badge;
  readonly locale: Locale;
}

export function ShareBadgeButton({ badge, locale }: ShareBadgeButtonProps) {
  const t = getDictionary(locale);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    readonly blob: Blob;
    readonly url: string;
  } | null>(null);
  const [sharing, setSharing] = useState(false);

  // Object URLs are per-render — revoke the previous one whenever a new
  // preview replaces it or the component unmounts, or it leaks.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function handleOpenPreview() {
    setLoading(true);
    try {
      const blob = await renderBadgeImage(badge);
      setPreview({ blob, url: URL.createObjectURL(blob) });
    } catch {
      announce(t.badge.couldntRender);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!preview) return;
    setSharing(true);
    try {
      await shareBadgeImage(preview.blob, badge);
      announce(t.badge.shared(badge.label));
      setPreview(null);
    } catch (e) {
      // AbortError is the user dismissing the native share sheet — not a
      // failure worth surfacing.
      if (e instanceof Error && e.name !== "AbortError") {
        announce(t.badge.couldntShare);
      }
    } finally {
      setSharing(false);
    }
  }

  function handleDownload() {
    if (!preview) return;
    downloadBadgeImage(preview.blob, badge);
    announce(t.badge.downloaded(badge.label));
    setPreview(null);
  }

  return (
    <>
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{badge.label}</DialogTitle>
          </DialogHeader>
          {preview && (
            <img
              src={preview.url}
              alt={t.badge.badgeAlt(badge.label)}
              className="aspect-square w-full rounded-lg"
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={sharing}
            >
              <DownloadIcon /> {t.badge.download}
            </Button>
            {preview && canShareBadgeImage(preview.blob, badge) && (
              <Button disabled={sharing} onClick={() => void handleShare()}>
                {sharing ? t.badge.sharing : t.badge.share}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                void handleOpenPreview();
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
