import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { getDictionary, type Locale } from "@/i18n";

interface LoginButtonProps {
  // Optional, defaulting to "en": most call sites don't yet thread locale
  // down through their own component tree (tracked as follow-up i18n work,
  // see TODO.md) — defaulting keeps them compiling and behaving as before
  // rather than forcing a prop nobody has to pass yet.
  readonly locale?: Locale;
  readonly size?: "default" | "sm";
}

export function LoginButton({
  locale = "en",
  size = "default",
}: LoginButtonProps) {
  const t = getDictionary(locale);
  return (
    <Button size={size} onClick={() => void signInWithGoogle()}>
      {t.account.continueWithGoogle}
    </Button>
  );
}
