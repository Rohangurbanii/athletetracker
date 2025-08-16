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
      FROM public.profiles p1, public.profiles p2
      WHERE p1.user_id = auth.uid()
      AND p2.user_id = target_user_id
      AND p1.role IN ('admin', 'coach')
      AND p1.club_id = p2.club_id
    );
$$;

-- Ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_role_and_club() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_profile_details(uuid) TO authenticated;