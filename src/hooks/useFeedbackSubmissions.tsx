import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/auditLog";

export interface FeedbackSubmission {
  id: string;
  business_id: string;
  form_id: string | null;
  source: "public_form" | "manual" | "inbox" | "csat";
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  rating: number | null;
  message: string;
  status: "pending" | "approved" | "rejected" | "spam";
  created_at: string;
}

export interface FeedbackForm {
  id: string;
  business_id: string;
  slug: string;
  title: string;
  description: string | null;
  is_active: boolean;
  require_contact: boolean;
  created_at: string;
}

export function useFeedbackSubmissions(status?: string) {
  const { business } = useBusiness();
  const { user } = useAuth();
  const qc = useQueryClient();

  const submissions = useQuery({
    queryKey: ["feedback-submissions", business?.id, status ?? "all"],
    enabled: !!business?.id,
    queryFn: async () => {
      let q = supabase
        .from("feedback_submissions")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackSubmission[];
    },
  });

  const moderate = useMutation({
    mutationFn: async (args: { id: string; status: FeedbackSubmission["status"] }) => {
      const { error } = await supabase
        .from("feedback_submissions")
        .update({
          status: args.status,
          moderated_by: user?.id,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", args.id)
        .eq("business_id", business!.id);
      if (error) throw error;
      await logAuditEvent(`feedback.${args.status}`, {
        entityType: "feedback_submission",
        entityId: args.id,
        businessId: business!.id,
      });
    },
    onSuccess: () => {
      toast.success("Feedback updated");
      qc.invalidateQueries({ queryKey: ["feedback-submissions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const addManual = useMutation({
    mutationFn: async (input: {
      message: string;
      customer_name?: string;
      rating?: number;
    }) => {
      const { data, error } = await supabase
        .from("feedback_submissions")
        .insert({
          business_id: business!.id,
          source: "manual",
          message: input.message,
          customer_name: input.customer_name ?? null,
          rating: input.rating ?? null,
          status: "approved",
          submitted_by: user!.id,
          moderated_by: user!.id,
          moderated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      // Fire-and-forget AI analysis
      supabase.functions.invoke("analyze-customer-sentiment", {
        body: {
          business_id: business!.id,
          text: input.message,
          source: "manual",
        },
      }).catch(() => {});
      return data;
    },
    onSuccess: () => {
      toast.success("Feedback recorded");
      qc.invalidateQueries({ queryKey: ["feedback-submissions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add"),
  });

  return { submissions, moderate, addManual };
}

export function useFeedbackForms() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const qc = useQueryClient();

  const forms = useQuery({
    queryKey: ["feedback-forms", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_forms")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackForm[];
    },
  });

  const checkSlug = async (slug: string) => {
    const normalized = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(normalized)) return false;
    const { data, error } = await supabase.rpc("is_feedback_slug_available" as any, {
      p_slug: normalized,
    });
    if (error) return false;
    return Boolean(data);
  };

  const createForm = useMutation({
    mutationFn: async (input: {
      slug: string;
      title: string;
      description?: string;
      require_contact?: boolean;
    }) => {
      const slug = input.slug.trim().toLowerCase();
      const available = await checkSlug(slug);
      if (!available) throw new Error("Slug is taken or invalid");
      const { data, error } = await supabase
        .from("feedback_forms")
        .insert({
          business_id: business!.id,
          slug,
          title: input.title,
          description: input.description ?? null,
          require_contact: input.require_contact ?? false,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Feedback form created");
      qc.invalidateQueries({ queryKey: ["feedback-forms"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create form"),
  });

  const toggleActive = useMutation({
    mutationFn: async (args: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("feedback_forms")
        .update({ is_active: args.is_active })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback-forms"] }),
  });

  return { forms, createForm, toggleActive, checkSlug };
}
