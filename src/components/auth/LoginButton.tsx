import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { getDictionary, type Locale } from "@/i18n";
import { useLocale } from "@/lib/hooks/useLocale";

interface LoginButtonProps {
  // Optional: falls back to the locale stamped on <html lang> (useLocale),
  // so call sites that don't thread a `locale` prop still translate.
  readonly locale?: Locale;
  readonly size?: "default" | "sm";
  readonly className?: string;
}

export function LoginButton({
  locale,
  size = "default",
  className,
}: LoginButtonProps) {
  const detected = useLocale();
  const t = getDictionary(locale ?? detected);
  return (
    <Button
      size={size}
      className={className}
      onClick={() => void signInWithGoogle()}
    >
      {t.account.continueWithGoogle}
    </Button>
  );
}
