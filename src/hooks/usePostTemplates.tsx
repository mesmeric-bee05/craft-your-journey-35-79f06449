import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type PostTemplate = Database['public']['Tables']['post_templates']['Row'];
type ChannelType = Database['public']['Enums']['channel_type'];

export interface CreateTemplateData {
  name: string;
  content: string;
  category?: string;
  platforms?: ChannelType[];
  hashtags?: string[];
  mediaUrls?: string[];
}

export interface UpdateTemplateData {
  name?: string;
  content?: string;
  category?: string;
  platforms?: ChannelType[];
  hashtags?: string[];
  mediaUrls?: string[];
}

interface UsePostTemplatesReturn {
  templates: PostTemplate[];
  loading: boolean;
  error: string | null;
  createTemplate: (data: CreateTemplateData) => Promise<PostTemplate | null>;
  updateTemplate: (id: string, data: UpdateTemplateData) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  duplicateTemplate: (id: string) => Promise<PostTemplate | null>;
  incrementUsage: (id: string) => Promise<void>;
  getTemplatesByCategory: (category: string) => PostTemplate[];
  getTemplatesByPlatform: (platform: ChannelType) => PostTemplate[];
  applyVariables: (content: string, variables: Record<string, string>) => string;
  refetch: () => Promise<void>;
}

export function usePostTemplates(): UsePostTemplatesReturn {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('post_templates')
        .select('*')
        .eq('business_id', business.id)
        .order('usage_count', { ascending: false });

      if (fetchError) throw fetchError;

      setTemplates(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(message);
      logger.error('Error fetching post templates', err, { hook: 'usePostTemplates' });
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (data: CreateTemplateData): Promise<PostTemplate | null> => {
    if (!business?.id) {
      toast({ title: 'Error', description: 'Business not found', variant: 'destructive' });
      return null;
    }

    try {
      const { data: newTemplate, error: createError } = await supabase
        .from('post_templates')
        .insert({
          business_id: business.id,
          name: data.name,
          content: data.content,
          category: data.category,
          platforms: data.platforms,
          hashtags: data.hashtags || [],
          media_urls: data.mediaUrls || [],
        })
        .select()
        .single();

      if (createError) throw createError;

      toast({ title: 'Template created successfully!' });
      return newTemplate;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      logger.error('Error creating post template', err, { hook: 'usePostTemplates' });
      return null;
    }
  };

  const updateTemplate = async (id: string, data: UpdateTemplateData): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.platforms !== undefined) updateData.platforms = data.platforms;
      if (data.hashtags !== undefined) updateData.hashtags = data.hashtags;
      if (data.mediaUrls !== undefined) updateData.media_urls = data.mediaUrls;

      const { error: updateError } = await supabase
        .from('post_templates')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchTemplates();
      toast({ title: 'Template updated successfully!' });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update template';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      logger.error('Error updating post template', err, { hook: 'usePostTemplates', templateId: id });
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('post_templates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Template deleted successfully!' });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      logger.error('Error deleting post template', err, { hook: 'usePostTemplates', templateId: id });
      return false;
    }
  };

  const duplicateTemplate = async (id: string): Promise<PostTemplate | null> => {
    const template = templates.find((t) => t.id === id);
    if (!template) return null;

    return createTemplate({
      name: `${template.name} (Copy)`,
      content: template.content,
      category: template.category || undefined,
      platforms: template.platforms as ChannelType[] | undefined,
      hashtags: template.hashtags || undefined,
      mediaUrls: template.media_urls || undefined,
    });
  };

  const incrementUsage = async (id: string): Promise<void> => {
    try {
      const template = templates.find((t) => t.id === id);
      if (!template) return;

      await supabase
        .from('post_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', id);

      setTemplates((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, usage_count: (t.usage_count || 0) + 1 } : t
        )
      );
    } catch (err) {
      logger.error('Error incrementing template usage', err, { hook: 'usePostTemplates', templateId: id });
    }
  };

  const getTemplatesByCategory = (category: string): PostTemplate[] => {
    return templates.filter((t) => t.category === category);
  };

  const getTemplatesByPlatform = (platform: ChannelType): PostTemplate[] => {
    return templates.filter((t) => 
      t.platforms && (t.platforms as ChannelType[]).includes(platform)
    );
  };

  /**
   * Apply variable substitution to template content
   * Variables are in the format {{variable_name}}
   */
  const applyVariables = (content: string, variables: Record<string, string>): string => {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      result = result.replace(regex, value);
    }
    return result;
  };

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    incrementUsage,
    getTemplatesByCategory,
    getTemplatesByPlatform,
    applyVariables,
    refetch: fetchTemplates,
  };
}
