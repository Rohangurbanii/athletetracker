-- Create clubs table
CREATE TABLE public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Add club_id to profiles table
ALTER TABLE public.profiles ADD COLUMN club_id UUID REFERENCES public.clubs(id);

-- Add club_id to practice_sessions table  
ALTER TABLE public.practice_sessions ADD COLUMN club_id UUID REFERENCES public.clubs(id);

-- Add club_id to sleep_logs table
ALTER TABLE public.sleep_logs ADD COLUMN club_id UUID REFERENCES public.clubs(id);

-- Add club_id to tournaments table
ALTER TABLE public.tournaments ADD COLUMN club_id UUID REFERENCES public.clubs(id);

-- Add club_id to tournament_results table
ALTER TABLE public.tournament_results ADD COLUMN club_id UUID REFERENCES public.clubs(id);

-- Add club_id to goals table
ALTER TABLE public.goals ADD COLUMN club_id UUID REFERENCES public.clubs(id);

-- Add club_id to coach_athletes table
ALTER TABLE public.coach_athletes ADD COLUMN club_id UUID REFERENCES public.clubs(id);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id),
  club_id UUID NOT NULL REFERENCES public.clubs(id),
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(practice_session_id, athlete_id)
);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for club-scoped access

-- Clubs policies
CREATE POLICY "Users can view their own club" ON public.clubs
FOR SELECT USING (id IN (
  SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Updated profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view profiles in their club" ON public.profiles
FOR SELECT USING (club_id IN (
  SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Updated practice_sessions policies  
DROP POLICY IF EXISTS "Athletes can view their own sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Coaches can view sessions for their athletes" ON public.practice_sessions;
DROP POLICY IF EXISTS "Coaches can create sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Coaches and athletes can update sessions" ON public.practice_sessions;

CREATE POLICY "Users can view sessions in their club" ON public.practice_sessions
FOR SELECT USING (club_id IN (
  SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Coaches can create sessions in their club" ON public.practice_sessions
FOR INSERT WITH CHECK (
  coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
  AND club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches and athletes can update sessions in their club" ON public.practice_sessions
FOR UPDATE USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
  AND (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Updated sleep_logs policies
DROP POLICY IF EXISTS "Athletes can manage their own sleep logs" ON public.sleep_logs;
DROP POLICY IF EXISTS "Coaches can view sleep logs of their athletes" ON public.sleep_logs;

CREATE POLICY "Athletes can manage their own sleep logs" ON public.sleep_logs
FOR ALL USING (
  athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can view sleep logs in their club" ON public.sleep_logs
FOR SELECT USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
);

-- Updated goals policies
DROP POLICY IF EXISTS "Athletes can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Coaches can manage goals" ON public.goals;
DROP POLICY IF EXISTS "Coaches can view goals for their athletes" ON public.goals;

CREATE POLICY "Users can view goals in their club" ON public.goals
FOR SELECT USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can manage goals in their club" ON public.goals
FOR ALL USING (
  coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
  AND club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Updated coach_athletes policies
DROP POLICY IF EXISTS "Athletes can view their coaches" ON public.coach_athletes;
DROP POLICY IF EXISTS "Coaches can manage athlete relationships" ON public.coach_athletes;
DROP POLICY IF EXISTS "Coaches can view their athletes" ON public.coach_athletes;

CREATE POLICY "Users can view coach-athlete relationships in their club" ON public.coach_athletes
FOR SELECT USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can manage athlete relationships in their club" ON public.coach_athletes
FOR ALL USING (
  coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
  AND club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Updated tournament_results policies
DROP POLICY IF EXISTS "Athletes can view their own results" ON public.tournament_results;
DROP POLICY IF EXISTS "Athletes can create their own results" ON public.tournament_results;
DROP POLICY IF EXISTS "Athletes and coaches can update results" ON public.tournament_results;
DROP POLICY IF EXISTS "Coaches can view results of their athletes" ON public.tournament_results;

CREATE POLICY "Users can view tournament results in their club" ON public.tournament_results
FOR SELECT USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Athletes can create their own results in their club" ON public.tournament_results
FOR INSERT WITH CHECK (
  athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  AND club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Athletes and coaches can update results in their club" ON public.tournament_results
FOR UPDATE USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
  AND (
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR athlete_id IN (
      SELECT ca.athlete_id FROM coach_athletes ca
      JOIN profiles p ON p.id = ca.coach_id
      WHERE p.user_id = auth.uid() AND p.role = 'coach'
    )
  )
);

-- Attendance policies
CREATE POLICY "Users can view attendance in their club" ON public.attendance
FOR SELECT USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Coaches can manage attendance in their club" ON public.attendance
FOR ALL USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update tournaments policy to allow club-scoped access
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;
CREATE POLICY "Users can view tournaments in their club" ON public.tournaments
FOR SELECT USING (
  club_id IN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid())
  OR club_id IS NULL -- Allow public tournaments
);