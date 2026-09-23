import { useEffect, useMemo, useState } from "react";
import { BellIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/lib/firebase/notifications";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { getDictionary } from "@/i18n";
import { useLocale } from "@/lib/hooks/useLocale";
import type { AppNotification } from "@/types/notifications";

export function NotificationBell() {
  const t = getDictionary(useLocale()).notifications;
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<
    readonly AppNotification[]
  >([]);
  // Distinguishes "still waiting on the first snapshot" from "confirmed
  // empty" — notifications itself starts at [] either way, so without this
  // opening the menu before the subscription resolves showed the same
  // "no notifications yet" message a genuinely empty inbox would.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    return subscribeToNotifications(user.uid, (n) => {
      setNotifications(n);
      setLoaded(true);
    });
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  if (!user) return null;

  function handleOpenChange(open: boolean) {
    if (open || !user || unreadCount === 0) return;
    void markAllNotificationsRead(
      user.uid,
      notifications.filter((n) => !n.read).map((n) => n.id),
    );
  }

  function notificationTitle(n: AppNotification): string {
    switch (n.type) {
      case "new-release":
        return t.newRelease(n.personName);
      case "person-recommendation":
        return t.recommendedPerson(n.recommenderName);
      case "recommendation":
        return n.mediaType === "tv"
          ? t.recommendedShow(n.recommenderName)
          : t.recommendedMovie(n.recommenderName);
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              className="focus-ring relative flex size-11 items-center justify-center rounded-full hover:bg-muted"
              aria-label={
                unreadCount > 0 ? t.labelUnread(unreadCount) : t.label
              }
            />
          }
        >
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
          )}
        </TooltipTrigger>
        <TooltipContent>{t.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!loaded && (
            <div className="space-y-2 p-2" role="status">
              <span className="sr-only">{t.loading}</span>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton className="h-14 w-10 shrink-0 rounded" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {loaded && notifications.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">{t.empty}</p>
          )}
          {notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              render={
                <a
                  href={
                    n.type === "new-release" ||
                    n.type === "person-recommendation"
                      ? `/person/${n.personId}`
                      : `/u/${n.recommenderId}`
                  }
                />
              }
              className="items-start gap-2"
              onClick={() => {
                if (!n.read) void markNotificationRead(user.uid, n.id);
              }}
            >
              {(
                n.type === "person-recommendation"
                  ? n.profilePath
                  : n.posterPath
              ) ? (
                <img
                  src={tmdbImageUrl(
                    n.type === "person-recommendation"
                      ? n.profilePath!
                      : n.posterPath!,
                    92,
                  )}
                  alt=""
                  className={`h-14 w-10 shrink-0 object-cover ${n.type === "person-recommendation" ? "rounded-full" : "rounded"}`}
                />
              ) : (
                <div className="h-14 w-10 shrink-0 rounded bg-muted" />
              )}
              <span className="flex flex-col gap-0.5 text-left">
                <span className="text-sm font-medium">
                  {notificationTitle(n)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {n.type === "person-recommendation"
                    ? n.personName
                    : n.movieTitle}
                </span>
              </span>
              {!n.read && (
                <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
