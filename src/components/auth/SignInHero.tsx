import { LoginButton } from "./LoginButton";
import { getDictionary, type Locale } from "@/i18n";
import type { Dictionary } from "@/i18n/en";

export type SignInHeroSection = keyof Dictionary["signInHero"]["sections"];

interface SignInHeroProps {
  readonly locale: Locale;
  readonly section: SignInHeroSection;
}

// Signed-out placeholder for sections that have nothing to show without an
// account: explains what the section offers, with the login button right
// there. Fixed light-on-dark text (not theme tokens) because it sits on the
// shared dark hero backdrop, same as WelcomeHero.
export function SignInHero({ locale, section }: SignInHeroProps) {
  const t = getDictionary(locale).signInHero;
  const { title, body } = t.sections[section];
  return (
    <section
      style={{ backgroundImage: "url(/hero-backdrop.webp)" }}
      className="rounded-2xl bg-cover bg-center"
    >
      <div className="flex flex-col items-center space-y-4 px-4 py-12 text-center">
        <img
          src="/logo.png"
          alt=""
          width={96}
          height={96}
          className="size-20 sm:size-24"
        />
        <h1 className="text-2xl font-display font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto max-w-md text-white/80">{body}</p>
        <LoginButton locale={locale} />
      </div>
    </section>
  );
}
