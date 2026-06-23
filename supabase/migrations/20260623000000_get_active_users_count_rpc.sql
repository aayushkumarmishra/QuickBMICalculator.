-- Create a helper function to count unique users with login events in the last N days to prevent unbounded client downloads
CREATE OR REPLACE FUNCTION public.get_active_users_count(days_offset integer)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT user_id)
  FROM public.audit_logs
  WHERE action = 'User Login'
    AND created_at >= (now() - (days_offset || ' days')::interval);
$$;
