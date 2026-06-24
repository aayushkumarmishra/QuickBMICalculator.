-- Add role and provider columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider TEXT;

-- Hard Admin Email Configuration
-- Only this email can ever have the 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin_email(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email_to_check = 'ayushmishra2131@gmail.com';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Ensure existing data adheres to the hard whitelist
UPDATE public.profiles 
SET role = 'user' 
WHERE role = 'admin' AND NOT public.is_admin_email(email);

UPDATE public.profiles 
SET role = 'admin' 
WHERE public.is_admin_email(email);

-- Policies for Admin Access
-- Note: We use permissive policies (OR-ed) with HARD email check

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND public.is_admin_email(email)
  )
);

DROP POLICY IF EXISTS "Admins can view all tracker profiles" ON public.tracker_profiles;
CREATE POLICY "Admins can view all tracker profiles" 
ON public.tracker_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND public.is_admin_email(email)
  )
);

DROP POLICY IF EXISTS "Admins can view all health reports" ON public.health_reports;
CREATE POLICY "Admins can view all health reports" 
ON public.health_reports FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND public.is_admin_email(email)
  )
);

-- Update handle_new_user function to include provider and automatic role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role TEXT := 'user';
BEGIN
  -- Automatic Admin Assignment
  IF public.is_admin_email(new.email) THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, provider, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_app_meta_data->>'provider',
    assigned_role
  );

  -- Create the default 'self' tracker profile
  INSERT INTO public.tracker_profiles (user_id, profile_name, relation_type)
  VALUES (new.id, 'Me', 'self');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
