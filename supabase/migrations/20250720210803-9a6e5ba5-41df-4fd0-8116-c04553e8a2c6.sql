-- Update RLS policy for goals to work with batch-based coach-athlete relationships
DROP POLICY IF EXISTS "Goals viewable by athlete and coaches" ON goals;

CREATE POLICY "Goals viewable by athlete and coaches" 
ON goals 
FOR SELECT 
USING (
  -- Athletes can view their own goals
  (athlete_id IN ( 
    SELECT a.id
    FROM athletes a
    JOIN profiles p ON (a.profile_id = p.id)
    WHERE (p.user_id = auth.uid())
  )) 
  OR 
  -- Coaches can view goals of athletes in their batches
  (athlete_id IN ( 
    SELECT ba.athlete_id
    FROM batch_athletes ba
    JOIN batches b ON (ba.batch_id = b.id)
    JOIN coaches c ON (b.coach_id = c.id)
    JOIN profiles p ON (c.profile_id = p.id)
    WHERE (p.user_id = auth.uid())
  ))
);