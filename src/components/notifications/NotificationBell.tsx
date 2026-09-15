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
import type { AppNotification } from "@/types/notifications";

export function NotificationBell() {
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

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              className="focus-ring relative flex size-11 items-center justify-center rounded-full hover:bg-muted"
              aria-label={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : "Notifications"
              }
            />
          }
        >
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
          )}
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!loaded && (
            <div className="space-y-2 p-2" role="status">
              <span className="sr-only">Loading notifications…</span>
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
            <p className="p-2 text-sm text-muted-foreground">
              No notifications yet — you'll hear about it when someone you
              follow has a new movie out, or recommends something.
            </p>
          )}
          {notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              render={
                <a
                  href={
                    n.type === "new-release"
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
              {n.posterPath ? (
                <img
                  src={tmdbImageUrl(n.posterPath, 92)}
                  alt=""
                  className="h-14 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-14 w-10 shrink-0 rounded bg-muted" />
              )}
              <span className="flex flex-col gap-0.5 text-left">
                <span className="text-sm font-medium">
                  {n.type === "new-release"
                    ? `${n.personName} has a new movie`
                    : `${n.recommenderName} recommended a ${n.mediaType === "tv" ? "show" : "movie"}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  {n.movieTitle}
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
