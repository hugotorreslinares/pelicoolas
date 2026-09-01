import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { XIcon } from "lucide-react";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

interface PersonPhotoGalleryProps {
  readonly personId: number;
  readonly personName: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function PersonPhotoGallery({
  personId,
  personName,
  open,
  onOpenChange,
}: PersonPhotoGalleryProps) {
  const [images, setImages] = useState<readonly string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setImages(null);
    setError(null);
    fetch(`/api/person/${personId}/images`)
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then((data: { images: readonly string[] }) => setImages(data.images))
      .catch(() =>
        setError("We couldn't load these photos. Please try again."),
      );
  }, [open, personId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto"
      >
        <DialogClose
          render={
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 z-10 size-11 rounded-full shadow"
            />
          }
        >
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <DialogTitle>{personName}</DialogTitle>

        {error && <p className="py-6 text-center text-destructive">{error}</p>}

        {!error && images === null && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
            ))}
          </div>
        )}

        {!error && images !== null && images.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">
            No photos available.
          </p>
        )}

        {!error && images !== null && images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((path) => (
              <img
                key={path}
                src={`${TMDB_IMAGE_BASE}${path}`}
                alt={personName}
                loading="lazy"
                className="aspect-[2/3] w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
