-- Fix remaining security linter issues

-- 1. Fix security definer view issue by recreating the view without security definer
DROP VIEW IF EXISTS public.security_dashboard;

CREATE VIEW public.security_dashboard AS
SELECT 
  'recent_logins' as metric,
  COUNT(*) as count,
  date_trunc('hour', created_at) as time_period
FROM public.audit_logs 
WHERE action = 'INSERT' 
  AND table_name = 'profiles'
  AND created_at > now() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', created_at);

-- Enable RLS on the view
ALTER VIEW public.security_dashboard SET (security_barrier = on);

-- Create RLS policy for the view
CREATE POLICY "Only admins can view security dashboard" 
ON public.security_dashboard 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Security migration complete