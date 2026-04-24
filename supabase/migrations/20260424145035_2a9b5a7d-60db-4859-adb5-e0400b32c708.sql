CREATE TABLE public.spl_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  dob DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'not_selected', 'invited')),
  CONSTRAINT spl_applications_phone_dob_unique UNIQUE (phone, dob),
  CONSTRAINT spl_applications_phone_length CHECK (char_length(phone) BETWEEN 8 AND 20)
);

CREATE INDEX idx_spl_applications_created_at ON public.spl_applications (created_at DESC);
CREATE INDEX idx_spl_applications_phone_dob ON public.spl_applications (phone, dob);

ALTER TABLE public.spl_applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.submit_spl_application(
  _phone TEXT,
  _dob DATE,
  _answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_start_ist TIMESTAMP WITH TIME ZONE;
  tomorrow_start_ist TIMESTAMP WITH TIME ZONE;
  todays_count INTEGER;
  existing_id UUID;
  new_id UUID;
BEGIN
  IF _phone IS NULL OR char_length(trim(_phone)) < 8 OR char_length(trim(_phone)) > 20 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_phone', 'message', 'Please enter a valid WhatsApp number.');
  END IF;

  IF _dob IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_dob', 'message', 'Please enter your date of birth.');
  END IF;

  SELECT id INTO existing_id
  FROM public.spl_applications
  WHERE phone = trim(_phone) AND dob = _dob
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'duplicate', 'message', 'You have already submitted your SPL application once.', 'id', existing_id);
  END IF;

  today_start_ist := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata');
  tomorrow_start_ist := today_start_ist + interval '1 day';

  SELECT count(*) INTO todays_count
  FROM public.spl_applications
  WHERE created_at >= today_start_ist AND created_at < tomorrow_start_ist;

  IF todays_count >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'full', 'message', 'Seats full. Reset in 00:00 IST. Come back tomorrow.');
  END IF;

  INSERT INTO public.spl_applications (phone, dob, answers, status)
  VALUES (trim(_phone), _dob, COALESCE(_answers, '{}'::jsonb), 'pending')
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id, 'message', 'If selected, you will receive an invitation within 24 hours.');
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_spl_application(_id UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT spl_applications.id, spl_applications.created_at, spl_applications.status
  FROM public.spl_applications
  WHERE spl_applications.id = _id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.submit_spl_application(TEXT, DATE, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_spl_application(UUID) TO anon, authenticated;