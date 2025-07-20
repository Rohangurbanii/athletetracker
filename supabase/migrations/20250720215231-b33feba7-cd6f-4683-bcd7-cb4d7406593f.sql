-- Add policy to allow coaches to insert RPE logs for their athletes
CREATE POLICY "Coaches can insert RPE logs for their athletes" 
ON public.rpe_logs 
FOR INSERT 
WITH CHECK (
  athlete_id IN (
    SELECT ba.athlete_id
    FROM batch_athletes ba
    JOIN batches b ON ba.batch_id = b.id
    JOIN coaches c ON b.coach_id = c.id
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);