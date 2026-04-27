import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { detectPlatform, linkVideoPlatform, type VideoPlatform } from "@/lib/api/videos";
import PlatformIcon from "@/components/app/PlatformIcon";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  /** Platforms already linked to this video — disables their detection. */
  existingPlatforms: VideoPlatform[];
}

export default function AddPlatformDialog({ open, onOpenChange, videoId, existingPlatforms }: Props) {
  const [url, setUrl] = useState("");
  const qc = useQueryClient();

  const detected = detectPlatform(url);
  const alreadyLinked = detected ? existingPlatforms.includes(detected) : false;

  const mutation = useMutation({
    mutationFn: (sourceUrl: string) => linkVideoPlatform(videoId, sourceUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video", videoId] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Plataforma agregada y sincronizada");
      setUrl("");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    if (alreadyLinked) {
      toast.error("Esta plataforma ya está vinculada al video");
      return;
    }
    mutation.mutate(url.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--ll-border)] bg-[var(--ll-surface)] text-[var(--ll-text)]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.02em" }}>
            Vincular otra plataforma
          </DialogTitle>
          <DialogDescription style={{ color: "var(--ll-text-muted)" }}>
            Pegá el URL del mismo video posteado en otra plataforma. Lo sumamos al mismo video lógico y
            sincronizamos sus métricas automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="link-url" style={{ color: "var(--ll-text-muted)" }}>
              URL del video
            </Label>
            <Input
              id="link-url"
              type="url"
              required
              autoFocus
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
            />
            {detected && (
              <div
                className="inline-flex items-center gap-2 text-xs"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: alreadyLinked ? "var(--ll-warm)" : `var(--platform-${detected})` }}
              >
                <PlatformIcon platform={detected} className="h-3.5 w-3.5" />
                {alreadyLinked
                  ? `Ya vinculaste ${detected}`
                  : detected === "other"
                    ? "Plataforma no reconocida (no se sincroniza)"
                    : `Detectado: ${detected}`}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={mutation.isPending || !url || alreadyLinked}>
              {mutation.isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
