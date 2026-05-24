
-- Auth events log
CREATE TABLE public.auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  username text,
  event text NOT NULL, -- login_success, login_failed, logout, blocked_attempt, signup
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_logs_created ON public.auth_logs(created_at DESC);
CREATE INDEX idx_auth_logs_username ON public.auth_logs(username);
CREATE INDEX idx_auth_logs_event ON public.auth_logs(event);

ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all auth logs" ON public.auth_logs
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Anyone can insert auth logs" ON public.auth_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin actions audit
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_username text NOT NULL,
  action text NOT NULL, -- block_user, unblock_user, delete_user, delete_item, promote_admin, demote_admin
  target_type text NOT NULL, -- user, item, role
  target_id uuid,
  target_label text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_actions_created ON public.admin_actions(created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view admin actions" ON public.admin_actions
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins insert admin actions" ON public.admin_actions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND admin_id = auth.uid());

-- Login attempts (for rate limit)
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  success boolean NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_username_time ON public.login_attempts(username, created_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view login attempts" ON public.login_attempts
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Anyone insert login attempts" ON public.login_attempts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Rate limit check: locked if 5+ failed attempts in last 15 minutes with no success since
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fail_count int;
  last_success timestamptz;
  window_start timestamptz := now() - interval '15 minutes';
BEGIN
  SELECT max(created_at) INTO last_success
  FROM public.login_attempts
  WHERE username = _username AND success = true AND created_at > window_start;

  SELECT count(*) INTO fail_count
  FROM public.login_attempts
  WHERE username = _username
    AND success = false
    AND created_at > window_start
    AND (last_success IS NULL OR created_at > last_success);

  RETURN jsonb_build_object(
    'locked', fail_count >= 5,
    'failed_count', fail_count,
    'unlocks_in_seconds',
      CASE WHEN fail_count >= 5
        THEN GREATEST(0, 900 - EXTRACT(EPOCH FROM (now() - window_start))::int)
        ELSE 0
      END
  );
END;
$$;

-- Helper to log auth events from anywhere
CREATE OR REPLACE FUNCTION public.log_auth_event(
  _event text,
  _username text DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.auth_logs(user_id, username, event, metadata)
  VALUES (_user_id, _username, _event, _metadata);
$$;
