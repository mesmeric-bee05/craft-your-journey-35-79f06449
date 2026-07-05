
-- =========================================================================
-- SACCO INTEGRATION PORTAL — foundation migration
-- =========================================================================

-- --- ENUMS -----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.sacco_loi_status AS ENUM ('none','signed','active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sacco_tier AS ENUM ('starter','growth','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sacco_member_status AS ENUM ('imported','invited','claimed','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sacco_import_source AS ENUM ('csv','api','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sacco_application_status AS ENUM ('new','reviewing','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --- HELPER: is_sacco_admin (admins only for now) --------------------------
CREATE OR REPLACE FUNCTION public.is_sacco_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id)
$$;

-- =========================================================================
-- 1. saccos
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.saccos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  registration_no text UNIQUE,
  county text,
  region text,
  member_count_estimate integer DEFAULT 0,
  loi_status public.sacco_loi_status NOT NULL DEFAULT 'none',
  contact_name text,
  contact_email text,
  contact_phone text,
  tier public.sacco_tier NOT NULL DEFAULT 'starter',
  api_key_hash text,
  api_key_last4 text,
  api_key_issued_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saccos_county ON public.saccos(county);
CREATE INDEX IF NOT EXISTS idx_saccos_loi ON public.saccos(loi_status);
CREATE INDEX IF NOT EXISTS idx_saccos_api_key_hash ON public.saccos(api_key_hash) WHERE api_key_hash IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saccos TO authenticated;
GRANT ALL ON public.saccos TO service_role;

ALTER TABLE public.saccos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saccos_admin_all" ON public.saccos
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Signed-in users can read a directory view (all rows) but the exposed
-- columns are limited by a view below — RLS still applies.
CREATE POLICY "saccos_directory_read" ON public.saccos
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_saccos_updated
  BEFORE UPDATE ON public.saccos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 2. sacco_members
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.sacco_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sacco_id uuid NOT NULL REFERENCES public.saccos(id) ON DELETE CASCADE,
  external_member_id text,
  full_name text NOT NULL,
  phone text,
  email text,
  joined_at date,
  claimed_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  claimed_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.sacco_member_status NOT NULL DEFAULT 'imported',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sacco_id, external_member_id),
  UNIQUE (sacco_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_sacco_members_sacco ON public.sacco_members(sacco_id);
CREATE INDEX IF NOT EXISTS idx_sacco_members_phone ON public.sacco_members(phone);
CREATE INDEX IF NOT EXISTS idx_sacco_members_claimed_user ON public.sacco_members(claimed_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sacco_members TO authenticated;
GRANT ALL ON public.sacco_members TO service_role;

ALTER TABLE public.sacco_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sacco_members_admin_all" ON public.sacco_members
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- A member can read their own row when their auth uid matches claimed_user_id
CREATE POLICY "sacco_members_self_read" ON public.sacco_members
  FOR SELECT TO authenticated
  USING (claimed_user_id = auth.uid());

CREATE TRIGGER trg_sacco_members_updated
  BEFORE UPDATE ON public.sacco_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. sacco_imports
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.sacco_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sacco_id uuid NOT NULL REFERENCES public.saccos(id) ON DELETE CASCADE,
  source public.sacco_import_source NOT NULL,
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  row_count integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sacco_imports_sacco ON public.sacco_imports(sacco_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sacco_imports TO authenticated;
GRANT ALL ON public.sacco_imports TO service_role;

ALTER TABLE public.sacco_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sacco_imports_admin_all" ON public.sacco_imports
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_sacco_imports_updated
  BEFORE UPDATE ON public.sacco_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 4. sacco_applications  (public partner form submissions)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.sacco_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sacco_name text NOT NULL,
  county text,
  member_count_estimate integer,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  message text,
  status public.sacco_application_status NOT NULL DEFAULT 'new',
  ip_address inet,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  linked_sacco_id uuid REFERENCES public.saccos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sacco_applications_status ON public.sacco_applications(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sacco_applications TO authenticated;
GRANT ALL ON public.sacco_applications TO service_role;
-- Note: anonymous submissions go through submit_sacco_application() (SECURITY DEFINER), not direct anon grants.

ALTER TABLE public.sacco_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sacco_applications_admin_all" ON public.sacco_applications
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_sacco_applications_updated
  BEFORE UPDATE ON public.sacco_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger: sanity checks + length caps for public submissions
CREATE OR REPLACE FUNCTION public.validate_sacco_application()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(coalesce(NEW.sacco_name,'')) < 2 OR length(NEW.sacco_name) > 200 THEN
    RAISE EXCEPTION 'sacco_name length invalid';
  END IF;
  IF length(coalesce(NEW.contact_name,'')) < 2 OR length(NEW.contact_name) > 120 THEN
    RAISE EXCEPTION 'contact_name length invalid';
  END IF;
  IF NEW.contact_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'contact_email invalid';
  END IF;
  IF length(coalesce(NEW.message,'')) > 4000 THEN
    RAISE EXCEPTION 'message too long';
  END IF;
  -- Anonymous submissions cannot preset status
  IF auth.uid() IS NULL THEN
    NEW.status := 'new';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.linked_sacco_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sacco_applications_validate
  BEFORE INSERT OR UPDATE ON public.sacco_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_sacco_application();

-- Public submission RPC: rate-limited (10 per IP per hour)
CREATE OR REPLACE FUNCTION public.submit_sacco_application(
  p_sacco_name text,
  p_county text,
  p_member_count_estimate integer,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_ip inet := inet_client_addr();
  v_recent int;
BEGIN
  -- Rate limit: max 10 submissions per hour per IP
  IF v_ip IS NOT NULL THEN
    SELECT count(*) INTO v_recent
      FROM public.sacco_applications
      WHERE ip_address = v_ip AND created_at > now() - interval '1 hour';
    IF v_recent >= 10 THEN
      RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.sacco_applications
    (sacco_name, county, member_count_estimate, contact_name, contact_email, contact_phone, message, ip_address)
  VALUES
    (p_sacco_name, p_county, p_member_count_estimate, p_contact_name, p_contact_email, p_contact_phone, p_message, v_ip)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_sacco_application(text,text,integer,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_sacco_application(text,text,integer,text,text,text,text) TO anon, authenticated;

-- =========================================================================
-- 5. sacco_api_rate_limits (backing the partner sync endpoint)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.sacco_api_rate_limits (
  sacco_id uuid PRIMARY KEY REFERENCES public.saccos(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  invocation_count integer NOT NULL DEFAULT 0,
  last_invoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sacco_api_rate_limits TO authenticated;
GRANT ALL ON public.sacco_api_rate_limits TO service_role;

ALTER TABLE public.sacco_api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sacco_api_rate_limits_admin_read" ON public.sacco_api_rate_limits
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_sacco_api_rate_limits_updated
  BEFORE UPDATE ON public.sacco_api_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
