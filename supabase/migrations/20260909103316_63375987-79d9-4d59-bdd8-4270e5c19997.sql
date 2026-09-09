-- Fan security alerts into the in-app notification bell -----------------

-- Admin fan-out: keep the admin-only table, plus a bell row per admin.
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

  -- Bell rows for admins that belong to at least one business.
  INSERT INTO public.notifications (business_id, user_id, type, title, body, data)
  SELECT b.business_id, b.user_id, 'security_alert'::public.notification_type, p_title, p_body,
         jsonb_build_object('event_id', p_event_id, 'kind', p_kind,
                            'link', '/admin/monitoring/security', 'audience', 'admin')
  FROM (
    SELECT DISTINCT ON (ur.user_id) ur.user_id, x.business_id
    FROM public.user_roles ur
    JOIN LATERAL (
      SELECT bs.id AS business_id FROM public.businesses bs WHERE bs.owner_id = ur.user_id
      UNION ALL
      SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = ur.user_id
    ) x ON true
    WHERE ur.role = 'admin'
  ) b;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_admins_security(uuid, text, text, text) FROM anon, authenticated;

-- Business-facing fan-out: only serious, business-relevant alerts.
CREATE OR REPLACE FUNCTION public.notify_business_owners_security(
  p_event_id uuid, p_kind text, p_title text, p_body text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (business_id, user_id, type, title, body, data)
  SELECT bs.id, bs.owner_id, 'security_alert'::public.notification_type, p_title, p_body,
         jsonb_build_object('event_id', p_event_id, 'kind', p_kind,
                            'link', '/settings', 'audience', 'business')
  FROM public.businesses bs
  WHERE bs.owner_id IS NOT NULL
    AND NOT public.is_admin(bs.owner_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_business_owners_security(uuid, text, text, text) FROM anon, authenticated;

-- Finding status changes: admins always, owners on newly opened high-severity findings.
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
      scanner_name, old_status, new_status, note, metadata
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

    IF NEW.severity = 'error' AND NEW.status = 'open' THEN
      PERFORM public.notify_business_owners_security(
        v_event_id,
        'finding_status_changed',
        'Important security update',
        'Our team is working on a security issue affecting the platform. No action is needed from you right now.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Completed scans: admins always, owners only when a scan fails.
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

  IF NEW.status = 'fail' THEN
    PERFORM public.notify_business_owners_security(
      v_event_id,
      'scan_completed',
      'Security check needs attention',
      'A routine platform security check reported a problem. Our team has been alerted.'
    );
  END IF;

  RETURN NEW;
END;
$$;