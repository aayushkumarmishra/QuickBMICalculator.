-- CREATE public.get_admin_dashboard_data() RPC function
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_data(
  seven_days TIMESTAMPTZ,
  fourteen_days TIMESTAMPTZ,
  ninety_days TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users INT;
  v_total_reports INT;
  v_total_profiles INT;
  v_google_users INT;
  v_admin_count INT;
  v_users_current_week INT;
  v_users_previous_week INT;
  v_reports_current_week INT;
  v_reports_previous_week INT;
  v_profiles_current_week INT;
  v_profiles_previous_week INT;
  v_recent_users JSONB;
  v_user_growth_dates JSONB;
  v_report_volume_dates JSONB;
BEGIN
  -- Verify caller is an authorized admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 1. Get total counts
  SELECT COUNT(*)::INT INTO v_total_users FROM public.profiles;
  SELECT COUNT(*)::INT INTO v_total_reports FROM public.health_reports;
  SELECT COUNT(*)::INT INTO v_total_profiles FROM public.tracker_profiles;
  SELECT COUNT(*)::INT INTO v_google_users FROM public.profiles WHERE provider = 'google';
  SELECT COUNT(*)::INT INTO v_admin_count FROM public.profiles WHERE role = 'admin';

  -- 2. Get weekly trend counts
  SELECT COUNT(*)::INT INTO v_users_current_week 
  FROM public.profiles 
  WHERE created_at >= seven_days;

  SELECT COUNT(*)::INT INTO v_users_previous_week 
  FROM public.profiles 
  WHERE created_at >= fourteen_days AND created_at < seven_days;

  SELECT COUNT(*)::INT INTO v_reports_current_week 
  FROM public.health_reports 
  WHERE created_at >= seven_days;

  SELECT COUNT(*)::INT INTO v_reports_previous_week 
  FROM public.health_reports 
  WHERE created_at >= fourteen_days AND created_at < seven_days;

  SELECT COUNT(*)::INT INTO v_profiles_current_week 
  FROM public.tracker_profiles 
  WHERE created_at >= seven_days;

  SELECT COUNT(*)::INT INTO v_profiles_previous_week 
  FROM public.tracker_profiles 
  WHERE created_at >= fourteen_days AND created_at < seven_days;

  -- 3. Get recent users with their profiles and reports counts
  WITH recent_profiles AS (
    SELECT p.id, p.email, p.full_name, p.provider, p.created_at
    FROM public.profiles p
    ORDER BY p.created_at DESC
    LIMIT 8
  ),
  recent_profiles_with_counts AS (
    SELECT 
      rp.id,
      rp.email,
      rp.full_name,
      rp.provider,
      rp.created_at,
      (SELECT COUNT(*)::INT FROM public.tracker_profiles tp WHERE tp.user_id = rp.id) AS profiles_count,
      (SELECT COUNT(*)::INT FROM public.health_reports hr WHERE hr.user_id = rp.id) AS reports_count
    FROM recent_profiles rp
  )
  SELECT json_agg(rpwc)::JSONB INTO v_recent_users
  FROM recent_profiles_with_counts rpwc;

  -- 4. Get registration dates in the last 90 days
  SELECT json_agg(created_at)::JSONB INTO v_user_growth_dates
  FROM (
    SELECT created_at 
    FROM public.profiles 
    WHERE created_at >= ninety_days
    ORDER BY created_at ASC
  ) t;

  -- 5. Get report volume dates in the last 90 days
  SELECT json_agg(created_at)::JSONB INTO v_report_volume_dates
  FROM (
    SELECT created_at 
    FROM public.health_reports 
    WHERE created_at >= ninety_days
    ORDER BY created_at ASC
  ) t;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'total_reports', v_total_reports,
    'total_profiles', v_total_profiles,
    'google_users', v_google_users,
    'admin_count', v_admin_count,
    'users_current_week', v_users_current_week,
    'users_previous_week', v_users_previous_week,
    'reports_current_week', v_reports_current_week,
    'reports_previous_week', v_reports_previous_week,
    'profiles_current_week', v_profiles_current_week,
    'profiles_previous_week', v_profiles_previous_week,
    'recent_users', COALESCE(v_recent_users, '[]'::jsonb),
    'user_growth_dates', COALESCE(v_user_growth_dates, '[]'::jsonb),
    'report_volume_dates', COALESCE(v_report_volume_dates, '[]'::jsonb)
  );
END;
$$;
