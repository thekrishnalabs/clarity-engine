-- Public daily SPL status (no auth required)
CREATE OR REPLACE FUNCTION public.spl_today_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_start_ist TIMESTAMP WITH TIME ZONE;
  tomorrow_start_ist TIMESTAMP WITH TIME ZONE;
  cnt INTEGER;
BEGIN
  today_start_ist := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata');
  tomorrow_start_ist := today_start_ist + interval '1 day';

  SELECT count(*) INTO cnt
  FROM public.spl_applications
  WHERE created_at >= today_start_ist AND created_at < tomorrow_start_ist;

  RETURN jsonb_build_object(
    'used', cnt,
    'limit', 10,
    'remaining', GREATEST(10 - cnt, 0),
    'resets_at', tomorrow_start_ist
  );
END;
$$;

-- Allow lookup by either internal UUID or human UID like HK-SPL-YYYYMMDD-XXXX
DROP FUNCTION IF EXISTS public.lookup_spl_application(uuid);

CREATE OR REPLACE FUNCTION public.lookup_spl_application(_q text)
RETURNS TABLE(id uuid, created_at timestamp with time zone, status text, uid text, approved_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trimmed text := trim(_q);
BEGIN
  IF trimmed IS NULL OR length(trimmed) = 0 THEN
    RETURN;
  END IF;

  -- Match by human UID (case-insensitive)
  RETURN QUERY
    SELECT a.id, a.created_at, a.status, a.uid, a.approved_at
    FROM public.spl_applications a
    WHERE upper(a.uid) = upper(trimmed)
    LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Fallback: match by internal UUID if input parses as one
  BEGIN
    RETURN QUERY
      SELECT a.id, a.created_at, a.status, a.uid, a.approved_at
      FROM public.spl_applications a
      WHERE a.id = trimmed::uuid
      LIMIT 1;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN;
  END;
END;
$$;