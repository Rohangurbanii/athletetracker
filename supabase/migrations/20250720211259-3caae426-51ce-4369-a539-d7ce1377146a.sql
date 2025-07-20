-- Add coach completion tracking to goals table
ALTER TABLE goals ADD COLUMN coach_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE goals ADD COLUMN completed_by_coach_at TIMESTAMP WITH TIME ZONE;

-- Update RLS policy to allow coaches to update goal completion status
CREATE POLICY "Coaches can update goal completion for their athletes" 
ON goals 
FOR UPDATE 
USING (
  athlete_id IN ( 
    SELECT ba.athlete_id
    FROM batch_athletes ba
    JOIN batches b ON (ba.batch_id = b.id)
    JOIN coaches c ON (b.coach_id = c.id)
    JOIN profiles p ON (c.profile_id = p.id)
    WHERE (p.user_id = auth.uid())
  )
);