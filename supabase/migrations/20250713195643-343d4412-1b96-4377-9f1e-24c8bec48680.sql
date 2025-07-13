-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('coach', 'athlete')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coach-athlete relationships
CREATE TABLE public.coach_athletes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coach_id, athlete_id)
);

-- Create practice sessions
CREATE TABLE public.practice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  coach_rpe INTEGER CHECK (coach_rpe >= 1 AND coach_rpe <= 10),
  athlete_rpe INTEGER CHECK (athlete_rpe >= 1 AND athlete_rpe <= 10),
  coach_notes TEXT,
  athlete_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sleep logs
CREATE TABLE public.sleep_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bedtime TIME NOT NULL,
  wake_time TIME NOT NULL,
  quality INTEGER NOT NULL CHECK (quality >= 1 AND quality <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, date)
);

-- Create tournaments
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournament results
CREATE TABLE public.tournament_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  result TEXT NOT NULL,
  coach_notes TEXT,
  athlete_notes TEXT,
  key_learnings TEXT,
  improvement_areas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, athlete_id)
);

-- Create goals
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for coach_athletes
CREATE POLICY "Coaches can view their athletes" ON public.coach_athletes
  FOR SELECT USING (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Athletes can view their coaches" ON public.coach_athletes
  FOR SELECT USING (
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'athlete')
  );

CREATE POLICY "Coaches can manage athlete relationships" ON public.coach_athletes
  FOR ALL USING (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
  );

-- Create RLS policies for practice_sessions
CREATE POLICY "Athletes can view their own sessions" ON public.practice_sessions
  FOR SELECT USING (
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Coaches can view sessions for their athletes" ON public.practice_sessions
  FOR SELECT USING (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coaches can create sessions" ON public.practice_sessions
  FOR INSERT WITH CHECK (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coaches and athletes can update sessions" ON public.practice_sessions
  FOR UPDATE USING (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Create RLS policies for sleep_logs
CREATE POLICY "Athletes can manage their own sleep logs" ON public.sleep_logs
  FOR ALL USING (
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Coaches can view sleep logs of their athletes" ON public.sleep_logs
  FOR SELECT USING (
    athlete_id IN (
      SELECT ca.athlete_id FROM public.coach_athletes ca
      JOIN public.profiles p ON p.id = ca.coach_id
      WHERE p.user_id = auth.uid() AND p.role = 'coach'
    )
  );

-- Create RLS policies for tournaments
CREATE POLICY "Anyone can view tournaments" ON public.tournaments
  FOR SELECT USING (true);

-- Create RLS policies for tournament_results
CREATE POLICY "Athletes can view their own results" ON public.tournament_results
  FOR SELECT USING (
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Coaches can view results of their athletes" ON public.tournament_results
  FOR SELECT USING (
    athlete_id IN (
      SELECT ca.athlete_id FROM public.coach_athletes ca
      JOIN public.profiles p ON p.id = ca.coach_id
      WHERE p.user_id = auth.uid() AND p.role = 'coach'
    )
  );

CREATE POLICY "Athletes can create their own results" ON public.tournament_results
  FOR INSERT WITH CHECK (
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Athletes and coaches can update results" ON public.tournament_results
  FOR UPDATE USING (
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    athlete_id IN (
      SELECT ca.athlete_id FROM public.coach_athletes ca
      JOIN public.profiles p ON p.id = ca.coach_id
      WHERE p.user_id = auth.uid() AND p.role = 'coach'
    )
  );

-- Create RLS policies for goals
CREATE POLICY "Athletes can view their own goals" ON public.goals
  FOR SELECT USING (
    athlete_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Coaches can view goals for their athletes" ON public.goals
  FOR SELECT USING (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
  );

CREATE POLICY "Coaches can manage goals" ON public.goals
  FOR ALL USING (
    coach_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'coach')
  );

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_sessions_updated_at
  BEFORE UPDATE ON public.practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();