import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/i18n";

interface SocialHeroProps {
  readonly locale: Locale;
}

// Always shown (unlike WelcomeHero, which only appears with nobody
// followed) — an existing active user is exactly who has friends to go
// find, so this slide isn't gated on any state. See HomeHeroSlider.
//
// Same icon-circle + light-text layout as the other slides now (unified
// hero look, shared backdrop) — the group photo that used to fill half
// the card is now a small medallion inside the circle instead, so it
// survives as an accent without breaking that unity.
export function SocialHero({ locale }: SocialHeroProps) {
  const t = getDictionary(locale);
  return (
    <div className="flex w-full flex-col justify-center space-y-4 px-4 py-10 text-center">
      <img
        src="/friends-hero.webp"
        alt=""
        width={1408}
        height={768}
        loading="lazy"
        className="mx-auto size-24 rounded-full border-2 border-white/20 object-cover sm:size-32"
      />
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
        {t.heroes.findFriendsTitle}
      </h2>
      <p className="mx-auto max-w-md text-white/80">
        {t.heroes.findFriendsBody}
      </p>
      <Button render={<a href="/friends" />}>{t.heroes.findFriendsCta}</Button>
    </div>
  );
}
