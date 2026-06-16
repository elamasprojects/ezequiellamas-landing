import { useState } from "react";
import { Bookmark, FolderPlus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useReferentCollections,
  useSaveToReferentCollection,
  useCreateReferentCollection,
} from "@/hooks/useReferentCollections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referentVideoId: string;
}

export default function SaveToReferentCollectionDialog({ open, onOpenChange, referentVideoId }: Props) {
  const { data: collections } = useReferentCollections();
  const save = useSaveToReferentCollection();
  const createCol = useCreateReferentCollection();
  const [newName, setNewName] = useState("");

  function saveTo(collectionId?: string) {
    save.mutate({ referentVideoId, collectionId }, { onSuccess: () => onOpenChange(false) });
  }

  async function createAndSave() {
    const name = newName.trim();
    if (!name) return;
    const col = await createCol.mutateAsync(name);
    setNewName("");
    saveTo(col.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
            Guardar video
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
            Elegí una colección o creá una nueva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <button
            type="button"
            onClick={() => saveTo()}
            disabled={save.isPending}
            className="flex w-full items-center gap-2 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-3 py-2.5 text-left text-sm transition-colors hover:border-[var(--ll-border-hover)] disabled:opacity-50"
          >
            <Bookmark className="h-4 w-4" style={{ color: "var(--ll-accent)" }} />
            Guardados
            <span className="ml-auto text-[10px] uppercase tracking-[0.15em]" style={{ color: "var(--ll-text-dim)" }}>
              por defecto
            </span>
          </button>

          {collections
            ?.filter((c) => c.name !== "Guardados")
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => saveTo(c.id)}
                disabled={save.isPending}
                className="flex w-full items-center gap-2 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-3 py-2.5 text-left text-sm transition-colors hover:border-[var(--ll-border-hover)] disabled:opacity-50"
              >
                <FolderPlus className="h-4 w-4" style={{ color: "var(--ll-text-muted)" }} />
                {c.name}
                <span className="ml-auto text-xs" style={{ color: "var(--ll-text-dim)" }}>
                  {c.item_count}
                </span>
              </button>
            ))}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--ll-border)] pt-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nueva colección…"
            onKeyDown={(e) => {
              if (e.key === "Enter") createAndSave();
            }}
            className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
          />
          <Button
            type="button"
            variant="brand"
            size="sm"
            onClick={createAndSave}
            disabled={!newName.trim() || createCol.isPending || save.isPending}
          >
            <Plus className="h-4 w-4" /> Crear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
