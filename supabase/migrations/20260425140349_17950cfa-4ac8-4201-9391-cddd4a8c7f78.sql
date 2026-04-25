CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  admin_count int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Not signed in.');
  END IF;

  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';

  IF admin_count > 0 THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'admin') THEN
      RETURN jsonb_build_object('ok', true, 'message', 'Already admin.');
    END IF;
    RETURN jsonb_build_object('ok', false, 'message', 'Admin already exists. Ask an existing admin to grant you access.');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'message', 'Admin role granted.');
END;
$$;