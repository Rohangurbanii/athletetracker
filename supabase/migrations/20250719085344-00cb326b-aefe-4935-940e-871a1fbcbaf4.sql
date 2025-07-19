-- Add UPDATE policy for athletes to update their own RPE logs
CREATE POLICY "Athletes can update their own RPE logs" 
ON public.rpe_logs 
FOR UPDATE 
USING (athlete_id IN ( 
  SELECT a.id
  FROM (athletes a
    JOIN profiles p ON ((a.profile_id = p.id)))
  WHERE (p.user_id = auth.uid())
));