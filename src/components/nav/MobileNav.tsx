import {
  MenuIcon,
  SearchIcon,
  FilmIcon,
  EyeIcon,
  BookmarkIcon,
  NetworkIcon,
  UsersIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDictionary, type Locale } from "@/i18n";

interface MobileNavProps {
  readonly locale: Locale;
}

// Collapses the nav links behind a hamburger on narrow screens — with all
// of them inline, the header wrapped onto 3+ ragged lines on phone widths.
// NotificationBell/ThemeToggle/UserMenu stay inline everywhere since
// they're single icon buttons, not a list.
export function MobileNav({ locale }: MobileNavProps) {
  const t = getDictionary(locale);
  const links = [
    { href: "/search", label: t.nav.search, icon: SearchIcon },
    { href: "/filmographies", label: t.nav.myFilmographies, icon: FilmIcon },
    { href: "/watched", label: t.nav.watched, icon: EyeIcon },
    { href: "/watchlist", label: t.nav.watchlist, icon: BookmarkIcon },
    { href: "/connections", label: t.nav.connections, icon: NetworkIcon },
    { href: "/friends", label: t.nav.friends, icon: UsersIcon },
  ] as const;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              className="focus-ring flex size-11 items-center justify-center rounded-full border sm:hidden"
              aria-label={t.nav.menu}
            />
          }
        >
          <MenuIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent>{t.nav.menu}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        {links.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} render={<a href={href} />}>
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
