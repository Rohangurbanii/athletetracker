-- Add created_by_athlete_id column to tournaments table to track athlete-created tournaments
ALTER TABLE public.tournaments 
ADD COLUMN created_by_athlete_id UUID REFERENCES public.athletes(id);