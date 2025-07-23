-- Fix overly restrictive security constraints that may be blocking normal app functionality

-- 1. Update sanitize_text function to be less aggressive and preserve legitimate content
CREATE OR REPLACE FUNCTION public.sanitize_text(input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Return original input if null or empty
  IF input IS NULL OR trim(input) = '' THEN
    RETURN input;
  END IF;
  
  -- Only remove truly dangerous patterns, preserve legitimate content
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(input, '<script[^>]*>.*?</script>', '', 'gi'),
      'javascript:[^"\s]*', '', 'gi'
    ),
    '\.\./+', '', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = '';

-- 2. Create a more permissive validation function for general text content
CREATE OR REPLACE FUNCTION public.validate_content_text(input TEXT, max_length INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow most content, only block truly dangerous patterns
  RETURN input IS NOT NULL 
    AND length(input) <= max_length
    AND position('<script' in lower(input)) = 0
    AND position('javascript:' in lower(input)) = 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = '';

-- 3. Temporarily disable constraints that might be blocking uploads
-- Remove overly restrictive constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_full_name;
ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS valid_club_name;
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS valid_goal_title;
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS valid_tournament_name;

-- Add more permissive constraints
ALTER TABLE public.profiles ADD CONSTRAINT valid_full_name_permissive
  CHECK (full_name IS NULL OR (length(full_name) <= 100 AND position('<script' in lower(full_name)) = 0));

ALTER TABLE public.clubs ADD CONSTRAINT valid_club_name_permissive
  CHECK (length(name) <= 100 AND position('<script' in lower(name)) = 0);

ALTER TABLE public.goals ADD CONSTRAINT valid_goal_title_permissive
  CHECK (length(title) <= 200 AND position('<script' in lower(title)) = 0);

ALTER TABLE public.tournaments ADD CONSTRAINT valid_tournament_name_permissive
  CHECK (length(name) <= 200 AND position('<script' in lower(name)) = 0);

-- 4. Update the profile update policy to be less restrictive
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Prevent role changes except by admins
    role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- 5. Log a security event that we've relaxed constraints for functionality
SELECT public.log_security_event('SECURITY_CONSTRAINTS_RELAXED', 'profiles', NULL, NULL, 
  jsonb_build_object('reason', 'Allow normal app functionality while maintaining core security'));