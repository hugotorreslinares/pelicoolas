import { useState } from "react";
import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDictionary, type Locale } from "@/i18n";

interface TrailerButtonProps {
  readonly youtubeKey: string;
  readonly title: string;
  readonly locale: Locale;
}

// The iframe only mounts while the dialog is open, so the page doesn't load
// YouTube (or hand it any cookies — nocookie domain) until someone asks.
export function TrailerButton({
  youtubeKey,
  title,
  locale,
}: TrailerButtonProps) {
  const t = getDictionary(locale).movie;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className="mt-2"
        onClick={() => setOpen(true)}
      >
        <PlayIcon data-icon="inline-start" />
        {t.watchTrailer}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.trailerOf(title)}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
            {open && (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeKey)}?autoplay=1&rel=0`}
                title={t.trailerOf(title)}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="size-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
