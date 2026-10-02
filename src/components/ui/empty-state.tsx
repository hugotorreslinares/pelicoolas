import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body?: string;
  /** Rendered as the page heading (h1) — for full-page empties, not inline ones. */
  readonly asPageHeading?: boolean;
  readonly children?: ReactNode;
}

// Shared "nothing here yet" block: the popcorn mascot with a section icon
// badge, a short title and an optional call to action — so an empty page
// still feels like part of the product instead of a blank gap.
export function EmptyState({
  icon: Icon,
  title,
  body,
  asPageHeading = false,
  children,
}: EmptyStateProps) {
  const Heading = asPageHeading ? "h1" : "p";
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-6 py-10 text-center">
      <div className="relative">
        <img
          src="/logo.png"
          alt=""
          width={80}
          height={80}
          className="size-20 opacity-90"
        />
        <span className="absolute -right-2 -bottom-1 flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow">
          <Icon className="size-4" />
        </span>
      </div>
      <Heading className="font-display text-xl font-bold tracking-tight">
        {title}
      </Heading>
      {body && <p className="text-sm text-muted-foreground">{body}</p>}
      {children && (
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}
