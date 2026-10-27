import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { addFavorite, listFavorites, removeFavorite } from "@/features/trips/api";

export function useFavorites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["favorites", session?.userId],
    queryFn: listFavorites,
    enabled: Boolean(session),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async ({ tripId, favorite }: { tripId: number; favorite: boolean }) => {
      if (favorite) await removeFavorite(tripId);
      else await addFavorite(tripId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites", session?.userId] });
    },
  });
}
