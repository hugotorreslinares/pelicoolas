import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/firebase/auth";

interface LoginButtonProps {
  readonly size?: "default" | "sm";
}

export function LoginButton({ size = "default" }: LoginButtonProps) {
  return (
    <Button size={size} onClick={() => void signInWithGoogle()}>
      Continue with Google
    </Button>
  );
}
