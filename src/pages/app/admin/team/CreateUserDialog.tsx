import { useState, type FormEvent } from "react";
import { toast } from "sonner";
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
import { supabase } from "@/lib/supabase";
import { ALL_ROLES, ROLE_LABEL, type AppRole } from "@/lib/api/roles";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateUserDialog({ open, onOpenChange, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("editor");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: { email, role },
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "No se pudo crear el usuario");
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }

    toast.success(`Usuario creado: ${email}`);
    setEmail("");
    setRole("editor");
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
            Crear miembro
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
            Creamos el usuario al toque con la contraseña por defecto <code className="rounded bg-[var(--ll-surface-2)] px-1.5 py-0.5 font-mono text-xs">123456</code>. Después
            mandale los accesos por mail desde la tabla con el botón <em>Enviar accesos</em>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="create-email" style={{ color: "var(--ll-text-muted)" }}>
              Email
            </Label>
            <Input
              id="create-email"
              type="email"
              required
              autoFocus
              placeholder="persona@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          <div className="space-y-2">
            <Label style={{ color: "var(--ll-text-muted)" }}>Rol</Label>
            <div className="flex gap-2">
              {ALL_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={
                    role === r
                      ? "rounded-md border border-[var(--ll-accent)] bg-[var(--ll-accent)]/10 px-3 py-2 text-sm text-[var(--ll-accent)]"
                      : "rounded-md border border-[var(--ll-border)] bg-[var(--ll-surface-2)] px-3 py-2 text-sm text-[var(--ll-text-muted)] hover:bg-[var(--ll-surface)]"
                  }
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={submitting || !email}>
              {submitting ? "Creando..." : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
