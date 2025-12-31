-- Phase 0: Fix Onboarding Issues

-- Add onboarding tracking columns to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create team_invitations table for onboarding team invites
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  token UUID DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, email)
);

-- Enable RLS on team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_invitations
CREATE POLICY "Business owners can manage invitations"
ON public.team_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = team_invitations.business_id 
    AND businesses.owner_id = auth.uid()
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Business members can view invitations"
ON public.team_invitations
FOR SELECT
USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Anyone can view their own invitations by email"
ON public.team_invitations
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_team_invitations_updated_at
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create business-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for business-assets bucket
CREATE POLICY "Business owners can upload assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'business-assets' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Business owners can update their assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'business-assets' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Business owners can delete their assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'business-assets' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view business assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-assets');