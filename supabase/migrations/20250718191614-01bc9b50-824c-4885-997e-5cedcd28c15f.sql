-- Fix the trigger to properly link admin_id to profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_club_id uuid;
  new_profile_id uuid;
BEGIN
  -- Insert profile for the user and get the profile ID
  INSERT INTO public.profiles (user_id, email, full_name, role, club_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'role',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'role' = 'admin' THEN NULL
      ELSE (NEW.raw_user_meta_data ->> 'club_id')::uuid
    END
  )
  RETURNING id INTO new_profile_id;

  -- If user is admin, create a new club and update their profile
  IF NEW.raw_user_meta_data ->> 'role' = 'admin' THEN
    INSERT INTO public.clubs (name, admin_id)
    VALUES (
      NEW.raw_user_meta_data ->> 'club_name',
      new_profile_id  -- Use profile ID, not auth user ID
    )
    RETURNING id INTO new_club_id;
    
    -- Update the profile with the new club_id
    UPDATE public.profiles 
    SET club_id = new_club_id
    WHERE id = new_profile_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add proper foreign key constraint for admin_id
ALTER TABLE public.clubs 
DROP CONSTRAINT IF EXISTS clubs_admin_id_fkey;

ALTER TABLE public.clubs 
ADD CONSTRAINT clubs_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES public.profiles(id);