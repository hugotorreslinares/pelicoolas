import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarIcon, ShareIcon, SparklesIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfileLists } from "@/lib/hooks/useProfileLists";
import { computeInsights, MIN_MOVIES_FOR_INSIGHTS } from "@/lib/insights";
import { profileUrl, shareContent } from "@/lib/shareProfile";
import { getDictionary, type Locale } from "@/i18n";

interface ProfileInsightsProps {
  readonly locale: Locale;
  readonly userId: string;
  readonly displayName: string | null;
  /** Owner sees "your" copy and the share button; followers see a read-only view. */
  readonly isOwner: boolean;
}

// Owner-only "movie profile": stats derived purely from what's already
// stored per watched movie (year, rating, genres, watchedAt). Sharing sends
// the profile link, whose preview image (see /api/og/profile) carries the
// numbers to people who haven't joined yet.
export function ProfileInsights({
  locale,
  userId,
  displayName,
  isOwner,
}: ProfileInsightsProps) {
  const t = getDictionary(locale).insights;
  const lists = useProfileLists(userId);
  const [sharing, setSharing] = useState(false);
  const insights = useMemo(
    () => (lists ? computeInsights(lists.seen) : null),
    [lists],
  );

  if (!insights) return null;

  if (insights.total < MIN_MOVIES_FOR_INSIGHTS) {
    if (!isOwner) return null;
    return (
      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t.notEnough(MIN_MOVIES_FOR_INSIGHTS)}
      </div>
    );
  }

  const monthName = (month: number) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(
      new Date(2000, month, 1),
    );

  async function share() {
    setSharing(true);
    const result = await shareContent(
      profileUrl(userId),
      "Pelicoolas",
      t.shareText(displayName ?? "Pelicoolas", insights?.total ?? 0),
    );
    setSharing(false);
    if (result === "shared") toast.success(t.shared);
    else if (result === "copied") toast.success(t.copied);
    else if (result === "failed") toast.error(t.shareFailed);
  }

  return (
    <div className="card-elevated space-y-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {isOwner ? t.heading : t.headingOther(displayName ?? t.thisUser)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-bold">
            <SparklesIcon className="size-5 text-primary" />
            {isOwner ? t.personalityLabel : t.personalityLabelOther}{" "}
            {(insights.topGenreId !== null &&
              t.personality[insights.topGenreId]) ||
              t.personalityDefault}
          </p>
        </div>
        {isOwner && (
          <Button size="sm" onClick={share} disabled={sharing}>
            <ShareIcon />
            {t.share}
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {insights.averageRating !== null && (
          <div className="rounded-lg border p-3">
            <StarIcon className="mb-1 size-4 text-primary" />
            <p className="text-2xl leading-tight font-bold">
              {insights.averageRating.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.averageRating} · {t.averageRatingHint}
            </p>
          </div>
        )}
        {insights.bestYear && (
          <div className="rounded-lg border p-3">
            <CalendarIcon className="mb-1 size-4 text-primary" />
            <p className="text-2xl leading-tight font-bold">
              {insights.bestYear.year}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.bestYear}.{" "}
              {t.bestYearBody(
                insights.bestYear.count,
                insights.bestYear.topTitle,
              )}
            </p>
          </div>
        )}
        {insights.busiestMonth && (
          <div className="rounded-lg border p-3">
            <CalendarIcon className="mb-1 size-4 text-primary" />
            <p className="text-2xl leading-tight font-bold capitalize">
              {monthName(insights.busiestMonth.month)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.busiestMonth}.{" "}
              {t.busiestMonthBody(insights.busiestMonth.count)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
