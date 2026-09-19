import { useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { announce } from "@/lib/a11y";
import { shareProfile } from "@/lib/shareProfile";
import { getDictionary, type Locale } from "@/i18n";
import engagement from "@/config/engagement.json";

const WATCHED_THRESHOLD = 5;
const DISMISSED_KEY_PREFIX = "invite-prompt-dismissed:";

interface InviteFriendPromptProps {
  readonly locale: Locale;
  readonly uid: string;
  readonly watchedCount: number;
}

// Shown once, on the page where marking movies watched actually happens —
// right after a few movies are logged is the moment someone's most likely
// to want to compare notes with a friend. Dismissed forever (per browser)
// once closed or shared once, so it never nags on return visits.
export function InviteFriendPrompt({
  locale,
  uid,
  watchedCount,
}: InviteFriendPromptProps) {
  const t = getDictionary(locale);
  const dismissedKey = `${DISMISSED_KEY_PREFIX}${uid}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(dismissedKey) === "1";
    } catch {
      return false;
    }
  });

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(dismissedKey, "1");
    } catch {
      // Private mode / quota — worst case the prompt reappears next visit.
    }
  }

  async function handleInvite() {
    const result = await shareProfile(
      uid,
      t.growth.shareTitle,
      t.growth.shareText,
    );
    if (result === "copied") announce(t.growth.linkCopied);
    if (result === "failed") announce(t.growth.couldntShare);
    if (result === "shared" || result === "copied") dismiss();
  }

  if (
    !engagement.nudges.inviteFriendPrompt ||
    dismissed ||
    watchedCount < WATCHED_THRESHOLD
  ) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{t.growth.invitePromptTitle}</p>
        <p className="text-sm text-muted-foreground">
          {t.growth.invitePromptBody}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={() => void handleInvite()}>
            {t.growth.invitePromptCta}
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            {t.growth.invitePromptDismiss}
          </Button>
        </div>
      </div>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={t.growth.invitePromptDismiss}
        onClick={dismiss}
      >
        <XIcon />
      </Button>
    </div>
  );
}
