import { Button } from "@/components/ui/button";

// Shared "what is this app" moment — the anonymous home, and the slide-1
// welcome shown to a signed-in user with nobody followed yet (see
// HomeHeroSlider). Same content either way: neither visitor has anything
// else on screen to explain what to do next.
export function WelcomeHero() {
  return (
    <div className="space-y-4 py-6 text-center">
      <img
        src="/logo.png"
        alt=""
        width={128}
        height={128}
        className="mx-auto size-24 sm:size-32"
      />
      <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
        Pelicoolas
      </h1>
      <p className="mx-auto max-w-md text-muted-foreground">
        Follow your favorite actors and directors, track what you've already
        watched, and never miss what they release next.
      </p>
      <Button render={<a href="/search" />}>Search actors & directors</Button>
    </div>
  );
}
