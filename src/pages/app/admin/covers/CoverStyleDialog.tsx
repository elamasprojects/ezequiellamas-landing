import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCoverStyle,
  updateCoverStyle,
  type CoverStyle,
} from "@/lib/api/coverStyles";
import { useSession } from "@/hooks/useSession";

interface FormValues {
  name: string;
  description: string;
  when_to_use: string;
  system_prompt: string;
  reference_image_url: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  style: CoverStyle | null;
  nextPosition: number;
}

export default function CoverStyleDialog({ open, onOpenChange, style, nextPosition }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        name: style?.name ?? "",
        description: style?.description ?? "",
        when_to_use: style?.when_to_use ?? "",
        system_prompt: style?.system_prompt ?? "",
        reference_image_url: style?.reference_image_url ?? "",
      });
    }
  }, [open, style, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!user) throw new Error("not_authenticated");
      const input = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        when_to_use: values.when_to_use.trim() || null,
        system_prompt: values.system_prompt.trim(),
        reference_image_url: values.reference_image_url.trim() || null,
      };
      return style
        ? updateCoverStyle(style.id, input)
        : createCoverStyle(input, user.id, nextPosition);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cover_styles"] });
      toast.success(style ? "Estilo actualizado" : "Estilo creado");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
            {style ? "Editar estilo" : "Nuevo estilo de portada"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cs-name">Nombre *</Label>
            <Input
              id="cs-name"
              placeholder="ej: thumb-short-object"
              className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]"
              {...register("name", { required: "Requerido" })}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cs-desc">Descripción</Label>
            <Input
              id="cs-desc"
              placeholder="Producto físico en primer plano..."
              className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]"
              {...register("description")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cs-when">Cuándo usarlo</Label>
            <Input
              id="cs-when"
              placeholder="Videos sobre herramientas, demos de software..."
              className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]"
              {...register("when_to_use")}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cs-prompt">System prompt del estilo *</Label>
            <Textarea
              id="cs-prompt"
              rows={5}
              placeholder="Instrucciones específicas de composición, encuadre y tratamiento visual para este estilo..."
              className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)] resize-none"
              {...register("system_prompt", { required: "Requerido" })}
            />
            {errors.system_prompt && (
              <p className="text-xs text-red-400">{errors.system_prompt.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cs-ref">URL imagen de referencia</Label>
            <Input
              id="cs-ref"
              type="url"
              placeholder="https://..."
              className="border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]"
              {...register("reference_image_url")}
            />
            <p className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
              URL pública de la imagen de referencia para este estilo.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : style ? "Guardar cambios" : "Crear estilo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
