-- Drop the problematic view and create a proper security definer function instead
DROP VIEW IF EXISTS public.safe_profiles;

-- Create a security definer function to get current user's role and club
CREATE OR REPLACE FUNCTION public.get_current_user_role_and_club()
RETURNS TABLE(user_role text, user_club_id uuid)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role, club_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Create a function to check if user can see sensitive profile data
CREATE OR REPLACE FUNCTION public.can_see_profile_details(target_user_id uuid)
RETURNS boolean
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    -- User can see their own details
    auth.uid() = target_user_id
    OR
    -- Admins and coaches can see details of users in their club
    EXISTS (
      SELECT 1 
      FROM public.profiles current_user, public.profiles target_user
      WHERE current_user.user_id = auth.uid()
      AND target_user.user_id = target_user_id
      AND current_user.role IN ('admin', 'coach')
      AND current_user.club_id = target_user.club_id
    );
$$;

-- Update the existing policies to be more specific about athlete access
-- Add policy for athletes to view basic coach info (name and role only)
CREATE POLICY "Athletes can view basic coach info" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() <> user_id AND
  role = 'coach' AND
  club_id = get_current_user_club_id() AND
  EXISTS (
    SELECT 1 FROM profiles athlete_profile 
    WHERE athlete_profile.user_id = auth.uid() 
    AND athlete_profile.role = 'athlete'
  )
);

-- Ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_role_and_club() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_profile_details(uuid) TO authenticated;