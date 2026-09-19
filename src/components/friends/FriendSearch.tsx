import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/useAuth";
import { searchUsersByUsername } from "@/lib/firebase/firestore";
import { UserCard } from "@/components/social/UserCard";
import { FollowButton } from "@/components/social/FollowButton";
import { getDictionary, type Locale } from "@/i18n";
import type { PublicProfile } from "@/types/user";

const DEBOUNCE_MS = 300;

interface FriendSearchProps {
  readonly locale: Locale;
}

// Search by username (prefix-only, see searchUsersByUsername) and follow —
// accepting the request makes it mutual (approveFollowRequest).
export function FriendSearch({ locale }: FriendSearchProps) {
  const t = getDictionary(locale);
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (!user) return null;

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.search.searchUsersPlaceholder}
        aria-label={t.search.searchUsersAria}
      />
      {loading && (
        <p className="text-sm text-muted-foreground">{t.people.searching}</p>
      )}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-sm text-muted-foreground">{t.search.noUsersFound}</p>
      )}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <UserCard
              key={result.uid}
              locale={locale}
              profile={result}
              action={<FollowButton locale={locale} target={result} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}
