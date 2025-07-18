-- Add admin_id column to clubs table
ALTER TABLE public.clubs ADD COLUMN admin_id uuid REFERENCES public.profiles(id);

-- Create index for better performance
CREATE INDEX idx_clubs_admin_id ON public.clubs(admin_id);

-- Add missing RLS policies for tables that need them

-- Attendance policies
CREATE POLICY "Attendance viewable by club members" ON public.attendance
FOR SELECT USING (
  club_id IN (
    SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Attendance insertable by coaches and admins" ON public.attendance
FOR INSERT WITH CHECK (
  club_id IN (
    SELECT p.club_id FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role IN ('coach', 'admin')
  )
);

-- Coach_athletes policies
CREATE POLICY "Coach athletes viewable by club members" ON public.coach_athletes
FOR SELECT USING (
  coach_id IN (
    SELECT c.id FROM public.coaches c 
    JOIN public.profiles p ON c.profile_id = p.id 
    WHERE p.club_id IN (
      SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Goals policies
CREATE POLICY "Goals viewable by athlete and coaches" ON public.goals
FOR SELECT USING (
  athlete_id IN (
    SELECT a.id FROM public.athletes a 
    JOIN public.profiles p ON a.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  ) OR
  athlete_id IN (
    SELECT ca.athlete_id FROM public.coach_athletes ca
    JOIN public.coaches c ON ca.coach_id = c.id
    JOIN public.profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Goals insertable by athlete" ON public.goals
FOR INSERT WITH CHECK (
  athlete_id IN (
    SELECT a.id FROM public.athletes a 
    JOIN public.profiles p ON a.profile_id = p.id 
    WHERE p.user_id = auth.uid()
  )
);

-- Practice sessions policies
CREATE POLICY "Practice sessions viewable by club members" ON public.practice_sessions
FOR SELECT USING (
  club_id IN (
    SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Practice sessions insertable by coaches and admins" ON public.practice_sessions
FOR INSERT WITH CHECK (
  club_id IN (
    SELECT p.club_id FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role IN ('coach', 'admin')
  )
);

-- Tournament results policies  
CREATE POLICY "Tournament results viewable by club members" ON public.tournament_results
FOR SELECT USING (
  athlete_id IN (
    SELECT a.id FROM public.athletes a 
    JOIN public.profiles p ON a.profile_id = p.id 
    WHERE p.club_id IN (
      SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Tournaments policies
CREATE POLICY "Tournaments viewable by club members" ON public.tournaments
FOR SELECT USING (
  club_id IN (
    SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
  ) OR club_id IS NULL -- Public tournaments
);

CREATE POLICY "Tournaments insertable by admins and coaches" ON public.tournaments
FOR INSERT WITH CHECK (
  club_id IN (
    SELECT p.club_id FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role IN ('coach', 'admin')
  )
);