-- Add admin role and update club structure for scoped access

-- First, add 'admin' as a valid role option
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'coach', 'athlete'));

-- Add admin_id to clubs table to track which admin created the club
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id);

-- Update clubs RLS policies for admin management
DROP POLICY IF EXISTS "Users can view their own club" ON public.clubs;

CREATE POLICY "Users can view their own club" 
ON public.clubs 
FOR SELECT 
USING (
  id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage their club" 
ON public.clubs 
FOR ALL
USING (
  admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can create clubs" 
ON public.clubs 
FOR INSERT 
WITH CHECK (
  admin_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Update all other tables to ensure club-scoped access
-- Practice sessions
DROP POLICY IF EXISTS "Users can view sessions in their club" ON public.practice_sessions;
DROP POLICY IF EXISTS "Coaches can create sessions in their club" ON public.practice_sessions;
DROP POLICY IF EXISTS "Coaches and athletes can update sessions in their club" ON public.practice_sessions;

CREATE POLICY "Users can view sessions in their club" 
ON public.practice_sessions 
FOR SELECT 
USING (club_id = public.get_current_user_club_id());

CREATE POLICY "Coaches and admins can create sessions in their club" 
ON public.practice_sessions 
FOR INSERT 
WITH CHECK (
  club_id = public.get_current_user_club_id() 
  AND (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role IN ('coach', 'admin'))
  )
);

CREATE POLICY "Coaches, athletes and admins can update sessions in their club" 
ON public.practice_sessions 
FOR UPDATE 
USING (
  club_id = public.get_current_user_club_id()
  AND (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Goals table
DROP POLICY IF EXISTS "Users can view goals in their club" ON public.goals;
DROP POLICY IF EXISTS "Coaches can manage goals in their club" ON public.goals;

CREATE POLICY "Users can view goals in their club" 
ON public.goals 
FOR SELECT 
USING (club_id = public.get_current_user_club_id());

CREATE POLICY "Coaches and admins can manage goals in their club" 
ON public.goals 
FOR ALL
USING (
  club_id = public.get_current_user_club_id()
  AND coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role IN ('coach', 'admin'))
);

-- Sleep logs
DROP POLICY IF EXISTS "Athletes can manage their own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Coaches can view sleep logs in their club" ON public.sleep_logs;

CREATE POLICY "Athletes can manage their own sleep logs" 
ON public.sleep_logs 
FOR ALL
USING (
  club_id = public.get_current_user_club_id()
  AND athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches and admins can view sleep logs in their club" 
ON public.sleep_logs 
FOR SELECT 
USING (
  club_id = public.get_current_user_club_id()
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('coach', 'admin') AND club_id = public.get_current_user_club_id()
  )
);

-- Tournament results
DROP POLICY IF EXISTS "Users can view tournament results in their club" ON public.tournament_results;
DROP POLICY IF EXISTS "Athletes can create their own results in their club" ON public.tournament_results;
DROP POLICY IF EXISTS "Athletes and coaches can update results in their club" ON public.tournament_results;

CREATE POLICY "Users can view tournament results in their club" 
ON public.tournament_results 
FOR SELECT 
USING (club_id = public.get_current_user_club_id());

CREATE POLICY "Athletes can create their own results in their club" 
ON public.tournament_results 
FOR INSERT 
WITH CHECK (
  club_id = public.get_current_user_club_id()
  AND athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Athletes, coaches and admins can update results in their club" 
ON public.tournament_results 
FOR UPDATE 
USING (
  club_id = public.get_current_user_club_id()
  AND (
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR auth.uid() IN (
      SELECT user_id FROM public.profiles 
      WHERE role IN ('coach', 'admin') AND club_id = public.get_current_user_club_id()
    )
  )
);

-- Coach athletes relationships
DROP POLICY IF EXISTS "Users can view coach-athlete relationships in their club" ON public.coach_athletes;
DROP POLICY IF EXISTS "Coaches can manage athlete relationships in their club" ON public.coach_athletes;

CREATE POLICY "Users can view coach-athlete relationships in their club" 
ON public.coach_athletes 
FOR SELECT 
USING (club_id = public.get_current_user_club_id());

CREATE POLICY "Coaches and admins can manage athlete relationships in their club" 
ON public.coach_athletes 
FOR ALL
USING (
  club_id = public.get_current_user_club_id()
  AND coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role IN ('coach', 'admin'))
);

-- Attendance
DROP POLICY IF EXISTS "Users can view attendance in their club" ON public.attendance;
DROP POLICY IF EXISTS "Coaches can manage attendance in their club" ON public.attendance;

CREATE POLICY "Users can view attendance in their club" 
ON public.attendance 
FOR SELECT 
USING (club_id = public.get_current_user_club_id());

CREATE POLICY "Coaches and admins can manage attendance in their club" 
ON public.attendance 
FOR ALL
USING (
  club_id = public.get_current_user_club_id()
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE role IN ('coach', 'admin') AND club_id = public.get_current_user_club_id()
  )
);