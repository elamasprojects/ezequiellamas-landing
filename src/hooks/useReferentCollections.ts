import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchReferentCollections,
  fetchSavedReferentVideoIds,
  createReferentCollection,
  saveToReferentCollection,
  removeFromReferentCollection,
} from "@/lib/api/referents";
import { useSession } from "@/hooks/useSession";

export function useReferentCollections() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["referent-collections"],
    queryFn: fetchReferentCollections,
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

// Set of referent_video ids saved in any collection — drives the feed "saved" state.
export function useSavedReferentVideoIds() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["referent-saved-ids"],
    queryFn: fetchSavedReferentVideoIds,
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useCreateReferentCollection() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => {
      if (!user?.id) throw new Error("Necesitás iniciar sesión");
      return createReferentCollection(name, user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referent-collections"] }),
    onError: () => toast.error("No se pudo crear la colección"),
  });
}

export function useSaveToReferentCollection() {
  const { user } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { referentVideoId: string; collectionId?: string }) => {
      if (!user?.id) throw new Error("Necesitás iniciar sesión");
      return saveToReferentCollection({ ...opts, ownerId: user.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referent-collections"] });
      qc.invalidateQueries({ queryKey: ["referent-saved-ids"] });
      toast.success("Guardado");
    },
    onError: () => toast.error("No se pudo guardar"),
  });
}

export function useRemoveFromReferentCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { collectionId: string; referentVideoId: string }) =>
      removeFromReferentCollection(opts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referent-collections"] });
      qc.invalidateQueries({ queryKey: ["referent-saved-ids"] });
    },
    onError: () => toast.error("No se pudo quitar"),
  });
}
