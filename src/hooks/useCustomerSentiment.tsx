import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

export interface SentimentLogRow {
  id: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  themes: string[];
  language: string;
  source: string;
  raw_text: string | null;
  conversation_id: string | null;
  analyzed_at: string;
}

export interface DailyRollupRow {
  date: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  avg_score: number | null;
  top_themes: Array<{ theme: string; count: number }>;
}

export function useCustomerSentiment(days = 30) {
  const { business } = useBusiness();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const trends = useQuery({
    queryKey: ["voc-trends", business?.id, days],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_sentiment_daily")
        .select("*")
        .eq("business_id", business!.id)
        .gte("date", since.slice(0, 10))
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DailyRollupRow[];
    },
  });

  const negatives = useQuery({
    queryKey: ["voc-negatives", business?.id, days],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_sentiment_log")
        .select("id, sentiment, score, themes, language, source, raw_text, conversation_id, analyzed_at")
        .eq("business_id", business!.id)
        .eq("sentiment", "negative")
        .gte("analyzed_at", since)
        .order("analyzed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as SentimentLogRow[];
    },
  });

  return { trends, negatives };
}
