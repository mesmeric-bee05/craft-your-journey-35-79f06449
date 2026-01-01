-- Phase 1: Talent Marketplace Database Schema

-- Enum for freelancer availability
CREATE TYPE public.availability_status AS ENUM ('available', 'busy', 'unavailable');

-- Enum for job types
CREATE TYPE public.job_type AS ENUM ('one_time', 'ongoing', 'full_time', 'part_time');

-- Enum for budget types
CREATE TYPE public.budget_type AS ENUM ('fixed', 'hourly');

-- Enum for job posting status
CREATE TYPE public.job_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');

-- Enum for location types
CREATE TYPE public.location_type AS ENUM ('remote', 'onsite', 'hybrid');

-- Enum for application status
CREATE TYPE public.application_status AS ENUM ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn');

-- Enum for contract status
CREATE TYPE public.contract_status AS ENUM ('pending', 'active', 'completed', 'cancelled', 'disputed');

-- Enum for review types
CREATE TYPE public.review_type AS ENUM ('client_to_freelancer', 'freelancer_to_client');

-- Freelancer Profiles Table
CREATE TABLE public.freelancer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  headline TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  hourly_rate NUMERIC(10,2),
  currency TEXT DEFAULT 'KES',
  availability public.availability_status DEFAULT 'available',
  portfolio_urls TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  location TEXT,
  languages TEXT[] DEFAULT '{}'::TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Job Postings Table
CREATE TABLE public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  skills_required TEXT[] DEFAULT '{}',
  job_type public.job_type DEFAULT 'one_time',
  budget_type public.budget_type DEFAULT 'fixed',
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  currency TEXT DEFAULT 'KES',
  duration TEXT,
  status public.job_status DEFAULT 'draft',
  deadline TIMESTAMPTZ,
  location_type public.location_type DEFAULT 'remote',
  applications_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job Applications Table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  proposed_rate NUMERIC(12,2),
  proposed_duration TEXT,
  status public.application_status DEFAULT 'pending',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, freelancer_id)
);

-- Contracts Table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  rate NUMERIC(12,2) NOT NULL,
  rate_type public.budget_type DEFAULT 'fixed',
  currency TEXT DEFAULT 'KES',
  status public.contract_status DEFAULT 'pending',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  total_paid NUMERIC(12,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews Table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  review_type public.review_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, reviewer_id)
);

-- Enable RLS on all tables
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Freelancer Profiles Policies
CREATE POLICY "Anyone can view freelancer profiles"
  ON public.freelancer_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own freelancer profile"
  ON public.freelancer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own freelancer profile"
  ON public.freelancer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own freelancer profile"
  ON public.freelancer_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Job Postings Policies
CREATE POLICY "Anyone can view open job postings"
  ON public.job_postings FOR SELECT
  USING (status = 'open' OR is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can create job postings"
  ON public.job_postings FOR INSERT
  WITH CHECK (is_business_member(auth.uid(), business_id) AND created_by = auth.uid());

CREATE POLICY "Business members can update their job postings"
  ON public.job_postings FOR UPDATE
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can delete their job postings"
  ON public.job_postings FOR DELETE
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

-- Job Applications Policies
CREATE POLICY "Freelancers can view their own applications"
  ON public.job_applications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM freelancer_profiles fp WHERE fp.id = freelancer_id AND fp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = job_id AND is_business_member(auth.uid(), jp.business_id))
    OR is_admin(auth.uid())
  );

CREATE POLICY "Freelancers can create applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM freelancer_profiles fp WHERE fp.id = freelancer_id AND fp.user_id = auth.uid())
  );

CREATE POLICY "Freelancers can update their own applications"
  ON public.job_applications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM freelancer_profiles fp WHERE fp.id = freelancer_id AND fp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = job_id AND is_business_member(auth.uid(), jp.business_id))
  );

CREATE POLICY "Freelancers can withdraw their applications"
  ON public.job_applications FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM freelancer_profiles fp WHERE fp.id = freelancer_id AND fp.user_id = auth.uid())
  );

-- Contracts Policies
CREATE POLICY "Contract parties can view contracts"
  ON public.contracts FOR SELECT
  USING (
    is_business_member(auth.uid(), business_id)
    OR EXISTS (SELECT 1 FROM freelancer_profiles fp WHERE fp.id = freelancer_id AND fp.user_id = auth.uid())
    OR is_admin(auth.uid())
  );

CREATE POLICY "Business members can create contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (is_business_member(auth.uid(), business_id));

CREATE POLICY "Contract parties can update contracts"
  ON public.contracts FOR UPDATE
  USING (
    is_business_member(auth.uid(), business_id)
    OR EXISTS (SELECT 1 FROM freelancer_profiles fp WHERE fp.id = freelancer_id AND fp.user_id = auth.uid())
  );

-- Reviews Policies
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Contract parties can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id
      AND c.status = 'completed'
      AND (
        (is_business_member(auth.uid(), c.business_id) AND reviewer_id = auth.uid())
        OR EXISTS (SELECT 1 FROM freelancer_profiles fp WHERE fp.id = c.freelancer_id AND fp.user_id = auth.uid() AND reviewer_id = auth.uid())
      )
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_freelancer_profiles_updated_at
  BEFORE UPDATE ON public.freelancer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_freelancer_profiles_user_id ON public.freelancer_profiles(user_id);
CREATE INDEX idx_freelancer_profiles_skills ON public.freelancer_profiles USING GIN(skills);
CREATE INDEX idx_freelancer_profiles_availability ON public.freelancer_profiles(availability);
CREATE INDEX idx_job_postings_business_id ON public.job_postings(business_id);
CREATE INDEX idx_job_postings_status ON public.job_postings(status);
CREATE INDEX idx_job_postings_skills ON public.job_postings USING GIN(skills_required);
CREATE INDEX idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_freelancer_id ON public.job_applications(freelancer_id);
CREATE INDEX idx_job_applications_status ON public.job_applications(status);
CREATE INDEX idx_contracts_business_id ON public.contracts(business_id);
CREATE INDEX idx_contracts_freelancer_id ON public.contracts(freelancer_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_reviews_contract_id ON public.reviews(contract_id);