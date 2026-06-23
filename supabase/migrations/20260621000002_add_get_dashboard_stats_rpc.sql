-- Create get_dashboard_stats RPC function to resolve 19 concurrent requests issue
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  start_today timestamptz,
  seven_days timestamptz,
  fourteen_days timestamptz,
  thirty_days timestamptz,
  sixty_days timestamptz
)
RETURNS jsonb
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND public.is_admin_email(email)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_reports', (SELECT count(*) FROM public.health_reports),
    'total_profiles', (SELECT count(*) FROM public.tracker_profiles),
    'google_users', (SELECT count(*) FROM public.profiles WHERE provider = 'google'),
    'email_users', (SELECT count(*) FROM public.profiles WHERE provider IS NULL),
    'reports_today', (SELECT count(*) FROM public.health_reports WHERE created_at >= start_today),
    'reports_7days', (SELECT count(*) FROM public.health_reports WHERE created_at >= seven_days),
    'reports_14days', (SELECT count(*) FROM public.health_reports WHERE created_at >= fourteen_days),
    'reports_30days', (SELECT count(*) FROM public.health_reports WHERE created_at >= thirty_days),
    'reports_60days', (SELECT count(*) FROM public.health_reports WHERE created_at >= sixty_days),
    'reports_bmi', (SELECT count(*) FROM public.health_reports WHERE calculator_type = 'bmi'),
    'reports_bmr', (SELECT count(*) FROM public.health_reports WHERE calculator_type = 'bmr'),
    'reports_calorie', (SELECT count(*) FROM public.health_reports WHERE calculator_type = 'calorie'),
    'reports_water', (SELECT count(*) FROM public.health_reports WHERE calculator_type = 'water_intake'),
    'reports_ideal', (SELECT count(*) FROM public.health_reports WHERE calculator_type = 'ideal_weight'),
    'underweight', (SELECT count(*) FROM public.health_reports WHERE calculator_type = 'bmi' AND result_data->>'category' = 'Underweight'),
    'normal', (SELECT count(*) FROM public.health_reports WHERE calculator_type = 'bmi' AND result_data->>'category' = 'Normal'),
    'overweight', (SELECT count(*) FROM public.health_reports WHERE calculator_type = 'bmi' AND result_data->>'category' = 'Overweight'),
    'obese', (SELECT count(*) FROM public.health_reports WHERE calculator_type = 'bmi' AND result_data->>'category' = 'Obese')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
