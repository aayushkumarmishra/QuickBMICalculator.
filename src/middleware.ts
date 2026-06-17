import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';

export const onRequest = defineMiddleware(async ({ locals, url, redirect, cookies }, next) => {
  const currentPath = url.pathname;
  
  // 1. Get Session & Role from Cookie (reliable on server)
  const roleCookie = cookies.get('sb-role');
  const role = roleCookie?.value || 'user';
  const isAdmin = role === 'admin';
  
  // For session check, use the access token cookie that Supabase sets automatically
  const hasSession = !!cookies.get('sb-access-token')?.value || 
                     !!cookies.get('supabase-auth-token')?.value ||
                     !!cookies.get(`sb-${import.meta.env.PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`)?.value ||
                     isAdmin; // if role cookie exists, user was authenticated at some point


  // Pass role to locals
  locals.role = role;

  // 2. Define Allowed Admin Routes
  const allowedAdminPaths = [
    '/admin',
    '/admin/users',
    '/admin/reports',
    '/admin/analytics',
    '/login',
    '/admin-login',
    '/logout',
    '/403',
    '/404',
    '/500',
    '/auth/callback'
  ];

  // Normalize path for comparison (handle trailing slashes)
  const normalizedPath = currentPath.endsWith('/') && currentPath !== '/' 
    ? currentPath.slice(0, -1) 
    : currentPath;

  const isAllowedPath = allowedAdminPaths.includes(normalizedPath);

  // 3. Block regular users/anonymous from admin routes
  if (normalizedPath.startsWith('/admin') && normalizedPath !== '/admin-login') {
    if (!hasSession) {
      return redirect(`/login?returnTo=${encodeURIComponent(currentPath)}`);
    }
    if (!isAdmin || !hasSession) {
      return redirect('/403');
    }

    // If admin but unknown /admin/* sub-path, redirect to dashboard
    if (!isAllowedPath) {
      return redirect('/admin');
    }
  }

  // 4. Redirect Admin if on Blocked Route (User-facing routes)
  if (isAdmin && !isAllowedPath) {
    if (normalizedPath !== '/admin') {
      return redirect('/admin');
    }
  }

  // 5. If Admin is already logged in, don't let them see login/signup
  if (isAdmin && hasSession && normalizedPath === '/login') {
    return redirect('/admin');
  }

  return next();
});
