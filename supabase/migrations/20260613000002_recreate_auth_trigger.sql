-- FINAL SAFETY IMPROVEMENT: Recreate Auth Signup Trigger
-- This ensures the 'on_auth_user_created' trigger is synchronized with the 
-- latest handle_new_user() function, which now creates a default 'Me' tracker profile.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
