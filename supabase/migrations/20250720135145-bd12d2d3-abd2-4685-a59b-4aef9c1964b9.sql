-- Create tournament participation table
CREATE TABLE public.tournament_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  athlete_id UUID NOT NULL,
  is_participating BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tournament_id, athlete_id)
);

-- Enable RLS
ALTER TABLE public.tournament_participation ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Athletes can view their own participation"
ON public.tournament_participation
FOR SELECT
USING (athlete_id IN (
  SELECT a.id
  FROM athletes a
  JOIN profiles p ON a.profile_id = p.id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Athletes can insert their own participation"
ON public.tournament_participation
FOR INSERT
WITH CHECK (athlete_id IN (
  SELECT a.id
  FROM athletes a
  JOIN profiles p ON a.profile_id = p.id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Athletes can update their own participation"
ON public.tournament_participation
FOR UPDATE
USING (athlete_id IN (
  SELECT a.id
  FROM athletes a
  JOIN profiles p ON a.profile_id = p.id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Coaches can view participation for their club tournaments"
ON public.tournament_participation
FOR SELECT
USING (tournament_id IN (
  SELECT t.id
  FROM tournaments t
  JOIN profiles p ON t.club_id = p.club_id
  WHERE p.user_id = auth.uid() AND p.role = 'coach'
));

-- Add trigger for updated_at
CREATE TRIGGER update_tournament_participation_updated_at
BEFORE UPDATE ON public.tournament_participation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();