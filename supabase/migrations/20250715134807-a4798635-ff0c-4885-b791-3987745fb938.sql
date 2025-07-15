-- Completely fix RLS policies for profiles table
-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their club" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same club" ON public.profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a security definer function to get current user's club_id
CREATE OR REPLACE FUNCTION public.get_current_user_club_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT club_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Now create club viewing policy using the function
CREATE POLICY "Users can view profiles in their club" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  (
    club_id IS NOT NULL 
    AND club_id = public.get_current_user_club_id()
  )
);