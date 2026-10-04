import { useState } from "react";
import { PlayIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { getDictionary, type Locale } from "@/i18n";
import type { ClipVideo } from "@/types/movie";

interface MediaGalleryProps {
  readonly locale: Locale;
  readonly stills: readonly string[];
  readonly clips: readonly ClipVideo[];
  readonly title: string;
}

type Open =
  | { readonly kind: "still"; readonly path: string }
  | { readonly kind: "clip"; readonly clip: ClipVideo }
  | null;

// Thumbnails render as plain <button><img> so they exist in the server HTML
// and cost nothing until clicked; the dialog (and YouTube iframe) only mounts
// on demand, via the cookie-less nocookie domain.
export function MediaGallery({
  locale,
  stills,
  clips,
  title,
}: MediaGalleryProps) {
  const t = getDictionary(locale).movie;
  const [open, setOpen] = useState<Open>(null);

  if (stills.length === 0 && clips.length === 0) return null;

  return (
    <section className="space-y-6">
      {stills.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">{t.gallery}</h2>
          <div className="scroll-thin flex gap-3 overflow-x-auto pb-2">
            {stills.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => setOpen({ kind: "still", path })}
                aria-label={t.openStill(title)}
                className="focus-ring shrink-0 overflow-hidden rounded-lg border"
              >
                <img
                  src={tmdbImageUrl(path, 300)}
                  alt=""
                  loading="lazy"
                  className="h-28 w-auto bg-muted object-cover transition-transform hover:scale-[1.03] sm:h-32"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {clips.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">{t.videos}</h2>
          <div className="scroll-thin flex gap-3 overflow-x-auto pb-2">
            {clips.map((clip) => (
              <button
                key={clip.key}
                type="button"
                onClick={() => setOpen({ kind: "clip", clip })}
                className="focus-ring group w-48 shrink-0 space-y-1 text-left"
              >
                <span className="relative block overflow-hidden rounded-lg border">
                  <img
                    src={`https://i.ytimg.com/vi/${encodeURIComponent(clip.key)}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full bg-muted object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white transition-colors group-hover:bg-black/40">
                    <PlayIcon className="size-8 fill-current" />
                  </span>
                </span>
                <span className="line-clamp-2 text-xs leading-tight font-medium">
                  {clip.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {open?.kind === "clip" ? open.clip.name : title}
            </DialogTitle>
          </DialogHeader>
          {open?.kind === "still" && (
            <img
              src={tmdbImageUrl(open.path, 1280)}
              alt=""
              className="w-full rounded-lg"
            />
          )}
          {open?.kind === "clip" && (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(open.clip.key)}?autoplay=1&rel=0`}
                title={open.clip.name}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="size-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
