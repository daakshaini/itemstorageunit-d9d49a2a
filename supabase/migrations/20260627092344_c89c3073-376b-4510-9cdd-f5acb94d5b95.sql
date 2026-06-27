
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', NEW.email);
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, v_username);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;
