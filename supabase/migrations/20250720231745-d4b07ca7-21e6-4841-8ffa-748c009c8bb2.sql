-- Add indexes for RLS performance optimization
-- These indexes will significantly improve performance of RLS policy checks

-- Index on profiles.user_id (most frequently used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Index on practice_sessions.athlete_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_practice_sessions_athlete_id ON public.practice_sessions (athlete_id);

-- Index on athletes.profile_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_athletes_profile_id ON public.athletes (profile_id);

-- Index on athletes.club_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_athletes_club_id ON public.athletes (club_id);

-- Index on rpe_logs.athlete_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_rpe_logs_athlete_id ON public.rpe_logs (athlete_id);

-- Index on sleep_logs.athlete_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_sleep_logs_athlete_id ON public.sleep_logs (athlete_id);

-- Index on goals.athlete_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_goals_athlete_id ON public.goals (athlete_id);

-- Index on tournament_results.athlete_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_tournament_results_athlete_id ON public.tournament_results (athlete_id);

-- Index on tournament_participation.athlete_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_tournament_participation_athlete_id ON public.tournament_participation (athlete_id);

-- Index on batches.coach_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_batches_coach_id ON public.batches (coach_id);

-- Index on batch_athletes.batch_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_batch_athletes_batch_id ON public.batch_athletes (batch_id);

-- Index on coaches.profile_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_coaches_profile_id ON public.coaches (profile_id);

-- Index on profiles.club_id (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_profiles_club_id ON public.profiles (club_id);

-- Composite indexes for frequently joined columns in RLS policies
CREATE INDEX IF NOT EXISTS idx_practice_sessions_coach_session_date ON public.practice_sessions (coach_id, session_date);
CREATE INDEX IF NOT EXISTS idx_rpe_logs_athlete_log_date ON public.rpe_logs (athlete_id, log_date);