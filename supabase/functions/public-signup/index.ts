import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Sign-up WITHOUT an email: the account signs in with a username. (Sign-up with an email uses normal Supabase auth.)
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
const COMMON_PASSWORDS = new Set(['password','password1','password123','12345678','123456789','1234567890','qwertyuiop','qwerty123','iloveyou','admin123','welcome1','letmein123','11111111','00000000','abc12345','pocket123','forma123']);
const TOO_MANY = 'Too many attempts. Please wait a little and try again.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Sign-up is temporarily unavailable.' }, 503);

  let body: { username?: unknown; password?: unknown; full_name?: unknown; gender?: unknown; avatar?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const fullName = String(body.full_name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const gender = ['male', 'female', 'prefer_not_to_say'].includes(String(body.gender)) ? String(body.gender) : 'prefer_not_to_say';
  if (!fullName) return json({ error: 'Enter your name.' }, 400);
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return json({ error: 'Username must be 3–32 characters: letters, numbers, dots, underscores or hyphens.' }, 400);
  if (password.length < 8) return json({ error: 'Use a password with at least 8 characters.' }, 400);
  if (password.toLowerCase().includes(username.toLowerCase()) || COMMON_PASSWORDS.has(password.toLowerCase())) return json({ error: 'Choose a password that is harder to guess (not your username or a common password).' }, 400);

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // Max 5 sign-ups per IP per hour and 200 per hour overall. Fail closed if the limiter is unavailable.
  if (!(await allow(service, `signup:ip:${clientIp(req)}`, 5, 3600, false)) || !(await allow(service, 'signup:all', 200, 3600, false))) {
    return new Response(JSON.stringify({ error: TOO_MANY }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '900' } });
  }
  const { data: taken, error: lookupError } = await service.from('profiles').select('id').ilike('username', username).limit(1);
  if (lookupError) return json({ error: 'Could not check the username. Try again.' }, 500);
  if (taken?.length) return json({ error: 'That username is already taken.' }, 409);

  const [firstName, ...rest] = fullName.split(' ');
  const { error: createError } = await service.auth.admin.createUser({
    email: `${username.toLowerCase()}@users.pocket.local`,
    password,
    email_confirm: true,
    user_metadata: { username, first_name: firstName, last_name: rest.join(' '), full_name: fullName, gender, avatar: String(body.avatar || '').slice(0, 200) || undefined },
  });
  if (createError) return json({ error: /already/i.test(createError.message) ? 'That username is already taken.' : createError.message }, 400);
  return json({ ok: true });
});
