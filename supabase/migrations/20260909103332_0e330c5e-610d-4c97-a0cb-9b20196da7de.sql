REVOKE EXECUTE ON FUNCTION public.notify_business_owners_security(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_admins_security(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_business_owners_security(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_admins_security(uuid, text, text, text) TO service_role;