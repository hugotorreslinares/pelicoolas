import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  claimUsername,
  isValidUsername,
  subscribeToPublicProfile,
} from "@/lib/firebase/firestore";
import { getDictionary, type Locale } from "@/i18n";

interface UsernamePromptProps {
  readonly locale: Locale;
}

// Blocks (no close button, no Escape/backdrop dismiss) until the signed-in
// user has a username — covers both new sign-ups and existing accounts that
// predate this field, in one gate. Closes itself the moment the profile
// doc reflects a claimed username (realtime, no page reload needed).
export function UsernamePrompt({ locale }: UsernamePromptProps) {
  const t = getDictionary(locale);
  const { user } = useAuth();
  const [hasUsername, setHasUsername] = useState(true);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToPublicProfile(user.uid, (profile) => {
      setHasUsername(profile?.usernameLower != null);
    });
  }, [user]);

  async function handleSubmit() {
    if (!user) return;
    const trimmed = value.trim();
    if (!isValidUsername(trimmed)) {
      setError(t.usernamePrompt.invalidUsername);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await claimUsername(user.uid, trimmed);
    } catch {
      setError(t.usernamePrompt.usernameTaken);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || hasUsername) return null;

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="max-w-sm gap-4 p-6">
        <div className="space-y-2">
          <DialogTitle className="font-heading text-lg font-semibold">
            {t.usernamePrompt.pickUsername}
          </DialogTitle>
          <DialogDescription>{t.usernamePrompt.description}</DialogDescription>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="space-y-2"
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t.usernamePrompt.placeholder}
            aria-label={t.usernamePrompt.ariaLabel}
            aria-invalid={error != null}
            maxLength={20}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t.usernamePrompt.checking : t.usernamePrompt.continue}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
