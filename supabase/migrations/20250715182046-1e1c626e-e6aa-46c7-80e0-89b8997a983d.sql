-- Update the handle_new_user function to create clubs for admin users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_profile_id uuid;
  club_name text;
BEGIN
  -- Insert profile first
  INSERT INTO public.profiles (user_id, email, full_name, role, club_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN NULL
      ELSE NEW.raw_user_meta_data->>'club_id'::uuid
    END
  )
  RETURNING id INTO new_profile_id;

  -- If user is admin, create a club
  IF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    club_name := NEW.raw_user_meta_data->>'club_name';
    IF club_name IS NOT NULL THEN
      INSERT INTO public.clubs (name, admin_id)
      VALUES (club_name, new_profile_id);
      
      -- Update the profile with the new club_id
      UPDATE public.profiles 
      SET club_id = (SELECT id FROM public.clubs WHERE admin_id = new_profile_id)
      WHERE id = new_profile_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;