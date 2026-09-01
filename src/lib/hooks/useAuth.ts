import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuthState } from "@/lib/firebase/auth";

export function useAuth(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToAuthState((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
