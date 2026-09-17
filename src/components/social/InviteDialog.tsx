import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { subscribeToInvites } from "@/lib/firebase/firestore";
import { getDictionary, type Locale } from "@/i18n";
import type { Invite } from "@/types/user";

interface InviteDialogProps {
  readonly user: User;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly locale: Locale;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteDialog({
  user,
  open,
  onOpenChange,
  locale,
}: InviteDialogProps) {
  const t = getDictionary(locale);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState<readonly Invite[]>([]);

  useEffect(() => subscribeToInvites(user.uid, setInvites), [user.uid]);

  async function handleSend() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      toast.error(t.invite.invalidEmail);
      return;
    }
    setSending(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email: trimmed, message: message.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? t.invite.couldntSend);
        return;
      }
      toast.success(t.invite.inviteSentTo(trimmed));
      setEmail("");
      setMessage("");
    } catch {
      toast.error(t.invite.couldntSendRetry);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.invite.title}</DialogTitle>
          <DialogDescription>{t.invite.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="email"
            placeholder={t.invite.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
          />
          <Textarea
            placeholder={t.invite.messagePlaceholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={2}
            disabled={sending}
          />
          <Button
            className="w-full"
            disabled={sending}
            onClick={() => void handleSend()}
          >
            {sending ? t.invite.sending : t.invite.sendInvite}
          </Button>
        </div>
        {invites.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t.invite.sentInvites}
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {invites.map((invite) => (
                <li
                  key={invite.email}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{invite.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {invite.status === "converted"
                      ? t.invite.joined
                      : t.invite.sent}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
