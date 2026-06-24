-- CREATE public.get_users_with_counts() RPC function
CREATE OR REPLACE FUNCTION public.get_users_with_counts(
  search_term TEXT DEFAULT '',
  provider_filter TEXT DEFAULT 'all',
  sort_order TEXT DEFAULT 'newest',
  limit_val INT DEFAULT 10,
  offset_val INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  provider TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  profiles_count INT,
  reports_count INT,
  last_activity TIMESTAMPTZ,
  total_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_matching_count INT;
BEGIN
  -- Verify calling user is an authorized admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Calculate the total count of matches matching current filters
  SELECT COUNT(*)::INT INTO total_matching_count
  FROM public.profiles p
  WHERE (
    search_term = '' OR 
    (p.email IS NOT NULL AND p.email ILIKE '%' || search_term || '%') OR 
    (p.full_name IS NOT NULL AND p.full_name ILIKE '%' || search_term || '%')
  ) AND (
    provider_filter = 'all' OR
    (provider_filter = 'google' AND p.provider = 'google') OR
    (provider_filter = 'email' AND (p.provider = 'email' OR p.provider IS NULL))
  );

  -- Return matching paginated rows with aggregated metrics
  RETURN QUERY
  WITH paginated_profiles AS (
    SELECT p.id, p.email, p.full_name, p.provider, p.role, p.created_at, p.last_login_at
    FROM public.profiles p
    WHERE (
      search_term = '' OR 
      (p.email IS NOT NULL AND p.email ILIKE '%' || search_term || '%') OR 
      (p.full_name IS NOT NULL AND p.full_name ILIKE '%' || search_term || '%')
    ) AND (
      provider_filter = 'all' OR
      (provider_filter = 'google' AND p.provider = 'google') OR
      (provider_filter = 'email' AND (p.provider = 'email' OR p.provider IS NULL))
    )
    ORDER BY 
      CASE WHEN sort_order = 'oldest' THEN p.created_at END ASC,
      CASE WHEN sort_order = 'newest' THEN p.created_at END DESC,
      p.id DESC
    LIMIT limit_val
    OFFSET offset_val
  ),
  user_profiles_count AS (
    SELECT user_id, COUNT(*)::INT AS p_count
    FROM public.tracker_profiles
    WHERE user_id IN (SELECT pp.id FROM paginated_profiles pp)
    GROUP BY user_id
  ),
  user_reports_info AS (
    SELECT 
      user_id, 
      COUNT(*)::INT AS r_count,
      MAX(created_at) AS last_rep_activity
    FROM public.health_reports
    WHERE user_id IN (SELECT pp.id FROM paginated_profiles pp)
    GROUP BY user_id
  )
  SELECT 
    pp.id,
    pp.email::TEXT,
    pp.full_name::TEXT,
    pp.provider::TEXT,
    pp.role::TEXT,
    pp.created_at,
    pp.last_login_at,
    COALESCE(upc.p_count, 0)::INT AS profiles_count,
    COALESCE(uri.r_count, 0)::INT AS reports_count,
    COALESCE(uri.last_rep_activity, pp.created_at) AS last_activity,
    total_matching_count AS total_count
  FROM paginated_profiles pp
  LEFT JOIN user_profiles_count upc ON pp.id = upc.user_id
  LEFT JOIN user_reports_info uri ON pp.id = uri.user_id
  ORDER BY 
    CASE WHEN sort_order = 'oldest' THEN pp.created_at END ASC,
    CASE WHEN sort_order = 'newest' THEN pp.created_at END DESC,
    pp.id DESC;
END;
$$;


-- CREATE public.get_profiles_with_stats() RPC function
CREATE OR REPLACE FUNCTION public.get_profiles_with_stats()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  profile_name TEXT,
  relation_type TEXT,
  nickname TEXT,
  created_at TIMESTAMPTZ,
  report_count INT,
  last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id,
    tp.user_id,
    tp.profile_name,
    tp.relation_type,
    tp.nickname,
    tp.created_at,
    COALESCE(COUNT(hr.id), 0)::INT AS report_count,
    MAX(hr.created_at) AS last_activity
  FROM public.tracker_profiles tp
  LEFT JOIN public.health_reports hr ON tp.id = hr.tracker_profile_id
  WHERE tp.user_id = auth.uid()
  GROUP BY tp.id, tp.user_id, tp.profile_name, tp.relation_type, tp.nickname, tp.created_at
  ORDER BY tp.created_at DESC;
END;
$$;
