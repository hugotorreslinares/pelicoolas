import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginButton } from "@/components/auth/LoginButton";
import { UserCard, UserCardSkeleton } from "./UserCard";
import { FollowButton } from "./FollowButton";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  fetchRecentUsers,
  searchUsersByUsername,
  subscribeToFollowersList,
  subscribeToFollowingList,
} from "@/lib/firebase/firestore";
import { getDictionary, type Locale } from "@/i18n";
import type { UserCardProfile } from "./UserCard";

const DISCOVER_COUNT = 30;
const SEARCH_DEBOUNCE_MS = 300;

type Tab = "discover" | "following" | "followers";
type LoadState = "loading" | "error" | "ready";

interface PeoplePageProps {
  readonly locale: Locale;
}

function EmptyOrError<T>(props: {
  readonly state: LoadState;
  readonly items: readonly T[];
  readonly emptyLabel: string;
  readonly errorLabel: string;
  readonly retryLabel: string;
  readonly onRetry: () => void;
  readonly cta?: React.ReactNode;
}) {
  if (props.state === "loading") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <UserCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (props.state === "error") {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">{props.errorLabel}</p>
        <Button size="sm" variant="outline" onClick={props.onRetry}>
          {props.retryLabel}
        </Button>
      </div>
    );
  }
  if (props.items.length === 0) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">{props.emptyLabel}</p>
        {props.cta}
      </div>
    );
  }
  return null;
}

export function PeoplePage({ locale }: PeoplePageProps) {
  const t = getDictionary(locale);
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("discover");

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    readonly UserCardProfile[] | null
  >(null);
  const [discover, setDiscover] = useState<readonly UserCardProfile[]>([]);
  const [discoverState, setDiscoverState] = useState<LoadState>("loading");
  const [discoverGen, setDiscoverGen] = useState(0);

  const [following, setFollowing] = useState<readonly UserCardProfile[]>([]);
  const [followingState, setFollowingState] = useState<LoadState>("loading");
  const [followingGen, setFollowingGen] = useState(0);
  const [followers, setFollowers] = useState<readonly UserCardProfile[]>([]);
  const [followersState, setFollowersState] = useState<LoadState>("loading");
  const [followersGen, setFollowersGen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDiscoverState("loading");
    fetchRecentUsers(DISCOVER_COUNT)
      .then((result) => {
        if (cancelled) return;
        setDiscover(result.filter((p) => p.uid !== user?.uid));
        setDiscoverState("ready");
      })
      .catch(() => !cancelled && setDiscoverState("error"));
    return () => {
      cancelled = true;
    };
  }, [user?.uid, discoverGen]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      searchUsersByUsername(q)
        .then((found) =>
          setSearchResults(found.filter((r) => r.uid !== user?.uid)),
        )
        .catch(() => setSearchResults([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, user?.uid]);

  useEffect(() => {
    if (!user) return;
    setFollowingState("loading");
    return subscribeToFollowingList(
      user.uid,
      (list) => {
        setFollowing(
          list.map((f) => ({
            uid: f.targetId,
            displayName: f.targetName,
            photoURL: f.targetPhotoURL,
          })),
        );
        setFollowingState("ready");
      },
      () => setFollowingState("error"),
    );
  }, [user, followingGen]);

  useEffect(() => {
    if (!user) return;
    setFollowersState("loading");
    return subscribeToFollowersList(
      user.uid,
      (list) => {
        setFollowers(
          list.map((f) => ({
            uid: f.followerId,
            displayName: f.followerName,
            photoURL: f.followerPhotoURL,
          })),
        );
        setFollowersState("ready");
      },
      () => setFollowersState("error"),
    );
  }, [user, followersGen]);

  if (authLoading) {
    return (
      <div className="space-y-2">
        <h1 className="sr-only">{t.people.tabsLabel}</h1>
        <UserCardSkeleton />
        <UserCardSkeleton />
      </div>
    );
  }

  const showingSearch = tab === "discover" && searchResults !== null;
  const discoverList = showingSearch ? searchResults! : discover;
  const discoverListState = showingSearch ? "ready" : discoverState;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t.people.tabsLabel}</h1>

      <div className="flex gap-2" role="tablist">
        {(["discover", "following", "followers"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            role="tab"
            aria-selected={tab === value}
            variant={tab === value ? "default" : "outline"}
            onClick={() => setTab(value)}
          >
            {t.people[value]}
          </Button>
        ))}
      </div>

      {tab === "discover" && (
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.searchUsersPlaceholder}
            aria-label={t.search.searchUsersAria}
          />
          <EmptyOrError
            state={discoverListState}
            items={discoverList}
            emptyLabel={
              showingSearch ? t.search.noUsersFound : t.people.emptyDiscover
            }
            errorLabel={t.people.couldntLoad}
            retryLabel={t.people.retry}
            onRetry={() => setDiscoverGen((g) => g + 1)}
          />
          {discoverListState === "ready" && discoverList.length > 0 && (
            <div className="space-y-2">
              {discoverList.map((p) => (
                <UserCard
                  key={p.uid}
                  locale={locale}
                  profile={p}
                  action={
                    user ? (
                      <FollowButton locale={locale} target={p} />
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "following" &&
        (!user ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t.people.signInPrompt}
          </p>
        ) : (
          <div className="space-y-2">
            <EmptyOrError
              state={followingState}
              items={following}
              emptyLabel={t.people.emptyFollowing}
              errorLabel={t.people.couldntLoad}
              retryLabel={t.people.retry}
              onRetry={() => setFollowingGen((g) => g + 1)}
              cta={
                <Button size="sm" onClick={() => setTab("discover")}>
                  {t.people.emptyFollowingCta}
                </Button>
              }
            />
            {followingState === "ready" &&
              following.map((p) => (
                <UserCard key={p.uid} locale={locale} profile={p} />
              ))}
          </div>
        ))}

      {tab === "followers" &&
        (!user ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t.people.signInPrompt}
          </p>
        ) : (
          <div className="space-y-2">
            <EmptyOrError
              state={followersState}
              items={followers}
              emptyLabel={t.people.emptyFollowers}
              errorLabel={t.people.couldntLoad}
              retryLabel={t.people.retry}
              onRetry={() => setFollowersGen((g) => g + 1)}
              cta={
                <Button size="sm" render={<a href={`/u/${user.uid}`} />}>
                  {t.people.emptyFollowersCta}
                </Button>
              }
            />
            {followersState === "ready" &&
              followers.map((p) => (
                <UserCard
                  key={p.uid}
                  locale={locale}
                  profile={p}
                  action={<FollowButton locale={locale} target={p} />}
                />
              ))}
          </div>
        ))}

      {!user && tab === "discover" && (
        <div className="pt-2 text-center">
          <LoginButton size="sm" />
        </div>
      )}
    </div>
  );
}
