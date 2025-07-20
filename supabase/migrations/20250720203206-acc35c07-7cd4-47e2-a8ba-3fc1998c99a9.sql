-- Add DELETE policy for coaches to delete tournament results for their athletes
CREATE POLICY "Coaches can delete tournament results for their athletes" 
ON public.tournament_results 
FOR DELETE 
USING (athlete_id IN ( 
  SELECT ba.athlete_id
  FROM (((batch_athletes ba
    JOIN batches b ON ((ba.batch_id = b.id)))
    JOIN coaches c ON ((b.coach_id = c.id)))
    JOIN profiles p ON ((c.profile_id = p.id)))
  WHERE (p.user_id = auth.uid())
));