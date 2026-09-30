import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginButton } from "@/components/auth/LoginButton";
import { useAuth } from "@/lib/hooks/useAuth";
import { createList, deleteList, subscribeToLists } from "@/lib/firebase/lists";
import { getDictionary, type Locale } from "@/i18n";
import type { MovieList } from "@/types/lists";

interface ListsPageProps {
  readonly locale: Locale;
}

export function ListsPage({ locale }: ListsPageProps) {
  const t = getDictionary(locale).lists;
  const { user, loading: authLoading } = useAuth();
  const [lists, setLists] = useState<readonly MovieList[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!user) return;
    return subscribeToLists(user.uid, setLists);
  }, [user]);

  async function handleCreate() {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      await createList(user.uid, name.trim());
      setName("");
    } catch {
      toast.error(t.couldntCreate);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(list: MovieList) {
    if (!user || !window.confirm(t.deleteConfirm(list.name))) return;
    setDeletingIds((prev) => new Set(prev).add(list.id));
    try {
      await deleteList(user.uid, list.id);
      toast.success(t.deleted);
    } catch {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(list.id);
        return next;
      });
      toast.error(t.couldntDelete);
    }
  }

  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{t.heading}</h1>
        <p className="text-muted-foreground">{t.signInPrompt}</p>
        <LoginButton size="sm" locale={locale} />
      </div>
    );
  }

  const visible = (lists ?? []).filter((l) => !deletingIds.has(l.id));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t.heading}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleCreate();
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.newListPlaceholder}
          aria-label={t.newListPlaceholder}
        />
        <Button type="submit" disabled={creating || !name.trim()}>
          <PlusIcon data-icon="inline-start" />
          {creating ? t.creating : t.create}
        </Button>
      </form>

      {lists === null && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {lists !== null && visible.length === 0 && (
        <p className="text-center text-muted-foreground">{t.emptyState}</p>
      )}

      {visible.length > 0 && (
        <ul className="space-y-2">
          {visible.map((list) => (
            <li
              key={list.id}
              className="card-elevated flex items-center justify-between gap-2 rounded-lg border p-3"
            >
              <a
                href={`/lists/${user.uid}/${list.id}`}
                className="focus-ring min-w-0 flex-1"
              >
                <p className="truncate font-medium">{list.name}</p>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t.deleteList}
                onClick={() => void handleDelete(list)}
              >
                <TrashIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
