import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBrollStyle,
  deleteBrollStyle,
  fetchBrollStyles,
  fetchQueuedBrolls,
  updateBrollStyle,
  type BrollStyleInsert,
  type BrollStyleUpdate,
} from "@/lib/api/brolls";

export function useQueuedBrolls() {
  return useQuery({
    queryKey: ["brolls", "queue"],
    queryFn: fetchQueuedBrolls,
  });
}

export function useBrollStyles() {
  return useQuery({
    queryKey: ["brolls", "styles"],
    queryFn: fetchBrollStyles,
  });
}

export function useCreateBrollStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<BrollStyleInsert, "owner_id">) => createBrollStyle(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brolls", "styles"] }),
  });
}

export function useUpdateBrollStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BrollStyleUpdate }) =>
      updateBrollStyle(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brolls", "styles"] }),
  });
}

export function useDeleteBrollStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrollStyle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brolls", "styles"] }),
  });
}
