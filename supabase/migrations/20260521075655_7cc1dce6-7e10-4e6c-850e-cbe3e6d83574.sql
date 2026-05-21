
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.username_exists(TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.username_exists(TEXT) TO anon;
