import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/hooks/useAuth";
import { signOutUser } from "@/lib/firebase/auth";
import { LoginButton } from "./LoginButton";

export function UserMenu() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <LoginButton />;

  const initials = user.displayName?.slice(0, 1).toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full">
        <Avatar>
          <AvatarImage
            src={user.photoURL ?? undefined}
            alt={user.displayName ?? ""}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void signOutUser()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
