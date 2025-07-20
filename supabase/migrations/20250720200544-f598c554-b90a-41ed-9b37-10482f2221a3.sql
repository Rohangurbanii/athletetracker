-- Add unique constraint for tournament results upsert operation
ALTER TABLE public.tournament_results 
ADD CONSTRAINT tournament_results_tournament_athlete_unique 
UNIQUE (tournament_id, athlete_id);