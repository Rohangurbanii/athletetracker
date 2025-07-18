-- Create batches table
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  coach_id UUID NOT NULL,
  club_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batch_athletes junction table
CREATE TABLE public.batch_athletes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  athlete_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(batch_id, athlete_id)
);

-- Enable RLS on batches table
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Enable RLS on batch_athletes table
ALTER TABLE public.batch_athletes ENABLE ROW LEVEL SECURITY;

-- Create policies for batches table
CREATE POLICY "Coaches can view their own batches" 
ON public.batches 
FOR SELECT 
USING (coach_id IN (
  SELECT c.id 
  FROM coaches c 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Coaches can create batches" 
ON public.batches 
FOR INSERT 
WITH CHECK (coach_id IN (
  SELECT c.id 
  FROM coaches c 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Coaches can update their own batches" 
ON public.batches 
FOR UPDATE 
USING (coach_id IN (
  SELECT c.id 
  FROM coaches c 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Coaches can delete their own batches" 
ON public.batches 
FOR DELETE 
USING (coach_id IN (
  SELECT c.id 
  FROM coaches c 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

-- Create policies for batch_athletes table
CREATE POLICY "Batch athletes viewable by coach" 
ON public.batch_athletes 
FOR SELECT 
USING (batch_id IN (
  SELECT b.id 
  FROM batches b 
  JOIN coaches c ON b.coach_id = c.id 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Coaches can assign athletes to their batches" 
ON public.batch_athletes 
FOR INSERT 
WITH CHECK (batch_id IN (
  SELECT b.id 
  FROM batches b 
  JOIN coaches c ON b.coach_id = c.id 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Coaches can remove athletes from their batches" 
ON public.batch_athletes 
FOR DELETE 
USING (batch_id IN (
  SELECT b.id 
  FROM batches b 
  JOIN coaches c ON b.coach_id = c.id 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on batches
CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();