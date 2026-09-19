import { UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/i18n";

interface SocialHeroProps {
  readonly locale: Locale;
}

// Always shown (unlike WelcomeHero, which only appears with nobody
// followed) — an existing active user is exactly who has friends to find,
// so this slide isn't gated on any state. See HomeHeroSlider.
//
// md+: text on the left over a white fade, photo on the right (object-right
// keeps the right-hand group in frame as the card narrows). Mobile: the
// photo is dropped — a 16:9 crop of a group shot reads as noise on a phone,
// so it keeps the icon layout. The photo is light in both themes, hence the
// fixed (not token) text colors on md+.
export function SocialHero({ locale }: SocialHeroProps) {
  const t = getDictionary(locale);
  return (
    <div className="relative overflow-hidden md:rounded-2xl md:border md:bg-white">
      <img
        src="/friends-hero.webp"
        alt=""
        width={1408}
        height={768}
        loading="lazy"
        className="absolute inset-0 hidden size-full object-cover object-right-bottom md:block"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-gradient-to-r from-white via-white/90 to-transparent md:block md:via-white/85"
      />
      <div className="relative space-y-4 py-6 text-center md:flex md:min-h-[520px] md:max-w-[46%] md:flex-col md:items-start md:justify-center md:px-10 md:text-left">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-muted sm:size-32 md:hidden">
          <UsersIcon className="size-10 text-muted-foreground sm:size-14" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-4xl md:text-neutral-900">
          {t.heroes.findFriendsTitle}
        </h2>
        <p className="mx-auto max-w-md text-muted-foreground md:mx-0 md:text-neutral-600">
          {t.heroes.findFriendsBody}
        </p>
        <Button render={<a href="/friends" />}>
          {t.heroes.findFriendsCta}
        </Button>
      </div>
    </div>
  );
}
