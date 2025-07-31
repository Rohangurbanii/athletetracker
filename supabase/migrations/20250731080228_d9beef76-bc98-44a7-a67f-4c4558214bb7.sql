-- CRITICAL SECURITY FIX: Fix role escalation vulnerability in profiles table
-- Current policy allows users to change their own roles, which is a major security flaw

-- Drop the existing unsafe UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create secure UPDATE policy that prevents role changes by regular users
CREATE POLICY "Users can update their own profile (non-role fields)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Prevent role changes unless user is admin
    role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Create admin-only role management function
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only admins can change roles
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can change user roles';
  END IF;
  
  -- Validate role
  IF new_role NOT IN ('admin', 'coach', 'athlete') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;
  
  -- Log the role change for audit
  PERFORM public.log_security_event(
    'ROLE_CHANGE',
    'profiles',
    target_user_id,
    jsonb_build_object('old_role', (SELECT role FROM public.profiles WHERE user_id = target_user_id)),
    jsonb_build_object('new_role', new_role, 'changed_by', auth.uid())
  );
  
  -- Update the role
  UPDATE public.profiles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;

-- Add stronger password validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN password IS NOT NULL
    AND length(password) >= 8
    AND password ~ '[A-Z]'  -- at least one uppercase
    AND password ~ '[a-z]'  -- at least one lowercase  
    AND password ~ '[0-9]'  -- at least one digit
    AND password !~ '^[a-zA-Z]*$'  -- not all letters
    AND password !~ '^[0-9]*$';    -- not all numbers
END;
$$;

-- Enhanced rate limiting function for auth operations
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  user_identifier text,
  action_type text,
  max_attempts integer DEFAULT 5,
  time_window interval DEFAULT '15 minutes'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM public.rate_limits
  WHERE (ip_address::text = user_identifier OR user_id::text = user_identifier)
    AND action_type = check_auth_rate_limit.action_type
    AND created_at > now() - time_window;
  
  -- If too many attempts, log and block
  IF attempt_count >= max_attempts THEN
    PERFORM public.log_security_event(
      'RATE_LIMIT_EXCEEDED',
      NULL,
      NULL,
      NULL,
      jsonb_build_object(
        'action', action_type,
        'identifier', user_identifier,
        'attempts', attempt_count
      )
    );
    RETURN false;
  END IF;
  
  -- Record this attempt
  INSERT INTO public.rate_limits (
    user_id, 
    ip_address, 
    action_type, 
    attempts,
    blocked_until
  ) VALUES (
    CASE WHEN user_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
         THEN user_identifier::uuid 
         ELSE NULL END,
    CASE WHEN user_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
         THEN NULL 
         ELSE user_identifier::inet END,
    action_type,
    1,
    CASE WHEN attempt_count + 1 >= max_attempts 
         THEN now() + time_window 
         ELSE NULL END
  );
  
  RETURN true;
END;
$$;