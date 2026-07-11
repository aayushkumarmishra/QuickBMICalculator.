-- Create public.is_admin(uid) function for server-side admin checks
-- Used by RPC functions and potentially Row-Level Security policies
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND role = 'admin'
      AND public.is_admin_email(email)
  );
END;
$$;
