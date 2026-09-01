import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/firebase/auth";

export function LoginButton() {
  return (
    <Button onClick={() => void signInWithGoogle()}>Continue with Google</Button>
  );
}
