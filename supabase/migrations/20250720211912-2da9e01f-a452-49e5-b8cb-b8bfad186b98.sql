-- Add RLS policy for coaches to update progress percentage  
CREATE POLICY "Coaches can update progress for their athletes" 
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