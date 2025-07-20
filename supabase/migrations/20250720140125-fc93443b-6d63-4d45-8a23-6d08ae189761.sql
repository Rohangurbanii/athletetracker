-- Add new fields to tournament_results table for athlete self-assessment and coach comments
ALTER TABLE public.tournament_results 
ADD COLUMN position text,
ADD COLUMN areas_of_improvement text,
ADD COLUMN strong_points text,
ADD COLUMN coach_comments text,
ADD COLUMN athlete_completed_at timestamp with time zone,
ADD COLUMN coach_completed_at timestamp with time zone;

-- Update RLS policies to allow athletes to insert/update their own results
CREATE POLICY "Athletes can insert their own tournament results" 
ON public.tournament_results 
FOR INSERT 
WITH CHECK (athlete_id IN ( 
  SELECT a.id
  FROM (athletes a
    JOIN profiles p ON ((a.profile_id = p.id)))
  WHERE (p.user_id = auth.uid())
));

CREATE POLICY "Athletes can update their own tournament results" 
ON public.tournament_results 
FOR UPDATE 
USING (athlete_id IN ( 
  SELECT a.id
  FROM (athletes a
    JOIN profiles p ON ((a.profile_id = p.id)))
  WHERE (p.user_id = auth.uid())
));

-- Allow coaches to update coach comments for their athletes
CREATE POLICY "Coaches can update coach comments for their athletes" 
ON public.tournament_results 
FOR UPDATE 
USING (athlete_id IN ( 
  SELECT ba.athlete_id
  FROM (((batch_athletes ba
    JOIN batches b ON ((ba.batch_id = b.id)))
    JOIN coaches c ON ((b.coach_id = c.id)))
    JOIN profiles p ON ((c.profile_id = p.id)))
  WHERE (p.user_id = auth.uid())
));