import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export const onRequest = defineMiddleware(async ({ locals, url, redirect, cookies, request }, next) => {
  const currentPath = url.pathname;
  
  // Early return for static assets to prevent infinite redirection loops for CSS/JS
  if (
    currentPath.startsWith('/_astro/') || 
    currentPath.includes('.') || 
    currentPath === '/favicon.ico'
  ) {
    return next();
  }

  // Rate limit auth-sensitive POST endpoints (login, signup, forgot-password) by IP
  if (request.method === 'POST') {
    const authPaths = ['/login', '/signup', '/forgot-password', '/api/auth'];
    if (authPaths.some(p => normalizedPath === p || normalizedPath.startsWith(p))) {
      const ip = request.headers.get('cf-connecting-ip') 
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown';
      if (!checkRateLimit(`auth:${ip}`, 10, 60_000)) {
        return new Response(null, { status: 429, statusText: 'Too Many Requests' });
      }
    }
  }
  
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  let role = 'user';
  let hasSession = false;

  const accessToken = cookies.get('sb-access-token')?.value;

  if (accessToken && supabaseUrl && supabaseAnonKey) {
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (user && !authError) {
        hasSession = true;

        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && !profileError) {
          role = profile.role;
        }
      }
    } catch (err) {
      console.error('Error verifying session in middleware:', err);
    }
  }

  const isAdmin = role === 'admin';

  // Pass role to locals
  locals.role = role;

  // 2. Define Allowed Admin Routes
  const allowedAdminPaths = [
    '/admin',
    '/admin/users',
    '/admin/reports',
    '/admin/analytics',
    '/admin/audit-logs',
    '/admin/monitoring',
    '/admin/settings',
    '/login',
    '/admin-login',
    '/logout',
    '/403',
    '/404',
    '/500',
    '/auth/callback',
    '/sitemap.xml',
    '/sitemap-index.xml',
    '/sitemap-0.xml'
  ];

  // Normalize path for comparison (handle trailing slashes)
  const normalizedPath = currentPath.endsWith('/') && currentPath !== '/' 
    ? currentPath.slice(0, -1) 
    : currentPath;

  const isAllowedPath = allowedAdminPaths.includes(normalizedPath) || 
                        (normalizedPath.startsWith('/admin/users/') && normalizedPath.split('/').length === 4) ||
                        (normalizedPath.startsWith('/admin/reports/') && normalizedPath.split('/').length === 4);

  // 3. Block unauthenticated users from protected user routes (/tracker/*)
  if (normalizedPath.startsWith('/tracker/') || normalizedPath === '/tracker') {
    if (!hasSession) {
      return redirect(`/login?returnTo=${encodeURIComponent(currentPath)}`);
    }
  }

  // 4. Block regular users/anonymous from admin routes
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

  // 4. Redirect logged-in admin away from auth pages (login, signup, admin-login)
  if (isAdmin && hasSession && (normalizedPath === '/login' || normalizedPath === '/signup' || normalizedPath === '/admin-login' || normalizedPath === '/forgot-password' || normalizedPath === '/reset-password')) {
    return redirect('/admin');
  }

  return next();
});
