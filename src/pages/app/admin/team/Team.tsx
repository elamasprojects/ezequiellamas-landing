import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchTeamMembers, ROLE_LABEL, type AppRole } from "@/lib/api/roles";
import { fetchPairingsForAdmin, togglePairingActive } from "@/lib/api/advisorAssignments";
import CreateUserDialog from "@/pages/app/admin/team/CreateUserDialog";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

export default function Team() {
  const { user } = useSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: members, isLoading, refetch } = useQuery({
    queryKey: ["team_members"],
    queryFn: fetchTeamMembers,
  });

  const { data: pairings } = useQuery({
    queryKey: ["advisor_pairings", user?.id],
    queryFn: () => fetchPairingsForAdmin(user!.id),
    enabled: !!user?.id,
  });

  const pairingByAdvisor = new Map((pairings ?? []).map((p) => [p.advisor_id, p.active]));

  const toggleMutation = useMutation({
    mutationFn: ({ advisorId, active }: { advisorId: string; active: boolean }) => {
      if (!user) throw new Error("not authenticated");
      return togglePairingActive(user.id, advisorId, active);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advisor_pairings", user?.id] });
      toast.success("Asignación actualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleSendAccess(targetUserId: string, email: string) {
    setSendingTo(targetUserId);
    const { data, error } = await supabase.functions.invoke("send-access-email", {
      body: { user_id: targetUserId },
    });
    setSendingTo(null);
    if (error) {
      toast.error(error.message ?? "No se pudo enviar el mail");
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    toast.success(`Accesos enviados a ${email}`);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Equipo
          </div>
          <h1
            className="text-2xl md:text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Quién <em style={{ color: "var(--ll-warm)" }}>tiene acceso</em>
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Creás el usuario al toque con la contraseña por defecto <code className="rounded bg-[var(--ll-surface-2)] px-1.5 py-0.5 font-mono text-[11px]">123456</code>.
            Cuando esté listo, mandale los accesos por mail con el botón de cada fila. Para los asesores, podés
            activar/desactivar el acceso a tus videos con el toggle.
          </p>
        </div>
        <Button variant="brand" onClick={() => setCreateOpen(true)} className="self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Crear miembro
        </Button>
      </header>

      <div className="overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--ll-border)] hover:bg-transparent">
              <TableHead style={{ color: "var(--ll-text-muted)" }}>Email</TableHead>
              <TableHead style={{ color: "var(--ll-text-muted)" }}>Roles</TableHead>
              <TableHead style={{ color: "var(--ll-text-muted)" }}>Asignado</TableHead>
              <TableHead style={{ color: "var(--ll-text-muted)" }}>Desde</TableHead>
              <TableHead className="text-right" style={{ color: "var(--ll-text-muted)" }}>
                Accesos
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center" style={{ color: "var(--ll-text-muted)" }}>
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && members && members.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center" style={{ color: "var(--ll-text-muted)" }}>
                  Todavía no creaste ningún miembro.
                </TableCell>
              </TableRow>
            )}
            {members?.map((m) => {
              const isAdvisor = m.roles.includes("advisor");
              const isMe = m.user_id === user?.id;
              const active = pairingByAdvisor.get(m.user_id) ?? false;
              return (
                <TableRow key={m.user_id} className="border-[var(--ll-border)]">
                  <TableCell className="font-medium" style={{ color: "var(--ll-text)" }}>
                    {m.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {m.roles.length === 0 && (
                        <span className="text-xs" style={{ color: "var(--ll-text-dim)" }}>
                          sin rol
                        </span>
                      )}
                      {m.roles.map((r: AppRole) => (
                        <Badge key={r} variant={r}>
                          {ROLE_LABEL[r]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isAdvisor && !isMe ? (
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs" style={{ color: "var(--ll-text-muted)" }}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) =>
                            toggleMutation.mutate({ advisorId: m.user_id, active: e.target.checked })
                          }
                          className="h-4 w-4 cursor-pointer accent-[var(--ll-accent)]"
                        />
                        {active ? "Activo" : "Inactivo"}
                      </label>
                    ) : (
                      <span style={{ color: "var(--ll-text-dim)" }}>—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className="text-xs"
                    style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {new Date(m.created_at).toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {isMe ? (
                      <span style={{ color: "var(--ll-text-dim)" }}>—</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={sendingTo === m.user_id}
                        onClick={() => handleSendAccess(m.user_id, m.email)}
                        className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {sendingTo === m.user_id ? "Enviando..." : "Enviar accesos"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          setCreateOpen(false);
          refetch();
          qc.invalidateQueries({ queryKey: ["advisor_pairings", user?.id] });
        }}
      />
    </div>
  );
}
