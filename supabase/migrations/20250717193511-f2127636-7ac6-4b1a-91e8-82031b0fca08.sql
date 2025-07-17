-- Ensure clubs table has the correct structure
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS description text;

-- Enable RLS on clubs table
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clubs table
DROP POLICY IF EXISTS "Users can view their own club" ON public.clubs;
CREATE POLICY "Users can view their own club" 
ON public.clubs 
FOR SELECT 
USING (id IN (
  SELECT profiles.club_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins can manage their club" ON public.clubs;
CREATE POLICY "Admins can manage their club" 
ON public.clubs 
FOR ALL 
USING (admin_id IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

DROP POLICY IF EXISTS "Admins can create clubs" ON public.clubs;
CREATE POLICY "Admins can create clubs" 
ON public.clubs 
FOR INSERT 
WITH CHECK (admin_id IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));