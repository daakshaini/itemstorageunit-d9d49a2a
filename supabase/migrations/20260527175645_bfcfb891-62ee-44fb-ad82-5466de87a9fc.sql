
-- Enforce username whitelist server-side at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
  v_allowed text[] := ARRAY[
    '210682','213346','213342','213571','214238','219561','219199','219818','219820','219874',
    '219880','218412','218423','218427','219225','220368','220369','220374','220380','220396',
    '220441','220444','220454','220462','220483','220490','220523','220526','220532','220534',
    '220402','220460','220476','220663','220667','220748','220781','220631','220636','220630',
    '214563','214611','214305','214809','215422','215705','215706','216157','216376','216377',
    '216813','216950','217042','217287','216217','217806','217895','217908','218863','219269','219270'
  ];
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', NEW.email);
  IF v_username <> 'masteradmin' AND NOT (v_username = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, v_username);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;
