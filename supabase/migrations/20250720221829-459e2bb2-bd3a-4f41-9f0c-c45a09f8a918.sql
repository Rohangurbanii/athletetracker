-- Add batch_id column to practice_sessions table
ALTER TABLE public.practice_sessions 
ADD COLUMN batch_id uuid;

-- Add foreign key constraint (optional, but good practice)
-- ALTER TABLE public.practice_sessions 
-- ADD CONSTRAINT fk_practice_sessions_batch 
-- FOREIGN KEY (batch_id) REFERENCES public.batches(id);