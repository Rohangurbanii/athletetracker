-- Add policy for athletes to view their own record
CREATE POLICY "Athletes can view their own record" 
ON public.athletes 
FOR SELECT 
USING (profile_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));