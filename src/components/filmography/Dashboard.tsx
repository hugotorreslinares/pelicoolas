import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowedPersonCard } from "./FollowedPersonCard";
import { FollowedPeopleHero } from "./FollowedPeopleHero";
import { useAuth } from "@/lib/hooks/useAuth";
import { subscribeToFollowedPeople } from "@/lib/firebase/firestore";
import type { FollowedPerson } from "@/types/filmography";

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [people, setPeople] = useState<readonly FollowedPerson[] | null>(null);

  useEffect(() => {
    if (!user) {
      setPeople(null);
      return;
    }
    return subscribeToFollowedPeople(user.uid, setPeople);
  }, [user]);

  // A page-level h1 that renders in every state (including the loading
  // skeleton, which is what search engines and pre-hydration crawlers see)
  // rather than only in a client-resolved branch — axe-core's
  // page-has-heading-one flagged this when it scanned before Firebase's
  // async auth check resolved.
  const heading = "My Filmographies";

  if (authLoading || (user && people === null)) {
    return (
      <div className="space-y-2">
        <h1 className="sr-only">{heading}</h1>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">{heading}</h1>
        <p>Follow the people whose movies you want to watch.</p>
        <Button render={<a href="/search" />}>Search actors & directors</Button>
      </div>
    );
  }

  if (!people || people.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">
          You aren&apos;t following anyone yet.
        </h1>
        <p className="text-muted-foreground">
          Find an actor or director whose movies you want to explore.
        </p>
        <Button render={<a href="/search" />}>Search</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FollowedPeopleHero people={people} />
      <h1 className="text-xl font-semibold">{heading}</h1>
      <p className="text-sm text-muted-foreground">
        {people.length} people you're following
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((person) => (
          <FollowedPersonCard key={person.tmdbId} person={person} />
        ))}
      </div>
    </div>
  );
}
