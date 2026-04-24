CREATE POLICY "No direct access to SPL applications"
ON public.spl_applications
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "No direct SPL application creation"
ON public.spl_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "No direct SPL application changes"
ON public.spl_applications
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct SPL application removal"
ON public.spl_applications
FOR DELETE
TO anon, authenticated
USING (false);