
CREATE OR REPLACE FUNCTION public.log_activity(
  _action text,
  _item_name text DEFAULT NULL,
  _item_id uuid DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_username text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _action NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'Invalid action: %', _action;
  END IF;

  IF _item_id IS NOT NULL AND _action IN ('create', 'update') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.items WHERE id = _item_id AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Item not owned by caller';
    END IF;
  END IF;

  SELECT username INTO v_username FROM public.profiles WHERE id = v_user_id;

  INSERT INTO public.activity_logs(user_id, username, action, item_name, item_id, details)
  VALUES (v_user_id, COALESCE(v_username, 'unknown'), _action, _item_name, _item_id, _details);
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity(text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, uuid, jsonb) TO authenticated;

DROP POLICY IF EXISTS "Users insert own logs" ON public.activity_logs;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
