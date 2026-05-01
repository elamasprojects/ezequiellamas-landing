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
import { createShape, updateShape, type Shape } from "@/lib/api/shapes";
import { useSession } from "@/hooks/useSession";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shape?: Shape | null;
  nextPosition: number;
}

export default function ShapeDialog({ open, onOpenChange, shape, nextPosition }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exampleUrl, setExampleUrl] = useState("");

  useEffect(() => {
    if (open) {
      setName(shape?.name ?? "");
      setDescription(shape?.description ?? "");
      setExampleUrl(shape?.example_url ?? "");
    }
  }, [open, shape]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not authenticated");
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        example_url: exampleUrl.trim() || null,
      };
      if (shape) {
        return updateShape(shape.id, payload);
      }
      return createShape(payload, user.id, nextPosition);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shapes"] });
      toast.success(shape ? "Shape actualizado" : "Shape creado");
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
            {shape ? "Editar shape" : "Nuevo shape"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
            Definí la estructura narrativa: hook → contexto → demo → ROI/payoff → CTA. La descripción se usa como contexto cuando la IA genera guiones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="shape-name" style={{ color: "var(--ll-text-muted)" }}>
              Nombre
            </Label>
            <Input
              id="shape-name"
              required
              autoFocus
              placeholder="Antes / Después"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shape-desc" style={{ color: "var(--ll-text-muted)" }}>
              Descripción
            </Label>
            <Textarea
              id="shape-desc"
              placeholder="Hook, beats narrativos, duración aproximada, formato recomendado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shape-example" style={{ color: "var(--ll-text-muted)" }}>
              URL de ejemplo (opcional)
            </Label>
            <Input
              id="shape-example"
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
              {mutation.isPending ? "Guardando..." : shape ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
