-- Create stat definitions table for club-wide custom metrics
CREATE TABLE IF NOT EXISTS public.stat_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_by_profile_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stat_definitions ENABLE ROW LEVEL SECURITY;

-- Policies for stat_definitions
CREATE POLICY "Stats viewable by club members"
ON public.stat_definitions
FOR SELECT
USING (club_id = public.get_current_user_club_id());

CREATE POLICY "Coaches and admins can create stats for their club"
ON public.stat_definitions
FOR INSERT
WITH CHECK (
  club_id = public.get_current_user_club_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('coach','admin')
  )
);

CREATE POLICY "Coaches and admins can update stats for their club"
ON public.stat_definitions
FOR UPDATE
USING (
  club_id = public.get_current_user_club_id()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('coach','admin')
  )
);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_stat_definitions_updated_at
BEFORE UPDATE ON public.stat_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create stat values table
CREATE TABLE IF NOT EXISTS public.stat_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_id uuid NOT NULL REFERENCES public.stat_definitions(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL,
  value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stat_id, athlete_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stat_values_stat_id ON public.stat_values(stat_id);
CREATE INDEX IF NOT EXISTS idx_stat_values_athlete_id ON public.stat_values(athlete_id);

-- Enable RLS
ALTER TABLE public.stat_values ENABLE ROW LEVEL SECURITY;

-- Policies for stat_values
-- Athletes can view their own stat values
CREATE POLICY "Athletes can view their own stat values"
ON public.stat_values
FOR SELECT
USING (
  athlete_id IN (
    SELECT a.id FROM public.athletes a
    JOIN public.profiles p ON a.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Club members can view stat values for their club
CREATE POLICY "Club members can view club stat values"
ON public.stat_values
FOR SELECT
USING (
  stat_id IN (
    SELECT sd.id FROM public.stat_definitions sd
    WHERE sd.club_id = public.get_current_user_club_id()
  )
);

-- Coaches/admins can insert values for their club
CREATE POLICY "Coaches and admins can insert stat values for their club"
ON public.stat_values
FOR INSERT
WITH CHECK (
  stat_id IN (
    SELECT sd.id FROM public.stat_definitions sd
    WHERE sd.club_id = public.get_current_user_club_id()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('coach','admin')
  )
);

-- Coaches/admins can update values for their club
CREATE POLICY "Coaches and admins can update stat values for their club"
ON public.stat_values
FOR UPDATE
USING (
  stat_id IN (
    SELECT sd.id FROM public.stat_definitions sd
    WHERE sd.club_id = public.get_current_user_club_id()
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('coach','admin')
  )
);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_stat_values_updated_at
BEFORE UPDATE ON public.stat_values
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();