
REVOKE EXECUTE ON FUNCTION public.has_brevo_api_key() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_brevo_api_key() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_brevo_api_key() TO authenticated;
