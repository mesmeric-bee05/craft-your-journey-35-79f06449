CREATE OR REPLACE FUNCTION public.get_my_advance_status(p_business_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_adv RECORD;
  v_app RECORD;
  v_last_sync timestamptz;
  v_repayments jsonb;
  v_last_webhook jsonb;
  v_last_disb jsonb;
  v_last_cron jsonb;
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
           'rows_affected', r.rows_affected
         )
    INTO v_last_cron
    FROM public.cron_job_runs r
    WHERE r.job_name IN ('capital-repayment-cron', 'capital-repayment')
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
    'last_disbursement_event', v_last_disb,
    'last_repayment_cron', v_last_cron
  );
END;
$function$;