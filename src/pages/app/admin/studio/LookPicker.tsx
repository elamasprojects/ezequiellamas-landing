import { Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeygenAvatar } from "@/lib/api/youtubeStudio";

// Horizontal gallery of HeyGen looks (preview + name). `value` is the selected
// avatar_id; null = "Por defecto" (when allowDefault) or none.
export default function LookPicker({
  avatars,
  value,
  onChange,
  allowDefault,
  disabled,
}: {
  avatars: HeygenAvatar[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowDefault?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {allowDefault && (
        <Tile selected={value === null} onClick={() => onChange(null)} disabled={disabled} label="Por defecto">
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-5 w-5" style={{ color: "var(--ll-text-dim)" }} />
          </div>
        </Tile>
      )}
      {avatars.map((a) => (
        <Tile key={a.avatar_id} selected={value === a.avatar_id} onClick={() => onChange(a.avatar_id)} disabled={disabled} label={a.name}>
          {a.preview_image_url ? (
            <img src={a.preview_image_url} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-5 w-5" style={{ color: "var(--ll-text-dim)" }} />
            </div>
          )}
        </Tile>
      ))}
    </div>
  );
}

function Tile({
  selected,
  onClick,
  disabled,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "relative w-20 shrink-0 overflow-hidden rounded-lg border text-left disabled:opacity-50",
        selected ? "border-[var(--ll-accent)]" : "border-[var(--ll-border)]",
      )}
    >
      <div className="aspect-square bg-[var(--ll-surface-2)]">{children}</div>
      <div className="truncate px-1 py-0.5 text-[10px]" style={{ color: selected ? "var(--ll-accent)" : "var(--ll-text-muted)" }}>
        {label}
      </div>
      {selected && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "var(--ll-accent)", color: "#0a0a0a" }}>
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}
