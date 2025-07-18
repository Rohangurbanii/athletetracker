-- Create missing athlete records for existing athlete profiles
INSERT INTO public.athletes (profile_id, club_id)
SELECT p.id, p.club_id
FROM public.profiles p
WHERE p.role = 'athlete'
AND NOT EXISTS (
  SELECT 1 FROM public.athletes a WHERE a.profile_id = p.id
);

-- Create missing coach records for existing coach profiles
INSERT INTO public.coaches (profile_id, club_id)
SELECT p.id, p.club_id
FROM public.profiles p
WHERE p.role = 'coach'
AND NOT EXISTS (
  SELECT 1 FROM public.coaches c WHERE c.profile_id = p.id
);

-- Update the trigger to properly create athlete/coach records
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
      new_profile_id
    )
    RETURNING id INTO new_club_id;
    
    -- Update the profile with the new club_id
    UPDATE public.profiles 
    SET club_id = new_club_id
    WHERE id = new_profile_id;
  END IF;

  -- If user is an athlete, create athlete record
  IF NEW.raw_user_meta_data ->> 'role' = 'athlete' THEN
    INSERT INTO public.athletes (profile_id, club_id)
    VALUES (
      new_profile_id,
      COALESCE(new_club_id, (NEW.raw_user_meta_data ->> 'club_id')::uuid)
    );
  END IF;

  -- If user is a coach, create coach record
  IF NEW.raw_user_meta_data ->> 'role' = 'coach' THEN
    INSERT INTO public.coaches (profile_id, club_id)
    VALUES (
      new_profile_id,
      COALESCE(new_club_id, (NEW.raw_user_meta_data ->> 'club_id')::uuid)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;