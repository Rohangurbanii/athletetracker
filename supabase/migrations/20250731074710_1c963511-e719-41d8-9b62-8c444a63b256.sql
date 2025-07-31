-- Update tournaments table RLS policies to allow athletes to insert their own tournaments

-- Drop existing insert policy
DROP POLICY "Tournaments insertable by admins and coaches" ON public.tournaments;

-- Create new insert policy that allows both coaches/admins (club tournaments) and athletes (personal tournaments)
CREATE POLICY "Tournaments insertable by admins, coaches, and athletes"
ON public.tournaments
FOR INSERT
WITH CHECK (
  -- Admins and coaches can create club tournaments (created_by_athlete_id is null)
  (created_by_athlete_id IS NULL AND club_id IN (
    SELECT p.club_id FROM profiles p 
    WHERE p.user_id = auth.uid() AND p.role IN ('coach', 'admin')
  ))
  OR
  -- Athletes can create their own tournaments (created_by_athlete_id is their athlete ID)
  (created_by_athlete_id IN (
    SELECT a.id FROM athletes a
    JOIN profiles p ON a.profile_id = p.id
    WHERE p.user_id = auth.uid() AND p.role = 'athlete'
  ))
);

-- Update select policy to include athlete-created tournaments
DROP POLICY "Tournaments viewable by club members" ON public.tournaments;

CREATE POLICY "Tournaments viewable by club members and related athletes/coaches"
ON public.tournaments
FOR SELECT
USING (
  -- Club tournaments visible to all club members
  (created_by_athlete_id IS NULL AND (
    club_id IN (SELECT profiles.club_id FROM profiles WHERE profiles.user_id = auth.uid()) 
    OR club_id IS NULL
  ))
  OR
  -- Athlete-created tournaments visible to the athlete who created them
  (created_by_athlete_id IN (
    SELECT a.id FROM athletes a
    JOIN profiles p ON a.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ))
  OR
  -- Athlete-created tournaments visible to their coaches
  (created_by_athlete_id IN (
    SELECT ba.athlete_id FROM batch_athletes ba
    JOIN batches b ON ba.batch_id = b.id
    JOIN coaches c ON b.coach_id = c.id
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid() AND p.role = 'coach'
  ))
);