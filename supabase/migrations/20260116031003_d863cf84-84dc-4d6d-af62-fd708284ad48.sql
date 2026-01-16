-- Create user_mfa_settings table for tracking MFA enrollment
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_mfa_enabled boolean DEFAULT false,
  backup_codes_hash text[],
  last_verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own MFA settings
CREATE POLICY "Users can view own MFA settings" ON public.user_mfa_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own MFA settings" ON public.user_mfa_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MFA settings" ON public.user_mfa_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create live_stream_status enum
CREATE TYPE public.live_stream_status AS ENUM ('preparing', 'live', 'ended', 'failed');

-- Create live_streams table for multi-platform streaming
CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status public.live_stream_status DEFAULT 'preparing',
  stream_key text UNIQUE,
  rtmp_url text,
  started_at timestamptz,
  ended_at timestamptz,
  viewer_count integer DEFAULT 0,
  peak_viewers integer DEFAULT 0,
  platforms jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for live_streams
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Users can manage their own streams
CREATE POLICY "Users can view own streams" ON public.live_streams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own streams" ON public.live_streams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streams" ON public.live_streams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own streams" ON public.live_streams
  FOR DELETE USING (auth.uid() = user_id);

-- Create live_stream_destinations for multi-platform simulcast
CREATE TABLE IF NOT EXISTS public.live_stream_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  rtmp_url text NOT NULL,
  stream_key text NOT NULL,
  status text DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for destinations
ALTER TABLE public.live_stream_destinations ENABLE ROW LEVEL SECURITY;

-- Users can manage destinations for their own streams
CREATE POLICY "Users can view own stream destinations" ON public.live_stream_destinations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.live_streams WHERE id = stream_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create destinations for own streams" ON public.live_stream_destinations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.live_streams WHERE id = stream_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update destinations for own streams" ON public.live_stream_destinations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.live_streams WHERE id = stream_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete destinations for own streams" ON public.live_stream_destinations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.live_streams WHERE id = stream_id AND user_id = auth.uid())
  );

-- Create updated_at trigger for live_streams
CREATE TRIGGER update_live_streams_updated_at
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for user_mfa_settings
CREATE TRIGGER update_user_mfa_settings_updated_at
  BEFORE UPDATE ON public.user_mfa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live_streams (for live chat and viewer count)
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;