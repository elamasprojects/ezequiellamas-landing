import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSeries, updateSeries, type Series } from "@/lib/api/series";
import { useSession } from "@/hooks/useSession";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series?: Series | null;
  nextPosition: number;
}

export default function SeriesDialog({ open, onOpenChange, series, nextPosition }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exampleUrl, setExampleUrl] = useState("");

  useEffect(() => {
    if (open) {
      setName(series?.name ?? "");
      setDescription(series?.description ?? "");
      setExampleUrl(series?.example_url ?? "");
    }
  }, [open, series]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not authenticated");
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        example_url: exampleUrl.trim() || null,
      };
      if (series) {
        return updateSeries(series.id, payload);
      }
      return createSeries(payload, user.id, nextPosition);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["series"] });
      toast.success(series ? "Serie actualizada" : "Serie creada");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
            {series ? "Editar serie" : "Nueva serie"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
            Una serie agrupa varios videos en una narrativa multi-parte (parte 1, 2, 3...). La descripción se inyecta como contexto cuando la IA genera guiones de la serie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="series-name" style={{ color: "var(--ll-text-muted)" }}>
              Nombre
            </Label>
            <Input
              id="series-name"
              required
              autoFocus
              placeholder="Aplicando Claude a negocios"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="series-desc" style={{ color: "var(--ll-text-muted)" }}>
              Descripción
            </Label>
            <Textarea
              id="series-desc"
              placeholder="Premisa de la serie, ángulo, qué tipo de videos van adentro..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="series-example" style={{ color: "var(--ll-text-muted)" }}>
              URL de ejemplo (opcional)
            </Label>
            <Input
              id="series-example"
              type="url"
              placeholder="https://instagram.com/reel/..."
              value={exampleUrl}
              onChange={(e) => setExampleUrl(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? "Guardando..." : series ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
