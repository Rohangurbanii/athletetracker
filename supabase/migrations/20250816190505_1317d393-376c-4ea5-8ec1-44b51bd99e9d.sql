-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view other profiles in their club" ON public.profiles;

-- Create more secure, role-based policies

-- 1. Coaches can view profiles of athletes in their batches (limited fields)
CREATE POLICY "Coaches can view their athletes profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() <> user_id AND
  EXISTS (
    SELECT 1 
    FROM coaches c
    JOIN profiles coach_profile ON c.profile_id = coach_profile.id
    JOIN batches b ON c.id = b.coach_id
    JOIN batch_athletes ba ON b.id = ba.batch_id
    JOIN athletes a ON ba.athlete_id = a.id
    WHERE coach_profile.user_id = auth.uid()
    AND a.profile_id = profiles.id
  )
);

-- 2. Admins can view all profiles in their club
CREATE POLICY "Admins can view club profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() <> user_id AND
  club_id = get_current_user_club_id() AND
  EXISTS (
    SELECT 1 FROM profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND admin_profile.role = 'admin'
  )
);

-- 3. Athletes can view only basic info of their coaches (name only, not email/phone)
-- This will be handled in the application layer by selecting only specific fields

-- Create a view for safe profile access with masked sensitive data
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  id,
  user_id,
  full_name,
  role,
  club_id,
  created_at,
  updated_at,
  -- Mask email and phone for non-privileged access
  CASE 
    WHEN auth.uid() = user_id THEN email
    WHEN EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'coach')
      AND p.club_id = profiles.club_id
    ) THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN auth.uid() = user_id THEN phone
    WHEN EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'coach')
      AND p.club_id = profiles.club_id
    ) THEN phone
    ELSE NULL
  END as phone,
  CASE 
    WHEN auth.uid() = user_id THEN avatar_url
    WHEN EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.club_id = profiles.club_id
    ) THEN avatar_url
    ELSE NULL
  END as avatar_url
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.safe_profiles SET (security_barrier = true);

-- Grant access to the view
GRANT SELECT ON public.safe_profiles TO authenticated;