-- Fix the overly permissive INSERT policy on notifications
-- Drop the existing policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- The INSERT should only happen via SECURITY DEFINER trigger functions
-- which bypass RLS anyway, so we don't need an INSERT policy for regular users
-- This is the secure approach since notifications are created by database triggers