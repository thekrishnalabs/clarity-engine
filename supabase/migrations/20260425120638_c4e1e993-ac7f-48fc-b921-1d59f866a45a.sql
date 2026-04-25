ALTER FUNCTION public.admin_list_spl_applications() SET search_path = public;
ALTER FUNCTION public.admin_list_bookings() SET search_path = public;
ALTER FUNCTION public.approve_spl_application(uuid) SET search_path = public;
ALTER FUNCTION public.reject_spl_application(uuid) SET search_path = public;
ALTER FUNCTION public.submit_booking(text, text, text, date, text, text, text, integer, text) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;