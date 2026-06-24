-- 1. Common function for handling updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add updated_at columns to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.tracker_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.health_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Apply updated_at triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_tracker_profiles_updated_at ON public.tracker_profiles;
CREATE TRIGGER set_tracker_profiles_updated_at 
    BEFORE UPDATE ON public.tracker_profiles 
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_health_reports_updated_at ON public.health_reports;
CREATE TRIGGER set_health_reports_updated_at 
    BEFORE UPDATE ON public.health_reports 
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 4. Constraint: Only one 'self' profile per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_self_profile_per_user 
ON public.tracker_profiles (user_id) 
WHERE (relation_type = 'self');

-- 5. Constraint: Max 10 tracker profiles per user
CREATE OR REPLACE FUNCTION public.check_tracker_profile_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.tracker_profiles WHERE user_id = NEW.user_id) >= 10 THEN
        RAISE EXCEPTION 'Maximum limit of 10 tracker profiles reached.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_profile_limit ON public.tracker_profiles;
CREATE TRIGGER enforce_profile_limit
    BEFORE INSERT ON public.tracker_profiles
    FOR EACH ROW EXECUTE PROCEDURE public.check_tracker_profile_limit();

-- 6. Automation: Auto-create 'Me' profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the core profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');

  -- Create the default 'self' tracker profile
  INSERT INTO public.tracker_profiles (user_id, profile_name, relation_type)
  VALUES (new.id, 'Me', 'self');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
