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

// Blocks (no close button, no Escape/backdrop dismiss) until the signed-in
// user has a username — covers both new sign-ups and existing accounts that
// predate this field, in one gate. Closes itself the moment the profile
// doc reflects a claimed username (realtime, no page reload needed).
export function UsernamePrompt() {
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
      setError("3-20 characters: letters, numbers, underscore.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await claimUsername(user.uid, trimmed);
    } catch {
      setError("That username is taken. Try another.");
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
            Pick a username
          </DialogTitle>
          <DialogDescription>
            So friends can find you and send you a follow request.
          </DialogDescription>
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
            placeholder="username"
            aria-label="Username"
            aria-invalid={error != null}
            maxLength={20}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Checking…" : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
