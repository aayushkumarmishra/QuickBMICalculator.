-- Add a row-level security policy on the health_reports table allowing admins to delete records directly using the client
CREATE POLICY "Admins can delete all health reports"
ON public.health_reports FOR DELETE
USING (
  public.is_admin_email(auth.jwt() ->> 'email')
);
