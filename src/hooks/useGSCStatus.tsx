import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Mode = "token" | "verify" | "add" | "status";

async function call(mode: Mode) {
  const { data, error } = await supabase.functions.invoke("gsc-verify-site", { body: { mode } });
  if (error) throw error;
  return data;
}

export function useGSCStatus() {
  return useQuery({
    queryKey: ["gsc-status"],
    queryFn: () => call("status"),
    refetchInterval: 5 * 60_000,
    retry: 0,
  });
}

export function useGSCAction() {
  const qc = useQueryClient();
  const token = useMutation({
    mutationFn: () => call("token"),
    onSuccess: () => toast.success("Verification token minted"),
    onError: (e: any) => toast.error(e.message ?? "Failed to mint token"),
  });
  const verify = useMutation({
    mutationFn: () => call("verify"),
    onSuccess: () => { toast.success("Verification submitted"); qc.invalidateQueries({ queryKey: ["gsc-status"] }); },
    onError: (e: any) => toast.error(e.message ?? "Verification failed — make sure the META tag is deployed"),
  });
  const add = useMutation({
    mutationFn: () => call("add"),
    onSuccess: () => { toast.success("Site added & sitemap submitted"); qc.invalidateQueries({ queryKey: ["gsc-status"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to add site"),
  });
  return { token, verify, add };
}
