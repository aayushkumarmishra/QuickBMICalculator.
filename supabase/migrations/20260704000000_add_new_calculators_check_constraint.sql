-- Drop the existing check constraint on calculator_type in health_reports
ALTER TABLE public.health_reports
DROP CONSTRAINT IF EXISTS health_reports_calculator_type_check;

-- Recreate the check constraint with the new calculator types
ALTER TABLE public.health_reports
ADD CONSTRAINT health_reports_calculator_type_check
CHECK (calculator_type IN (
  'bmi',
  'bmr',
  'calorie',
  'ideal_weight',
  'water_intake',
  'body_fat',
  'lean_body_mass',
  'protein_intake',
  'macro',
  'daily_nutrition'
));

-- Recreate get_dashboard_stats RPC to count the new calculator types
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
  v_total_users bigint;
  v_total_reports bigint;
  v_total_profiles bigint;
  v_google_users bigint;
  v_email_users bigint;
  v_reports_today bigint;
  v_reports_7days bigint;
  v_reports_14days bigint;
  v_reports_30days bigint;
  v_reports_60days bigint;
  v_reports_bmi bigint;
  v_reports_bmr bigint;
  v_reports_calorie bigint;
  v_reports_water bigint;
  v_reports_ideal bigint;
  v_reports_body_fat bigint;
  v_reports_lean_body_mass bigint;
  v_reports_protein_intake bigint;
  v_reports_macro bigint;
  v_reports_daily_nutrition bigint;
  v_underweight bigint;
  v_normal bigint;
  v_overweight bigint;
  v_obese bigint;
BEGIN
  -- Verify caller is an authorized admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Read stats
  SELECT count(*) INTO v_total_users FROM public.profiles;
  SELECT count(*) INTO v_total_reports FROM public.health_reports;
  SELECT count(*) INTO v_total_profiles FROM public.tracker_profiles;
  SELECT count(*) INTO v_google_users FROM public.profiles WHERE provider = 'google';
  SELECT count(*) INTO v_email_users FROM public.profiles WHERE provider IS NULL OR provider = 'email';
  
  SELECT count(*) INTO v_reports_today FROM public.health_reports WHERE created_at >= start_today;
  SELECT count(*) INTO v_reports_7days FROM public.health_reports WHERE created_at >= seven_days;
  SELECT count(*) INTO v_reports_14days FROM public.health_reports WHERE created_at >= fourteen_days;
  SELECT count(*) INTO v_reports_30days FROM public.health_reports WHERE created_at >= thirty_days;
  SELECT count(*) INTO v_reports_60days FROM public.health_reports WHERE created_at >= sixty_days;
  
  SELECT count(*) INTO v_reports_bmi FROM public.health_reports WHERE calculator_type = 'bmi';
  SELECT count(*) INTO v_reports_bmr FROM public.health_reports WHERE calculator_type = 'bmr';
  SELECT count(*) INTO v_reports_calorie FROM public.health_reports WHERE calculator_type = 'calorie';
  SELECT count(*) INTO v_reports_water FROM public.health_reports WHERE calculator_type = 'water_intake';
  SELECT count(*) INTO v_reports_ideal FROM public.health_reports WHERE calculator_type = 'ideal_weight';
  SELECT count(*) INTO v_reports_body_fat FROM public.health_reports WHERE calculator_type = 'body_fat';
  SELECT count(*) INTO v_reports_lean_body_mass FROM public.health_reports WHERE calculator_type = 'lean_body_mass';
  SELECT count(*) INTO v_reports_protein_intake FROM public.health_reports WHERE calculator_type = 'protein_intake';
  SELECT count(*) INTO v_reports_macro FROM public.health_reports WHERE calculator_type = 'macro';
  SELECT count(*) INTO v_reports_daily_nutrition FROM public.health_reports WHERE calculator_type = 'daily_nutrition';
  
  SELECT count(*) INTO v_underweight FROM public.health_reports WHERE calculator_type = 'bmi' AND result_data->>'category' = 'Underweight';
  SELECT count(*) INTO v_normal FROM public.health_reports WHERE calculator_type = 'bmi' AND result_data->>'category' = 'Normal Weight';
  SELECT count(*) INTO v_overweight FROM public.health_reports WHERE calculator_type = 'bmi' AND result_data->>'category' = 'Overweight';
  SELECT count(*) INTO v_obese FROM public.health_reports WHERE calculator_type = 'bmi' AND result_data->>'category' LIKE 'Obesity%';

  SELECT jsonb_build_object(
    'total_users', v_total_users,
    'total_reports', v_total_reports,
    'total_profiles', v_total_profiles,
    'google_users', v_google_users,
    'email_users', v_email_users,
    'reports_today', v_reports_today,
    'reports_7days', v_reports_7days,
    'reports_14days', v_reports_14days,
    'reports_30days', v_reports_30days,
    'reports_60days', v_reports_60days,
    'reports_bmi', v_reports_bmi,
    'reports_bmr', v_reports_bmr,
    'reports_calorie', v_reports_calorie,
    'reports_water', v_reports_water,
    'reports_ideal', v_reports_ideal,
    'reports_body_fat', v_reports_body_fat,
    'reports_lean_body_mass', v_reports_lean_body_mass,
    'reports_protein_intake', v_reports_protein_intake,
    'reports_macro', v_reports_macro,
    'reports_daily_nutrition', v_reports_daily_nutrition,
    'underweight', v_underweight,
    'normal', v_normal,
    'overweight', v_overweight,
    'obese', v_obese
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
