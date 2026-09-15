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
import type { Invite } from "@/types/user";

interface InviteDialogProps {
  readonly user: User;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteDialog({ user, open, onOpenChange }: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState<readonly Invite[]>([]);

  useEffect(() => subscribeToInvites(user.uid, setInvites), [user.uid]);

  async function handleSend() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      toast.error("Enter a valid email address.");
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
        toast.error(body?.error ?? "Couldn't send the invite.");
        return;
      }
      toast.success(`Invite sent to ${trimmed}`);
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Couldn't send the invite. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a friend</DialogTitle>
          <DialogDescription>
            Send an email invite to join Pelicoolas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending}
          />
          <Textarea
            placeholder="Add a personal message (optional)"
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
            {sending ? "Sending…" : "Send invite"}
          </Button>
        </div>
        {invites.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium text-muted-foreground">
              Sent invites
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {invites.map((invite) => (
                <li
                  key={invite.email}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{invite.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {invite.status === "converted" ? "Joined ✓" : "Sent"}
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
