import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/hooks/useAuth";
import { signOutUser } from "@/lib/firebase/auth";
import { exportUserData } from "@/lib/firebase/firestore";
import { downloadJson } from "@/lib/download";
import { announce } from "@/lib/a11y";
import { LoginButton } from "./LoginButton";

export function UserMenu() {
  const { user, loading } = useAuth();
  const [exporting, setExporting] = useState(false);

  if (loading) return null;
  if (!user) return <LoginButton />;

  const initials = user.displayName?.slice(0, 1).toUpperCase() ?? "?";

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    try {
      const data = await exportUserData(user.uid);
      downloadJson(
        `filmo-export-${new Date().toISOString().slice(0, 10)}.json`,
        data,
      );
      announce("Export downloaded");
    } finally {
      setExporting(false);
    }
  }

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
        <DropdownMenuItem
          disabled={exporting}
          onSelect={() => void handleExport()}
        >
          {exporting ? "Exporting…" : "Export data"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOutUser()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
