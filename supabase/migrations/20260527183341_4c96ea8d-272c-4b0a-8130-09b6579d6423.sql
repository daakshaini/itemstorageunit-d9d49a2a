-- Fix: scope realtime channel subscriptions per-user, and add admin UPDATE policy on items
DROP POLICY IF EXISTS "Authenticated can receive realtime" ON realtime.messages;

CREATE POLICY "Users receive own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'admin-dashboard' AND public.is_admin()
  OR realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
  OR realtime.topic() = 'user:' || auth.uid()::text
);

CREATE POLICY "Admins update all items"
ON public.items
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());