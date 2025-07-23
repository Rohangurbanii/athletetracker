-- Fix view security issue by converting to a secure function instead
DROP VIEW IF EXISTS public.security_dashboard;

-- Create a secure function instead of a view for security dashboard
CREATE OR REPLACE FUNCTION public.get_security_dashboard()
RETURNS TABLE(metric TEXT, count BIGINT, time_period TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  -- Only admins can access security data
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access security dashboard';
  END IF;
  
  RETURN QUERY
  SELECT 
    'recent_logins'::TEXT as metric,
    COUNT(*) as count,
    date_trunc('hour', al.created_at) as time_period
  FROM public.audit_logs al
  WHERE al.action = 'INSERT' 
    AND al.table_name = 'profiles'
    AND al.created_at > now() - INTERVAL '24 hours'
  GROUP BY date_trunc('hour', al.created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Grant execute permission to authenticated users (will be filtered by the function logic)
GRANT EXECUTE ON FUNCTION public.get_security_dashboard() TO authenticated;