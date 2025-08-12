-- Performance indexes for frequent filters
CREATE INDEX IF NOT EXISTS idx_rpe_logs_athlete_date ON public.rpe_logs (athlete_id, log_date);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_athlete_date ON public.sleep_logs (athlete_id, sleep_date);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_athlete_date ON public.practice_sessions (athlete_id, session_date);
CREATE INDEX IF NOT EXISTS idx_practice_feedback_club_date ON public.practice_feedback (club_id, feedback_date);
CREATE INDEX IF NOT EXISTS idx_batches_coach_id ON public.batches (coach_id);
CREATE INDEX IF NOT EXISTS idx_batch_athletes_batch_id ON public.batch_athletes (batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_athletes_athlete_id ON public.batch_athletes (athlete_id);