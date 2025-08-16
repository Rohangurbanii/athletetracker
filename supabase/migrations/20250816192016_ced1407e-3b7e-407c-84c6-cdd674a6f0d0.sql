BEGIN;

-- Remove recursive profiles SELECT policy and replace with safe version
DROP POLICY IF EXISTS "Club members can view other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recreate simple, non-recursive policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Safe club visibility using SECURITY DEFINER function
CREATE POLICY "Club members can view other profiles (safe)"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR (club_id IS NOT NULL AND club_id = public.get_current_user_club_id())
);

COMMIT;