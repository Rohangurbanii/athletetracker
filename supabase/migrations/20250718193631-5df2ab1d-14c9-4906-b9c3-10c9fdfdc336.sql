-- Fix the infinite recursion in profiles RLS policy
-- First create a security definer function to get current user's club_id
CREATE OR REPLACE FUNCTION public.get_current_user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop the problematic policies and recreate them properly
DROP POLICY IF EXISTS "Users can view profiles in their club" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view other profiles in their club" ON public.profiles
FOR SELECT USING (
  auth.uid() != user_id AND 
  club_id = public.get_current_user_club_id()
);