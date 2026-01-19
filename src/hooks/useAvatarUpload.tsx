import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UseAvatarUploadReturn {
  uploading: boolean;
  uploadAvatar: (file: File) => Promise<string | null>;
  deleteAvatar: (url: string) => Promise<boolean>;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function useAvatarUpload(): UseAvatarUploadReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!user?.id) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return null;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, GIF, or WebP image.',
        variant: 'destructive',
      });
      return null;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setUploading(true);

      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      toast({ title: 'Avatar uploaded successfully' });
      return publicUrl;
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [user?.id, toast]);

  const deleteAvatar = useCallback(async (url: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Extract file path from URL
      const urlParts = url.split('/avatars/');
      if (urlParts.length < 2) return false;
      
      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Avatar delete error:', err);
      return false;
    }
  }, [user?.id]);

  return {
    uploading,
    uploadAvatar,
    deleteAvatar,
  };
}
