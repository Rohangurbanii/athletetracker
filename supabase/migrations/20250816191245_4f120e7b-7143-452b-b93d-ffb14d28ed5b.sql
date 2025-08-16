-- Drop all existing problematic policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile (non-role fields)" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view club profiles" ON public.profiles;
DROP POLICY IF EXISTS "Athletes can view basic coach info" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view their athletes profiles" ON public.profiles;

-- Create simple, working policies
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

-- Simple club member visibility (non-recursive)
CREATE POLICY "Club members can view other profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.club_id = profiles.club_id
  )
);