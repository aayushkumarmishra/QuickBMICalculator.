import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate-limiter.ts';

const RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 };

const ALLOWED_ORIGINS = [
  'https://quickbmicalculator.com',
  'https://quickbmicalculator.pages.dev',
  'http://localhost:4321',
  'http://localhost:8788',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://quickbmicalculator.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerEmail = callerData.user.email;
    const callerId = callerData.user.id;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit by caller admin ID (10 req/min per admin)
    if (!checkRateLimit(`admin-delete:${callerId}`, RATE_LIMIT)) {
      const rateHeaders = getRateLimitHeaders(`admin-delete:${callerId}`, RATE_LIMIT);
      return new Response(JSON.stringify({ success: false, error: 'Too many requests. Please slow down.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateHeaders },
      });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing target user ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Safeguard 1: Admin cannot delete their own account
    if (userId === callerId) {
      return new Response(JSON.stringify({ success: false, error: 'Accidental self-deletion protection: you cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch target user profile first
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      return new Response(JSON.stringify({ success: false, error: 'Target user profile not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Safeguard 2: Last remaining admin cannot be deleted
    if (targetProfile.role === 'admin') {
      const { data: admins, error: countError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (countError) {
        return new Response(JSON.stringify({ success: false, error: 'Error checking admin accounts count' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (admins && admins.length <= 1) {
        return new Response(JSON.stringify({ success: false, error: 'Operation denied: cannot delete the last remaining administrator account' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Safeguard 3: Delete Auth User and cascade-delete profiles
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to delete authentication user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the ADMIN_DELETED_USER action
    await adminClient.from('audit_logs').insert({
      user_id: callerId,
      email: callerEmail,
      action: 'ADMIN_DELETED_USER',
      event_type: 'ADMIN_DELETED_USER',
      entity_type: 'user',
      entity_id: userId,
      description: `Admin ${callerEmail} deleted user account: ${targetProfile.email}`,
      metadata: {
        admin_id: callerId,
        admin_email: callerEmail,
        deleted_user_id: userId,
        deleted_user_email: targetProfile.email,
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('admin-delete-user error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
