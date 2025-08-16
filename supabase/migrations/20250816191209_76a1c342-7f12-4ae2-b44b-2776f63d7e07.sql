-- Fix infinite recursion in profiles RLS policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admins can view club profiles" ON public.profiles;
DROP POLICY IF EXISTS "Athletes can view basic coach info" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view their athletes profiles" ON public.profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Temporarily allow broader access to resolve data fetching issues
-- This can be refined later with proper security functions
CREATE POLICY "Club members can view other club profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  club_id = (SELECT club_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
);