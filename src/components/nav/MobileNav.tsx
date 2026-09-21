import {
  MenuIcon,
  SearchIcon,
  FilmIcon,
  EyeIcon,
  BookmarkIcon,
  NetworkIcon,
  WaypointsIcon,
  UsersIcon,
  GhostIcon,
  XIcon,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDictionary, type Locale } from "@/i18n";

interface MobileNavProps {
  readonly locale: Locale;
}

// Slide-in drawer on narrow screens, replacing the old dropdown — mirrors
// the desktop sidebar's nav list instead of a small popup menu. Reuses the
// Dialog primitive (Base UI) for its built-in focus-trap/backdrop/Escape,
// just repositioned as a left panel instead of a centered modal.
export function MobileNav({ locale }: MobileNavProps) {
  const t = getDictionary(locale);
  const links = [
    { href: "/search", label: t.nav.search, icon: SearchIcon },
    { href: "/filmographies", label: t.nav.myFilmographies, icon: FilmIcon },
    { href: "/watched", label: t.nav.watched, icon: EyeIcon },
    { href: "/watchlist", label: t.nav.watchlist, icon: BookmarkIcon },
    { href: "/connections", label: t.nav.connections, icon: NetworkIcon },
    { href: "/map", label: t.nav.movieMap, icon: WaypointsIcon },
    { href: "/friends", label: t.nav.friends, icon: UsersIcon },
  ];
  const lists = [
    { href: "/halloween", label: t.nav.halloween, icon: GhostIcon },
  ] as const;

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogPrimitive.Trigger
              className="focus-ring flex size-11 items-center justify-center rounded-full border sm:hidden"
              aria-label={t.nav.menu}
            />
          }
        >
          <MenuIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent>{t.nav.menu}</TooltipContent>
      </Tooltip>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-150 outline-none data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left"
        >
          <div className="mb-2 flex items-center justify-between">
            <DialogPrimitive.Title className="font-heading text-base font-medium">
              {t.nav.menu}
            </DialogPrimitive.Title>
            <DialogClose
              render={
                <Button variant="ghost" size="icon-sm" className="size-11" />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
          {links.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </a>
          ))}
          <p className="px-3 pt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t.nav.lists}
          </p>
          {lists.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </a>
          ))}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
