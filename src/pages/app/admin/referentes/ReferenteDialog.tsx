import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { createReferent, updateReferent, type Referent } from "@/lib/api/referents";
import { parseProfileUrl } from "@/lib/parseProfileUrl";
import { useSession } from "@/hooks/useSession";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referent?: Referent | null;
  nextPosition: number;
}

export default function ReferenteDialog({ open, onOpenChange, referent, nextPosition }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  useEffect(() => {
    if (open) {
      setName(referent?.name ?? "");
      setNote(referent?.note ?? "");
      setInstagramUrl(referent?.instagram_url ?? "");
      setYoutubeUrl(referent?.youtube_url ?? "");
      setTiktokUrl(referent?.tiktok_url ?? "");
    }
  }, [open, referent]);

  const igParsed = useMemo(() => parseProfileUrl(instagramUrl), [instagramUrl]);
  const ytParsed = useMemo(() => parseProfileUrl(youtubeUrl), [youtubeUrl]);
  const ttParsed = useMemo(() => parseProfileUrl(tiktokUrl), [tiktokUrl]);

  const igInvalid = instagramUrl.trim().length > 0 && (!igParsed || igParsed.platform !== "instagram");
  const ytInvalid = youtubeUrl.trim().length > 0 && (!ytParsed || ytParsed.platform !== "youtube");
  const ttInvalid = tiktokUrl.trim().length > 0 && (!ttParsed || ttParsed.platform !== "tiktok");

  const hasAtLeastOneUrl =
    instagramUrl.trim().length > 0 || youtubeUrl.trim().length > 0 || tiktokUrl.trim().length > 0;
  const formValid =
    name.trim().length > 0 && hasAtLeastOneUrl && !igInvalid && !ytInvalid && !ttInvalid;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      const payload = {
        name,
        note: note || null,
        instagram_url: instagramUrl || null,
        youtube_url: youtubeUrl || null,
        tiktok_url: tiktokUrl || null,
      };
      if (referent) return updateReferent(referent.id, payload);
      return createReferent(payload, user.id, nextPosition);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referents"] });
      if (referent) qc.invalidateQueries({ queryKey: ["referent", referent.id] });
      toast.success(referent ? "Referente actualizado" : "Referente creado");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
            {referent ? "Editar referente" : "Nuevo referente"}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
            Sumá un creator a tu radar de inspiración. Pegá los links de sus perfiles y escribí qué te gusta de su contenido.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ref-name" style={{ color: "var(--ll-text-muted)" }}>
              Nombre
            </Label>
            <Input
              id="ref-name"
              required
              autoFocus
              placeholder="Alex Hormozi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref-ig" style={{ color: "var(--ll-text-muted)" }}>
              Instagram (URL)
            </Label>
            <Input
              id="ref-ig"
              type="url"
              placeholder="https://instagram.com/hormozi"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            {igParsed?.platform === "instagram" && (
              <p className="text-xs" style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
                @{igParsed.handle}
              </p>
            )}
            {igInvalid && (
              <p className="text-xs text-red-400">URL no parece de Instagram.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref-yt" style={{ color: "var(--ll-text-muted)" }}>
              YouTube (URL)
            </Label>
            <Input
              id="ref-yt"
              type="url"
              placeholder="https://youtube.com/@hormozi"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            {ytParsed?.platform === "youtube" && (
              <p className="text-xs" style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
                {ytParsed.handle}
              </p>
            )}
            {ytInvalid && <p className="text-xs text-red-400">URL no parece de YouTube.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref-tt" style={{ color: "var(--ll-text-muted)" }}>
              TikTok (URL, opcional)
            </Label>
            <Input
              id="ref-tt"
              type="url"
              placeholder="https://tiktok.com/@hormozi"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            {ttParsed?.platform === "tiktok" && (
              <p className="text-xs" style={{ color: "var(--ll-text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
                @{ttParsed.handle}
              </p>
            )}
            {ttInvalid && <p className="text-xs text-red-400">URL no parece de TikTok.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref-note" style={{ color: "var(--ll-text-muted)" }}>
              Nota (opcional)
            </Label>
            <Textarea
              id="ref-note"
              placeholder="Qué te gusta de su contenido. Ej: cómo abre con loop, el ritmo, el tipo de hook..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
          </div>

          {!hasAtLeastOneUrl && (
            <p className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
              Pegá al menos un link (IG, YT o TT) para guardar.
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={mutation.isPending || !formValid}>
              {mutation.isPending ? "Guardando..." : referent ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
