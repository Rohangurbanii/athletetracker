-- Add coach_rpe field to rpe_logs table to store coach's RPE rating for athletes
ALTER TABLE public.rpe_logs ADD COLUMN coach_rpe integer;

-- Add a comment to clarify the difference between rpe_score (athlete's self-rating) and coach_rpe (coach's rating of athlete)
COMMENT ON COLUMN public.rpe_logs.rpe_score IS 'Athlete self-reported RPE score (1-10)';
COMMENT ON COLUMN public.rpe_logs.coach_rpe IS 'Coach-assigned RPE score for athlete (1-10)';

-- Create policy to allow coaches to update coach_rpe for athletes in their batches
CREATE POLICY "Coaches can update coach RPE for their athletes" 
ON public.rpe_logs 
FOR UPDATE 
USING (
  athlete_id IN (
    SELECT ba.athlete_id
    FROM batch_athletes ba
    JOIN batches b ON ba.batch_id = b.id
    JOIN coaches c ON b.coach_id = c.id
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);