import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";

export interface ModerationRules {
  id: string; business_id: string; is_active: boolean;
  spam_keywords: string[]; block_languages: string[];
  min_message_length: number; max_links: number;
  auto_reject_below_score: number | null; auto_approve_above_score: number | null;
  severity_threshold: string;
}

export function useModerationRules() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const businessId = business?.id;

  const rules = useQuery({
    queryKey: ["moderation-rules", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.from("feedback_moderation_rules").select("*").eq("business_id", businessId!).maybeSingle();
      if (error) throw error;
      return data as unknown as ModerationRules | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (r: Partial<ModerationRules>) => {
      const payload: any = { ...r, business_id: businessId };
      const { error } = rules.data
        ? await supabase.from("feedback_moderation_rules").update(payload).eq("business_id", businessId!)
        : await supabase.from("feedback_moderation_rules").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rules saved"); qc.invalidateQueries({ queryKey: ["moderation-rules"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return { rules, upsert };
}

export function previewModeration(text: string, rules: ModerationRules | null): { decision: string; rule?: string } {
  if (!rules || !rules.is_active) return { decision: "pending" };
  if (text.length < rules.min_message_length) return { decision: "spam", rule: "min_length" };
  const links = (text.match(/https?:\/\//g) ?? []).length;
  if (links > rules.max_links) return { decision: "spam", rule: "max_links" };
  for (const kw of rules.spam_keywords) {
    if (kw && text.toLowerCase().includes(kw.toLowerCase())) return { decision: "spam", rule: `spam_keyword:${kw}` };
  }
  return { decision: "pending" };
}
