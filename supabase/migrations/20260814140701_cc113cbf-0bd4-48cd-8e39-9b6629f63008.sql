-- 1. Security audit events -------------------------------------------------
CREATE TABLE public.security_audit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  actor_user_id uuid,
  actor_label text,
  finding_id uuid REFERENCES public.security_findings(id) ON DELETE SET NULL,
  finding_internal_id text,
  scanner_name text,
  old_status text,
  new_status text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_audit_events_created ON public.security_audit_events (created_at DESC);
CREATE INDEX idx_security_audit_events_action ON public.security_audit_events (action, created_at DESC);

GRANT SELECT, INSERT ON public.security_audit_events TO authenticated;
GRANT ALL ON public.security_audit_events TO service_role;

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read security audit events"
  ON public.security_audit_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert security audit events"
  ON public.security_audit_events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. Admin notifications ---------------------------------------------------
CREATE TABLE public.security_admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  event_id uuid REFERENCES public.security_audit_events(id) ON DELETE CASCADE,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_sec_admin_notif_user ON public.security_admin_notifications (user_id, created_at DESC);
CREATE INDEX idx_sec_admin_notif_unread ON public.security_admin_notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.security_admin_notifications TO authenticated;
GRANT ALL ON public.security_admin_notifications TO service_role;

ALTER TABLE public.security_admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read own security notifications"
  ON public.security_admin_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update own security notifications"
  ON public.security_admin_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid());

