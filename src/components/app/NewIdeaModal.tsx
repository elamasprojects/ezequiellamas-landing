import { useNavigate } from "react-router-dom";
import { Smartphone, Youtube } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Big "capture a new idea" modal. A single question with two large choices:
 * Corto (short-form → /ideas/new) or Largo (long-form → YouTube studio capture).
 * It's the top-priority entry point of the admin app.
 */
export default function NewIdeaModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  function go(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-[var(--ll-border)] bg-[var(--ll-bg)] text-[var(--ll-text)]">
        <DialogHeader>
          <DialogTitle
            className="text-center text-2xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em" }}
          >
            ¿Qué tipo de contenido querés idear?
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <ChoiceButton
            label="Corto"
            sub="Reel · Short · TikTok"
            icon={<Smartphone className="h-9 w-9" />}
            onClick={() => go("/app/admin/ideas/new")}
          />
          <ChoiceButton
            label="Largo"
            sub="Video de YouTube"
            icon={<Youtube className="h-9 w-9" />}
            onClick={() => go("/app/admin/studio")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChoiceButton({
  label,
  sub,
  icon,
  onClick,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[10rem] flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center transition-colors"
      style={{ borderColor: "var(--ll-border)", background: "var(--ll-surface)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--ll-accent)";
        e.currentTarget.style.background = "var(--ll-accent-dim)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ll-border)";
        e.currentTarget.style.background = "var(--ll-surface)";
      }}
    >
      <span className="text-xl font-medium" style={{ color: "var(--ll-text)" }}>
        {label}
      </span>
      <span style={{ color: "var(--ll-accent)" }}>{icon}</span>
      <span className="text-xs" style={{ color: "var(--ll-text-muted)" }}>
        {sub}
      </span>
    </button>
  );
}
