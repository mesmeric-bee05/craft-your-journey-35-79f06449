REVOKE EXECUTE ON FUNCTION public.notify_admins_security(uuid, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_security_finding_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_security_scan_completed() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_security_scan_trigger(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_advance_status(uuid) FROM anon;