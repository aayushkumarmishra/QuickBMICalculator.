-- CREATE the get_top_active_users() RPC function
CREATE OR REPLACE FUNCTION public.get_top_active_users()
RETURNS TABLE (
  rank INT,
  id UUID,
  name TEXT,
  email TEXT,
  reports_count INT,
  profiles_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_counts AS (
    SELECT 
      user_id,
      COUNT(*)::INT AS r_count
    FROM public.health_reports
    GROUP BY user_id
  ),
  profile_counts AS (
    SELECT 
      user_id,
      COUNT(*)::INT AS p_count
    FROM public.tracker_profiles
    GROUP BY user_id
  ),
  all_user_ids AS (
    SELECT user_id FROM user_counts
    UNION
    SELECT user_id FROM profile_counts
  ),
  scored_users AS (
    SELECT
      au.user_id,
      COALESCE(uc.r_count, 0) AS rep_count,
      COALESCE(pc.p_count, 0) AS prof_count,
      (COALESCE(uc.r_count, 0) * 1.5 + COALESCE(pc.p_count, 0))::NUMERIC AS activity_score
    FROM all_user_ids au
    LEFT JOIN user_counts uc ON au.user_id = uc.user_id
    LEFT JOIN profile_counts pc ON au.user_id = pc.user_id
  ),
  ranked_users AS (
    SELECT
      su.user_id,
      su.rep_count,
      su.prof_count,
      su.activity_score,
      ROW_NUMBER() OVER (ORDER BY su.activity_score DESC, su.user_id) AS rnk
    FROM scored_users su
    ORDER BY activity_score DESC, user_id
    LIMIT 10
  )
  SELECT
    ru.rnk::INT AS rank,
    p.id,
    COALESCE(p.full_name, 'Anonymous') AS name,
    COALESCE(p.email, 'N/A') AS email,
    ru.rep_count AS reports_count,
    ru.prof_count AS profiles_count
  FROM ranked_users ru
  LEFT JOIN public.profiles p ON ru.user_id = p.id
  ORDER BY ru.rnk;
END;
$$;
