import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'Server function is not configured.' }, 503);

  const authHeader = req.headers.get('Authorization') || '';
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user: actor }, error: authError } = await caller.auth.getUser();
  if (authError || !actor) return json({ error: 'Sign in is required.' }, 401);

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actorProfile, error: actorProfileError } = await service.from('profiles').select('role').eq('id', actor.id).maybeSingle();
  if (actorProfileError || !actorProfile || !['owner', 'super_admin'].includes(actorProfile.role)) return json({ error: 'Owner or Super Admin access is required.' }, 403);

  if (!(await allow(service, `admincreate:${actor.id}`, 30, 3600))) return json({ error: TOO_MANY }, 429);

  let body: { username?: unknown; email?: unknown; password?: unknown; role?: unknown; first_name?: unknown; last_name?: unknown; full_name?: unknown; gender?: unknown; enabled_features?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const requestedRole = String(body.role || 'user');
  const titleCase = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').split(' ').map(part => part ? part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase() : '').join(' ');
  const firstName = titleCase(body.first_name);
  const lastName = titleCase(body.last_name);
  const fullName = `${firstName} ${lastName}`.trim();
  const gender = String(body.gender || 'prefer_not_to_say');
  const allowedFeatures = ['overview','transactions','accounts','calendar','budgets','goals','subscriptions','debts','insights','reports','expense_categories','vehicle_management','bank_sms'];
  const enabledFeatures = Array.isArray(body.enabled_features) ? body.enabled_features.map(String).filter((feature: string) => allowedFeatures.includes(feature)) : [];
  if (!firstName || !lastName) return json({ error: 'First name and last name are required.' }, 400);
  if (!['male','female','prefer_not_to_say'].includes(gender)) return json({ error: 'Choose a valid gender option.' }, 400);
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return json({ error: 'Username must be 3–32 characters using letters, numbers, dots, underscores or hyphens.' }, 400);
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address or leave it blank.' }, 400);
  if (!['user', 'super_admin'].includes(requestedRole)) return json({ error: 'Invalid role.' }, 400);
  if (requestedRole === 'super_admin' && actorProfile.role !== 'owner') return json({ error: 'Only the Owner can create a Super Admin.' }, 403);

  const { data: existing, error: usernameError } = await service.from('profiles').select('id').ilike('username', username).limit(1);
  if (usernameError) return json({ error: 'Username support is not installed. Run the latest SQL migration first.' }, 500);
  if (existing?.length) return json({ error: 'That username is already in use.' }, 409);
  if (email) {
    const { data: found } = await service.from('profiles').select('id').ilike('email', email).limit(1);
    if (found?.length) return json({ error: 'An account with that email already exists.' }, 409);
  }

  const authEmail = email || `${username.toLowerCase()}@users.pocket.local`;
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { username, first_name: firstName, last_name: lastName, full_name: fullName, gender, created_by_admin: true },
  });
  if (createError || !created.user) return json({ error: createError?.message || 'Could not create the account.' }, 400);

  const { error: profileError } = await service.from('profiles').upsert({
    id: created.user.id,
    email,
    username,
    first_name: firstName,
    last_name: lastName,
    gender,
    full_name: fullName,
    role: requestedRole,
    enabled_features: requestedRole === 'user' ? enabledFeatures : [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (profileError) {
    await service.auth.admin.deleteUser(created.user.id);
    return json({ error: 'The profile could not be saved. Account creation was rolled back.' }, 500);
  }
  return json({ ok: true, userId: created.user.id, emailProvided: Boolean(email) });
});
