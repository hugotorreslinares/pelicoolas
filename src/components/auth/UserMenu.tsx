import { useEffect, useState } from "react";
import * as Sentry from "@sentry/astro";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/hooks/useAuth";
import { signOutUser } from "@/lib/firebase/auth";
import {
  exportUserData,
  subscribeToFollowersList,
  subscribeToFollowRequests,
  syncPublicProfile,
} from "@/lib/firebase/firestore";
import { downloadJson } from "@/lib/download";
import { announce } from "@/lib/a11y";
import {
  captureInviteFromUrl,
  convertPendingInviteIfAny,
} from "@/lib/inviteTracking";
import { sendWelcomeEmail } from "@/lib/welcomeEmail";
import { InviteDialog } from "@/components/social/InviteDialog";
import { getDictionary, type Locale } from "@/i18n";
import { LoginButton } from "./LoginButton";

interface UserMenuProps {
  readonly locale: Locale;
}

export function UserMenu({ locale }: UserMenuProps) {
  const t = getDictionary(locale);
  const { user, loading } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Runs once per page load regardless of auth state — an invite link can
  // land here before the visitor has signed in at all.
  useEffect(() => {
    captureInviteFromUrl();
  }, []);

  useEffect(() => {
    if (!user) return;
    void syncPublicProfile(user).then((isNewUser) => {
      if (!isNewUser) return;
      void convertPendingInviteIfAny(() => user.getIdToken());
      void sendWelcomeEmail(() => user.getIdToken());
    });
    return subscribeToFollowRequests(user.uid, (requests) =>
      setPendingRequests(requests.length),
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToFollowersList(user.uid, (followers) =>
      setFollowerCount(followers.length),
    );
  }, [user]);

  if (loading) {
    return (
      <Skeleton className="size-11 rounded-full" role="status">
        <span className="sr-only">Loading account…</span>
      </Skeleton>
    );
  }
  if (!user) return <LoginButton locale={locale} />;

  const initials = user.displayName?.slice(0, 1).toUpperCase() ?? "?";

  async function handleExport() {
    if (!user) return;
    // Must happen synchronously, before the Firestore read below — a
    // window.open() called after an `await` loses the click's
    // user-activation context and iOS Safari's popup blocker silently
    // swallows it (see downloadJson's own comment). Harmless no-op on
    // every other platform, which redirects the real anchor download
    // instead.
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
    const preOpenedWindow = isIOS ? window.open("", "_blank") : null;

    setExporting(true);
    try {
      const data = await exportUserData(user.uid);
      downloadJson(
        `filmo-export-${new Date().toISOString().slice(0, 10)}.json`,
        data,
        preOpenedWindow,
      );
      announce(t.account.exportDownloaded);
    } catch (error) {
      preOpenedWindow?.close();
      // No app-wide toast system to hang this off of, and `announce` alone
      // (screen readers only) is exactly the kind of silent failure that
      // made this bug hard to notice in the first place — an alert is
      // heavy-handed but guarantees a sighted user actually sees it too.
      announce(t.account.exportFailed);
      window.alert(t.account.exportFailed);
      Sentry.captureException(error, { tags: { action: "export-data" } });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <InviteDialog
        user={user}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger className="focus-ring flex size-11 items-center justify-center rounded-full" />
            }
          >
            <div className="relative">
              <Avatar>
                <AvatarImage
                  src={user.photoURL ?? undefined}
                  alt={user.displayName ?? ""}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute -right-1.5 -bottom-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-card bg-secondary px-0.5 text-[9px] font-semibold text-secondary-foreground">
                {followerCount}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {t.account.accountMenu(followerCount)}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<a href={`/u/${user.uid}`} />}>
            {t.account.myProfile}
            {pendingRequests > 0 && ` (${pendingRequests})`}
          </DropdownMenuItem>
          <DropdownMenuItem render={<a href={`/board/${user.uid}`} />}>
            {t.account.myBoard}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setInviteOpen(true)}>
            {t.account.inviteFriend}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? t.account.exporting : t.account.exportData}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void signOutUser()}>
            {t.account.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
