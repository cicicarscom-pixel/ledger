REVOKE EXECUTE ON FUNCTION public.get_active_social_accounts_for_sync() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_active_social_accounts_for_sync() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_social_accounts_for_sync() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_social_accounts_for_sync() TO service_role;
