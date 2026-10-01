import { useEffect, useState } from "react";
import { announce } from "@/lib/a11y";
import {
  canShareBadgeImage,
  downloadBadgeImage,
  renderBadgeImage,
  shareBadgeImage,
} from "@/lib/shareBadgeImage";
import { getDictionary, type Locale } from "@/i18n";
import type { Badge } from "@/types/badges";

interface BadgeSharePreview {
  readonly badge: Badge;
  readonly blob: Blob;
  readonly url: string;
}

interface BadgeShareState {
  readonly preview: BadgeSharePreview | null;
  readonly loading: boolean;
  readonly sharing: boolean;
  readonly open: (badge: Badge) => Promise<void>;
  readonly close: () => void;
  readonly share: () => Promise<void>;
  readonly download: () => void;
}

/**
 * Preview-render/share/download state for a badge's shareable image —
 * shared by the manual share button (ShareBadgeButton) and the auto-popup
 * shown right when a badge is newly earned (BadgeEarnedPrompt), so the
 * render/share/download logic exists in exactly one place.
 */
export function useBadgeShare(locale: Locale): BadgeShareState {
  const t = getDictionary(locale);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<BadgeSharePreview | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function open(badge: Badge) {
    setLoading(true);
    try {
      const blob = await renderBadgeImage(badge);
      setPreview({ badge, blob, url: URL.createObjectURL(blob) });
    } catch {
      announce(t.badge.couldntRender);
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setPreview(null);
  }

  async function share() {
    if (!preview) return;
    setSharing(true);
    try {
      await shareBadgeImage(preview.blob, preview.badge);
      announce(t.badge.shared(preview.badge.label));
      setPreview(null);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        announce(t.badge.couldntShare);
      }
    } finally {
      setSharing(false);
    }
  }

  function download() {
    if (!preview) return;
    downloadBadgeImage(preview.blob, preview.badge);
    announce(t.badge.downloaded(preview.badge.label));
    setPreview(null);
  }

  return { preview, loading, sharing, open, close, share, download };
}

export { canShareBadgeImage };
