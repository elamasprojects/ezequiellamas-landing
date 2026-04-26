import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useVideoFeedback } from "@/hooks/useVideoFeedback";
import { useSession } from "@/hooks/useSession";
import { createFeedback, deleteFeedback, type FeedbackWithAuthor } from "@/lib/api/feedback";
import { sendNotification } from "@/lib/api/notifications";

interface Props {
  videoId: string;
  videoTitle: string;
  /** id of the admin who owns the content. Required to attribute feedback. */
  adminId: string;
  /** Whether the current user is allowed to write — typically advisor or the admin himself replying. */
  canWrite: boolean;
}

export default function FeedbackThread({ videoId, videoTitle, adminId, canWrite }: Props) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const { data: feedback, isLoading } = useVideoFeedback(videoId);

  const isAdmin = user?.id === adminId;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not authenticated");
      // If user is the admin replying, advisor_id is the latest commenter (or themselves if no thread).
      // Simpler: store adminId/advisorId both; if admin is the author, advisor_id mirrors first advisor in the thread or themselves.
      const advisorId = isAdmin
        ? feedback?.find((f) => f.advisor_id !== adminId)?.advisor_id ?? adminId
        : user.id;
      const created = await createFeedback({
        admin_id: adminId,
        advisor_id: advisorId,
        video_id: videoId,
        scope: "video",
        body: body.trim(),
      });
      // Notify admin if the author is not the admin
      if (!isAdmin) {
        await sendNotification({
          user_id: adminId,
          kind: "feedback_received",
          title: `Nuevo feedback en "${videoTitle}"`,
          body: body.trim().slice(0, 200),
          link: `${window.location.origin}/app/admin/videos/${videoId}`,
          send_email: true,
        }).catch(() => {});
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video_feedback", videoId] });
      setBody("");
      toast.success("Feedback enviado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeedback,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["video_feedback", videoId] });
      toast.success("Comentario eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    createMutation.mutate();
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Skeleton className="h-32 w-full bg-[var(--ll-surface)]" />
      ) : !feedback || feedback.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ll-text-muted)" }}>
          {canWrite
            ? "Sin comentarios todavía. Sé el primero."
            : "Sin comentarios todavía."}
        </p>
      ) : (
        <ul className="space-y-3">
          {feedback.map((f) => (
            <FeedbackItem
              key={f.id}
              item={f}
              canDelete={user?.id === f.advisor_id || user?.id === adminId}
              onDelete={() => deleteMutation.mutate(f.id)}
            />
          ))}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
          <Textarea
            placeholder={
              isAdmin
                ? "Respondé al asesor..."
                : "Tu feedback. Sé específico y accionable."
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="border-[var(--ll-border)] bg-[var(--ll-surface-2)] text-[var(--ll-text)]"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="brand" disabled={createMutation.isPending || !body.trim()}>
              <Send className="h-4 w-4" />
              {createMutation.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function FeedbackItem({
  item,
  canDelete,
  onDelete,
}: {
  item: FeedbackWithAuthor;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-lg border border-[var(--ll-border)] bg-[var(--ll-surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: "var(--ll-surface-2)", color: "var(--ll-text-muted)" }}
          >
            <User className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: "var(--ll-text)" }}>
              {item.advisor?.full_name || item.advisor?.email || "Anónimo"}
            </div>
            <div
              className="text-[10px]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--ll-text-dim)" }}
            >
              {new Date(item.created_at).toLocaleString("es-AR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-7 w-7 text-[var(--ll-text-muted)] hover:text-red-400"
            aria-label="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--ll-text)" }}>
        {item.body}
      </p>
    </li>
  );
}
