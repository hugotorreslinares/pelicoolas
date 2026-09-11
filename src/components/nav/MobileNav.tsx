import {
  MenuIcon,
  SearchIcon,
  FilmIcon,
  BookmarkIcon,
  NetworkIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LINKS = [
  { href: "/search", label: "Search", icon: SearchIcon },
  { href: "/filmographies", label: "My Filmographies", icon: FilmIcon },
  { href: "/watchlist", label: "Watchlist", icon: BookmarkIcon },
  { href: "/connections", label: "Connections", icon: NetworkIcon },
] as const;

// Collapses the nav links behind a hamburger on narrow screens — with all
// of them inline, the header wrapped onto 3+ ragged lines on phone widths.
// NotificationBell/ThemeToggle/UserMenu stay inline everywhere since
// they're single icon buttons, not a list. Deliberately NOT embedding
// FollowedDock here: it's its own small widget of plain <a> links, and
// nesting that raw inside the menu's popup broke base-ui's focus
// management on open (the whole trigger would vanish on click) — the
// dock stays desktop-only, "My Filmographies" above covers mobile.
export function MobileNav() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus-ring flex size-11 items-center justify-center rounded-full border sm:hidden"
        aria-label="Menu"
      >
        <MenuIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} render={<a href={href} />}>
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
