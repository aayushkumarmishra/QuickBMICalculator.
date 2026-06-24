-- Create a helper function to count unique users with reports database-side to prevent unbounded client downloads
CREATE OR REPLACE FUNCTION public.get_unique_reports_user_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT count(distinct user_id) FROM public.health_reports;
$$;
