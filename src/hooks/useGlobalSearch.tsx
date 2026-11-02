import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { sanitizeSearchInput } from '@/lib/sanitize';

export interface SearchResult {
  id: string;
  type: 'conversation' | 'customer' | 'campaign' | 'job' | 'freelancer';
  title: string;
  subtitle: string;
  href: string;
  metadata?: Record<string, any>;
}

interface UseGlobalSearchReturn {
  results: SearchResult[];
  loading: boolean;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const { business } = useBusiness();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim() || !business?.id) {
      setResults([]);
      return;
    }

    setLoading(true);
    const sanitizedQuery = sanitizeSearchInput(query);
    const searchPattern = `%${sanitizedQuery}%`;

    try {
      // Search across multiple tables in parallel
      const [
        conversationsResult,
        customersResult,
        campaignsResult,
        jobsResult,
        freelancersResult,
      ] = await Promise.all([
        // Conversations
        supabase
          .from('conversations')
          .select('id, subject, last_message_preview, customer:customers(name)')
          .eq('business_id', business.id)
          .or(`subject.ilike.${searchPattern},last_message_preview.ilike.${searchPattern}`)
          .limit(5),
        // Customers
        supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('business_id', business.id)
          .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
          .limit(5),
        // Campaigns
        supabase
          .from('campaigns')
          .select('id, name, status')
          .eq('business_id', business.id)
          .ilike('name', searchPattern)
          .limit(5),
        // Job postings
        supabase
          .from('job_postings')
          .select('id, title, status')
          .eq('business_id', business.id)
          .ilike('title', searchPattern)
          .limit(5),
        // Freelancers
        supabase
          .from('freelancer_profiles')
          .select('id, user_id, headline, skills')
          .ilike('headline', searchPattern)
          .limit(5),
      ]);

      const searchResults: SearchResult[] = [];

      // Map conversations
      (conversationsResult.data || []).forEach((c: any) => {
        searchResults.push({
          id: c.id,
          type: 'conversation',
          title: c.customer?.name || c.subject || 'Conversation',
          subtitle: c.last_message_preview?.slice(0, 60) || 'No messages',
          href: `/inbox?conversation=${c.id}`,
        });
      });

      // Map customers
      (customersResult.data || []).forEach((c: any) => {
        searchResults.push({
          id: c.id,
          type: 'customer',
          title: c.name || 'Unknown Customer',
          subtitle: c.email || c.phone || 'No contact info',
          href: `/inbox?customer=${c.id}`,
        });
      });

      // Map campaigns
      (campaignsResult.data || []).forEach((c: any) => {
        searchResults.push({
          id: c.id,
          type: 'campaign',
          title: c.name,
          subtitle: `Campaign • ${c.status}`,
          href: `/marketing?campaign=${c.id}`,
        });
      });

      // Map jobs
      (jobsResult.data || []).forEach((j: any) => {
        searchResults.push({
          id: j.id,
          type: 'job',
          title: j.title,
          subtitle: `Job Posting • ${j.status}`,
          href: `/talent?job=${j.id}`,
        });
      });

      // Map freelancers
      (freelancersResult.data || []).forEach((f: any) => {
        searchResults.push({
          id: f.id,
          type: 'freelancer',
          title: f.headline || 'Freelancer',
          subtitle: `Skills: ${(f.skills || []).slice(0, 3).join(', ')}`,
          href: `/talent?freelancer=${f.id}`,
        });
      });

      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    loading,
    search,
    clearResults,
  };
}
