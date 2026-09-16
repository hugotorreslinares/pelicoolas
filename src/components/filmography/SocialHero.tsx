import { UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Always shown (unlike WelcomeHero, which only appears with nobody
// followed) — an existing active user is exactly who has friends to find,
// so this slide isn't gated on any state. See HomeHeroSlider.
export function SocialHero() {
  return (
    <div className="space-y-4 py-6 text-center">
      <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-muted sm:size-32">
        <UsersIcon className="size-10 text-muted-foreground sm:size-14" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
        Find your friends
      </h2>
      <p className="mx-auto max-w-md text-muted-foreground">
        Search by username, send a follow request, and see what they're
        watching, adding, and recommending.
      </p>
      <Button render={<a href="/friends" />}>Find friends</Button>
    </div>
  );
}
