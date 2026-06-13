import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/useSession";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import {
  type FollowerGoals,
  type PlatformKey,
  parseFollowerGoals,
  upsertCreatorProfile,
} from "@/lib/api/creatorProfile";

const PLATFORMS: { key: PlatformKey; label: string; color: string }[] = [
  { key: "instagram", label: "Instagram", color: "var(--platform-instagram, #e1306c)" },
  { key: "tiktok", label: "TikTok", color: "var(--platform-tiktok, #25f4ee)" },
  { key: "youtube", label: "YouTube", color: "var(--platform-youtube, #ff0000)" },
];

/**
 * Configuración → Objetivos. Sets per-platform follower goals shown as progress
 * bars on the dashboard. Stored in creator_profile.follower_goals.
 */
export default function GoalsTab() {
  const { user } = useSession();
  const { data: profile, isLoading } = useCreatorProfile();
  const qc = useQueryClient();
  const [goals, setGoals] = useState<FollowerGoals>(() => parseFollowerGoals(null));

  useEffect(() => {
    setGoals(parseFollowerGoals(profile?.follower_goals));
  }, [profile]);

  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      return upsertCreatorProfile(user.id, { follower_goals: goals });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator_profile"] });
      toast.success("Objetivos guardados");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Cargando...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
        Definí tu meta de seguidores por plataforma. La barra de progreso aparece en el dashboard, y
        cuando la alcanzás, el objetivo sube automáticamente un 20%.
      </p>

      <div className="space-y-4">
        {PLATFORMS.map((p) => (
          <div key={p.key} className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              {p.label}
            </Label>
            <Input
              type="number"
              min={1}
              value={goals[p.key]}
              onChange={(e) =>
                setGoals((g) => ({ ...g, [p.key]: Math.max(1, Math.round(Number(e.target.value) || 0)) }))
              }
              className="max-w-xs border-[var(--ll-border)] bg-[var(--ll-surface-2)]"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="brand" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
