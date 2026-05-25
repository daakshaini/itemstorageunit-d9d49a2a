
-- 1) Tighten login_attempts: drop public insert, add SECURITY DEFINER function
DROP POLICY IF EXISTS "Anyone insert login attempts" ON public.login_attempts;

CREATE OR REPLACE FUNCTION public.record_login_attempt(_username text, _success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_success boolean;
BEGIN
  -- Only allow success=true if the caller is actually authenticated as a user
  -- whose profile username matches. Otherwise force success=false.
  v_success := false;
  IF _success = true AND auth.uid() IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND username = _username
    ) THEN
      v_success := true;
    END IF;
  END IF;

  INSERT INTO public.login_attempts(username, success)
  VALUES (_username, v_success);
END;
$$;

REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) TO anon, authenticated;

-- 2) Tighten auth_logs: drop public insert. log_auth_event RPC remains.
DROP POLICY IF EXISTS "Anyone can insert auth logs" ON public.auth_logs;

-- 3) Profiles username format check (allow legacy 'masteradmin')
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username = 'masteradmin' OR username ~ '^2[0-9]{5}$');

-- 4) Validate username inside new-user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', NEW.email);
  IF v_username IS DISTINCT FROM 'masteradmin' AND v_username !~ '^2[0-9]{5}$' THEN
    RAISE EXCEPTION 'Invalid username format';
  END IF;
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, v_username);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 5) Lock down SECURITY DEFINER helpers that should not be client-callable
REVOKE EXECUTE ON FUNCTION public.username_exists(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
