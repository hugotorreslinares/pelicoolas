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
import { useAuth } from "@/lib/hooks/useAuth";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/lib/firebase/notifications";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { ReleaseNotification } from "@/types/notifications";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<
    readonly ReleaseNotification[]
  >([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    return subscribeToNotifications(user.uid, setNotifications);
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
      <DropdownMenuTrigger
        className="focus-ring relative flex size-11 items-center justify-center rounded-full hover:bg-muted"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
      >
        <BellIcon className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>New releases</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">
              No notifications yet — you'll hear about it when someone you
              follow has a new movie out.
            </p>
          )}
          {notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              render={<a href={`/person/${n.personId}`} />}
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
                  {n.personName} has a new movie
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
