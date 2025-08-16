-- Create trigger to auto-create profiles on new auth users and backfill existing users without profiles
BEGIN;

-- Ensure the trigger exists and points to our handler
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Backfill minimal profiles for existing users who don't yet have a profile
-- We keep it simple and safe: create only the profiles row so the app can load.
INSERT INTO public.profiles (user_id, email, full_name, role, club_id)
SELECT 
  u.id AS user_id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)) AS full_name,
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'role', ''), 'athlete') AS role,
  CASE 
    WHEN NULLIF(u.raw_user_meta_data ->> 'role', '') = 'admin' THEN NULL
    ELSE NULLIF(u.raw_user_meta_data ->> 'club_id', '')::uuid
  END AS club_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

COMMIT;