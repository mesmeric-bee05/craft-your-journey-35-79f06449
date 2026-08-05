import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Server-side admin check via the has_role security-definer function. */
export function useIsAdmin() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin" as never,
      });
      if (error) throw error;
      return Boolean(data);
    },
  });
  return { isAdmin: q.data ?? false, isLoading: q.isLoading, isResolved: q.isSuccess || q.isError };
}
