import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Optimistic "move a card between Kanban columns" mutation, shared by every
 * board. Writes the new status into the cached list immediately, rolls back on
 * error, and revalidates the EXACT query key on settle (no broad-prefix refetch
 * storm across unrelated cached variants of the same resource).
 */
export function useKanbanMove<T extends { id: string }>(opts: {
  /** The exact query key holding the list of rows being reordered. */
  queryKey: QueryKey;
  /** Persist the move server-side. */
  apply: (id: string, status: string) => Promise<unknown>;
  /** Produce the optimistically-updated row. */
  patch: (row: T, status: string) => T;
  /** Toast shown if the persist fails. */
  errorMessage: string;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => opts.apply(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: opts.queryKey });
      const prev = qc.getQueryData<T[]>(opts.queryKey);
      qc.setQueryData<T[]>(opts.queryKey, (old) =>
        (old ?? []).map((row) => (row.id === id ? opts.patch(row, status) : row)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(opts.queryKey, ctx.prev);
      toast.error(opts.errorMessage);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: opts.queryKey, exact: true }),
  });
}
