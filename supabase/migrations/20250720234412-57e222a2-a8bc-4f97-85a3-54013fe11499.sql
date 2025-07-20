-- Create session_batches junction table to support multiple batches per session
CREATE TABLE public.session_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  batch_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, batch_id)
);

-- Enable RLS on session_batches table
ALTER TABLE public.session_batches ENABLE ROW LEVEL SECURITY;

-- Create policies for session_batches table
CREATE POLICY "Coaches can view session batches for their sessions" 
ON public.session_batches 
FOR SELECT 
USING (session_id IN (
  SELECT ps.id 
  FROM practice_sessions ps 
  JOIN coaches c ON ps.coach_id = c.id 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Coaches can create session batches for their sessions" 
ON public.session_batches 
FOR INSERT 
WITH CHECK (session_id IN (
  SELECT ps.id 
  FROM practice_sessions ps 
  JOIN coaches c ON ps.coach_id = c.id 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Coaches can delete session batches for their sessions" 
ON public.session_batches 
FOR DELETE 
USING (session_id IN (
  SELECT ps.id 
  FROM practice_sessions ps 
  JOIN coaches c ON ps.coach_id = c.id 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

-- Add a session_group_id to practice_sessions to group related sessions
ALTER TABLE public.practice_sessions 
ADD COLUMN session_group_id UUID DEFAULT gen_random_uuid();

-- Create index for better performance
CREATE INDEX idx_session_batches_session_id ON public.session_batches(session_id);
CREATE INDEX idx_session_batches_batch_id ON public.session_batches(batch_id);
CREATE INDEX idx_practice_sessions_session_group_id ON public.practice_sessions(session_group_id);