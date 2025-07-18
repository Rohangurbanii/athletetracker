-- Create function to handle new user signup and create club for admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_club_id uuid;
BEGIN
  -- Insert profile for the user
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
  );

  -- If user is admin, create a new club and update their profile
  IF NEW.raw_user_meta_data ->> 'role' = 'admin' THEN
    INSERT INTO public.clubs (name, admin_id)
    VALUES (
      NEW.raw_user_meta_data ->> 'club_name',
      NEW.id
    )
    RETURNING id INTO new_club_id;
    
    -- Update the profile with the new club_id
    UPDATE public.profiles 
    SET club_id = new_club_id
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();