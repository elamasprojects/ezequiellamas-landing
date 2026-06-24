import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import IdeaReviewQueue from "./IdeaReviewQueue";

export default function IdeasInbox() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-accent)" }}
          >
            Ideas
          </div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Tus <em style={{ color: "var(--ll-warm)" }}>ideas</em>
          </h1>
          <p className="max-w-xl text-sm" style={{ color: "var(--ll-text-muted)" }}>
            Elegí primero la duración. Revisá las ideas que generan tus rutinas (deslizá para
            aprobar o descartar), o cargá una manual. Al aprobar, la IA te arma el guion (corto) o
            la estructura de YouTube (largo) en tu tono.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/app/admin/guiones">
              <FileText className="h-4 w-4" /> Ver guiones
            </Link>
          </Button>
          <Button asChild variant="brand">
            <Link to="/app/admin/ideas/new">
              <Plus className="h-4 w-4" /> Nueva idea
            </Link>
          </Button>
        </div>
      </header>

      <IdeaReviewQueue />
    </div>
  );
}
