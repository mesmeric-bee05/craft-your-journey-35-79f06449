import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order_index: number;
  is_published: boolean;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

interface UseFAQsReturn {
  faqs: FAQ[];
  loading: boolean;
  error: string | null;
  markHelpful: (id: string) => Promise<void>;
  incrementView: (id: string) => Promise<void>;
}

export function useFAQs(): UseFAQsReturn {
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use type assertion since tables are newly created
        const { data, error: fetchError } = await (supabase as any)
          .from('faqs')
          .select('*')
          .eq('is_published', true)
          .order('order_index', { ascending: true });

        if (fetchError) throw fetchError;

        setFAQs((data || []) as FAQ[]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  const markHelpful = async (id: string) => {
    try {
      const faq = faqs.find((f) => f.id === id);
      if (!faq) return;

      await (supabase as any)
        .from('faqs')
        .update({ helpful_count: (faq.helpful_count || 0) + 1 })
        .eq('id', id);

      setFAQs((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, helpful_count: (f.helpful_count || 0) + 1 } : f
        )
      );
    } catch (err) {
      console.error('Failed to mark FAQ as helpful:', err);
    }
  };

  const incrementView = async (id: string) => {
    try {
      const faq = faqs.find((f) => f.id === id);
      if (!faq) return;

      await (supabase as any)
        .from('faqs')
        .update({ view_count: (faq.view_count || 0) + 1 })
        .eq('id', id);
    } catch (err) {
      console.error('Failed to increment FAQ view:', err);
    }
  };

  return {
    faqs,
    loading,
    error,
    markHelpful,
    incrementView,
  };
}
