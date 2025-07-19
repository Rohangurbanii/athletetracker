-- Update RLS policies to allow coaches to view athlete data from their batches

-- Drop existing restrictive policies for sleep_logs
DROP POLICY IF EXISTS "Sleep logs viewable by athlete and their coaches" ON sleep_logs;

-- Create new policy for sleep_logs that allows coaches to view data for athletes in their batches
CREATE POLICY "Sleep logs viewable by athlete and coaches in same batch" 
ON sleep_logs 
FOR SELECT 
USING (
  -- Allow athletes to view their own logs
  (athlete_id IN (
    SELECT a.id
    FROM athletes a
    JOIN profiles p ON a.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )) 
  OR 
  -- Allow coaches to view logs for athletes in their batches
  (athlete_id IN (
    SELECT ba.athlete_id
    FROM batch_athletes ba
    JOIN batches b ON ba.batch_id = b.id
    JOIN coaches c ON b.coach_id = c.id
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ))
);

-- Drop existing restrictive policies for rpe_logs
DROP POLICY IF EXISTS "RPE logs viewable by athlete and their coaches" ON rpe_logs;

-- Create new policy for rpe_logs that allows coaches to view data for athletes in their batches
CREATE POLICY "RPE logs viewable by athlete and coaches in same batch" 
ON rpe_logs 
FOR SELECT 
USING (
  -- Allow athletes to view their own logs
  (athlete_id IN (
    SELECT a.id
    FROM athletes a
    JOIN profiles p ON a.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )) 
  OR 
  -- Allow coaches to view logs for athletes in their batches
  (athlete_id IN (
    SELECT ba.athlete_id
    FROM batch_athletes ba
    JOIN batches b ON ba.batch_id = b.id
    JOIN coaches c ON b.coach_id = c.id
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ))
);