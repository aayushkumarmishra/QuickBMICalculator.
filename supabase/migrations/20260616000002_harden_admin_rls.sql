-- Update Admin RLS policies to be more robust and non-recursive
-- Using auth.jwt() metadata or direct function checks is safer

-- 1. Profiles Policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  public.is_admin_email(auth.jwt() ->> 'email')
);

-- 2. Tracker Profiles Policy
DROP POLICY IF EXISTS "Admins can view all tracker profiles" ON public.tracker_profiles;
CREATE POLICY "Admins can view all tracker profiles" 
ON public.tracker_profiles FOR SELECT 
USING (
  public.is_admin_email(auth.jwt() ->> 'email')
);

-- 3. Health Reports Policy
DROP POLICY IF EXISTS "Admins can view all health reports" ON public.health_reports;
CREATE POLICY "Admins can view all health reports" 
ON public.health_reports FOR SELECT 
USING (
  public.is_admin_email(auth.jwt() ->> 'email')
);
