import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import InviteDialog from "@/pages/app/admin/team/InviteDialog";

export default function Team() {
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: members, isLoading, refetch } = useQuery({
    queryKey: ["team_members"],
    queryFn: fetchTeamMembers,
  });

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Equipo
          </div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Quién <em style={{ color: "var(--ll-warm)" }}>tiene acceso</em>
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Editores y asesores que invitas reciben un magic-link a su mail. Cuando entran, ven solo lo de su rol.
          </p>
        </div>
        <Button variant="brand" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" /> Invitar miembro
        </Button>
      </header>

      <div className="overflow-hidden rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)]">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--ll-border)] hover:bg-transparent">
              <TableHead style={{ color: "var(--ll-text-muted)" }}>Email</TableHead>
              <TableHead style={{ color: "var(--ll-text-muted)" }}>Roles</TableHead>
              <TableHead style={{ color: "var(--ll-text-muted)" }}>Desde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center" style={{ color: "var(--ll-text-muted)" }}>
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && members && members.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center" style={{ color: "var(--ll-text-muted)" }}>
                  Todavía no hay miembros invitados.
                </TableCell>
              </TableRow>
            )}
            {members?.map((m) => (
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
                <TableCell
                  className="text-xs"
                  style={{ color: "var(--ll-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {new Date(m.created_at).toLocaleDateString("es-AR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => {
          setInviteOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
