import { Bookmark, Repeat2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function RailButton({
  icon,
  label,
  onClick,
  href,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
}) {
  const inner = (
    <>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur transition-colors",
          active ? "text-[var(--ll-accent)]" : "text-white",
        )}
      >
        {icon}
      </span>
      <span className="text-[11px] font-medium text-white drop-shadow">{label}</span>
    </>
  );
  const cls = "flex flex-col items-center gap-1";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} aria-label={label}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      {inner}
    </button>
  );
}

interface Props {
  saved: boolean;
  onSave: () => void;
  onReuse: () => void;
  sourceUrl: string | null;
}

/** Vertical Instagram/TikTok-style action rail down the right edge of a feed slide. */
export function ReferentActionsRail({ saved, onSave, onReuse, sourceUrl }: Props) {
  return (
    <div className="absolute bottom-24 right-3 z-30 flex flex-col items-center gap-5">
      <RailButton
        icon={<Bookmark className="h-6 w-6" fill={saved ? "currentColor" : "none"} />}
        label={saved ? "Guardado" : "Guardar"}
        onClick={onSave}
        active={saved}
      />
      <RailButton icon={<Repeat2 className="h-6 w-6" />} label="Reutilizar" onClick={onReuse} />
      {sourceUrl && (
        <RailButton icon={<ExternalLink className="h-6 w-6" />} label="Abrir" href={sourceUrl} />
      )}
    </div>
  );
}
