-- 1. App role enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Extend spl_applications
ALTER TABLE public.spl_applications
  ADD COLUMN IF NOT EXISTS uid TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  dob DATE NOT NULL,
  tob TEXT NOT NULL,
  place TEXT NOT NULL,
  session TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  uid TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct booking access"
  ON public.bookings FOR SELECT
  TO anon, authenticated USING (false);

CREATE POLICY "No direct booking insert"
  ON public.bookings FOR INSERT
  TO anon, authenticated WITH CHECK (false);

CREATE POLICY "No direct booking update"
  ON public.bookings FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No direct booking delete"
  ON public.bookings FOR DELETE
  TO anon, authenticated USING (false);

-- 4. Public submit_booking function
CREATE OR REPLACE FUNCTION public.submit_booking(
  _name TEXT, _phone TEXT, _email TEXT, _dob DATE, _tob TEXT,
  _place TEXT, _session TEXT, _amount INTEGER, _notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  allowed_sessions TEXT[] := ARRAY['Bronze','Silver','Silver Prime','Gold','Gold Prime','Platinum','VIP Platinum'];
BEGIN
  IF _name IS NULL OR char_length(trim(_name)) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Please enter your full name.');
  END IF;
  IF _phone IS NULL OR char_length(trim(_phone)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Please enter a valid WhatsApp number.');
  END IF;
  IF _email IS NULL OR position('@' in _email) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Please enter a valid email.');
  END IF;
  IF NOT (_session = ANY(allowed_sessions)) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Invalid session.');
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Invalid amount.');
  END IF;

  INSERT INTO public.bookings (name, phone, email, dob, tob, place, session, amount, notes)
  VALUES (trim(_name), trim(_phone), lower(trim(_email)), _dob, _tob, trim(_place), _session, _amount, _notes)
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id, 'message', 'Booking received. We will contact you within 24 hours with payment details.');
END;
$$;

-- 5. Admin functions
CREATE OR REPLACE FUNCTION public.admin_list_spl_applications()
RETURNS SETOF public.spl_applications
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.spl_applications ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_bookings()
RETURNS SETOF public.bookings
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.bookings ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_spl_application(_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app RECORD;
  new_uid TEXT;
  rand4 TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO app FROM public.spl_applications WHERE id = _id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Application not found.');
  END IF;

  IF app.status = 'approved' AND app.uid IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'uid', app.uid, 'message', 'Already approved.');
  END IF;

  rand4 := upper(substring(md5(random()::text || clock_timestamp()::text) for 4));
  new_uid := 'HK-SPL-' || to_char(app.dob, 'YYYYMMDD') || '-' || rand4;

  UPDATE public.spl_applications
  SET status = 'approved', uid = new_uid, approved_at = now()
  WHERE id = _id;

  RETURN jsonb_build_object('ok', true, 'uid', new_uid, 'phone', app.phone, 'email', app.email);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_spl_application(_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.spl_applications SET status = 'rejected' WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END;
$$;