-- 3. Fan-out helper --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admins_security(
  p_event_id uuid, p_kind text, p_title text, p_body text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_admin_notifications (user_id, kind, title, body, event_id)
  SELECT DISTINCT ur.user_id, p_kind, p_title, p_body, p_event_id
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- 4. Record finding status changes ----------------------------------------
CREATE OR REPLACE FUNCTION public.log_security_finding_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_label text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT p.email INTO v_label FROM public.profiles p WHERE p.user_id = auth.uid();

    INSERT INTO public.security_audit_events (
      action, actor_user_id, actor_label, finding_id, finding_internal_id,
      scanner_name, old_status, new_status, note,
      metadata
    ) VALUES (
      'finding_status_changed', auth.uid(), coalesce(v_label, 'automation'), NEW.id, NEW.finding_internal_id,
      NEW.scanner_name, OLD.status, NEW.status, NEW.resolution_note,
      jsonb_build_object('severity', NEW.severity, 'name', NEW.name)
    ) RETURNING id INTO v_event_id;

    PERFORM public.notify_admins_security(
      v_event_id,
      'finding_status_changed',
      format('Finding %s → %s', NEW.name, NEW.status),
      format('%s marked "%s" as %s.', coalesce(v_label, 'Automation'), NEW.name, NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_finding_status_change ON public.security_findings;
CREATE TRIGGER trg_security_finding_status_change
AFTER UPDATE ON public.security_findings
FOR EACH ROW EXECUTE FUNCTION public.log_security_finding_status_change();

-- 5. Record completed scans ----------------------------------------------
CREATE OR REPLACE FUNCTION public.log_security_scan_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.security_audit_events (
    action, actor_user_id, actor_label, scanner_name, new_status, note, metadata
  ) VALUES (
    'scan_completed', auth.uid(), coalesce(NEW.ran_by, 'automation'), NEW.check_type, NEW.status, NEW.summary,
    jsonb_build_object('run_id', NEW.id, 'environment', NEW.environment)
  ) RETURNING id INTO v_event_id;

  PERFORM public.notify_admins_security(
    v_event_id,
    'scan_completed',
    format('Security scan %s: %s', NEW.check_type, NEW.status),
    coalesce(NEW.summary, 'A security scan finished.')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_scan_completed ON public.security_check_runs;
CREATE TRIGGER trg_security_scan_completed
AFTER INSERT ON public.security_check_runs
FOR EACH ROW EXECUTE FUNCTION public.log_security_scan_completed();

-- 6. Admin-triggered scan audit entry ------------------------------------
CREATE OR REPLACE FUNCTION public.log_security_scan_trigger(p_job_name text, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_label text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT p.email INTO v_label FROM public.profiles p WHERE p.user_id = auth.uid();

  INSERT INTO public.security_audit_events (action, actor_user_id, actor_label, scanner_name, note, metadata)
  VALUES ('scan_triggered', auth.uid(), coalesce(v_label, 'admin'), p_job_name, p_note,
          jsonb_build_object('job_name', p_job_name))
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- 7. Capital status: latest successful sync signals -----------------------
CREATE OR REPLACE FUNCTION public.get_my_advance_status(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adv RECORD;
  v_app RECORD;
  v_last_sync timestamptz;
  v_repayments jsonb;
  v_last_webhook jsonb;
  v_ok_webhook jsonb;
  v_last_disb jsonb;
  v_last_cron jsonb;
  v_ok_cron jsonb;
BEGIN
  IF auth.uid() IS NULL
     OR NOT (public.is_business_owner(auth.uid(), p_business_id) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_adv FROM public.capital_advances
   WHERE business_id = p_business_id
   ORDER BY created_at DESC LIMIT 1;

  SELECT * INTO v_app FROM public.capital_applications
   WHERE business_id = p_business_id
   ORDER BY created_at DESC LIMIT 1;

  IF v_adv IS NULL AND v_app IS NULL THEN
    RETURN jsonb_build_object('has_activity', false);
  END IF;

  IF v_adv IS NOT NULL THEN
    SELECT max(greatest(coalesce(processed_at, created_at), created_at)) INTO v_last_sync
      FROM public.capital_webhook_events WHERE advance_id = v_adv.id;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id', id, 'amount_kes', amount_kes, 'source', source,
             'status', status, 'scheduled_for', scheduled_for,
             'collected_at', collected_at, 'reference', mpesa_reference
           ) ORDER BY created_at DESC), '[]'::jsonb)
      INTO v_repayments
      FROM public.capital_repayments WHERE advance_id = v_adv.id;

    SELECT jsonb_build_object(
             'event_type', w.event_type,
             'status', w.status,
             'received_at', w.created_at,
             'processed_at', w.processed_at
           )
      INTO v_last_webhook
      FROM public.capital_webhook_events w
      WHERE w.advance_id = v_adv.id
      ORDER BY w.created_at DESC LIMIT 1;

    SELECT jsonb_build_object(
             'event_type', w.event_type,
             'status', w.status,
             'received_at', w.created_at,
             'processed_at', w.processed_at
           )
      INTO v_ok_webhook
      FROM public.capital_webhook_events w
      WHERE w.advance_id = v_adv.id
        AND w.status IN ('processed', 'success', 'ok')
      ORDER BY w.created_at DESC LIMIT 1;

    v_last_disb := jsonb_build_object(
      'status', v_adv.disbursement_status,
      'requested_at', v_adv.disbursement_requested_at,
      'disbursed_at', v_adv.disbursed_at,
      'mpesa_reference', v_adv.mpesa_disbursement_ref,
      'error', v_adv.disbursement_error
    );
  END IF;

  SELECT jsonb_build_object(
           'job_name', r.job_name,
           'status', r.status,
           'started_at', r.started_at,
           'finished_at', r.finished_at,
           'rows_affected', r.rows_affected,
           'error_text', r.error_text
         )
    INTO v_last_cron
    FROM public.cron_job_runs r
    WHERE r.job_name IN ('capital-repayment-cron', 'capital-repayment')
    ORDER BY r.started_at DESC LIMIT 1;

  SELECT jsonb_build_object(
           'job_name', r.job_name,
           'status', r.status,
           'started_at', r.started_at,
           'finished_at', r.finished_at,
           'rows_affected', r.rows_affected
         )
    INTO v_ok_cron
    FROM public.cron_job_runs r
    WHERE r.job_name IN ('capital-repayment-cron', 'capital-repayment')
      AND r.status = 'success'
    ORDER BY r.started_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'has_activity', true,
    'application', CASE WHEN v_app IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_app.id,
      'status', v_app.status,
      'requested_amount_kes', v_app.requested_amount_kes,
      'revenue_share_pct', v_app.revenue_share_pct,
      'review_note', v_app.review_note,
      'created_at', v_app.created_at
    ) END,
    'advance', CASE WHEN v_adv IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_adv.id,
      'principal_kes', v_adv.principal_kes,
      'total_owed_kes', v_adv.total_owed_kes,
      'amount_repaid_kes', v_adv.amount_repaid_kes,
      'revenue_share_pct', v_adv.revenue_share_pct,
      'status', v_adv.status,
      'disbursement_status', v_adv.disbursement_status,
      'disbursement_error', v_adv.disbursement_error,
      'disbursement_requested_at', v_adv.disbursement_requested_at,
      'mpesa_disbursement_ref', v_adv.mpesa_disbursement_ref,
      'disbursed_at', v_adv.disbursed_at,
      'closed_at', v_adv.closed_at
    ) END,
    'repayments', coalesce(v_repayments, '[]'::jsonb),
    'last_synced_at', v_last_sync,
    'last_webhook_event', v_last_webhook,
    'last_successful_webhook_event', v_ok_webhook,
    'last_disbursement_event', v_last_disb,
    'last_repayment_cron', v_last_cron,
    'last_successful_repayment_cron', v_ok_cron
  );
END;
$$;