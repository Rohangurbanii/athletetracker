-- Add DELETE policy for athletes to delete their own tournament results
CREATE POLICY "Athletes can delete their own tournament results" 
ON public.tournament_results 
FOR DELETE 
USING (athlete_id IN ( 
  SELECT a.id
  FROM (athletes a
    JOIN profiles p ON ((a.profile_id = p.id)))
  WHERE (p.user_id = auth.uid())
));