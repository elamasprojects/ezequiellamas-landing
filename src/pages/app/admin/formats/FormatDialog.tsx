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
import {
  createFormat,
  updateFormat,
  type Format,
} from "@/lib/api/formats";
import { useSession } from "@/hooks/useSession";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format?: Format | null;
  nextPosition: number;
}

export default function FormatDialog({ open, onOpenChange, format, nextPosition }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exampleUrl, setExampleUrl] = useState("");

  useEffect(() => {
    if (open) {
      setName(format?.name ?? "");
      setDescription(format?.description ?? "");
      setExampleUrl(format?.example_url ?? "");
    }
  }, [open, format]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not authenticated");
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        example_url: exampleUrl.trim() || null,
      };
      if (format) {
        return updateFormat(format.id, payload);
      }
      return createFormat(payload, user.id, nextPosition);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formats"] });
      toast.success(format ? "Formato actualizado" : "Formato creado");
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
            {format ? "Editar formato" : "Nuevo formato"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
            Definí cómo grabás este tipo de video. La descripción se usa como contexto cuando la IA genera guiones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="format-name" style={{ color: "var(--ll-text-muted)" }}>
              Nombre
            </Label>
            <Input
              id="format-name"
              required
              autoFocus
              placeholder="Pantalla + rostro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format-desc" style={{ color: "var(--ll-text-muted)" }}>
              Descripción
            </Label>
            <Textarea
              id="format-desc"
              placeholder="Cómo grabás, qué cámara, qué tipo de contenido encaja..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format-example" style={{ color: "var(--ll-text-muted)" }}>
              URL de ejemplo (opcional)
            </Label>
            <Input
              id="format-example"
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
              {mutation.isPending ? "Guardando..." : format ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
