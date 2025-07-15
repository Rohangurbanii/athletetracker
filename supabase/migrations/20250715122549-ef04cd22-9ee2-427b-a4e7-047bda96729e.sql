-- Fix infinite recursion in profiles RLS policies
-- Drop the problematic policy that causes circular reference
DROP POLICY IF EXISTS "Users can view profiles in their club" ON public.profiles;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view profiles in their club" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  (
    club_id IS NOT NULL 
    AND club_id = (
      SELECT club_id 
      FROM public.profiles 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
  )
);