-- Update clubs RLS policy to allow unauthenticated users to view clubs for signup
DROP POLICY IF EXISTS "Clubs are viewable by authenticated users" ON public.clubs;

CREATE POLICY "Clubs are viewable by everyone" ON public.clubs
FOR SELECT USING (true);

-- Keep the other club policies as they are
-- Only admins can still insert/update clubs