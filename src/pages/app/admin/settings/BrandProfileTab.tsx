import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import {
  type AspirationalReferent,
  type BrandPatch,
  parseReferents,
  upsertCreatorProfile,
} from "@/lib/api/creatorProfile";
import ReferentsField from "@/pages/app/admin/settings/ReferentsField";

export default function BrandProfileTab() {
  const { user } = useSession();
  const { data: profile, isLoading } = useCreatorProfile();
  const qc = useQueryClient();

  const [productService, setProductService] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [shortStrategy, setShortStrategy] = useState("");
  const [longStrategy, setLongStrategy] = useState("");
  const [referents, setReferents] = useState<AspirationalReferent[]>([]);

  // Seed local state from the loaded row (matches FormatDialog pattern).
  useEffect(() => {
    if (!profile) return;
    setProductService(profile.product_service ?? "");
    setTargetAudience(profile.target_audience ?? "");
    setShortStrategy(profile.short_form_strategy ?? "");
    setLongStrategy(profile.long_form_strategy ?? "");
    setReferents(parseReferents(profile.aspirational_referents));
  }, [profile]);

  const save = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("not authenticated");
      const patch: BrandPatch = {
        product_service: productService.trim() || null,
        target_audience: targetAudience.trim() || null,
        short_form_strategy: shortStrategy.trim() || null,
        long_form_strategy: longStrategy.trim() || null,
        aspirational_referents: referents.filter(
          (r) => r.name.trim() || r.what_i_like.trim() || r.why.trim(),
        ),
      };
      return upsertCreatorProfile(user.id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator_profile"] });
      toast.success("Perfil de marca guardado");
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
      <Field
        label="Producto o servicio"
        help="Qué ofrecés, con descripción detallada."
        value={productService}
        onChange={setProductService}
        rows={4}
      />
      <Field
        label="Audiencia objetivo"
        help="A quién te dirigís."
        value={targetAudience}
        onChange={setTargetAudience}
        rows={3}
      />
      <Field
        label="Estrategia de contenido corto"
        help="Pilares, tono y formatos preferidos para shorts/reels."
        value={shortStrategy}
        onChange={setShortStrategy}
        rows={4}
      />
      <Field
        label="Estrategia de contenido largo"
        help="Estructura, objetivos y formatos para YouTube long-form."
        value={longStrategy}
        onChange={setLongStrategy}
        rows={4}
      />

      <div className="space-y-2">
        <Label>Referentes aspiracionales</Label>
        <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          Dos o tres creators que admirás: qué te gusta de cada uno y por qué querés un contenido
          similar.
        </p>
        <ReferentsField value={referents} onChange={setReferents} />
      </div>

      <div className="flex justify-end">
        <Button variant="brand" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {help && (
        <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
          {help}
        </p>
      )}
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
    </div>
  );
}
