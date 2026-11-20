import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

// ---- Rate limiting (fixed window, stored in public.rate_limits via check_rate_limit) ----
const clientIp = (req: Request) => (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown').trim();
async function allow(service: any, key: string, max: number, windowSeconds: number, failOpen = true) {
  const { data, error } = await service.rpc('check_rate_limit', { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) { console.error('rate limit check failed', error.message); return failOpen; }
  return data === true;
}
const TOO_MANY = 'Too many attempts. Please wait a little and try again.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('request-access missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY');
    return json({ ok: false, error: 'Access requests are temporarily unavailable: server configuration is incomplete.' }, 503);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ ok: false, error: 'Sign in is required.' }, 401);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!(await allow(service, `access:${user.id}`, 3, 3600))) return json({ ok: false, error: TOO_MANY }, 429);
  // Admins can turn access requests off from the Access requests page.
  const { data: intake } = await service.from('app_settings').select('value').eq('key', 'access_requests_enabled').maybeSingle();
  if (intake?.value === false) return json({ ok: false, error: 'Access requests are turned off right now. Please contact the administrator.' }, 403);

  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || '').slice(0, 160);
  const email = String(user.email || '').slice(0, 320);

  // Confirm the request is actually persisted before reporting success.
  const { data: inserted, error: insertError } = await service
    .from('access_requests')
    .insert({ user_id: user.id, user_email: email, user_name: name, status: 'pending' })
    .select('id, user_id, user_email, user_name, status, created_at')
    .single();

  if (insertError || !inserted) {
    console.error('request-access insert failed', {
      userId: user.id,
      code: insertError?.code,
      message: insertError?.message,
      details: insertError?.details,
      hint: insertError?.hint,
    });
    return json({ ok: false, error: 'Could not save the access request. Check that the access_requests migration is applied and the service role key is configured.', code: insertError?.code || null }, 500);
  }

  console.log('request-access persisted request', { requestId: inserted.id, userId: user.id });
  return json({ ok: true, saved: true, requestId: inserted.id, status: inserted.status, message: 'Access request saved successfully.' }, 201);
});
