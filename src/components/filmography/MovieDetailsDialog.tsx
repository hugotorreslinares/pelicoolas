import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { XIcon } from "lucide-react";
import type { MovieDetails } from "@/types/movie";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

interface MovieDetailsDialogProps {
  readonly movieId: number;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function MovieDetailsDialog({ movieId, open, onOpenChange }: MovieDetailsDialogProps) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDetails(null);
    setError(null);
    fetch(`/api/movie/${movieId}`)
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then((data: { movie: MovieDetails }) => setDetails(data.movie))
      .catch(() => setError("We couldn't load this movie. Please try again."));
  }, [open, movieId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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

        {error && (
          <div className="py-6 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {!error && !details && (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}

        {!error && details && (
          <>
            {details.posterPath && (
              <img
                src={`${TMDB_IMAGE_BASE}${details.posterPath}`}
                alt=""
                className="mb-2 h-64 w-full rounded-lg object-cover"
              />
            )}
            <DialogHeader>
              <DialogTitle>{details.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {[
                  details.releaseYear ?? "Unknown",
                  details.runtimeMinutes ? `${details.runtimeMinutes} min` : null,
                  details.genres.join(", ") || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </DialogHeader>
            <DialogDescription className="mt-2">
              {details.overview || "No overview available."}
            </DialogDescription>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
