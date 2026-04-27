import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, Plug, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "./PlatformBadge";
import { startOAuth } from "@/lib/api/publishing";
import { deleteSocialAccount, type SocialAccountPublic } from "@/lib/api/socialAccounts";
import type { PublishPlatform } from "@/lib/publishing/platformLimits";
import { PLATFORM_LABEL } from "@/lib/publishing/platformLimits";

interface Props {
  platform: PublishPlatform;
  account: SocialAccountPublic | undefined;
}

const NOTES: Record<PublishPlatform, string> = {
  instagram:
    "Cuenta Business o Creator vinculada a una Página de Facebook. La app de Meta vive en Development mode.",
  youtube:
    "Canal asociado a tu cuenta de Google. La app está en Testing mode (vos estás en la lista de test users).",
  tiktok:
    "Cuenta personal o Business. Los videos se suben en Upload Mode (borrador) — completás el post desde la app del celular.",
};

export function ConnectionCard({ platform, account }: Props) {
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);

  const disconnect = useMutation({
    mutationFn: () => deleteSocialAccount(account!.id),
    onSuccess: () => {
      toast.success(`${PLATFORM_LABEL[platform]} desconectado`);
      qc.invalidateQueries({ queryKey: ["social-accounts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await startOAuth({
        platform,
        redirect_path: "/app/admin/publishing/connections",
      });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error iniciando OAuth");
      setConnecting(false);
    }
  }

  const isConnected = account?.status === "connected";

  return (
    <div className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <PlatformBadge platform={platform} size="md" />
          {isConnected && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[var(--ll-accent)]" />
              <span style={{ color: "var(--ll-text)" }}>
                {account.display_name ?? account.external_account_id}
              </span>
            </div>
          )}
        </div>
        {isConnected ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="text-[var(--ll-text-muted)] hover:text-red-400"
          >
            {disconnect.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unplug className="h-4 w-4" />
            )}
            <span>Desconectar</span>
          </Button>
        ) : (
          <Button variant="brand" size="sm" onClick={handleConnect} disabled={connecting}>
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            <span>Conectar</span>
          </Button>
        )}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--ll-text-muted)" }}>
        {NOTES[platform]}
      </p>

      {isConnected && account.token_expires_at && (
        <div
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
        >
          Token expira: {new Date(account.token_expires_at).toLocaleDateString("es-AR")}
        </div>
      )}

      {isConnected && (
        <a
          href={
            platform === "instagram"
              ? `https://instagram.com/${account.display_name?.replace(/^@/, "") ?? ""}`
              : platform === "youtube"
                ? `https://youtube.com/${account.display_name ?? ""}`
                : `https://tiktok.com/@${account.display_name?.replace(/^@/, "") ?? ""}`
          }
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: "var(--ll-accent)" }}
        >
          Ver perfil <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
