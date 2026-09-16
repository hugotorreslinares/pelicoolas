import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  searchUsersByUsername,
  sendFollowRequest,
} from "@/lib/firebase/firestore";
import type { PublicProfile } from "@/types/user";

const DEBOUNCE_MS = 300;

function ResultRow({
  result,
  onInvite,
  sent,
}: {
  readonly result: PublicProfile;
  readonly onInvite: () => void;
  readonly sent: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <Avatar className="size-9">
        <AvatarImage src={result.photoURL ?? undefined} alt="" />
        <AvatarFallback>
          {(result.username ?? "?").slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">@{result.username}</p>
        {result.displayName && (
          <p className="truncate text-xs text-muted-foreground">
            {result.displayName}
          </p>
        )}
      </div>
      <Button size="sm" disabled={sent} onClick={onInvite}>
        {sent ? "Sent" : "Invite"}
      </Button>
    </div>
  );
}

// Search by username (prefix-only, see searchUsersByUsername) and send a
// friend invite — accepting it makes the follow mutual (approveFollowRequest).
export function FriendSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      void searchUsersByUsername(q).then((found) => {
        setResults(found.filter((r) => r.uid !== user?.uid));
        setLoading(false);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, user?.uid]);

  async function handleInvite(target: PublicProfile) {
    if (!user) return;
    setSentTo((prev) => new Set(prev).add(target.uid));
    try {
      await sendFollowRequest(target.uid, {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
      announce(`Invite sent to @${target.username}`);
    } catch {
      setSentTo((prev) => {
        const next = new Set(prev);
        next.delete(target.uid);
        return next;
      });
      toast.error(`Couldn't send the invite. Please try again.`);
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find friends by username…"
        aria-label="Search users by username"
      />
      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found.</p>
      )}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <ResultRow
              key={result.uid}
              result={result}
              sent={sentTo.has(result.uid)}
              onInvite={() => void handleInvite(result)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
